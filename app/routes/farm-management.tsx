import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { LatLngExpression } from "leaflet";

/* =========================================================
   TYPES
========================================================= */

interface MapPoint {
  latitude: number;
  longitude: number;
}

interface Farm {
  id: number;
  ownerId: number;
  farmName: string;
  farmAddress: string;
  latitude: number;
  longtitude: number;
  boundary: string;
}

type SizeUnit =
  | "ACRE"
  | "HECTARE"
  | "SQ_METER";

interface Field {
  id: number;
  farmId: number;
  fieldName: string;
  fieldSize: number;
  sizeUnit: SizeUnit;
  latitude: number;
  longtitude: number;
  boundary: string;
}

interface FarmForm {
  farmName: string;
  farmAddress: string;
}

interface FieldForm {
  farmId: string;
  fieldName: string;
  fieldSize: string;
  sizeUnit: SizeUnit;
}

/* =========================================================
   API
========================================================= */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FARM_API = `${API_BASE_URL}/api/v1/farms`;

const FIELD_API = `${API_BASE_URL}/api/v1/fields`;

/* =========================================================
   DEFAULT MAP
========================================================= */

const DEFAULT_CENTER: LatLngExpression = [
  7.8731,
  80.7718,
];

const DEFAULT_ZOOM = 8;

/* =========================================================
   LEAFLET ICON
========================================================= */

const markerIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* =========================================================
   AUTH
========================================================= */

function getAuthHeaders(): HeadersInit {
  const tokenData =
    localStorage.getItem("token_data");

  if (!tokenData) {
    return {
      "Content-Type": "application/json",
    };
  }

  try {
    const parsed = JSON.parse(tokenData);

    const token =
      parsed?.accessToken ||
      parsed?.access_token ||
      parsed?.token ||
      parsed?.jwt;

    if (token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
    }
  } catch {
    console.warn("Invalid token_data");
  }

  return {
    "Content-Type": "application/json",
  };
}

/* =========================================================
   BOUNDARY HELPERS
========================================================= */

function pointsToBoundary(
  points: MapPoint[]
): string {
  return JSON.stringify(
    points.map((point) => [
      point.latitude,
      point.longitude,
    ])
  );
}

function boundaryToPoints(
  boundary?: string | null
): MapPoint[] {
  if (!boundary) {
    return [];
  }

  try {
    const parsed = JSON.parse(boundary);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          Array.isArray(item) &&
          item.length >= 2 &&
          Number.isFinite(Number(item[0])) &&
          Number.isFinite(Number(item[1]))
      )
      .map((item) => ({
        latitude: Number(item[0]),
        longitude: Number(item[1]),
      }));
  } catch {
    console.warn(
      "Invalid boundary:",
      boundary
    );

    return [];
  }
}

function toLatLng(
  point: MapPoint
): [number, number] {
  return [
    point.latitude,
    point.longitude,
  ];
}

/* =========================================================
   CENTER
========================================================= */

function calculateCenter(
  points: MapPoint[]
): MapPoint {
  if (points.length === 0) {
    return {
      latitude: 0,
      longitude: 0,
    };
  }

  const latitude =
    points.reduce(
      (sum, point) =>
        sum + point.latitude,
      0
    ) / points.length;

  const longitude =
    points.reduce(
      (sum, point) =>
        sum + point.longitude,
      0
    ) / points.length;

  return {
    latitude,
    longitude,
  };
}

/* =========================================================
   MAP CLICK HANDLER
========================================================= */

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (
    point: MapPoint
  ) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

/* =========================================================
   MAP CENTER CONTROLLER
========================================================= */

function MapCenterController({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
    map.invalidateSize();
  }, [map, center, zoom]);

  return null;
}

/* =========================================================
   FIT BOUNDS
========================================================= */

function MapBoundsController({
  points,
}: {
  points: MapPoint[];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) {
      return;
    }

    const bounds =
      L.latLngBounds(
        points.map((point) => [
          point.latitude,
          point.longitude,
        ])
      );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 18,
    });
  }, [map, points]);

  return null;
}

/* =========================================================
   POINT ON SEGMENT
========================================================= */

function pointOnSegment(
  point: MapPoint,
  a: MapPoint,
  b: MapPoint
): boolean {
  const cross =
    (point.longitude - a.longitude) *
      (b.latitude - a.latitude) -
    (point.latitude - a.latitude) *
      (b.longitude - a.longitude);

  if (Math.abs(cross) > 0.00000001) {
    return false;
  }

  return (
    point.longitude >=
      Math.min(
        a.longitude,
        b.longitude
      ) &&
    point.longitude <=
      Math.max(
        a.longitude,
        b.longitude
      ) &&
    point.latitude >=
      Math.min(
        a.latitude,
        b.latitude
      ) &&
    point.latitude <=
      Math.max(
        a.latitude,
        b.latitude
      )
  );
}

/* =========================================================
   POINT INSIDE POLYGON
========================================================= */

function isPointInsidePolygon(
  point: MapPoint,
  polygon: MapPoint[]
): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (
    let i = 0,
      j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi =
      polygon[i].longitude;

    const yi =
      polygon[i].latitude;

    const xj =
      polygon[j].longitude;

    const yj =
      polygon[j].latitude;

    const intersect =
      yi > point.latitude !==
        yj > point.latitude &&
      point.longitude <
        ((xj - xi) *
          (point.latitude - yi)) /
          (yj - yi) +
          xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/* =========================================================
   POINT INSIDE OR ON POLYGON
========================================================= */

function isPointInsideOrOnPolygon(
  point: MapPoint,
  polygon: MapPoint[]
): boolean {
  if (polygon.length < 3) {
    return false;
  }

  for (
    let i = 0;
    i < polygon.length;
    i++
  ) {
    const a = polygon[i];

    const b =
      polygon[
        (i + 1) % polygon.length
      ];

    if (
      pointOnSegment(
        point,
        a,
        b
      )
    ) {
      return true;
    }
  }

  return isPointInsidePolygon(
    point,
    polygon
  );
}

/* =========================================================
   ORIENTATION
========================================================= */

function orientation(
  a: MapPoint,
  b: MapPoint,
  c: MapPoint
): number {
  const value =
    (b.longitude -
      a.longitude) *
      (c.latitude -
        a.latitude) -
    (b.latitude -
      a.latitude) *
      (c.longitude -
        a.longitude);

  if (
    Math.abs(value) <
    0.0000000001
  ) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

/* =========================================================
   SEGMENTS INTERSECT
========================================================= */

function segmentsIntersect(
  p1: MapPoint,
  q1: MapPoint,
  p2: MapPoint,
  q2: MapPoint
): boolean {
  const o1 =
    orientation(
      p1,
      q1,
      p2
    );

  const o2 =
    orientation(
      p1,
      q1,
      q2
    );

  const o3 =
    orientation(
      p2,
      q2,
      p1
    );

  const o4 =
    orientation(
      p2,
      q2,
      q1
    );

  if (
    o1 !== o2 &&
    o3 !== o4
  ) {
    return true;
  }

  if (
    o1 === 0 &&
    pointOnSegment(
      p2,
      p1,
      q1
    )
  ) {
    return true;
  }

  if (
    o2 === 0 &&
    pointOnSegment(
      q2,
      p1,
      q1
    )
  ) {
    return true;
  }

  if (
    o3 === 0 &&
    pointOnSegment(
      p1,
      p2,
      q2
    )
  ) {
    return true;
  }

  if (
    o4 === 0 &&
    pointOnSegment(
      q1,
      p2,
      q2
    )
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   POLYGON INSIDE POLYGON
========================================================= */

function isPolygonInsidePolygon(
  inner: MapPoint[],
  outer: MapPoint[]
): boolean {
  if (
    inner.length < 3 ||
    outer.length < 3
  ) {
    return false;
  }

  for (const point of inner) {
    if (
      !isPointInsideOrOnPolygon(
        point,
        outer
      )
    ) {
      return false;
    }
  }

  for (
    let i = 0;
    i < inner.length;
    i++
  ) {
    const innerA =
      inner[i];

    const innerB =
      inner[
        (i + 1) % inner.length
      ];

    for (
      let j = 0;
      j < outer.length;
      j++
    ) {
      const outerA =
        outer[j];

      const outerB =
        outer[
          (j + 1) % outer.length
        ];

      if (
        segmentsIntersect(
          innerA,
          innerB,
          outerA,
          outerB
        )
      ) {
        const mid: MapPoint = {
          latitude:
            (innerA.latitude +
              innerB.latitude) /
            2,

          longitude:
            (innerA.longitude +
              innerB.longitude) /
            2,
        };

        if (
          !isPointInsideOrOnPolygon(
            mid,
            outer
          )
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function FarmManagement() {
  /* =======================================================
     DATA
  ======================================================= */

  const [farms, setFarms] =
    useState<Farm[]>([]);

  const [fields, setFields] =
    useState<Field[]>([]);

  /* =======================================================
     UI
  ======================================================= */

  const [activeTab, setActiveTab] =
    useState<
      "farms" | "fields"
    >("farms");

  const [search, setSearch] =
    useState("");

  const [selectedFarmId, setSelectedFarmId] =
    useState<number | null>(null);

  const [loadingFarms, setLoadingFarms] =
    useState(false);

  const [loadingFields, setLoadingFields] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     FARM MODAL
  ======================================================= */

  const [showFarmModal, setShowFarmModal] =
    useState(false);

  const [editingFarmId, setEditingFarmId] =
    useState<number | null>(null);

  const [farmForm, setFarmForm] =
    useState<FarmForm>({
      farmName: "",
      farmAddress: "",
    });

  const [farmPoints, setFarmPoints] =
    useState<MapPoint[]>([]);

  const [farmMapCenter, setFarmMapCenter] =
    useState<LatLngExpression>(
      DEFAULT_CENTER
    );

  const [farmMapMessage, setFarmMapMessage] =
    useState("");

  const [savingFarm, setSavingFarm] =
    useState(false);

  /* =======================================================
     FIELD MODAL
  ======================================================= */

  const [showFieldModal, setShowFieldModal] =
    useState(false);

  const [editingFieldId, setEditingFieldId] =
    useState<number | null>(null);

  const [fieldForm, setFieldForm] =
    useState<FieldForm>({
      farmId: "",
      fieldName: "",
      fieldSize: "",
      sizeUnit: "ACRE",
    });

  const [fieldPoints, setFieldPoints] =
    useState<MapPoint[]>([]);

  const [fieldMapCenter, setFieldMapCenter] =
    useState<LatLngExpression>(
      DEFAULT_CENTER
    );

  const [fieldMapMessage, setFieldMapMessage] =
    useState("");

  const [savingField, setSavingField] =
    useState(false);

  /* =======================================================
     SAVED MAP VIEW
  ======================================================= */

  const [showSavedMap, setShowSavedMap] =
    useState(false);

  const [savedMapTitle, setSavedMapTitle] =
    useState("");

  const [savedMapType, setSavedMapType] =
    useState<"farm" | "field">("farm");

  const [savedMapPoints, setSavedMapPoints] =
    useState<MapPoint[]>([]);

  const [savedMapCenter, setSavedMapCenter] =
    useState<LatLngExpression>(
      DEFAULT_CENTER
    );

  /* =======================================================
     LOAD FARMS
  ======================================================= */

  const loadFarms = async () => {
    try {
      setLoadingFarms(true);
      setError("");

      const response =
        await fetch(FARM_API, {
          method: "GET",
          headers:
            getAuthHeaders(),
        });

      if (!response.ok) {
        throw new Error(
          `Failed to load farms (${response.status})`
        );
      }

      const data: Farm[] =
        await response.json();

      setFarms(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load farms"
      );
    } finally {
      setLoadingFarms(false);
    }
  };

  /* =======================================================
     LOAD FIELDS
  ======================================================= */

  const loadFields = async () => {
    try {
      setLoadingFields(true);
      setError("");

      const response =
        await fetch(FIELD_API, {
          method: "GET",
          headers:
            getAuthHeaders(),
        });

      if (!response.ok) {
        throw new Error(
          `Failed to load fields (${response.status})`
        );
      }

      const data: Field[] =
        await response.json();

      setFields(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load fields"
      );
    } finally {
      setLoadingFields(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadFarms();
    loadFields();
  }, []);

  /* =======================================================
     FILTER FARMS
  ======================================================= */

  const filteredFarms =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return farms;
      }

      return farms.filter(
        (farm) =>
          farm.farmName
            .toLowerCase()
            .includes(value) ||
          farm.farmAddress
            .toLowerCase()
            .includes(value)
      );
    }, [
      farms,
      search,
    ]);

  /* =======================================================
     FILTER FIELDS
  ======================================================= */

  const filteredFields =
    useMemo(() => {
      let result = fields;

      if (
        selectedFarmId !== null
      ) {
        result =
          result.filter(
            (field) =>
              field.farmId ===
              selectedFarmId
          );
      }

      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return result;
      }

      return result.filter(
        (field) =>
          field.fieldName
            .toLowerCase()
            .includes(value)
      );
    }, [
      fields,
      search,
      selectedFarmId,
    ]);

  /* =======================================================
     FARM NAME
  ======================================================= */

  const getFarmName = (
    farmId: number
  ) => {
    return (
      farms.find(
        (farm) =>
          farm.id === farmId
      )?.farmName ??
      `Farm #${farmId}`
    );
  };

  /* =======================================================
     FARM POINTS
  ======================================================= */

  const getFarmPoints = (
    farmId: number
  ) => {
    const farm =
      farms.find(
        (item) =>
          item.id === farmId
      );

    return boundaryToPoints(
      farm?.boundary
    );
  };

  /* =======================================================
     OPEN CREATE FARM
  ======================================================= */

  const openCreateFarm = () => {
    setEditingFarmId(null);

    setFarmForm({
      farmName: "",
      farmAddress: "",
    });

    setFarmPoints([]);

    setFarmMapCenter(
      DEFAULT_CENTER
    );

    setFarmMapMessage(
      "Click the map to select the real farm boundary. Minimum 3 points."
    );

    setShowFarmModal(true);
  };

  /* =======================================================
     OPEN EDIT FARM
  ======================================================= */

  const openEditFarm = (
    farm: Farm
  ) => {
    setEditingFarmId(
      farm.id
    );

    setFarmForm({
      farmName:
        farm.farmName,

      farmAddress:
        farm.farmAddress,
    });

    const points =
      boundaryToPoints(
        farm.boundary
      );

    setFarmPoints(points);

    if (points.length >= 3) {
      const center =
        calculateCenter(
          points
        );

      setFarmMapCenter([
        center.latitude,
        center.longitude,
      ]);
    } else if (
      farm.latitude !== 0 &&
      farm.longtitude !== 0
    ) {
      setFarmMapCenter([
        farm.latitude,
        farm.longtitude,
      ]);
    } else {
      setFarmMapCenter(
        DEFAULT_CENTER
      );
    }

    setFarmMapMessage(
      points.length >= 3
        ? "Existing farm boundary loaded. Remove Last Point or Clear All Points to redraw."
        : "Select the farm boundary on the map. Minimum 3 points."
    );

    setShowFarmModal(true);
  };

  /* =======================================================
     FARM MAP CLICK
  ======================================================= */

  const handleFarmMapClick = (
    point: MapPoint
  ) => {
    setFarmPoints(
      (previous) => {
        const updated = [
          ...previous,
          point,
        ];

        setFarmMapMessage(
          `Point ${
            updated.length
          } added. ${
            updated.length >= 3
              ? "Boundary is ready. You can create the farm."
              : `Add ${
                  3 - updated.length
                } more point${
                  3 -
                    updated.length ===
                  1
                    ? ""
                    : "s"
                }.`
          }`
        );

        return updated;
      }
    );
  };

  /* =======================================================
     REMOVE LAST FARM POINT
  ======================================================= */

  const removeLastFarmPoint =
    () => {
      setFarmPoints(
        (previous) => {
          if (
            previous.length ===
            0
          ) {
            return previous;
          }

          const updated =
            previous.slice(
              0,
              -1
            );

          setFarmMapMessage(
            updated.length ===
              0
              ? "All farm points removed. Click the map to add points."
              : `Last point removed. ${
                  updated.length
                } point${
                  updated.length ===
                  1
                    ? ""
                    : "s"
                } remaining.`
          );

          return updated;
        }
      );
    };

  /* =======================================================
     CLEAR FARM POINTS
  ======================================================= */

  const clearFarmPoints = () => {
    setFarmPoints([]);

    setFarmMapMessage(
      "Farm boundary cleared. Click the map to draw a new boundary."
    );
  };

  /* =======================================================
     FARM SUBMIT
  ======================================================= */

  const handleFarmSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (
      !farmForm.farmName.trim() ||
      !farmForm.farmAddress.trim()
    ) {
      alert(
        "Please fill all farm details."
      );
      return;
    }

    if (farmPoints.length < 3) {
      alert(
        "Please select at least 3 points on the map to create the farm boundary."
      );
      return;
    }

    const center =
      calculateCenter(
        farmPoints
      );

    const payload = {
      farmName:
        farmForm.farmName.trim(),

      farmAddress:
        farmForm.farmAddress.trim(),

      latitude:
        center.latitude,

      longtitude:
        center.longitude,

      boundary:
        pointsToBoundary(
          farmPoints
        ),
    };

    const isCreating =
      editingFarmId === null;

    try {
      setSavingFarm(true);
      setError("");

      const url =
        isCreating
          ? FARM_API
          : `${FARM_API}/${editingFarmId}`;

      const method =
        isCreating
          ? "POST"
          : "PUT";

      const response =
        await fetch(url, {
          method,
          headers:
            getAuthHeaders(),
          body: JSON.stringify(
            payload
          ),
        });

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(
          message ||
            `Failed to ${
              isCreating
                ? "create"
                : "update"
            } farm`
        );
      }

      await response.json();

      setShowFarmModal(false);

      setFarmPoints([]);

      setEditingFarmId(null);

      setFarmForm({
        farmName: "",
        farmAddress: "",
      });

      await loadFarms();

      alert(
        isCreating
          ? "Farm created successfully."
          : "Farm updated successfully."
      );
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to save farm"
      );
    } finally {
      setSavingFarm(false);
    }
  };

  /* =======================================================
     DELETE FARM
  ======================================================= */

  const handleDeleteFarm =
    async (
      farm: Farm
    ) => {
      const hasFields =
        fields.some(
          (field) =>
            field.farmId ===
            farm.id
        );

      if (hasFields) {
        alert(
          "This farm has fields. Please delete its fields first."
        );
        return;
      }

      if (
        !window.confirm(
          `Are you sure you want to delete "${farm.farmName}"?`
        )
      ) {
        return;
      }

      try {
        const response =
          await fetch(
            `${FARM_API}/${farm.id}`,
            {
              method: "DELETE",
              headers:
                getAuthHeaders(),
            }
          );

        if (!response.ok) {
          const message =
            await response.text();

          throw new Error(
            message ||
              "Failed to delete farm"
          );
        }

        await loadFarms();

        if (
          selectedFarmId ===
          farm.id
        ) {
          setSelectedFarmId(
            null
          );
        }
      } catch (err) {
        console.error(err);

        alert(
          err instanceof Error
            ? err.message
            : "Failed to delete farm"
        );
      }
    };

  /* =======================================================
     SELECT FARM
  ======================================================= */

  const handleSelectFarm = (
    farmId: number
  ) => {
    setSelectedFarmId(
      farmId
    );

    setActiveTab(
      "fields"
    );

    setSearch("");
  };

  /* =======================================================
     OPEN CREATE FIELD
  ======================================================= */

  const openCreateField = (
    farmId?: number
  ) => {
    const id =
      farmId ??
      selectedFarmId;

    if (id === null || id === undefined) {
      alert(
        "Please select a farm first."
      );
      return;
    }

    const farm =
      farms.find(
        (item) =>
          item.id === id
      );

    if (!farm) {
      alert(
        "Farm not found."
      );
      return;
    }

    const farmBoundary =
      boundaryToPoints(
        farm.boundary
      );

    if (
      farmBoundary.length < 3
    ) {
      alert(
        "This farm does not have a valid boundary. Please select the farm boundary first."
      );
      return;
    }

    const center =
      calculateCenter(
        farmBoundary
      );

    setEditingFieldId(null);

    setFieldForm({
      farmId:
        String(id),

      fieldName: "",

      fieldSize: "",

      sizeUnit: "ACRE",
    });

    setFieldPoints([]);

    setFieldMapCenter([
      center.latitude,
      center.longitude,
    ]);

    setFieldMapMessage(
      "Click only inside the green farm boundary. Minimum 3 points."
    );

    setShowFieldModal(true);
  };

  /* =======================================================
     OPEN EDIT FIELD
  ======================================================= */

  const openEditField = (
    field: Field
  ) => {
    const fieldBoundary =
      boundaryToPoints(
        field.boundary
      );

    const farmPoints =
      getFarmPoints(
        field.farmId
      );

    setEditingFieldId(
      field.id
    );

    setFieldForm({
      farmId:
        String(
          field.farmId
        ),

      fieldName:
        field.fieldName,

      fieldSize:
        String(
          field.fieldSize
        ),

      sizeUnit:
        field.sizeUnit,
    });

    setFieldPoints(
      fieldBoundary
    );

    if (
      fieldBoundary.length >=
      3
    ) {
      const center =
        calculateCenter(
          fieldBoundary
        );

      setFieldMapCenter([
        center.latitude,
        center.longitude,
      ]);
    } else if (
      field.latitude !== 0 &&
      field.longtitude !== 0
    ) {
      setFieldMapCenter([
        field.latitude,
        field.longtitude,
      ]);
    } else if (
      farmPoints.length >= 3
    ) {
      const center =
        calculateCenter(
          farmPoints
        );

      setFieldMapCenter([
        center.latitude,
        center.longitude,
      ]);
    }

    setFieldMapMessage(
      fieldBoundary.length >=
        3
        ? "Existing field boundary loaded. Remove Last Point or Clear All Points to redraw."
        : "Select the field boundary inside the green farm boundary."
    );

    setShowFieldModal(true);
  };

  /* =======================================================
     FIELD MAP CLICK
  ======================================================= */

  const handleFieldMapClick = (
    point: MapPoint
  ) => {
    const farmId =
      Number(
        fieldForm.farmId
      );

    const farmPoints =
      getFarmPoints(
        farmId
      );

    if (
      farmPoints.length < 3
    ) {
      setFieldMapMessage(
        "❌ Farm boundary is not available."
      );
      return;
    }

    if (
      !isPointInsideOrOnPolygon(
        point,
        farmPoints
      )
    ) {
      setFieldMapMessage(
        "❌ You cannot select this point. It is outside the farm boundary."
      );
      return;
    }

    setFieldPoints(
      (previous) => {
        const updated = [
          ...previous,
          point,
        ];

        setFieldMapMessage(
          `Point ${
            updated.length
          } added inside the farm. ${
            updated.length >= 3
              ? "Field boundary is ready. You can create the field."
              : `Add ${
                  3 - updated.length
                } more point${
                  3 -
                    updated.length ===
                  1
                    ? ""
                    : "s"
                }.`
          }`
        );

        return updated;
      }
    );
  };

  /* =======================================================
     REMOVE LAST FIELD POINT
  ======================================================= */

  const removeLastFieldPoint =
    () => {
      setFieldPoints(
        (previous) => {
          if (
            previous.length ===
            0
          ) {
            return previous;
          }

          const updated =
            previous.slice(
              0,
              -1
            );

          setFieldMapMessage(
            updated.length ===
              0
              ? "All field points removed. Click inside the green farm boundary to add points."
              : `Last point removed. ${
                  updated.length
                } point${
                  updated.length ===
                  1
                    ? ""
                    : "s"
                } remaining.`
          );

          return updated;
        }
      );
    };

  /* =======================================================
     CLEAR FIELD POINTS
  ======================================================= */

  const clearFieldPoints = () => {
    setFieldPoints([]);

    setFieldMapMessage(
      "Field boundary cleared. Click inside the green farm area to draw a new field."
    );
  };

  /* =======================================================
     FIELD SUBMIT
  ======================================================= */

  const handleFieldSubmit =
    async (
      e: FormEvent
    ) => {
      e.preventDefault();

      if (
        !fieldForm.farmId ||
        !fieldForm.fieldName.trim() ||
        !fieldForm.fieldSize
      ) {
        alert(
          "Please fill all field details."
        );
        return;
      }

      if (
        fieldPoints.length < 3
      ) {
        alert(
          "Please select at least 3 field boundary points."
        );
        return;
      }

      const farmId =
        Number(
          fieldForm.farmId
        );

      const farmPoints =
        getFarmPoints(
          farmId
        );

      if (
        farmPoints.length < 3
      ) {
        alert(
          "Farm boundary is invalid."
        );
        return;
      }

      if (
        !isPolygonInsidePolygon(
          fieldPoints,
          farmPoints
        )
      ) {
        setFieldMapMessage(
          "❌ Field boundary must be completely inside the farm boundary."
        );

        alert(
          "The complete field boundary must stay inside the farm boundary."
        );

        return;
      }

      const center =
        calculateCenter(
          fieldPoints
        );

      const payload = {
        farmId,

        fieldName:
          fieldForm.fieldName.trim(),

        fieldSize:
          Number(
            fieldForm.fieldSize
          ),

        sizeUnit:
          fieldForm.sizeUnit,

        latitude:
          center.latitude,

        longtitude:
          center.longitude,

        boundary:
          pointsToBoundary(
            fieldPoints
          ),
      };

      const isCreating =
        editingFieldId === null;

      try {
        setSavingField(true);
        setError("");

        const url =
          isCreating
            ? FIELD_API
            : `${FIELD_API}/${editingFieldId}`;

        const method =
          isCreating
            ? "POST"
            : "PUT";

        const response =
          await fetch(url, {
            method,
            headers:
              getAuthHeaders(),
            body: JSON.stringify(
              payload
            ),
          });

        if (!response.ok) {
          const message =
            await response.text();

          throw new Error(
            message ||
              `Failed to ${
                isCreating
                  ? "create"
                  : "update"
              } field`
          );
        }

        await response.json();

        setShowFieldModal(false);

        setEditingFieldId(null);

        setFieldPoints([]);

        setFieldForm({
          farmId: "",
          fieldName: "",
          fieldSize: "",
          sizeUnit: "ACRE",
        });

        await loadFields();

        alert(
          isCreating
            ? "Field created successfully."
            : "Field updated successfully."
        );
      } catch (err) {
        console.error(err);

        alert(
          err instanceof Error
            ? err.message
            : "Failed to save field"
        );
      } finally {
        setSavingField(false);
      }
    };

  /* =======================================================
     DELETE FIELD
  ======================================================= */

  const handleDeleteField =
    async (
      field: Field
    ) => {
      if (
        !window.confirm(
          `Are you sure you want to delete "${field.fieldName}"?`
        )
      ) {
        return;
      }

      try {
        const response =
          await fetch(
            `${FIELD_API}/${field.id}`,
            {
              method: "DELETE",
              headers:
                getAuthHeaders(),
            }
          );

        if (!response.ok) {
          const message =
            await response.text();

          throw new Error(
            message ||
              "Failed to delete field"
          );
        }

        await loadFields();
      } catch (err) {
        console.error(err);

        alert(
          err instanceof Error
            ? err.message
            : "Failed to delete field"
        );
      }
    };

  /* =======================================================
     VIEW SAVED FARM MAP
  ======================================================= */

  const viewFarmMap = (
    farm: Farm
  ) => {
    const points =
      boundaryToPoints(
        farm.boundary
      );

    if (points.length < 3) {
      alert(
        "This farm does not have a valid saved boundary."
      );
      return;
    }

    const center =
      calculateCenter(
        points
      );

    setSavedMapType("farm");

    setSavedMapTitle(
      farm.farmName
    );

    setSavedMapPoints(
      points
    );

    setSavedMapCenter([
      center.latitude,
      center.longitude,
    ]);

    setShowSavedMap(true);
  };

  /* =======================================================
     VIEW SAVED FIELD MAP
  ======================================================= */

  const viewFieldMap = (
    field: Field
  ) => {
    const fieldPoints =
      boundaryToPoints(
        field.boundary
      );

    if (
      fieldPoints.length < 3
    ) {
      alert(
        "This field does not have a valid saved boundary."
      );
      return;
    }

    const center =
      calculateCenter(
        fieldPoints
      );

    setSavedMapType("field");

    setSavedMapTitle(
      `${field.fieldName} — ${getFarmName(
        field.farmId
      )}`
    );

    setSavedMapPoints(
      fieldPoints
    );

    setSavedMapCenter([
      center.latitude,
      center.longitude,
    ]);

    setShowSavedMap(true);
  };

  /* =======================================================
     STATISTICS
  ======================================================= */

  const totalFarms =
    farms.length;

  const totalFields =
    fields.length;

  const selectedFarmFields =
    selectedFarmId === null
      ? fields
      : fields.filter(
          (field) =>
            field.farmId ===
            selectedFarmId
        );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 px-4 py-6 sm:px-6 lg:px-8">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Farm Management
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Manage farms and fields with real map boundaries
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">

          <button
            onClick={
              openCreateFarm
            }
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/25 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            + Register Farm
          </button>

          <button
            onClick={() =>
              openCreateField()
            }
            disabled={
              farms.length === 0
            }
            className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            + Register Field
          </button>

        </div>
      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* ===================================================
          STATS
      =================================================== */}

      <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">

        <StatCard
          title="Total Farms"
          value={
            totalFarms
          }
          icon="🌾"
        />

        <StatCard
          title="Total Fields"
          value={
            totalFields
          }
          icon="🌱"
        />

        <StatCard
          title="Selected Farm Fields"
          value={
            selectedFarmFields.length
          }
          icon="📍"
        />

      </div>

      {/* ===================================================
          TABS
      =================================================== */}

      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-4">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">

            <button
              onClick={() => {
                setActiveTab(
                  "farms"
                );

                setSelectedFarmId(
                  null
                );

                setSearch("");
              }}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
                activeTab ===
                "farms"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
              }`}
            >
              🌾 Farms
            </button>

            <button
              onClick={() => {
                setActiveTab(
                  "fields"
                );

                setSearch("");
              }}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
                activeTab ===
                "fields"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
              }`}
            >
              🌱 Fields
            </button>

          </div>

          <input
            type="text"
            placeholder={
              activeTab ===
              "farms"
                ? "Search farms..."
                : "Search fields..."
            }
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50 md:w-80"
          />

        </div>

      </div>

      {/* ===================================================
          FARM LIST
      =================================================== */}

      {activeTab ===
        "farms" && (
        <div>

          {loadingFarms ? (
            <LoadingState text="Loading farms..." />
          ) : filteredFarms.length ===
            0 ? (
            <EmptyState
              title="No farms found"
              description="Register your first farm."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

              {filteredFarms.map(
                (farm) => {
                  const farmPoints =
                    boundaryToPoints(
                      farm.boundary
                    );

                  const fieldCount =
                    fields.filter(
                      (field) =>
                        field.farmId ===
                        farm.id
                    ).length;

                  return (
                    <div
                      key={
                        farm.id
                      }
                      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60"
                    >

                      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />

                      <div className="p-5">

                        <div className="mb-5 flex items-start gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl ring-1 ring-emerald-100 transition-transform duration-300 group-hover:scale-105">
                            🌾
                          </div>

                          <div className="min-w-0">

                            <h3 className="truncate text-base font-extrabold text-slate-900">
                              {
                                farm.farmName
                              }
                            </h3>

                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                              📍{" "}
                              {
                                farm.farmAddress
                              }
                            </p>

                          </div>

                        </div>

                        <div className="grid grid-cols-2 gap-3">

                          <InfoBox
                            label="Fields"
                            value={String(
                              fieldCount
                            )}
                          />

                          <InfoBox
                            label="Boundary"
                            value={
                              farmPoints.length >=
                              3
                                ? "Saved"
                                : "Missing"
                            }
                          />

                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">

                          <InfoBox
                            label="Latitude"
                            value={Number(
                              farm.latitude
                            ).toFixed(
                              7
                            )}
                          />

                          <InfoBox
                            label="Longitude"
                            value={Number(
                              farm.longtitude
                            ).toFixed(
                              7
                            )}
                          />

                        </div>

                        {/* VIEW SAVED MAP */}

                        <button
                          onClick={() =>
                            viewFarmMap(
                              farm
                            )
                          }
                          disabled={
                            farmPoints.length <
                            3
                          }
                          className="mt-4 w-full rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          🗺️ View Saved Boundary
                        </button>

                        {/* EDIT */}

                        <button
                          onClick={() =>
                            openEditFarm(
                              farm
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          ✏️ Edit Farm Boundary
                        </button>

                        {/* VIEW FIELDS */}

                        <button
                          onClick={() =>
                            handleSelectFarm(
                              farm.id
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          🌱 View Fields
                        </button>

                        {/* ADD FIELD */}

                        <button
                          onClick={() =>
                            openCreateField(
                              farm.id
                            )
                          }
                          disabled={
                            farmPoints.length <
                            3
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + Add Field
                        </button>

                        {/* ACTIONS */}

                        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">

                          <button
                            onClick={() =>
                              openEditFarm(
                                farm
                              )
                            }
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteFarm(
                                farm
                              )
                            }
                            className="flex-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                          >
                            🗑️ Delete
                          </button>

                        </div>

                      </div>
                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>
      )}

      {/* ===================================================
          FIELD LIST
      =================================================== */}

      {activeTab ===
        "fields" && (
        <div>

          {selectedFarmId !==
            null && (
            <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-600">
                  Selected Farm
                </p>

                <h2 className="mt-1 text-lg font-extrabold text-emerald-900">
                  {getFarmName(
                    selectedFarmId
                  )}
                </h2>

                <p className="text-sm leading-5 text-emerald-700">
                  Fields can only be created inside this farm boundary.
                </p>
              </div>

              <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">

                <button
                  onClick={() =>
                    openCreateField(
                      selectedFarmId
                    )
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  + Add Field
                </button>

                <button
                  onClick={() => {
                    setSelectedFarmId(
                      null
                    );
                    setSearch("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Show All
                </button>

              </div>

            </div>
          )}

          {loadingFields ? (
            <LoadingState text="Loading fields..." />
          ) : filteredFields.length ===
            0 ? (
            <EmptyState
              title="No fields found"
              description="Select a farm and create a field inside its boundary."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px]">

                  <thead className="bg-slate-50">

                    <tr className="border-b border-slate-200 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">

                      <th className="px-5 py-4">
                        Field
                      </th>

                      <th className="px-5 py-4">
                        Farm
                      </th>

                      <th className="px-5 py-4">
                        Size
                      </th>

                      <th className="px-5 py-4">
                        Location
                      </th>

                      <th className="px-5 py-4">
                        Boundary
                      </th>

                      <th className="px-5 py-4 text-right">
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredFields.map(
                      (field) => {
                        const fieldBoundary =
                          boundaryToPoints(
                            field.boundary
                          );

                        return (
                          <tr
                            key={
                              field.id
                            }
                            className="border-b border-slate-100 transition hover:bg-emerald-50/30"
                          >

                            <td className="px-5 py-4">

                              <p className="font-extrabold text-slate-800">
                                🌱{" "}
                                {
                                  field.fieldName
                                }
                              </p>

                              <p className="text-xs font-medium text-slate-400">
                                ID:{" "}
                                {
                                  field.id
                                }
                              </p>

                            </td>

                            <td className="px-5 py-4">
                              {getFarmName(
                                field.farmId
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {
                                field.fieldSize
                              }{" "}
                              {
                                field.sizeUnit
                              }
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">

                              <div>
                                Lat:{" "}
                                {Number(
                                  field.latitude
                                ).toFixed(
                                  7
                                )}
                              </div>

                              <div>
                                Lng:{" "}
                                {Number(
                                  field.longtitude
                                ).toFixed(
                                  7
                                )}
                              </div>

                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  fieldBoundary.length >=
                                  3
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {fieldBoundary.length >=
                                3
                                  ? "Saved"
                                  : "Missing"}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <div className="flex justify-end gap-2">

                                <button
                                  onClick={() =>
                                    viewFieldMap(
                                      field
                                    )
                                  }
                                  disabled={
                                    fieldBoundary.length <
                                    3
                                  }
                                  title="View saved boundary"
                                  className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  🗺️
                                </button>

                                <button
                                  onClick={() =>
                                    openEditField(
                                      field
                                    )
                                  }
                                  title="Edit field"
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50"
                                >
                                  ✏️
                                </button>

                                <button
                                  onClick={() =>
                                    handleDeleteField(
                                      field
                                    )
                                  }
                                  title="Delete field"
                                  className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-red-600 transition hover:bg-red-100"
                                >
                                  🗑️
                                </button>

                              </div>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ===================================================
          FARM CREATE / EDIT MODAL
      =================================================== */}

      {showFarmModal && (
        <Modal
          title={
            editingFarmId ===
            null
              ? "Register New Farm"
              : "Edit Farm"
          }
          wide
          onClose={() =>
            setShowFarmModal(
              false
            )
          }
        >

          <form
            onSubmit={
              handleFarmSubmit
            }
            className="space-y-6"
          >

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">


              <Input
                label="Farm Name"
                placeholder="e.g. Green Valley Farm"
                value={
                  farmForm.farmName
                }
                onChange={(
                  value
                ) =>
                  setFarmForm(
                    (prev) => ({
                      ...prev,
                      farmName:
                        value,
                    })
                  )
                }
              />

              <Input
                label="Farm Address"
                placeholder="e.g. Gampaha"
                value={
                  farmForm.farmAddress
                }
                onChange={(
                  value
                ) =>
                  setFarmForm(
                    (prev) => ({
                      ...prev,
                      farmAddress:
                        value,
                    })
                  )
                }
              />

            </div>

            {/* FARM MAP */}

            <div>

              <div className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 shadow-sm">

                <p className="font-extrabold text-emerald-900">
                  🗺️ Select Real Farm Boundary
                </p>

                <p className="mt-1 text-sm leading-5 text-emerald-700">
                  Click the actual farm boundary on the map.
                  Minimum 3 points are required.
                </p>

                <p className="mt-2 text-sm font-semibold text-emerald-800">
                  {farmMapMessage}
                </p>

              </div>

              <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-slate-100 shadow-lg shadow-emerald-900/10">

                <MapContainer
                  key={`farm-map-${editingFarmId ?? "new"}`}
                  center={
                    farmMapCenter
                  }
                  zoom={13}
                  scrollWheelZoom
                  className="h-[430px] w-full sm:h-[500px]"
                >

                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapCenterController
                    center={
                      farmMapCenter
                    }
                    zoom={13}
                  />

                  {farmPoints.length >=
                    2 && (
                    <MapBoundsController
                      points={
                        farmPoints
                      }
                    />
                  )}

                  <MapClickHandler
                    onMapClick={
                      handleFarmMapClick
                    }
                  />

                  {farmPoints.map(
                    (
                      point,
                      index
                    ) => (
                      <Marker
                        key={`farm-marker-${index}`}
                        position={toLatLng(
                          point
                        )}
                        icon={
                          markerIcon
                        }
                      />
                    )
                  )}

                  {farmPoints.length >=
                    2 && (
                    <Polygon
                      positions={farmPoints.map(
                        toLatLng
                      )}
                      pathOptions={{
                        color:
                          "#15803d",
                        weight: 4,
                        fillColor:
                          "#22c55e",
                        fillOpacity:
                          0.2,
                      }}
                    />
                  )}

                  {farmPoints.map(
                    (
                      point,
                      index
                    ) => (
                      <CircleMarker
                        key={`farm-circle-${index}`}
                        center={toLatLng(
                          point
                        )}
                        radius={5}
                        pathOptions={{
                          color:
                            "#ffffff",
                          weight: 2,
                          fillColor:
                            "#16a34a",
                          fillOpacity:
                            1,
                        }}
                      />
                    )
                  )}

                </MapContainer>

                <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs shadow-xl backdrop-blur">

                  <p className="font-bold text-green-700">
                    FARM BOUNDARY
                  </p>

                  <p className="text-gray-500">
                    Click map to add points
                  </p>

                  <p className="font-semibold text-gray-700">
                    Points:{" "}
                    {
                      farmPoints.length
                    }
                  </p>

                  <p className="mt-1 text-gray-500">
                    Required: 3+
                  </p>

                </div>

              </div>

              {/* FARM LOCATION */}

              {farmPoints.length >=
                3 && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <InfoBox
                    label="Selected Points"
                    value={String(
                      farmPoints.length
                    )}
                  />

                  <InfoBox
                    label="Latitude"
                    value={calculateCenter(
                      farmPoints
                    ).latitude.toFixed(
                      7
                    )}
                  />

                  <InfoBox
                    label="Longitude"
                    value={calculateCenter(
                      farmPoints
                    ).longitude.toFixed(
                      7
                    )}
                  />

                </div>
              )}

            </div>

            {/* FARM ACTIONS */}

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={
                    removeLastFarmPoint
                  }
                  disabled={
                    farmPoints.length ===
                    0
                  }
                  className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↩️ Remove Last Point
                </button>

                <button
                  type="button"
                  onClick={
                    clearFarmPoints
                  }
                  disabled={
                    farmPoints.length ===
                    0
                  }
                  className="rounded-xl border border-red-100 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  🧹 Clear All Points
                </button>

              </div>

              <div className="flex gap-2.5">

                <button
                  type="button"
                  onClick={() =>
                    setShowFarmModal(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingFarm ||
                    farmPoints.length <
                      3
                  }
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingFarm
                    ? "Saving..."
                    : editingFarmId ===
                        null
                    ? "Create Farm"
                    : "Update Farm"}
                </button>

              </div>

            </div>

            {farmPoints.length < 3 && (
              <p className="text-right text-xs font-semibold text-red-500">
                Select at least 3 points to enable Create/Update.
              </p>
            )}

          </form>

        </Modal>
      )}

      {/* ===================================================
          FIELD CREATE / EDIT MODAL
      =================================================== */}

      {showFieldModal && (
        <Modal
          title={
            editingFieldId ===
            null
              ? "Register New Field"
              : "Edit Field"
          }
          wide
          onClose={() =>
            setShowFieldModal(
              false
            )
          }
        >

          <form
            onSubmit={
              handleFieldSubmit
            }
            className="space-y-6"
          >

            {/* FARM */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Farm
              </label>

              <select
                value={
                  fieldForm.farmId
                }
                onChange={(
                  e
                ) => {
                  const id =
                    e.target.value;

                  setFieldForm(
                    (prev) => ({
                      ...prev,
                      farmId:
                        id,
                    })
                  );

                  setFieldPoints([]);

                  setFieldMapMessage(
                    ""
                  );

                  if (id) {
                    const farm =
                      farms.find(
                        (item) =>
                          item.id ===
                          Number(
                            id
                          )
                      );

                    if (farm) {
                      const points =
                        boundaryToPoints(
                          farm.boundary
                        );

                      if (
                        points.length >=
                        3
                      ) {
                        const center =
                          calculateCenter(
                            points
                          );

                        setFieldMapCenter([
                          center.latitude,
                          center.longitude,
                        ]);
                      }
                    }
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              >

                <option value="">
                  Select farm
                </option>

                {farms.map(
                  (farm) => (
                    <option
                      key={
                        farm.id
                      }
                      value={
                        farm.id
                      }
                    >
                      {
                        farm.farmName
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            {/* FARM INFO */}

            {fieldForm.farmId &&
              (() => {
                const farm =
                  farms.find(
                    (item) =>
                      item.id ===
                      Number(
                        fieldForm.farmId
                      )
                  );

                const points =
                  boundaryToPoints(
                    farm?.boundary
                  );

                return (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">

                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-600">
                      Selected Farm
                    </p>

                    <p className="font-bold text-green-800">
                      {
                        farm?.farmName
                      }
                    </p>

                    <p className="mt-1 text-sm leading-5 text-emerald-700">
                      🟢 Green polygon = Farm boundary
                    </p>

                    <p className="text-sm leading-5 text-emerald-700">
                      Field points must stay inside the green area.
                    </p>

                    <p className="mt-1 text-xs text-green-600">
                      Farm boundary points:{" "}
                      {
                        points.length
                      }
                    </p>

                  </div>
                );
              })()}

            {/* FIELD DETAILS */}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <Input
                label="Field Name"
                placeholder="e.g. Field A"
                value={
                  fieldForm.fieldName
                }
                onChange={(
                  value
                ) =>
                  setFieldForm(
                    (prev) => ({
                      ...prev,
                      fieldName:
                        value,
                    })
                  )
                }
              />

              <Input
                label="Field Size"
                type="number"
                placeholder="e.g. 5"
                value={
                  fieldForm.fieldSize
                }
                onChange={(
                  value
                ) =>
                  setFieldForm(
                    (prev) => ({
                      ...prev,
                      fieldSize:
                        value,
                    })
                  )
                }
              />

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Size Unit
                </label>

                <select
                  value={
                    fieldForm.sizeUnit
                  }
                  onChange={(
                    e
                  ) =>
                    setFieldForm(
                      (prev) => ({
                        ...prev,
                        sizeUnit:
                          e.target
                            .value as SizeUnit,
                      })
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                >

                  <option value="ACRE">
                    ACRE
                  </option>

                  <option value="HECTARE">
                    HECTARE
                  </option>

                  <option value="SQ_METER">
                    SQ_METER
                  </option>

                </select>

              </div>

            </div>

            {/* FIELD MAP */}

            <div>

              <div className="mb-3 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 shadow-sm">

                <p className="font-extrabold text-sky-900">
                  🗺️ Select Field Boundary
                </p>

                <p className="mt-1 text-sm leading-5 text-sky-700">
                  Click points inside the green farm boundary.
                  Minimum 3 points are required.
                </p>

                <p className="mt-1 text-sm font-semibold text-sky-800">
                  {fieldMapMessage}
                </p>

              </div>

              <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-slate-100 shadow-lg shadow-sky-900/10">

                <MapContainer
                  key={`field-map-${editingFieldId ?? "new"}-${fieldForm.farmId}`}
                  center={
                    fieldMapCenter
                  }
                  zoom={15}
                  scrollWheelZoom
                  className="h-[430px] w-full sm:h-[500px]"
                >

                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapCenterController
                    center={
                      fieldMapCenter
                    }
                    zoom={15}
                  />

                  {/* FARM BOUNDARY */}

                  {fieldForm.farmId &&
                    (() => {
                      const farm =
                        farms.find(
                          (item) =>
                            item.id ===
                            Number(
                              fieldForm.farmId
                            )
                        );

                      const points =
                        boundaryToPoints(
                          farm?.boundary
                        );

                      if (
                        points.length <
                        3
                      ) {
                        return null;
                      }

                      return (
                        <>
                          <Polygon
                            positions={points.map(
                              toLatLng
                            )}
                            pathOptions={{
                              color:
                                "#15803d",
                              weight: 5,
                              fillColor:
                                "#22c55e",
                              fillOpacity:
                                0.15,
                            }}
                          />

                          {points.map(
                            (
                              point,
                              index
                            ) => (
                              <CircleMarker
                                key={`farm-point-${index}`}
                                center={toLatLng(
                                  point
                                )}
                                radius={4}
                                pathOptions={{
                                  color:
                                    "#ffffff",
                                  weight:
                                    2,
                                  fillColor:
                                    "#15803d",
                                  fillOpacity:
                                    1,
                                }}
                              />
                            )
                          )}
                        </>
                      );
                    })()}

                  {/* FIELD POLYGON */}

                  {fieldPoints.length >=
                    2 && (
                    <Polygon
                      positions={fieldPoints.map(
                        toLatLng
                      )}
                      pathOptions={{
                        color:
                          "#2563eb",
                        weight: 4,
                        fillColor:
                          "#3b82f6",
                        fillOpacity:
                          0.3,
                      }}
                    />
                  )}

                  {/* FIELD MARKERS */}

                  {fieldPoints.map(
                    (
                      point,
                      index
                    ) => (
                      <Marker
                        key={`field-marker-${index}`}
                        position={toLatLng(
                          point
                        )}
                        icon={
                          markerIcon
                        }
                      />
                    )
                  )}

                  {fieldPoints.map(
                    (
                      point,
                      index
                    ) => (
                      <CircleMarker
                        key={`field-circle-${index}`}
                        center={toLatLng(
                          point
                        )}
                        radius={5}
                        pathOptions={{
                          color:
                            "#ffffff",
                          weight: 2,
                          fillColor:
                            "#2563eb",
                          fillOpacity:
                            1,
                        }}
                      />
                    )
                  )}

                  <MapClickHandler
                    onMapClick={
                      handleFieldMapClick
                    }
                  />

                </MapContainer>

                <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs shadow-xl backdrop-blur">

                  <p className="font-bold text-green-700">
                    🟢 FARM
                  </p>

                  <p className="font-bold text-blue-700">
                    🔵 FIELD
                  </p>

                  <p className="mt-1 font-semibold text-gray-700">
                    Points:{" "}
                    {
                      fieldPoints.length
                    }
                  </p>

                  <p className="text-gray-500">
                    Required: 3+
                  </p>

                </div>

              </div>

              {/* FIELD LOCATION */}

              {fieldPoints.length >=
                3 && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <InfoBox
                    label="Selected Points"
                    value={String(
                      fieldPoints.length
                    )}
                  />

                  <InfoBox
                    label="Latitude"
                    value={calculateCenter(
                      fieldPoints
                    ).latitude.toFixed(
                      7
                    )}
                  />

                  <InfoBox
                    label="Longitude"
                    value={calculateCenter(
                      fieldPoints
                    ).longitude.toFixed(
                      7
                    )}
                  />

                </div>
              )}

            </div>

            {/* FIELD ACTIONS */}

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={
                    removeLastFieldPoint
                  }
                  disabled={
                    fieldPoints.length ===
                    0
                  }
                  className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↩️ Remove Last Point
                </button>

                <button
                  type="button"
                  onClick={
                    clearFieldPoints
                  }
                  disabled={
                    fieldPoints.length ===
                    0
                  }
                  className="rounded-xl border border-red-100 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  🧹 Clear All Points
                </button>

              </div>

              <div className="flex gap-2.5">

                <button
                  type="button"
                  onClick={() =>
                    setShowFieldModal(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingField ||
                    fieldPoints.length <
                      3
                  }
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingField
                    ? "Saving..."
                    : editingFieldId ===
                        null
                    ? "Create Field"
                    : "Update Field"}
                </button>

              </div>

            </div>

            {fieldPoints.length < 3 && (
              <p className="text-right text-xs font-semibold text-red-500">
                Select at least 3 points to enable Create/Update.
              </p>
            )}

          </form>

        </Modal>
      )}

      {/* ===================================================
          SAVED BOUNDARY MAP VIEW
      =================================================== */}

      {showSavedMap && (
        <Modal
          title={`🗺️ ${savedMapTitle}`}
          wide
          onClose={() =>
            setShowSavedMap(false)
          }
        >

          <div className="space-y-5">

            <div
              className={`rounded-2xl border p-4 shadow-sm ${
                savedMapType ===
                "farm"
                  ? "border-green-200 bg-green-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >

              <p
                className={`font-semibold ${
                  savedMapType ===
                  "farm"
                    ? "text-green-800"
                    : "text-blue-800"
                }`}
              >
                {savedMapType ===
                "farm"
                  ? "🌾 Saved Farm Boundary"
                  : "🌱 Saved Field Boundary"}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                This boundary is loaded from the API/database.
              </p>

              <p className="mt-1 text-sm font-medium text-gray-700">
                Points:{" "}
                {
                  savedMapPoints.length
                }
              </p>

            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xl shadow-slate-900/10">

              <MapContainer
                center={
                  savedMapCenter
                }
                zoom={15}
                scrollWheelZoom
                className="h-[460px] w-full sm:h-[550px]"
              >

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapCenterController
                  center={
                    savedMapCenter
                  }
                  zoom={15}
                />

                {savedMapPoints.length >=
                  2 && (
                  <MapBoundsController
                    points={
                      savedMapPoints
                    }
                  />
                )}

                {/* SAVED POLYGON */}

                {savedMapPoints.length >=
                  2 && (
                  <Polygon
                    positions={savedMapPoints.map(
                      toLatLng
                    )}
                    pathOptions={{
                      color:
                        savedMapType ===
                        "farm"
                          ? "#15803d"
                          : "#2563eb",
                      weight: 5,
                      fillColor:
                        savedMapType ===
                        "farm"
                          ? "#22c55e"
                          : "#3b82f6",
                      fillOpacity:
                        0.25,
                    }}
                  />
                )}

                {/* SAVED POINTS */}

                {savedMapPoints.map(
                  (
                    point,
                    index
                  ) => (
                    <CircleMarker
                      key={`saved-point-${index}`}
                      center={toLatLng(
                        point
                      )}
                      radius={6}
                      pathOptions={{
                        color:
                          "#ffffff",
                        weight: 2,
                        fillColor:
                          savedMapType ===
                          "farm"
                            ? "#15803d"
                            : "#2563eb",
                        fillOpacity:
                          1,
                      }}
                    />
                  )
                )}

              </MapContainer>

              <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs shadow-xl backdrop-blur">

                <p
                  className={`font-bold ${
                    savedMapType ===
                    "farm"
                      ? "text-green-700"
                      : "text-blue-700"
                  }`}
                >
                  {savedMapType ===
                  "farm"
                    ? "🌾 FARM"
                    : "🌱 FIELD"}
                </p>

                <p className="mt-1 font-semibold text-gray-700">
                  Saved Points:{" "}
                  {
                    savedMapPoints.length
                  }
                </p>

              </div>

            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              <InfoBox
                label="Saved Points"
                value={String(
                  savedMapPoints.length
                )}
              />

              <InfoBox
                label="Center Latitude"
                value={calculateCenter(
                  savedMapPoints
                ).latitude.toFixed(
                  7
                )}
              />

              <InfoBox
                label="Center Longitude"
                value={calculateCenter(
                  savedMapPoints
                ).longitude.toFixed(
                  7
                )}
              />

            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">

              <button
                type="button"
                onClick={() =>
                  setShowSavedMap(false)
                }
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800"
              >
                Close Map
              </button>

            </div>

          </div>

        </Modal>
      )}

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>

        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl ring-1 ring-emerald-100">
          {icon}
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">

      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-extrabold text-slate-800">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">

      <div className="text-4xl">
        🌱
      </div>

      <h3 className="mt-3 font-semibold text-gray-800">
        {title}
      </h3>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

      <div className="text-3xl">
        ⏳
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   INPUT
========================================================= */

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
}) {
  return (
    <div>

      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        placeholder={
          placeholder
        }
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
      />

    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">

      <div
        className={`max-h-[95vh] w-full overflow-y-auto rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/20 ${
          wide
            ? "max-w-6xl"
            : "max-w-lg"
        }`}
      >

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">

          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>

        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>

      </div>

    </div>
  );
}