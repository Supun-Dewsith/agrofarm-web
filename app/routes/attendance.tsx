import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import QRCode from "qrcode";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  LocateFixed,
  MapPin,
  Navigation,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
  X,
  Copy,
  Leaf,
} from "lucide-react";

import {
  generateAttendanceQr,
  getAttendanceByDate,
  getAttendanceDashboard,
  getAttendanceFarms,
  getAttendanceReport,
  getAttendanceReportSummary,
  getAttendanceQrLiveCode,
  getAttendanceWorkers,
  processCodeAttendance,
  processQrAttendance,
} from "../services/attendanceService";
import { getAuthData } from "../utils/auth";
import type {
  AttendanceDashboardResponse,
  AttendanceDeviceType,
  AttendanceFarm,
  AttendanceReportSummary,
  AttendanceResponse,
  AttendanceWorker,
  QrAttendanceResponse,
} from "../types/attendance";

/* =========================================================
   LOCATION SETTINGS
========================================================= */

const LOCATION_MAX_WAIT_MS = 12_000;
const LOCATION_TARGET_SAMPLE_COUNT = 3;
const LOCATION_TARGET_ACCURACY_METERS = 35;
const LOCATION_MAX_ATTENDANCE_ACCURACY_METERS = 100;
const LOCATION_MAX_SAMPLE_ACCURACY_METERS = 5_000;
const LIVE_CODE_ROTATION_SECONDS = 45;
const RECENT_LOCATION_CACHE_KEY = "agrofarm_recent_device_location";
const RECENT_LOCATION_MAX_AGE_MS = 60_000;

interface LocationSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface AccurateLocationResult {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  sampleCount: number;
  stabilityMeters: number;
  elapsedMs: number;
  quality: "EXCELLENT" | "GOOD" | "ACCEPTABLE";
}

interface LocationProgress {
  sampleCount: number;
  bestAccuracyMeters: number | null;
  secondsRemaining: number;
}

type FarmBoundaryPoint = [number, number];

const DEFAULT_TIME_ZONE = "Asia/Colombo";

const getActiveTimeZone = (): string => {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      DEFAULT_TIME_ZONE
    );
  } catch {
    return DEFAULT_TIME_ZONE;
  }
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const getActiveTimeZoneDateParts = (value: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: getActiveTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const read = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
};

const getActiveTimeZoneToday = () => {
  const { year, month, day } = getActiveTimeZoneDateParts();
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

/**
 * Spring Boot currently returns LocalDateTime values without a timezone offset.
 * The Docker backend runs on UTC, so timezone-less API values are interpreted as UTC
 * and then displayed using the browser/device timezone.
 * If the browser cannot resolve a timezone, Asia/Colombo is used as fallback.
 */
const parseBackendDateTime = (
  value: string | null | undefined
): Date | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized =
    hasExplicitZone || !/^\d{4}-\d{2}-\d{2}T/.test(trimmed)
      ? trimmed
      : `${trimmed}Z`;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const time = (value: string | null | undefined) => {
  const parsed = parseBackendDateTime(value);
  if (!parsed) return "-";

  return new Intl.DateTimeFormat("en-LK", {
    timeZone: getActiveTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
};

const dateTimeInActiveTimeZone = (value: string | null | undefined) => {
  const parsed = parseBackendDateTime(value);
  if (!parsed) return "-";

  return new Intl.DateTimeFormat("en-LK", {
    timeZone: getActiveTimeZone(),
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
};

const statusClass = (s: string) =>
  `status status-${s.toLowerCase().replace("_", "-")}`;

const prettyStatus = (s: string) => s.replaceAll("_", " ").toLowerCase();

const metersBetween = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const r = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
};

const locationQuality = (
  accuracyMeters: number
): AccurateLocationResult["quality"] => {
  if (accuracyMeters <= 20) return "EXCELLENT";
  if (accuracyMeters <= 50) return "GOOD";
  return "ACCEPTABLE";
};

const parseFarmBoundary = (boundary: unknown): FarmBoundaryPoint[] => {
  if (boundary == null || boundary === "") return [];

  try {
    const raw =
      typeof boundary === "string"
        ? (JSON.parse(boundary) as unknown)
        : boundary;

    if (!Array.isArray(raw)) return [];

    return raw
      .filter(
        (item): item is [number, number] =>
          Array.isArray(item) &&
          item.length >= 2 &&
          Number.isFinite(Number(item[0])) &&
          Number.isFinite(Number(item[1]))
      )
      .map((item) => [Number(item[0]), Number(item[1])]);
  } catch {
    return [];
  }
};

const isPointOnSegment = (
  latitude: number,
  longitude: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
) => {
  const cross =
    (longitude - aLng) * (bLat - aLat) -
    (latitude - aLat) * (bLng - aLng);
  if (Math.abs(cross) > 1e-10) return false;

  const dot =
    (longitude - aLng) * (bLng - aLng) +
    (latitude - aLat) * (bLat - aLat);
  if (dot < 0) return false;

  const squaredLength =
    (bLng - aLng) * (bLng - aLng) +
    (bLat - aLat) * (bLat - aLat);

  return dot <= squaredLength;
};

const isPointInsideFarmBoundary = (
  latitude: number,
  longitude: number,
  polygon: FarmBoundaryPoint[]
) => {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    if (isPointOnSegment(latitude, longitude, latI, lngI, latJ, lngJ)) {
      return true;
    }

    const intersects =
      lngI > longitude !== lngJ > longitude &&
      latitude <
        ((latJ - latI) * (longitude - lngI)) / (lngJ - lngI) + latI;

    if (intersects) inside = !inside;
  }

  return inside;
};

const distanceToFarmBoundaryMeters = (
  latitude: number,
  longitude: number,
  polygon: FarmBoundaryPoint[]
) => {
  if (polygon.length < 2) return 0;

  const earthRadius = 6_371_000;
  const refLatRad = (latitude * Math.PI) / 180;
  const toXY = (lat: number, lng: number) => ({
    x: ((lng - longitude) * Math.PI) / 180 * earthRadius * Math.cos(refLatRad),
    y: ((lat - latitude) * Math.PI) / 180 * earthRadius,
  });

  let minDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < polygon.length; i++) {
    const a = toXY(polygon[i][0], polygon[i][1]);
    const b = toXY(
      polygon[(i + 1) % polygon.length][0],
      polygon[(i + 1) % polygon.length][1]
    );

    const abX = b.x - a.x;
    const abY = b.y - a.y;
    const abLengthSquared = abX * abX + abY * abY;

    let t = 0;
    if (abLengthSquared > 0) {
      t = Math.max(
        0,
        Math.min(1, (-(a.x) * abX + -(a.y) * abY) / abLengthSquared)
      );
    }

    const closestX = a.x + t * abX;
    const closestY = a.y + t * abY;
    const distance = Math.hypot(closestX, closestY);
    minDistance = Math.min(minDistance, distance);
  }

  return Number.isFinite(minDistance) ? minDistance : 0;
};

const verifyLocationAgainstFarmBoundary = (
  location: AccurateLocationResult,
  polygon: FarmBoundaryPoint[]
) => {
  const inside = isPointInsideFarmBoundary(
    location.latitude,
    location.longitude,
    polygon
  );

  const distanceToBoundaryMeters = inside
    ? distanceToFarmBoundaryMeters(
        location.latitude,
        location.longitude,
        polygon
      )
    : 0;

  return {
    inside,
    distanceToBoundaryMeters,
    confidentlyInside:
      inside && distanceToBoundaryMeters >= location.accuracyMeters,
  };
};

const locationErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;

  const geo = error as Partial<GeolocationPositionError>;
  if (geo?.code === 1) {
    return "Location permission is blocked. Allow Location for AgroFarm in the browser and turn on Windows Location Services.";
  }
  if (geo?.code === 2) {
    return "Windows/browser could not determine this device location. Turn on Windows Location Services and allow Location for this site.";
  }
  if (geo?.code === 3) {
    return "Windows/browser did not return a location in time. Check Location Services and this site's Location permission.";
  }
  return "Unable to get the current device location.";
};

const readRecentLocation = (): LocationSample | null => {
  try {
    const raw = sessionStorage.getItem(RECENT_LOCATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as LocationSample & { savedAt?: number };
    const savedAt = Number(parsed.savedAt ?? 0);

    if (
      !Number.isFinite(parsed.latitude) ||
      !Number.isFinite(parsed.longitude) ||
      !Number.isFinite(parsed.accuracy) ||
      parsed.accuracy <= 0 ||
      parsed.accuracy > LOCATION_MAX_ATTENDANCE_ACCURACY_METERS ||
      !Number.isFinite(savedAt) ||
      Date.now() - savedAt > RECENT_LOCATION_MAX_AGE_MS
    ) {
      return null;
    }

    return {
      latitude: Number(parsed.latitude),
      longitude: Number(parsed.longitude),
      accuracy: Number(parsed.accuracy),
      timestamp: Number(parsed.timestamp || savedAt),
    };
  } catch {
    return null;
  }
};

const saveRecentLocation = (sample: LocationSample) => {
  try {
    sessionStorage.setItem(
      RECENT_LOCATION_CACHE_KEY,
      JSON.stringify({ ...sample, savedAt: Date.now() })
    );
  } catch {
    // sessionStorage can be unavailable in some privacy modes.
  }
};

const getAccurateLocation = (
  onProgress?: (progress: LocationProgress) => void
) =>
  new Promise<AccurateLocationResult>((resolve, reject) => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      reject(new Error("Location can only be collected in the browser."));
      return;
    }

    if (!navigator.geolocation) {
      reject(
        new Error(
          "This browser does not provide device location. Open AgroFarm in Chrome/Edge on a phone or a location-enabled computer."
        )
      );
      return;
    }

    if (!window.isSecureContext) {
      reject(
        new Error(
          "Location is blocked because this page is not secure. Use https:// or http://localhost."
        )
      );
      return;
    }

    const startedAt = Date.now();
    const samples: LocationSample[] = [];
    let bestSample: LocationSample | null = null;
    let finished = false;
    const watchIds: number[] = [];
    let finishTimer: ReturnType<typeof setTimeout> | null = null;
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let lastGeoError: GeolocationPositionError | null = null;

    const cleanup = () => {
      for (const id of watchIds) navigator.geolocation.clearWatch(id);
      if (finishTimer) clearTimeout(finishTimer);
      if (progressTimer) clearInterval(progressTimer);
    };

    const emitProgress = () => {
      onProgress?.({
        sampleCount: samples.length,
        bestAccuracyMeters: bestSample?.accuracy ?? null,
        secondsRemaining: Math.max(
          0,
          Math.ceil((LOCATION_MAX_WAIT_MS - (Date.now() - startedAt)) / 1000)
        ),
      });
    };

    const buildResult = (sample: LocationSample): AccurateLocationResult => {
      const distances = samples.map((other) =>
        metersBetween(
          sample.latitude,
          sample.longitude,
          other.latitude,
          other.longitude
        )
      );

      return {
        latitude: sample.latitude,
        longitude: sample.longitude,
        accuracyMeters: sample.accuracy,
        sampleCount: Math.max(1, samples.length),
        stabilityMeters: distances.length ? Math.max(...distances, 0) : 0,
        elapsedMs: Date.now() - startedAt,
        quality: locationQuality(sample.accuracy),
      };
    };

    const complete = (sample: LocationSample) => {
      if (finished) return;
      finished = true;
      saveRecentLocation(sample);
      cleanup();
      resolve(buildResult(sample));
    };

    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error(message));
    };

    const addPosition = (position: GeolocationPosition) => {
      if (finished) return;

      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);
      const accuracy = Number(position.coords.accuracy);
      const timestamp = Number(position.timestamp || Date.now());

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(accuracy) ||
        accuracy <= 0 ||
        accuracy > LOCATION_MAX_SAMPLE_ACCURACY_METERS
      ) {
        return;
      }

      const sample: LocationSample = { latitude, longitude, accuracy, timestamp };
      const duplicate = samples.some(
        (x) =>
          x.timestamp === sample.timestamp &&
          Math.abs(x.latitude - sample.latitude) < 0.0000001 &&
          Math.abs(x.longitude - sample.longitude) < 0.0000001
      );

      if (!duplicate) samples.push(sample);
      if (!bestSample || sample.accuracy < bestSample.accuracy) bestSample = sample;
      emitProgress();

      // Do not wait for several duplicate readings on laptops. The browser's
      // reported accuracy is the important gate for attendance.
      if (bestSample.accuracy <= LOCATION_MAX_ATTENDANCE_ACCURACY_METERS) {
        complete(bestSample);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      lastGeoError = error;
      if (error.code === error.PERMISSION_DENIED) {
        fail(
          "Location is blocked for AgroFarm. Allow Location for this site and reload the page."
        );
      }
    };

    const start = async () => {
      try {
        if (navigator.permissions?.query) {
          const permission = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });
          if (permission.state === "denied") {
            fail(
              "Location is blocked for AgroFarm. Change this site's Location permission to Allow and reload."
            );
            return;
          }
        }
      } catch {
        // Permissions API is optional.
      }

      if (finished) return;

      // A successful fix from this same tab is safe to reuse briefly. This
      // avoids a second Windows provider timeout during immediate check-out.
      const recent = readRecentLocation();
      if (recent) {
        samples.push(recent);
        bestSample = recent;
        complete(recent);
        return;
      }

      emitProgress();
      progressTimer = setInterval(emitProgress, 500);

      const request = (
        enableHighAccuracy: boolean,
        maximumAge: number,
        timeout: number
      ) => {
        navigator.geolocation.getCurrentPosition(addPosition, handleError, {
          enableHighAccuracy,
          maximumAge,
          timeout,
        });
      };

      // Windows desktops sometimes answer only the balanced provider, while
      // phones usually answer high-accuracy. Run both modes instead of waiting
      // for one to fail before trying the other.
      request(false, 60_000, 4_000);
      request(false, 0, 10_000);
      request(true, 0, 11_000);

      watchIds.push(
        navigator.geolocation.watchPosition(addPosition, handleError, {
          enableHighAccuracy: false,
          maximumAge: 0,
          timeout: 10_000,
        })
      );

      watchIds.push(
        navigator.geolocation.watchPosition(addPosition, handleError, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 11_000,
        })
      );

      finishTimer = setTimeout(() => {
        if (finished) return;

        if (
          bestSample &&
          bestSample.accuracy <= LOCATION_MAX_ATTENDANCE_ACCURACY_METERS
        ) {
          complete(bestSample);
          return;
        }

        if (bestSample) {
          fail(
            `Location was found, but its accuracy is only ±${Math.round(
              bestSample.accuracy
            )}m. Move to an open area or use a phone with GPS, then retry.`
          );
          return;
        }

        if (lastGeoError?.code === 1) {
          fail(
            "Location is blocked for AgroFarm. Allow Location for this site and reload the page."
          );
          return;
        }

        if (lastGeoError?.code === 2) {
          fail(
            "This computer is not supplying a location fix. For attendance, open this AgroFarm page on a phone with Location/GPS enabled, or enable Windows Location Services and retry."
          );
          return;
        }

        fail(
          "No device location fix was available. Use a phone with Location/GPS enabled for attendance, or enable Windows Location Services and retry."
        );
      }, LOCATION_MAX_WAIT_MS);
    };

    void start();
  });

/* =========================================================
   DEVICE MODE
   ---------------------------------------------------------
   PHONE / TABLET:
   - GPS/browser location is required.
   - Backend checks the real session farm boundary.

   LAPTOP / DESKTOP:
   - Location is NOT required.
   - QR / 4-digit code / rotating OTP / farm assignment still
     have to pass on the backend.
========================================================= */

const detectClientDeviceType = (): AttendanceDeviceType => {
  if (typeof navigator === "undefined") return "DESKTOP";

  const nav = navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean;
    };
  };

  if (nav.userAgentData?.mobile === true) {
    return "MOBILE";
  }

  const userAgent = navigator.userAgent || "";
  const mobileByUserAgent =
    /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(userAgent);

  // Newer iPadOS versions can expose a desktop-like "MacIntel" platform.
  const iPadDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return mobileByUserAgent || iPadDesktopMode ? "MOBILE" : "DESKTOP";
};

/* =========================================================
   QR SCAN PAGE
========================================================= */

function QrScanLanding({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<QrAttendanceResponse | null>(null);
  const [error, setError] = useState("");
  const [deviceType, setDeviceType] =
    useState<AttendanceDeviceType>("DESKTOP");
  const [progress, setProgress] = useState<LocationProgress>({
    sampleCount: 0,
    bestAccuracyMeters: null,
    secondsRemaining: Math.ceil(LOCATION_MAX_WAIT_MS / 1000),
  });
  const [captured, setCaptured] = useState<AccurateLocationResult | null>(null);

  useEffect(() => {
    setDeviceType(detectClientDeviceType());
  }, []);

  const isMobile = deviceType === "MOBILE";

  const mark = async () => {
    try {
      setBusy(true);
      setError("");
      setResult(null);
      setCaptured(null);
      setProgress({
        sampleCount: 0,
        bestAccuracyMeters: null,
        secondsRemaining: Math.ceil(LOCATION_MAX_WAIT_MS / 1000),
      });

      let location: AccurateLocationResult | null = null;

      if (isMobile) {
        location = await getAccurateLocation(setProgress);
        setCaptured(location);
      }

      const data = await processQrAttendance({
        qrToken: token,
        deviceType,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        accuracyMeters: location?.accuracyMeters ?? null,
        location: location
          ? `Mobile GPS location ${location.latitude.toFixed(
              7
            )}, ${location.longitude.toFixed(7)} (±${Math.round(
              location.accuracyMeters
            )}m)`
          : "Desktop/Laptop attendance - location not required",
      });

      setResult(data);
    } catch (e) {
      setError(locationErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scan-page">
      <div className="scan-card">
        <div className="scan-icon">
          {isMobile ? <LocateFixed size={34} /> : <QrCode size={34} />}
        </div>

        <h1>AgroFarm Attendance</h1>

        {isMobile ? (
          <p>
            Phone/tablet attendance requires the current GPS/browser location.
            The backend verifies that the position is inside the farm linked to
            this attendance session.
          </p>
        ) : (
          <p>
            Laptop/desktop attendance does not require device location. The QR
            session and your farm assignment are still validated by the backend.
          </p>
        )}

        {!result && (
          <div className="precision-note">
            <ShieldCheck size={17} />
            <div>
              <strong>
                {isMobile
                  ? "Mobile GPS + farm boundary check"
                  : "Laptop/Desktop mode"}
              </strong>
              <span>
                {isMobile
                  ? "Location must be available and accurate enough before attendance is sent."
                  : "No Windows location service, Wi-Fi helper, or Google Geolocation API is required."}
              </span>
            </div>
          </div>
        )}

        {busy && isMobile && (
          <div className="location-progress-card">
            <div className="progress-top">
              <div>
                <strong>Finding your current phone location...</strong>
                <span>
                  Reading {progress.sampleCount} fresh sample
                  {progress.sampleCount === 1 ? "" : "s"}
                </span>
              </div>
              <Navigation className="pulse" size={22} />
            </div>

            <div className="progress-grid">
              <div>
                <small>Best accuracy</small>
                <b>
                  {progress.bestAccuracyMeters == null
                    ? "Waiting..."
                    : `±${Math.round(progress.bestAccuracyMeters)} m`}
                </b>
              </div>
              <div>
                <small>Time remaining</small>
                <b>{progress.secondsRemaining}s</b>
              </div>
            </div>

            <div className="progress-bar">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    (progress.sampleCount / LOCATION_TARGET_SAMPLE_COUNT) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {captured && !result && (
          <div className="captured-location">
            <CheckCircle2 size={18} />
            <div>
              <strong>
                Phone location captured • {captured.quality.toLowerCase()} accuracy
              </strong>
              <span>
                ±{Math.round(captured.accuracyMeters)}m • {captured.latitude.toFixed(7)}, {" "}
                {captured.longitude.toFixed(7)}
              </span>
            </div>
          </div>
        )}

        {result ? (
          <div className={result.success ? "scan-success" : "scan-warning"}>
            <strong>{result.message}</strong>
            <span>
              Status: {result.status ? prettyStatus(result.status) : "-"}
            </span>
            <span>Check in: {time(result.checkInTime)}</span>
            <span>Check out: {time(result.checkOutTime)}</span>

            {result.accuracyMeters != null && (
              <span>
                Captured accuracy: ±{Math.round(result.accuracyMeters)} meters
              </span>
            )}

            {result.latitude != null && result.longitude != null && (
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps?q=${result.latitude},${result.longitude}`}
              >
                <MapPin size={16} /> View captured location on map
              </a>
            )}
          </div>
        ) : (
          <button className="primary large" onClick={mark} disabled={busy}>
            {isMobile ? <LocateFixed size={18} /> : <QrCode size={18} />}
            {busy
              ? isMobile
                ? "Checking phone location..."
                : "Marking attendance..."
              : "Mark Attendance"}
          </button>
        )}

        {error && (
          <div className="error-box scan-error">
            <strong>Attendance was not sent.</strong>
            <span>{error}</span>
          </div>
        )}

        {isMobile && (
          <div className="location-help">
            <strong>Phone attendance requirements:</strong>
            <span>1. Phone Location/GPS = ON</span>
            <span>2. Browser Location permission = Allow</span>
            <span>3. Open AgroFarm through HTTPS in production</span>
            <span>
              4. Location accuracy must be ±
              {LOCATION_MAX_ATTENDANCE_ACCURACY_METERS}m or better
            </span>
          </div>
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

/* =========================================================
   MANUAL CODE FALLBACK
========================================================= */

function ManualCodeAttendance({
  onMarked,
  farm,
}: {
  onMarked: () => void | Promise<void>;
  farm?: AttendanceFarm;
}) {
  const [sessionCode, setSessionCode] = useState("");
  const [liveCode, setLiveCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QrAttendanceResponse | null>(null);
  const [deviceType, setDeviceType] =
    useState<AttendanceDeviceType>("DESKTOP");
  const [capturedLocation, setCapturedLocation] =
    useState<AccurateLocationResult | null>(null);
  const [insideFarm, setInsideFarm] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<LocationProgress>({
    sampleCount: 0,
    bestAccuracyMeters: null,
    secondsRemaining: Math.ceil(LOCATION_MAX_WAIT_MS / 1000),
  });

  useEffect(() => {
    setDeviceType(detectClientDeviceType());
  }, []);

  const isMobile = deviceType === "MOBILE";

  const normalizeDigits = (value: string, maxLength: number) =>
    value.replace(/\D/g, "").slice(0, maxLength);

  const markWithCode = async () => {
    if (!/^\d{4}$/.test(sessionCode)) {
      setError("Enter the 4-digit attendance code shown under the QR.");
      return;
    }

    if (!/^\d{2}$/.test(liveCode)) {
      setError("Enter the current 2-digit live number shown under the QR.");
      return;
    }

    if (!farm) {
      setError("Select your farm before marking attendance.");
      return;
    }

    const polygon = parseFarmBoundary(farm.boundary);

    if (isMobile && polygon.length < 3) {
      setError(
        `${farm.farmName} does not have a valid saved boundary. Ask an ADMIN/SUPERVISOR to draw and save the farm boundary first.`
      );
      return;
    }

    try {
      setBusy(true);
      setError("");
      setResult(null);
      setCapturedLocation(null);
      setInsideFarm(null);
      setProgress({
        sampleCount: 0,
        bestAccuracyMeters: null,
        secondsRemaining: Math.ceil(LOCATION_MAX_WAIT_MS / 1000),
      });

      let location: AccurateLocationResult | null = null;
      let locationText = "Desktop/Laptop attendance - location not required";

      if (isMobile) {
        location = await getAccurateLocation(setProgress);
        setCapturedLocation(location);

        const boundaryCheck = verifyLocationAgainstFarmBoundary(location, polygon);
        setInsideFarm(boundaryCheck.inside);

        if (!boundaryCheck.inside) {
          throw new Error(
            `Your current location is outside ${farm.farmName}. Attendance was not sent. Current coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (±${Math.round(location.accuracyMeters)}m).`
          );
        }

        if (!boundaryCheck.confidentlyInside) {
          throw new Error(
            `Your phone position is inside ${farm.farmName}, but the location accuracy reaches outside the farm boundary. Current accuracy is ±${Math.round(location.accuracyMeters)}m and you are about ${Math.round(boundaryCheck.distanceToBoundaryMeters)}m from the farm edge. Move farther inside the farm and retry.`
          );
        }

        locationText = `Mobile GPS inside ${farm.farmName} - ${location.latitude.toFixed(
          7
        )}, ${location.longitude.toFixed(7)} (±${Math.round(
          location.accuracyMeters
        )}m, ${Math.round(boundaryCheck.distanceToBoundaryMeters)}m from boundary)`;
      }

      const data = await processCodeAttendance({
        sessionCode,
        rotatingCode: liveCode,
        deviceType,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        accuracyMeters: location?.accuracyMeters ?? null,
        location: locationText,
      });

      setResult(data);

      if (data.success) {
        await onMarked();
      }
    } catch (e) {
      setError(locationErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="manual-code-card">
      <div className="manual-code-copy">
        <div className="manual-code-icon">
          <QrCode size={22} />
        </div>
        <div>
          <h3>Can't scan the QR?</h3>
          <p>
            Enter the 4-digit attendance code and current 2-digit live number.
            {isMobile
              ? " On a phone/tablet, AgroFarm also requires GPS location and checks the farm boundary."
              : " On a laptop/desktop, location is not required."}
          </p>

          {farm && isMobile && (
            <div className="boundary-ready">
              <ShieldCheck size={15} />
              <span>
                Phone farm check: <b>{farm.farmName}</b>{" "}
                {parseFarmBoundary(farm.boundary).length >= 3
                  ? "• boundary ready"
                  : "• boundary missing"}
              </span>
            </div>
          )}

          {!isMobile && (
            <div className="boundary-ready">
              <ShieldCheck size={15} />
              <span>
                Laptop/Desktop mode • location check not required
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="manual-code-inputs">
        <label>
          <span>4-digit code</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="0000"
            maxLength={4}
            value={sessionCode}
            onChange={(e) => setSessionCode(normalizeDigits(e.target.value, 4))}
            disabled={busy}
          />
        </label>

        <label>
          <span>Live number</span>
          <input
            inputMode="numeric"
            placeholder="00"
            maxLength={2}
            value={liveCode}
            onChange={(e) => setLiveCode(normalizeDigits(e.target.value, 2))}
            disabled={busy}
          />
        </label>

        <button
          className="primary manual-mark-button"
          onClick={markWithCode}
          disabled={busy}
        >
          {isMobile ? <LocateFixed size={17} /> : <QrCode size={17} />}
          {busy
            ? isMobile
              ? "Checking phone location..."
              : "Marking attendance..."
            : "Mark Attendance"}
        </button>
      </div>

      {busy && isMobile && (
        <div className="manual-location-progress">
          <span>
            GPS readings: <b>{progress.sampleCount}</b>
          </span>
          <span>
            Accuracy: {progress.bestAccuracyMeters == null
              ? "waiting for coordinates..."
              : `±${Math.round(progress.bestAccuracyMeters)} m`}
          </span>
          <span>{progress.secondsRemaining}s max</span>
        </div>
      )}

      {capturedLocation && isMobile && (
        <div
          className={`farm-location-check ${
            insideFarm === true ? "inside" : insideFarm === false ? "outside" : ""
          }`}
        >
          <MapPin size={20} />
          <div>
            <strong>
              {insideFarm === true
                ? `Inside ${farm?.farmName ?? "farm"} boundary`
                : insideFarm === false
                  ? `Outside ${farm?.farmName ?? "farm"} boundary`
                  : "Phone location captured"}
            </strong>
            <span>
              {capturedLocation.latitude.toFixed(7)}, {" "}
              {capturedLocation.longitude.toFixed(7)} • ±
              {Math.round(capturedLocation.accuracyMeters)}m
            </span>
            <a
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps?q=${capturedLocation.latitude},${capturedLocation.longitude}`}
            >
              View current location on map
            </a>
          </div>
        </div>
      )}

      {result && (
        <div className={result.success ? "manual-result success" : "manual-result warning"}>
          <CheckCircle2 size={18} />
          <div>
            <strong>{result.message}</strong>
            <span>
              Check in: {time(result.checkInTime)} • Check out: {time(result.checkOutTime)}
            </span>
            {result.accuracyMeters != null && (
              <span>Location accuracy: ±{Math.round(result.accuracyMeters)} m</span>
            )}
          </div>
        </div>
      )}

      {error && <div className="error-box manual-code-error">{error}</div>}
    </section>
  );
}

/* =========================================================
   MAIN ROUTE WRAPPER
========================================================= */

export default function Attendance() {
  const [routeReady, setRouteReady] = useState(false);
  const [scanToken, setScanToken] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get(
      "attendanceToken"
    );
    setScanToken(token);
    setRouteReady(true);
  }, []);

  if (!routeReady) {
    return (
      <div className="route-loading">
        <RefreshCw className="spin" size={22} /> Loading attendance...
        <style>{styles}</style>
      </div>
    );
  }

  if (scanToken) {
    return <QrScanLanding token={scanToken} />;
  }

  return <AttendanceDashboard />;
}

/* =========================================================
   ATTENDANCE DASHBOARD
========================================================= */

function AttendanceDashboard() {
  const today = getActiveTimeZoneToday();
  const monthStart = `${today.slice(0, 8)}01`;

  const [role, setRole] = useState("");
  const [date, setDate] = useState(today);
  const [farmId, setFarmId] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [farms, setFarms] = useState<AttendanceFarm[]>([]);
  const [workers, setWorkers] = useState<AttendanceWorker[]>([]);
  const [items, setItems] = useState<AttendanceResponse[]>([]);
  const [dashboard, setDashboard] =
    useState<AttendanceDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [qrOpen, setQrOpen] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [qrFarm, setQrFarm] = useState("");
  const [qrManualCode, setQrManualCode] = useState("");
  const [qrLiveCode, setQrLiveCode] = useState("");
  const [qrLiveSecondsLeft, setQrLiveSecondsLeft] = useState(0);
  const [qrCreatedAt, setQrCreatedAt] = useState("");
  const [qrCreatedByName, setQrCreatedByName] = useState("");
  const [qrCreatedByRole, setQrCreatedByRole] = useState("");
  const [qrExpires, setQrExpires] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const qrLiveRefreshInFlight = useRef(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [reportUserId, setReportUserId] = useState<number | undefined>();
  const [reportRows, setReportRows] = useState<AttendanceResponse[]>([]);
  const [summary, setSummary] = useState<AttendanceReportSummary[]>([]);
  const [reportBusy, setReportBusy] = useState(false);

  useEffect(() => {
    const auth = getAuthData();
    setRole((auth?.role ?? "").toUpperCase());
  }, []);

  const canGenerateQr = role === "ADMIN" || role === "SUPERVISOR";
  const isFarmer = role === "FARMER";

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === farmId),
    [farms, farmId]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [d, list] = await Promise.all([
        getAttendanceDashboard(date, farmId),
        getAttendanceByDate(date, farmId, search),
      ]);

      setDashboard(d);
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [date, farmId, search]);

  useEffect(() => {
    getAttendanceFarms()
      .then((data) => {
        setFarms(data);

        // For a farmer with one allowed farm, select it automatically.
        if (isFarmer && data.length === 1) {
          setFarmId(data[0].id);
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load farms.")
      );
  }, [isFarmer]);

  useEffect(() => {
    getAttendanceWorkers(farmId, search)
      .then(setWorkers)
      .catch(() => setWorkers([]));
  }, [farmId, search]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: dashboard?.totalWorkers ?? items.length,
      present:
        dashboard?.presentToday ??
        items.filter((x) => x.status === "PRESENT").length,
      late:
        dashboard?.lateToday ??
        items.filter((x) => x.status === "LATE").length,
      absent:
        dashboard?.absentToday ??
        items.filter((x) => x.status === "ABSENT").length,
    }),
    [dashboard, items]
  );

  const generateQr = async () => {
    if (!canGenerateQr) {
      setError("Only ADMIN or SUPERVISOR users can generate attendance QR codes.");
      return;
    }

    if (!farmId) {
      setError("Select a farm first. The QR code is generated for one farm.");
      return;
    }

    try {
      setQrBusy(true);
      setError("");

      const qr = await generateAttendanceQr(farmId);
      const scanUrl = `${window.location.origin}/home/attendance?attendanceToken=${encodeURIComponent(
        qr.token
      )}`;

      const dataUrl = await QRCode.toDataURL(scanUrl, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      setQrImage(dataUrl);
      setQrToken(qr.token);
      setQrFarm(qr.farmName);
      setQrManualCode(qr.manualCode);
      setQrLiveCode(qr.rotatingCode);
      setQrLiveSecondsLeft(qr.rotatingCodeSecondsRemaining);
      setQrCreatedAt(qr.createdAt);
      setQrCreatedByName(qr.createdByName);
      setQrCreatedByRole(qr.createdByRole);
      setQrExpires(qr.expiresAt);
      setQrOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate QR.");
    } finally {
      setQrBusy(false);
    }
  };

  useEffect(() => {
    if (!qrOpen || !qrToken) return;

    let cancelled = false;

    const refreshLiveCode = async () => {
      if (qrLiveRefreshInFlight.current) return;
      qrLiveRefreshInFlight.current = true;

      try {
        const live = await getAttendanceQrLiveCode(qrToken);
        if (cancelled) return;
        setQrLiveCode(live.rotatingCode);
        setQrLiveSecondsLeft(live.secondsRemaining);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Unable to refresh live number."
          );
        }
      } finally {
        qrLiveRefreshInFlight.current = false;
      }
    };

    const timer = window.setInterval(() => {
      setQrLiveSecondsLeft((current) => {
        if (current <= 1) {
          void refreshLiveCode();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [qrOpen, qrToken]);

  const runReport = async () => {
    try {
      setReportBusy(true);
      setError("");

      if (!from || !to) {
        throw new Error("Select both From and To dates.");
      }

      if (from > to) {
        throw new Error("From date cannot be after To date.");
      }

      const [rows, sums] = await Promise.all([
        getAttendanceReport(from, to, farmId, reportUserId, search),
        getAttendanceReportSummary(from, to, farmId, reportUserId, search),
      ]);

      setReportRows(rows);
      setSummary(sums);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create report.");
    } finally {
      setReportBusy(false);
    }
  };

  const setMonth = (offset: number) => {
    const current = getActiveTimeZoneDateParts();
    const absoluteMonth = current.year * 12 + (current.month - 1) + offset;

    const year = Math.floor(absoluteMonth / 12);
    const zeroBasedMonth =
      ((absoluteMonth % 12) + 12) % 12;
    const month = zeroBasedMonth + 1;

    const daysInMonth = new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();

    setFrom(`${year}-${pad2(month)}-01`);
    setTo(`${year}-${pad2(month)}-${pad2(daysInMonth)}`);
  };

  const downloadReport = () => {
    if (!summary.length && !reportRows.length) return;

    const head = [
      "Worker ID",
      "Worker",
      "Farm",
      "Scheduled Days",
      "Present",
      "Late",
      "Absent",
      "Half Days",
      "Leave Days",
      "Worked Hours",
    ];

    const lines = summary.map((r) => [
      r.userId,
      r.userName,
      r.farmName,
      r.scheduledDays,
      r.presentDays,
      r.lateDays,
      r.absentDays,
      r.halfDays,
      r.leaveDays,
      r.workedHours,
    ]);

    const csv = [head, ...lines]
      .map((r) =>
        r
          .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    a.download = `attendance-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const farmLabel = farmId
    ? farms.find((farm) => farm.id === farmId)?.farmName ?? "Selected farm"
    : isFarmer
      ? "My farm"
      : "All farms";

  const otpProgress = Math.max(
    0,
    Math.min(1, qrLiveSecondsLeft / LIVE_CODE_ROTATION_SECONDS)
  );
  const otpRingOffset = 113.1 * (1 - otpProgress);

  return (
    <div className="attendance-page">
      <div className="attendance-container">
        <section className="attendance-hero">
          <div className="hero-decoration hero-decoration-one" />
          <div className="hero-decoration hero-decoration-two" />

          <div className="hero-copy">
            <div className="hero-icon">
              <Leaf size={27} />
            </div>

            <div>
              <h1>Attendance Management</h1>
              <p>
                {isFarmer
                  ? "View your attendance, precise location details and personal reports"
                  : "Track workers, precise location check-ins and payroll-ready reports"}
              </p>
            </div>
          </div>

          <div className="header-actions">
            {canGenerateQr && (
              <button
                className="action-btn action-btn-outline"
                onClick={generateQr}
                disabled={qrBusy}
              >
                <QrCode size={17} />
                {qrBusy ? "Generating..." : "Generate QR"}
              </button>
            )}

            <button
              className="action-btn action-btn-primary"
              onClick={() => {
                setReportOpen(true);
                setTimeout(runReport, 0);
              }}
            >
              <Download size={17} />
              Export Report
            </button>
          </div>
        </section>

        {error && (
          <div className="error-box">
            <strong>Attendance notice</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="filter-panel">
          <div className="filter-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isFarmer
                  ? "Search my attendance..."
                  : "Search worker name or email..."
              }
            />
          </div>

          <div className="filter-control">
            <MapPin size={17} />
            <select
              value={farmId ?? ""}
              onChange={(e) =>
                setFarmId(e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">{isFarmer ? "My farms" : "All farms"}</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.farmName}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-control filter-date">
            <CalendarDays size={17} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <button
            className="refresh-btn"
            onClick={load}
            disabled={loading}
            title="Refresh attendance"
          >
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </section>

        <section className="stats-grid">
          <Stat
            label={isFarmer ? "Attendance Records" : "Total Workers"}
            value={stats.total}
            icon={<UserRound />}
            kind="blue"
          />
          <Stat
            label="Present"
            value={stats.present}
            icon={<UserCheck />}
            kind="green"
          />
          <Stat
            label="Late"
            value={stats.late}
            icon={<Clock3 />}
            kind="orange"
          />
          <Stat
            label="Absent"
            value={stats.absent}
            icon={<UserX />}
            kind="red"
          />
        </section>

        {isFarmer && <ManualCodeAttendance onMarked={load} farm={selectedFarm} />}

        <section className="attendance-table-card">
          <div className="table-card-head">
            <div className="table-title-wrap">
              <div className="table-title-icon">
                <UserCheck size={18} />
              </div>
              <div>
                <h2>{isFarmer ? "My Attendance" : "Attendance"}</h2>
                <p>
                  {farmLabel}
                  <span>•</span>
                  {date}
                </p>
              </div>
            </div>

            <div className="record-count">
              {items.length} record{items.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Farm</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Check-in Location</th>
                  <th>Check-out Location</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      <div className="table-loading">
                        <RefreshCw className="spin" size={18} />
                        Loading attendance...
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      No attendance records found for this filter.
                    </td>
                  </tr>
                ) : (
                  items.map((a) => (
                    <tr key={`${a.userId}-${a.farmId}-${a.date}`}>
                      <td>
                        <div className="worker">
                          <span className="avatar">
                            {a.userName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <strong>{a.userName}</strong>
                            <small>{a.role}</small>
                          </div>
                        </div>
                      </td>

                      <td className="farm-cell">{a.farmName ?? "-"}</td>
                      <td className="time-cell">{time(a.checkInTime)}</td>
                      <td className="time-cell">{time(a.checkOutTime)}</td>

                      <td>
                        <span className={statusClass(a.status)}>
                          <i />
                          {prettyStatus(a.status)}
                        </span>
                      </td>

                      <td>
                        <LocationCell
                          latitude={a.latitude}
                          longitude={a.longitude}
                          accuracyMeters={a.accuracyMeters}
                          label="Check-in"
                        />
                      </td>

                      <td>
                        <LocationCell
                          latitude={a.checkOutLatitude ?? null}
                          longitude={a.checkOutLongitude ?? null}
                          accuracyMeters={a.checkOutAccuracyMeters ?? null}
                          label="Check-out"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="attendance-footer">
          <div>
            <Leaf size={15} />
            <span>Growing People</span>
            <b>•</b>
            <span>Stronger Farms</span>
            <b>•</b>
            <span>Brighter Tomorrows</span>
          </div>
          <span>Farm Management System</span>
        </footer>
      </div>

      {qrOpen && (
        <div className="modal-backdrop">
          <div className="modal qr-session-modal">
            <button
              className="close"
              onClick={() => setQrOpen(false)}
              aria-label="Close attendance session"
            >
              <X />
            </button>

            <div className="qr-modal-heading">
              <div className="qr-brand-icon">
                <Leaf size={25} />
              </div>
              <div>
                <h2>Attendance Session</h2>
                <p>Scan the QR code to check in or check out</p>
              </div>
            </div>

            <div className="qr-farm-pill">
              <MapPin size={15} />
              <span>{qrFarm || "Selected Farm"}</span>
            </div>

            <div className="qr-code-shell">
              <img src={qrImage} alt="Attendance QR code" />
            </div>

            <div className="qr-scan-caption">
              <QrCode size={19} />
              <strong>Scan this QR code to check in / check out</strong>
            </div>

            <p className="qr-helper">
              If a device cannot scan the QR, use the codes below.
            </p>

            <div className="session-code-grid">
              <div className="session-code-card attendance-code-card">
                <div className="session-code-title">
                  <span className="session-code-icon">
                    <QrCode size={18} />
                  </span>
                  <span>Attendance Code</span>
                </div>

                <div className="code-value-row">
                  <strong className="attendance-code-value">
                    {qrManualCode || "----"}
                  </strong>
                  <button
                    className="copy-code-btn"
                    onClick={() => {
                      if (qrManualCode) {
                        void navigator.clipboard?.writeText(qrManualCode);
                      }
                    }}
                    title="Copy attendance code"
                  >
                    <Copy size={15} />
                  </button>
                </div>

                <small>4-digit code valid for this session</small>
              </div>

              <div className="session-code-card otp-code-card">
                <div className="session-code-title">
                  <span className="session-code-icon otp-icon">
                    <Clock3 size={18} />
                  </span>
                  <span>OTP Code</span>
                </div>

                <div className="otp-content">
                  <div>
                    <div className="code-value-row">
                      <strong className="otp-code-value">
                        {qrLiveCode || "--"}
                      </strong>
                      <button
                        className="copy-code-btn"
                        onClick={() => {
                          if (qrLiveCode) {
                            void navigator.clipboard?.writeText(qrLiveCode);
                          }
                        }}
                        title="Copy OTP code"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                    <small>Changes every 45 seconds</small>
                  </div>

                  <div
                    className="otp-ring"
                    aria-label={`${qrLiveSecondsLeft} seconds remaining`}
                  >
                    <svg viewBox="0 0 44 44">
                      <circle className="otp-ring-track" cx="22" cy="22" r="18" />
                      <circle
                        className="otp-ring-progress"
                        cx="22"
                        cy="22"
                        r="18"
                        style={{ strokeDashoffset: otpRingOffset }}
                      />
                    </svg>
                    <b>{qrLiveSecondsLeft}s</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="manual-attendance-note">
              <ShieldCheck size={18} />
              <span>
                Manual attendance requires the 4-digit code + current 2-digit
                OTP code + verified worker location.
              </span>
            </div>

            <div className="qr-session-meta">
              <div>
                <span>Created by</span>
                <strong>
                  {qrCreatedByName || "-"}
                  {qrCreatedByRole ? ` (${qrCreatedByRole})` : ""}
                </strong>
              </div>

              <div>
                <span>Created</span>
                <strong>
                  {dateTimeInActiveTimeZone(qrCreatedAt)}
                </strong>
              </div>

              <div>
                <span>Session expires</span>
                <strong>
                  {dateTimeInActiveTimeZone(qrExpires)}
                </strong>
              </div>
            </div>

            <div className="qr-modal-actions">
              <span>
                Session is active for 1 hour. A new session replaces the old one.
              </span>

              <button
                className="mini-regenerate-btn"
                onClick={generateQr}
                disabled={qrBusy}
              >
                <RefreshCw size={15} className={qrBusy ? "spin" : ""} />
                {qrBusy ? "Generating..." : "New Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="modal-backdrop">
          <div className="modal report-modal">
            <button
              className="close"
              onClick={() => setReportOpen(false)}
              aria-label="Close report"
            >
              <X />
            </button>

            <div className="report-title">
              <div>
                <h2>Attendance Report</h2>
                <p>
                  Choose a date range, farm and worker. Export the summary for
                  payroll or salary calculations.
                </p>
              </div>

              <button
                className="action-btn action-btn-primary"
                onClick={downloadReport}
                disabled={!summary.length}
              >
                <Download size={16} />
                Download CSV
              </button>
            </div>

            <div className="report-presets">
              <button onClick={() => setMonth(0)}>This month</button>
              <button onClick={() => setMonth(-1)}>Previous month</button>
            </div>

            <div className="report-filters">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>

              <label>
                <span>To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>

              <label>
                <span>Worker</span>
                <select
                  value={reportUserId ?? ""}
                  onChange={(e) =>
                    setReportUserId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                >
                  <option value="">
                    {isFarmer ? "My records" : "All workers"}
                  </option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.userName}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="action-btn action-btn-primary report-run-btn"
                onClick={runReport}
                disabled={reportBusy}
              >
                {reportBusy ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    Loading...
                  </>
                ) : (
                  "Generate Report"
                )}
              </button>
            </div>

            <div className="table-wrap report-table">
              <table>
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Farm</th>
                    <th>Days</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Half Day</th>
                    <th>Leave</th>
                    <th>Worked Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.length ? (
                    summary.map((r) => (
                      <tr key={`${r.userId}-${r.farmId}`}>
                        <td>{r.userName}</td>
                        <td>{r.farmName}</td>
                        <td>{r.scheduledDays}</td>
                        <td>{r.presentDays}</td>
                        <td>{r.lateDays}</td>
                        <td>{r.absentDays}</td>
                        <td>{r.halfDays}</td>
                        <td>{r.leaveDays}</td>
                        <td>{r.workedHours.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="empty">
                        Choose filters and generate the report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

function LocationCell({
  latitude,
  longitude,
  accuracyMeters,
  label,
}: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  accuracyMeters: number | null | undefined;
  label: string;
}) {
  if (latitude == null || longitude == null) return <>-</>;

  return (
    <div className="location-cell">
      <a
        target="_blank"
        rel="noreferrer"
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
      >
        <MapPin size={15} /> View map
      </a>
      <small>
        {latitude.toFixed(7)}, {longitude.toFixed(7)}
      </small>
      {accuracyMeters != null && (
        <small
          className={
            accuracyMeters <= 50
              ? "accuracy-good"
              : accuracyMeters <= LOCATION_MAX_ATTENDANCE_ACCURACY_METERS
                ? "accuracy-ok"
                : "accuracy-poor"
          }
        >
          {label} accuracy ±{Math.round(accuracyMeters)}m
        </small>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  kind,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  kind: string;
}) {
  return (
    <div className={`stat-card stat-${kind}`}>
      <div className={`stat-icon ${kind}`}>{icon}</div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className={`stat-accent ${kind}`} />
    </div>
  );
}

const styles = `
*{box-sizing:border-box}
:root{--agro-950:#0b3b2f;--agro-900:#0f4a3a;--agro-800:#176044;--agro-700:#217452;--agro-600:#2f8b63;--agro-500:#39a66f;--ink:#153c31;--muted:#6f877f;--line:#dfeae5}
button,input,select{font:inherit}
button{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}
button:disabled{cursor:not-allowed;opacity:.56;transform:none!important;box-shadow:none!important}
button:not(:disabled):active{transform:translateY(1px)}
.attendance-page{min-height:100vh;padding:28px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:radial-gradient(circle at 90% 2%,rgba(177,232,204,.22),transparent 25%),linear-gradient(180deg,#f8fbfa 0%,#f4f8f6 100%)}
.attendance-container{max-width:1500px;margin:0 auto}
.attendance-hero{position:relative;overflow:hidden;min-height:146px;margin-bottom:18px;padding:30px 32px;display:flex;align-items:center;justify-content:space-between;gap:24px;border:1px solid #e2eee8;border-radius:22px;background:radial-gradient(circle at 88% 20%,rgba(129,207,163,.22),transparent 20%),linear-gradient(135deg,#fff 0%,#f8fcfa 44%,#edf8f2 100%);box-shadow:0 14px 35px rgba(27,86,62,.055)}
.hero-decoration{position:absolute;border-radius:999px;pointer-events:none}
.hero-decoration-one{width:340px;height:110px;right:-70px;bottom:-52px;background:rgba(116,202,153,.12);transform:rotate(-5deg)}
.hero-decoration-two{width:250px;height:80px;right:130px;bottom:-44px;background:rgba(166,224,190,.18);transform:rotate(6deg)}
.hero-copy{position:relative;z-index:1;display:flex;align-items:center;gap:18px}
.hero-icon{width:64px;height:64px;flex:none;border-radius:19px;display:grid;place-items:center;color:#157653;background:linear-gradient(145deg,#e5f8ed,#f4fbf7);border:1px solid #d8eee2;box-shadow:inset 0 1px 0 #fff,0 10px 24px rgba(23,103,73,.07)}
.hero-copy h1{margin:0;font-size:clamp(25px,2.2vw,35px);line-height:1.08;letter-spacing:-.035em;color:#0d3f33}
.hero-copy p{margin:8px 0 0;font-size:14px;color:#667f77}
.header-actions{position:relative;z-index:2;display:flex;align-items:center;gap:10px}
.action-btn,.primary,.outline,.soft,.report-presets button{min-height:44px;border-radius:12px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-weight:750;font-size:12px}
.action-btn:hover:not(:disabled),.primary:hover:not(:disabled),.outline:hover:not(:disabled),.soft:hover:not(:disabled),.report-presets button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 9px 22px rgba(25,92,66,.12)}
.action-btn-primary,.primary{color:#fff;border:1px solid #176b4d;background:linear-gradient(135deg,#277c59,#176246);box-shadow:0 7px 16px rgba(27,105,76,.16)}
.action-btn-outline,.outline{color:#145b43;border:1px solid #2a795b;background:rgba(255,255,255,.9)}
.soft,.report-presets button{color:#285f4e;border:1px solid #d8e8e0;background:#f8fbf9}
.error-box{margin-bottom:14px;padding:12px 14px;border:1px solid #ffd8dc;border-radius:12px;display:flex;align-items:flex-start;gap:7px;flex-direction:column;background:#fff4f5;color:#a92c36;font-size:12px}
.filter-panel{margin-bottom:18px;padding:13px;display:grid;grid-template-columns:minmax(320px,1fr) minmax(190px,240px) minmax(190px,230px) auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(37,88,69,.035)}
.filter-search,.filter-control{min-height:46px;display:flex;align-items:center;gap:10px;border:1px solid #d8e5df;border-radius:12px;padding:0 13px;background:#fff;color:#1b6c50;transition:border-color .16s ease,box-shadow .16s ease}
.filter-search:focus-within,.filter-control:focus-within{border-color:#7fbea1;box-shadow:0 0 0 4px rgba(73,159,113,.09)}
.filter-search input,.filter-control input,.filter-control select{width:100%;min-width:0;height:42px;border:0;outline:0;background:transparent;color:#24473c;font-size:13px}
.filter-search input::placeholder{color:#93a79f}
.filter-control select{appearance:auto;cursor:pointer}
.refresh-btn{min-height:46px;padding:0 15px;border:1px solid #d5e6de;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;color:#22634c;background:#f5fbf8;font-size:12px;font-weight:750}
.refresh-btn:hover:not(:disabled){border-color:#95c7ae;background:#eef8f2;box-shadow:0 7px 18px rgba(42,111,80,.08)}
.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}
.stat-card{position:relative;overflow:hidden;min-height:122px;padding:22px;display:flex;align-items:center;gap:16px;border:1px solid #e0e9e5;border-radius:18px;background:#fff;box-shadow:0 7px 22px rgba(36,83,66,.03);transition:transform .18s ease,box-shadow .18s ease}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(36,83,66,.08)}
.stat-blue{background:linear-gradient(135deg,#fff 0%,#f7fbff 100%);border-color:#dce9f6}.stat-green{background:linear-gradient(135deg,#fff 0%,#f4fcf7 100%);border-color:#d4ecdf}.stat-orange{background:linear-gradient(135deg,#fff 0%,#fffaf4 100%);border-color:#f2e5d7}.stat-red{background:linear-gradient(135deg,#fff 0%,#fff7f7 100%);border-color:#f2dddd}
.stat-icon{width:48px;height:48px;flex:none;border-radius:15px;display:grid;place-items:center}.stat-icon svg{width:23px;height:23px}.stat-icon.blue{background:#e9f3ff;color:#2878e0}.stat-icon.green{background:#e5f8ed;color:#17a660}.stat-icon.orange{background:#fff1de;color:#ef7a11}.stat-icon.red{background:#ffebee;color:#e84956}
.stat-copy span{display:block;color:#6f847d;font-size:12px;font-weight:650}.stat-copy strong{display:block;margin-top:5px;color:#0b3f33;font-size:34px;line-height:1;font-weight:800;letter-spacing:-.04em}
.stat-accent{position:absolute;width:86px;height:86px;border-radius:50%;right:-26px;bottom:-30px;opacity:.15}.stat-accent.blue{background:#4f9bec}.stat-accent.green{background:#45b978}.stat-accent.orange{background:#f7a74c}.stat-accent.red{background:#f1727b}
.manual-code-card{margin-bottom:18px;padding:18px;border:1px solid #dce9e3;border-radius:18px;display:grid;grid-template-columns:minmax(240px,1.2fr) minmax(360px,1fr);gap:18px;background:linear-gradient(135deg,#fff,#f5fbf8);box-shadow:0 8px 24px rgba(37,88,69,.04)}
.manual-code-copy{display:flex;gap:12px;align-items:flex-start}.manual-code-icon{width:42px;height:42px;flex:none;border-radius:13px;display:grid;place-items:center;background:#e8f7ef;color:#176b4d}.manual-code-copy h3{margin:0;font-size:15px;color:#133f33}.manual-code-copy p{margin:5px 0 0;color:#70857e;font-size:12px;line-height:1.55}
.manual-code-inputs{display:grid;grid-template-columns:1fr .75fr auto;gap:9px;align-items:end}.manual-code-inputs label{display:flex;flex-direction:column;gap:5px;color:#5f786f;font-size:10px;font-weight:700}.manual-code-inputs input{height:42px;border:1px solid #d9e7e0;border-radius:10px;padding:0 12px;outline:0;background:#fff;color:#163e33}.manual-mark-button{height:42px;white-space:nowrap}
.manual-location-progress{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:#58736a}.manual-result{grid-column:1/-1;padding:11px 12px;border-radius:12px;display:flex;gap:9px;align-items:flex-start}.manual-result.success{background:#eef9f3;border:1px solid #d1eadd;color:#245f49}.manual-result.warning{background:#fff8ea;border:1px solid #f3dfb9;color:#7c5c1e}.manual-result>div{display:flex;flex-direction:column;gap:3px}.manual-result strong{font-size:12px}.manual-result span{font-size:11px}.manual-code-error{grid-column:1/-1;margin:0}
.boundary-ready{margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#edf8f2;color:#276b52;font-size:10px;border:1px solid #d5ebe0}
.farm-location-check{grid-column:1/-1;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:13px;border:1px solid #d9e7e1;background:#f7fbf9;color:#47665b}.farm-location-check>div{display:flex;flex-direction:column;gap:3px}.farm-location-check strong{font-size:12px}.farm-location-check span,.farm-location-check a{font-size:11px}.farm-location-check a{color:#167a57;text-decoration:none;font-weight:700}.farm-location-check.inside{background:#eef9f3;border-color:#cce8d9;color:#236348}.farm-location-check.outside{background:#fff3f4;border-color:#ffd5d9;color:#a02f39}.farm-location-check.outside a{color:#a02f39}
.attendance-table-card{overflow:hidden;border:1px solid #dfe9e5;border-radius:20px;background:#fff;box-shadow:0 10px 28px rgba(31,80,60,.045)}
.table-card-head{min-height:86px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #e8efec;background:linear-gradient(180deg,#fff,#fbfdfc)}
.table-title-wrap{display:flex;align-items:center;gap:12px}.table-title-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#e5f7ee;color:#177653}.table-title-wrap h2{margin:0;color:#143f33;font-size:16px}.table-title-wrap p{margin:5px 0 0;display:flex;align-items:center;gap:7px;color:#71877f;font-size:12px}.record-count{font-size:12px;font-weight:800;color:#174f3d;background:#f0f8f4;border:1px solid #dbece3;border-radius:999px;padding:7px 11px}
.table-wrap{overflow:auto}.attendance-table,.report-table table{width:100%;border-collapse:collapse;min-width:1120px}.attendance-table thead th,.report-table th{text-align:left;padding:14px 16px;border-bottom:1px solid #dbe7e1;background:#f4f9f6;color:#577267;font-size:10px;font-weight:800;letter-spacing:.01em}.attendance-table tbody td,.report-table td{padding:14px 16px;border-bottom:1px solid #edf2ef;color:#2b4a40;font-size:12px;vertical-align:middle}.attendance-table tbody tr:last-child td,.report-table tr:last-child td{border-bottom:0}.attendance-table tbody tr{transition:background .15s ease}.attendance-table tbody tr:hover{background:#fbfefc}
.worker{display:flex;align-items:center;gap:11px;min-width:150px}.avatar{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#2e8a63,#176347);font-size:11px;font-weight:800;box-shadow:0 4px 10px rgba(24,101,72,.16)}.worker strong{display:block;color:#173f34;font-size:12px}.worker small{display:block;margin-top:2px;color:#82958e;font-size:9px;font-weight:650}.farm-cell{color:#44695d;font-weight:650}.time-cell{font-variant-numeric:tabular-nums;color:#3b5e53}
.status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:800}.status i{width:6px;height:6px;border-radius:50%;background:currentColor}.status-present{background:#e8f8ef;color:#0f9953}.status-late{background:#fff1e2;color:#e9770b}.status-absent{background:#ffedef;color:#df3f4c}.status-half-day{background:#fff8dc;color:#9a7800}.status-on-leave{background:#edf2ff;color:#4c67bd}
.location-cell{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:160px}.location-cell a{display:inline-flex;align-items:center;gap:5px;color:#176b4d;text-decoration:none;font-weight:800;font-size:11px}.location-cell a:hover{text-decoration:underline}.location-cell small{color:#8a9b95;font-size:9px}.location-cell .accuracy-good{color:#1a8b57;font-weight:700}.location-cell .accuracy-ok{color:#a56b0d;font-weight:700}.location-cell .accuracy-poor{color:#c93d49;font-weight:700}
.empty{text-align:center!important;padding:36px!important;color:#71867f!important}.table-loading{display:flex;align-items:center;justify-content:center;gap:8px}
.attendance-footer{margin:18px 2px 0;display:flex;justify-content:space-between;gap:12px;color:#91a49d;font-size:10px}.attendance-footer>div{display:flex;align-items:center;gap:8px}.attendance-footer svg{color:#68aa87}.attendance-footer b{font-weight:400}
.modal-backdrop{position:fixed;inset:0;z-index:9999;padding:18px;display:grid;place-items:center;overflow-y:auto;overscroll-behavior:contain;background:rgba(15,36,31,.54);backdrop-filter:blur(7px)}
.modal{position:relative;max-height:calc(100dvh - 36px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;border:1px solid rgba(255,255,255,.75);border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(6,31,23,.28)}
.close{position:absolute;right:18px;top:18px;z-index:5;width:38px;height:38px;border:0;border-radius:12px;display:grid;place-items:center;cursor:pointer;color:#244b3f;background:#f0f5f3}.close:hover{background:#e6efeb;transform:rotate(2deg)}.close svg{width:19px}
.qr-session-modal{width:min(760px,96vw);padding:26px 30px 22px;max-height:calc(100dvh - 36px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#bfd8cc transparent;background:radial-gradient(circle at 20% 33%,rgba(201,240,217,.26),transparent 22%),radial-gradient(circle at 82% 38%,rgba(201,240,217,.20),transparent 25%),#fff}.qr-session-modal::-webkit-scrollbar{width:7px}.qr-session-modal::-webkit-scrollbar-track{background:transparent}.qr-session-modal::-webkit-scrollbar-thumb{background:#bfd8cc;border-radius:999px}.qr-session-modal::-webkit-scrollbar-thumb:hover{background:#9fc5b3}
.qr-modal-heading{display:flex;justify-content:center;align-items:center;gap:13px;padding-right:35px;text-align:left}.qr-brand-icon{width:50px;height:50px;flex:none;border-radius:15px;display:grid;place-items:center;background:#e7f7ee;color:#187654;border:1px solid #daf0e4}.qr-modal-heading h2{margin:0;color:#0c4637;font-size:28px;letter-spacing:-.035em}.qr-modal-heading p{margin:4px 0 0;color:#73877f;font-size:12px}
.qr-farm-pill{width:max-content;margin:11px auto 14px;padding:7px 12px;display:flex;align-items:center;gap:6px;border-radius:999px;background:#edf8f3;border:1px solid #d9eee4;color:#3c6f5e;font-size:11px;font-weight:800;letter-spacing:.03em}
.qr-code-shell{width:278px;max-width:70vw;margin:0 auto;padding:12px;border-radius:18px;background:#fff;border:1px solid #e6eeea;box-shadow:0 12px 28px rgba(26,86,61,.08)}.qr-code-shell img{width:100%;display:block;border-radius:8px}
.qr-scan-caption{margin-top:13px;display:flex;justify-content:center;align-items:center;gap:7px;color:#145b43}.qr-scan-caption strong{font-size:12px}.qr-helper{text-align:center;margin:5px 0 14px;color:#84958f;font-size:10px}
.session-code-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.session-code-card{min-height:154px;padding:17px;border-radius:18px;border:1px solid #dcebe4;display:flex;flex-direction:column;justify-content:center;transition:transform .16s ease,box-shadow .16s ease}.session-code-card:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(35,93,70,.08)}.attendance-code-card{background:linear-gradient(135deg,#f3fbf6,#eaf8f1)}.otp-code-card{background:linear-gradient(135deg,#f7fbff,#edf6ff);border-color:#dce8f5}
.session-code-title{display:flex;align-items:center;gap:8px;color:#395f52;font-size:11px;font-weight:800}.session-code-icon{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:#dff4e9;color:#167751}.session-code-icon.otp-icon{background:#e6f2ff;color:#2f75bf}.code-value-row{display:flex;align-items:center;gap:8px;margin-top:7px}.attendance-code-value,.otp-code-value{font-size:39px;line-height:1;font-weight:850;letter-spacing:.08em;color:#0c6a49;font-variant-numeric:tabular-nums}.otp-code-value{color:#1d628f}
.copy-code-btn{width:30px;height:30px;border:1px solid rgba(40,104,79,.12);border-radius:9px;display:grid;place-items:center;cursor:pointer;background:rgba(255,255,255,.66);color:#4c7164}.copy-code-btn:hover{background:#fff;box-shadow:0 5px 12px rgba(26,79,60,.08)}.session-code-card small{margin-top:7px;color:#73877f;font-size:10px}
.otp-content{display:flex;align-items:center;justify-content:space-between;gap:12px}.otp-ring{position:relative;width:62px;height:62px;flex:none}.otp-ring svg{width:100%;height:100%;transform:rotate(-90deg)}.otp-ring circle{fill:none;stroke-width:4}.otp-ring-track{stroke:#dce5e1}.otp-ring-progress{stroke:#38a96e;stroke-linecap:round;stroke-dasharray:113.1;transition:stroke-dashoffset .8s linear}.otp-ring b{position:absolute;inset:0;display:grid;place-items:center;color:#245347;font-size:11px;font-variant-numeric:tabular-nums}
.manual-attendance-note{margin-top:12px;padding:11px 13px;display:flex;align-items:center;gap:9px;border:1px solid #e5ece9;border-radius:13px;background:#f8faf9;color:#71847e}.manual-attendance-note svg{flex:none;color:#2da56e}.manual-attendance-note span{font-size:10px;line-height:1.45}
.qr-session-meta{margin-top:16px;padding-top:15px;border-top:1px solid #e8eeeb;display:grid;grid-template-columns:1fr 1.35fr 1.35fr;gap:0}.qr-session-meta>div{min-width:0;padding:0 14px;border-right:1px solid #e9efec}.qr-session-meta>div:first-child{padding-left:0}.qr-session-meta>div:last-child{padding-right:0;border-right:0}.qr-session-meta span{display:block;color:#94a49f;font-size:9px}.qr-session-meta strong{display:block;margin-top:3px;color:#35564c;font-size:10px;line-height:1.35}
.qr-modal-actions{margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}.qr-modal-actions>span{color:#9aa8a4;font-size:9px;line-height:1.4}.mini-regenerate-btn{min-height:34px;padding:0 11px;flex:none;border:1px solid #d8e6df;border-radius:10px;display:flex;align-items:center;gap:6px;cursor:pointer;background:#f7fbf9;color:#2b6852;font-size:10px;font-weight:750}.mini-regenerate-btn:hover:not(:disabled){background:#edf7f1;border-color:#b8d7c8}
.report-modal{width:min(1120px,96vw);padding:25px}.report-title{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-right:44px}.report-title h2{margin:0;color:#133f33;font-size:21px}.report-title p{margin:5px 0 0;color:#72867f;font-size:11px;line-height:1.5}.report-presets{display:flex;gap:8px;margin:18px 0 10px}.report-presets button{min-height:36px;padding:0 12px}.report-filters{display:grid;grid-template-columns:1fr 1fr 1.2fr auto;gap:10px;align-items:end}.report-filters label{display:flex;flex-direction:column;gap:5px;color:#60786f;font-size:10px;font-weight:700}.report-filters input,.report-filters select{height:42px;border:1px solid #d9e6df;border-radius:10px;padding:0 10px;background:#fff;color:#234a3e;outline:0}.report-run-btn{height:42px}.report-table{margin-top:16px;border:1px solid #e1eae6;border-radius:14px;overflow:auto}
.scan-page{min-height:100vh;padding:22px;display:grid;place-items:center;background:linear-gradient(160deg,#eff8f3,#f8fbfa);color:#173c31;font-family:Inter,system-ui,sans-serif}.scan-card{width:min(540px,100%);padding:30px;border:1px solid #dce9e3;border-radius:22px;text-align:center;background:#fff;box-shadow:0 22px 55px rgba(20,70,53,.09)}.scan-icon{width:70px;height:70px;margin:0 auto 14px;border-radius:20px;display:grid;place-items:center;background:#e5f7ed;color:#237254}.scan-card h1{margin:0;color:#103f33;font-size:23px}.scan-card>p{color:#71867e;font-size:12px;line-height:1.6}.large{width:100%;min-height:48px;margin:15px 0}
.precision-note,.captured-location{display:flex;align-items:flex-start;gap:9px;text-align:left;padding:11px 12px;border-radius:11px;margin-top:13px}.precision-note{background:#f0f7ff;border:1px solid #d9eaff;color:#31566f}.captured-location{background:#edf9f2;border:1px solid #cfeada;color:#236047}.precision-note svg,.captured-location svg{flex:none;margin-top:1px}.precision-note div,.captured-location div{display:flex;flex-direction:column;gap:3px}.precision-note strong,.captured-location strong{font-size:12px}.precision-note span,.captured-location span{font-size:11px;line-height:1.45}
.location-progress-card{margin:16px 0;padding:14px;background:#f7faf9;border:1px solid #dce8e3;border-radius:12px;text-align:left}.progress-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.progress-top div{display:flex;flex-direction:column;gap:3px}.progress-top strong{font-size:12px}.progress-top span{font-size:11px;color:#72877f}.progress-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.progress-grid>div{background:#fff;border:1px solid #e4ece8;border-radius:8px;padding:9px}.progress-grid small{display:block;color:#7c9089;font-size:10px}.progress-grid b{display:block;margin-top:3px;font-size:13px;color:#245947}.progress-bar{height:6px;background:#e4ede9;border-radius:999px;overflow:hidden;margin-top:11px}.progress-bar span{display:block;height:100%;background:#2d795e;border-radius:999px;transition:width .25s ease}
.scan-success,.scan-warning{display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:12px;margin:16px 0;background:#edf9f2;border:1px solid #cfeada}.scan-warning{background:#fff8e8;border-color:#f0dfb5}.scan-success a,.scan-warning a{color:#1f6a51;display:inline-flex;justify-content:center;align-items:center;gap:5px}.scan-error{margin-top:12px}.location-help{margin-top:14px;padding:13px;text-align:left;background:#fafcfb;border:1px solid #e4ece8;border-radius:11px;color:#6e837b;display:flex;flex-direction:column;gap:5px;font-size:11px;line-height:1.45}.location-help strong{color:#355e51;margin-bottom:2px}
.route-loading{min-height:55vh;display:flex;align-items:center;justify-content:center;gap:9px;color:#456b5f;font-family:Inter,system-ui,sans-serif}.spin{animation:spin 1s linear infinite}.pulse{animation:pulse 1.4s ease-in-out infinite}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.45;transform:scale(.94)}50%{opacity:1;transform:scale(1.05)}}

@media(max-height:820px){.qr-session-modal{padding:18px 24px 16px}.qr-brand-icon{width:42px;height:42px;border-radius:13px}.qr-modal-heading h2{font-size:24px}.qr-modal-heading p{font-size:10px}.qr-farm-pill{margin:8px auto 10px;padding:6px 10px}.qr-code-shell{width:220px;padding:9px;border-radius:15px}.qr-scan-caption{margin-top:9px}.qr-helper{margin:3px 0 9px}.session-code-card{min-height:118px;padding:13px}.attendance-code-value,.otp-code-value{font-size:34px}.session-code-card small{margin-top:5px}.otp-ring{width:54px;height:54px}.manual-attendance-note{margin-top:9px;padding:9px 11px}.qr-session-meta{margin-top:10px;padding-top:10px}.qr-modal-actions{margin-top:10px}}
@media(max-height:680px){.modal-backdrop{place-items:start center;padding:8px}.qr-session-modal{max-height:calc(100dvh - 16px);padding:14px 18px 14px}.qr-modal-heading{gap:9px}.qr-brand-icon{width:36px;height:36px}.qr-modal-heading h2{font-size:21px}.qr-farm-pill{margin:6px auto 8px}.qr-code-shell{width:184px;padding:8px}.qr-scan-caption{margin-top:7px}.qr-scan-caption strong{font-size:10px}.qr-helper{font-size:9px;margin:2px 0 7px}.session-code-grid{gap:8px}.session-code-card{min-height:100px;padding:10px 12px;border-radius:14px}.session-code-icon{width:26px;height:26px}.session-code-title{font-size:10px}.code-value-row{margin-top:5px}.attendance-code-value,.otp-code-value{font-size:30px}.copy-code-btn{width:26px;height:26px}.session-code-card small{font-size:9px}.otp-ring{width:46px;height:46px}.manual-attendance-note{margin-top:7px;padding:8px 10px}.manual-attendance-note span{font-size:9px}.qr-session-meta{margin-top:8px;padding-top:8px}.qr-session-meta span{font-size:8px}.qr-session-meta strong{font-size:9px}.qr-modal-actions{margin-top:8px}}
@media(max-width:1050px){.filter-panel{grid-template-columns:1fr 1fr}.filter-search{grid-column:1/-1}.stats-grid{grid-template-columns:repeat(2,1fr)}.manual-code-card{grid-template-columns:1fr}.manual-code-inputs{grid-template-columns:1fr 1fr auto}}
@media(max-width:780px){.attendance-page{padding:16px}.attendance-hero{padding:22px;align-items:flex-start;flex-direction:column}.header-actions{width:100%}.header-actions .action-btn{flex:1}.report-filters{grid-template-columns:1fr 1fr}.report-run-btn{grid-column:1/-1}.qr-session-modal{padding:24px 18px 19px}.qr-modal-heading{justify-content:flex-start;padding-right:42px}.qr-modal-heading h2{font-size:23px}.session-code-grid{grid-template-columns:1fr}.qr-session-meta{grid-template-columns:1fr}.qr-session-meta>div{padding:8px 0;border-right:0;border-bottom:1px solid #edf1ef}.qr-session-meta>div:last-child{border-bottom:0}}
@media(max-width:560px){.attendance-page{padding:11px}.hero-copy{align-items:flex-start}.hero-icon{width:50px;height:50px;border-radius:15px}.hero-copy h1{font-size:23px}.hero-copy p{font-size:12px}.filter-panel{grid-template-columns:1fr}.filter-search{grid-column:auto}.refresh-btn{width:100%}.stats-grid{grid-template-columns:1fr 1fr;gap:9px}.stat-card{min-height:100px;padding:15px;gap:10px}.stat-icon{width:40px;height:40px}.stat-copy strong{font-size:27px}.manual-code-inputs{grid-template-columns:1fr}.manual-mark-button{width:100%}.table-card-head{align-items:flex-start}.record-count{white-space:nowrap}.attendance-footer{display:none}.modal-backdrop{padding:10px}.qr-session-modal{width:100%;max-height:96vh;border-radius:20px}.qr-brand-icon{width:42px;height:42px}.qr-code-shell{width:230px}.qr-modal-actions{flex-direction:column;align-items:stretch}.mini-regenerate-btn{justify-content:center}.report-modal{padding:20px 14px}.report-title{flex-direction:column;padding-right:40px}.report-title .action-btn{width:100%}.report-filters{grid-template-columns:1fr}.scan-card{padding:22px 17px}}
@media(max-width:780px) and (max-height:760px){.modal-backdrop{padding:8px;place-items:start center}.qr-session-modal{width:100%;max-height:calc(100dvh - 16px);padding:14px 16px 14px}.qr-modal-heading{justify-content:center;padding-right:36px;gap:8px}.qr-brand-icon{width:36px;height:36px}.qr-modal-heading h2{font-size:20px}.qr-modal-heading p{font-size:9px}.qr-farm-pill{margin:5px auto 7px;padding:5px 9px;font-size:9px}.qr-code-shell{width:180px;max-width:52vw;padding:7px;border-radius:13px}.qr-scan-caption{margin-top:6px}.qr-scan-caption strong{font-size:9px}.qr-scan-caption svg{width:15px;height:15px}.qr-helper{margin:2px 0 7px;font-size:8px}.session-code-grid{grid-template-columns:1fr 1fr;gap:7px}.session-code-card{min-height:92px;padding:9px 10px;border-radius:13px}.session-code-title{gap:6px;font-size:9px}.session-code-icon{width:24px;height:24px;border-radius:8px}.session-code-icon svg{width:14px;height:14px}.code-value-row{gap:6px;margin-top:4px}.attendance-code-value,.otp-code-value{font-size:28px}.copy-code-btn{width:24px;height:24px;border-radius:7px}.copy-code-btn svg{width:12px;height:12px}.session-code-card small{margin-top:4px;font-size:8px}.otp-content{gap:7px}.otp-ring{width:42px;height:42px}.otp-ring b{font-size:9px}.manual-attendance-note{margin-top:7px;padding:7px 9px;gap:6px}.manual-attendance-note svg{width:14px;height:14px}.manual-attendance-note span{font-size:8px;line-height:1.35}.qr-session-meta{margin-top:7px;padding-top:7px;grid-template-columns:1fr 1.35fr 1.35fr}.qr-session-meta>div{padding:0 8px;border-right:1px solid #e9efec;border-bottom:0}.qr-session-meta span{font-size:7px}.qr-session-meta strong{margin-top:2px;font-size:8px;line-height:1.25}.qr-modal-actions{margin-top:7px;flex-direction:row;align-items:center}.qr-modal-actions>span{font-size:7px}.mini-regenerate-btn{min-height:28px;padding:0 8px;font-size:8px}.close{top:9px;right:9px;width:31px;height:31px}.close svg{width:17px;height:17px}}

`;

