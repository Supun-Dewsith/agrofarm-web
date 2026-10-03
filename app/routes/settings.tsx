import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Bell,
  Check,
  Eye,
  EyeOff,
  Globe,
  LockKeyhole,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  Sliders,
  X,
  Sparkles,
  CloudRain,
  Database,
  LogOut,
  CheckCircle2,
  Calendar,
  Building2,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchWithAuth, getAuthData, logout } from "../utils/auth";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:80"
).replace(/\/+$/, "");

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

const TIMEZONES = [
  { value: "Asia/Colombo", label: "Asia/Colombo (UTC+05:30) - Sri Lanka" },
  { value: "UTC", label: "UTC (UTC+00:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30) - India" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+07:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+08:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+10:00)" },
  { value: "Europe/London", label: "Europe/London (UTC+00:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+01:00)" },
  { value: "America/New_York", label: "America/New_York (UTC-05:00)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (UTC-08:00)" },
];

const CURRENCIES = [
  { value: "LKR (Rs)", label: "LKR (Rs) - Sri Lankan Rupee" },
  { value: "USD ($)", label: "USD ($) - US Dollar" },
  { value: "EUR (€)", label: "EUR (€) - Euro" },
  { value: "GBP (£)", label: "GBP (£) - British Pound" },
  { value: "INR (₹)", label: "INR (₹) - Indian Rupee" },
  { value: "AUD ($)", label: "AUD ($) - Australian Dollar" },
  { value: "CAD ($)", label: "CAD ($) - Canadian Dollar" },
  { value: "AED (د.إ)", label: "AED (د.إ) - UAE Dirham" },
];

type Tab = "profile" | "preferences" | "notifications" | "security";

interface Profile {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  imageUrl: string | null;
  role?: string | null;
  enabled?: boolean | null;
  createdAt?: string | null;
  permissions?: string[];
  assignedFarms?: string[];
}

interface Notifications {
  diseaseAlerts: boolean;
  lowStockWarnings: boolean;
  taskReminders: boolean;
  harvestUpdates: boolean;
  weatherAlerts: boolean;
}

interface Security {
  twoFactorAuthentication: boolean;
}

interface SystemSettings {
  farmName: string;
  timezone: string;
  currency: string;
  autoBackup: boolean;
  aiDiseaseDetection: boolean;
  weatherSync: boolean;
}

interface Farm {
  id: number;
  farmName: string;
}

interface Message {
  type: "success" | "error";
  text: string;
}

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as
    | {
        message?: string;
        error?: string;
      }
    | null;

  return data?.message || data?.error || fallback;
}

function makeImageUrl(url: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getInitials(profile: Profile | null, fallbackUsername?: string) {
  const first = profile?.firstName?.trim()?.[0] || "";
  const last = profile?.lastName?.trim()?.[0] || "";
  const initials = `${first}${last}`;
  return (initials || profile?.username?.slice(0, 2) || fallbackUsername?.slice(0, 2) || "AG").toUpperCase();
}

// Reusable custom toggle switch styled to match the emerald theme
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-flex",
        height: "26px",
        width: "48px",
        flexShrink: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: "9999px",
        border: "2px solid transparent",
        backgroundColor: checked ? "#059669" : "#cbd5e1",
        transition: "background-color 0.2s ease-in-out",
        outline: "none",
        opacity: disabled ? 0.6 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          pointerEvents: "none",
          display: "inline-block",
          height: "22px",
          width: "22px",
          borderRadius: "9999px",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          transform: checked ? "translateX(22px)" : "translateX(0px)",
          transition: "transform 0.2s ease-in-out",
        }}
      />
    </button>
  );
}

function formatMemberDate(dateStr?: string | null) {
  if (!dateStr) return "September 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const authUser = getAuthData();

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notifications | null>(null);
  const [security, setSecurity] = useState<Security | null>(null);
  const [system, setSystem] = useState<SystemSettings | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);

  // Local farming usability preferences
  const [measurementUnit, setMeasurementUnit] = useState<"metric" | "imperial">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("agrofarm_measurement_unit") as "metric" | "imperial") || "metric";
    }
    return "metric";
  });

  const [dateFormat, setDateFormat] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("agrofarm_date_format") || "YYYY-MM-DD";
    }
    return "YYYY-MM-DD";
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingFarms, setLoadingFarms] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });

  const notify = (type: Message["type"], text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => {
      setMessage(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadFarms = async () => {
    try {
      setLoadingFarms(true);
      const response = await fetchWithAuth("/api/v1/farms");
      if (!response.ok) return;

      const data = (await response.json()) as {
        content?: unknown[];
        [key: string]: unknown;
      } | unknown[];

      const list: unknown[] = Array.isArray(data)
        ? data
        : !Array.isArray(data) && data && Array.isArray((data as any)?.content)
        ? (data as any).content
        : [];

      const validFarms = list
        .map((farm) => {
          const item = farm as Partial<Farm>;
          return {
            id: Number(item.id),
            farmName: String(item.farmName || ""),
          };
        })
        .filter((farm) => Number.isFinite(farm.id) && farm.farmName);

      setFarms(validFarms);
    } catch {
      // Graceful fallback
    } finally {
      setLoadingFarms(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const [
        profileResponse,
        notificationsResponse,
        securityResponse,
        systemResponse,
      ] = await Promise.all([
        fetchWithAuth("/api/v1/settings/profile"),
        fetchWithAuth("/api/v1/settings/notifications"),
        fetchWithAuth("/api/v1/settings/security"),
        fetchWithAuth("/api/v1/settings/system"),
      ]);

      if (!profileResponse.ok) {
        throw new Error(await readError(profileResponse, t("Failed to load profile")));
      }
      if (!notificationsResponse.ok) {
        throw new Error(await readError(notificationsResponse, t("Failed to load notifications")));
      }
      if (!securityResponse.ok) {
        throw new Error(await readError(securityResponse, t("Failed to load security settings")));
      }
      if (!systemResponse.ok) {
        throw new Error(await readError(systemResponse, t("Failed to load system settings")));
      }

      const [profileData, notificationData, securityData, systemData] =
        await Promise.all([
          profileResponse.json() as Promise<Profile>,
          notificationsResponse.json() as Promise<Notifications>,
          securityResponse.json() as Promise<Security>,
          systemResponse.json() as Promise<SystemSettings>,
        ]);

      setProfile(profileData);
      setProfileForm({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        email: profileData.email || "",
        phoneNumber: profileData.phoneNumber || "",
      });

      setNotifications(notificationData);
      setSecurity(securityData);

      setSystem({
        farmName: systemData.farmName || "",
        timezone: systemData.timezone || "Asia/Colombo",
        currency: systemData.currency || "LKR (Rs)",
        autoBackup: Boolean(systemData.autoBackup),
        aiDiseaseDetection: Boolean(systemData.aiDiseaseDetection),
        weatherSync: Boolean(systemData.weatherSync),
      });
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : t("Failed to load settings")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadFarms();
  }, []);

  const selectPhoto = (file?: File) => {
    if (!file) return;

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      notify("error", t("Profile image must not exceed 5 MB."));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      notify("error", t("Profile image must be JPG or PNG."));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const clearSelectedPhoto = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const updateProfile = async (event: FormEvent) => {
    event.preventDefault();

    if (!profileForm.firstName.trim()) {
      notify("error", t("First name is required."));
      return;
    }
    if (!profileForm.email.trim()) {
      notify("error", t("Email is required."));
      return;
    }
    if (selectedFile && selectedFile.size > MAX_PROFILE_IMAGE_SIZE) {
      notify("error", t("Profile image must not exceed 5 MB."));
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      const profileData = {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
      };

      formData.append(
        "data",
        new Blob([JSON.stringify(profileData)], { type: "application/json" })
      );

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const response = await fetchWithAuth("/api/v1/settings/profile", {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, t("Failed to update profile."))
        );
      }

      const updatedProfile = (await response.json()) as Profile;

      setProfile(updatedProfile);
      setProfileForm({
        firstName: updatedProfile.firstName || "",
        lastName: updatedProfile.lastName || "",
        email: updatedProfile.email || "",
        phoneNumber: updatedProfile.phoneNumber || "",
      });

      clearSelectedPhoto();
      notify("success", t("Profile updated successfully."));
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : t("Failed to update profile.")
      );
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!passwords.currentPassword) {
      notify("error", t("Current password is required."));
      return;
    }
    if (passwords.newPassword.length < 8) {
      notify("error", t("New password must be at least 8 characters."));
      return;
    }
    if (passwords.newPassword !== passwords.confirmNewPassword) {
      notify("error", t("New password and confirmation do not match."));
      return;
    }

    try {
      setSaving(true);
      const response = await fetchWithAuth("/api/v1/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
          confirmNewPassword: passwords.confirmNewPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, t("Failed to change password."))
        );
      }

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });

      notify("success", t("Password changed successfully."));
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : t("Failed to change password.")
      );
    } finally {
      setSaving(false);
    }
  };

  const updateNotifications = async (event: FormEvent) => {
    event.preventDefault();
    if (!notifications) return;

    try {
      setSaving(true);
      const response = await fetchWithAuth("/api/v1/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, t("Failed to update notifications."))
        );
      }

      const updated = (await response.json()) as Notifications;
      setNotifications(updated);

      notify("success", t("Notification settings saved successfully."));
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : t("Failed to update notifications.")
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleAllNotifications = (enabled: boolean) => {
    setNotifications({
      diseaseAlerts: enabled,
      lowStockWarnings: enabled,
      taskReminders: enabled,
      harvestUpdates: enabled,
      weatherAlerts: enabled,
    });
  };

  const updateSecurity = async (event: FormEvent) => {
    event.preventDefault();
    if (!security) return;

    try {
      setSaving(true);
      const response = await fetchWithAuth("/api/v1/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(security),
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, t("Failed to update security settings."))
        );
      }

      const updated = (await response.json()) as Security;
      setSecurity(updated);

      notify("success", t("Security settings saved successfully."));
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : t("Failed to update security settings.")
      );
    } finally {
      setSaving(false);
    }
  };

  const updateSystem = async (event: FormEvent) => {
    event.preventDefault();
    if (!system) return;

    if (!system.farmName) {
      notify("error", t("Please select a farm."));
      return;
    }
    if (!system.timezone) {
      notify("error", t("Please select a timezone."));
      return;
    }
    if (!system.currency) {
      notify("error", t("Please select a currency."));
      return;
    }

    try {
      setSaving(true);

      // Persist local agricultural preferences
      localStorage.setItem("agrofarm_measurement_unit", measurementUnit);
      localStorage.setItem("agrofarm_date_format", dateFormat);

      const response = await fetchWithAuth("/api/v1/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(system),
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, t("Failed to update system preferences."))
        );
      }

      const updated = (await response.json()) as SystemSettings;

      setSystem({
        farmName: updated.farmName || "",
        timezone: updated.timezone || "",
        currency: updated.currency || "",
        autoBackup: Boolean(updated.autoBackup),
        aiDiseaseDetection: Boolean(updated.aiDiseaseDetection),
        weatherSync: Boolean(updated.weatherSync),
      });

      notify("success", t("Farm & system preferences saved successfully."));
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : t("Failed to update system preferences.")
      );
    } finally {
      setSaving(false);
    }
  };

  // Language switch handler
  const handleLanguageChange = (lang: "en" | "si" | "ta") => {
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
    notify(
      "success",
      lang === "si"
        ? "භාෂාව සිංහලට මාරු කරන ලදී."
        : lang === "ta"
        ? "மொழி தமிழிற்கு மாற்றப்பட்டது."
        : "Language set to English."
    );
  };

  const currentLang = i18n.language || "en";

  // Exact design token styles matching user-registration.tsx
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
    marginBottom: "8px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#1e293b",
    boxSizing: "border-box",
    outline: "none",
    backgroundColor: "#ffffff",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 700,
    color: "#334155",
    marginTop: 0,
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: "12px 24px",
    backgroundColor: "#059669",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background-color 0.15s, opacity 0.15s",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: "11px 18px",
    backgroundColor: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.15s",
  };

  const navTabs = useMemo(
    () => [
      {
        id: "profile" as Tab,
        label: t("Profile"),
        sublabel: t("Name, email & contact details"),
        icon: UserRound,
      },
      {
        id: "preferences" as Tab,
        label: t("Farm Preferences"),
        sublabel: t("Language, regional & farm settings"),
        icon: Sliders,
      },
      {
        id: "notifications" as Tab,
        label: t("Notifications"),
        sublabel: t("Crop, stock & weather alerts"),
        icon: Bell,
      },
      {
        id: "security" as Tab,
        label: t("Security"),
        sublabel: t("Password & authentication"),
        icon: ShieldCheck,
      },
    ],
    [t]
  );

  if (loading) {
    return (
      <div style={{
        padding: "48px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "440px",
        fontFamily: "Inter, system-ui, sans-serif"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#64748b", fontSize: "14px", fontWeight: 600 }}>
          <span style={{
            width: "20px",
            height: "20px",
            border: "2px solid #a7f3d0",
            borderTopColor: "#059669",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.8s linear infinite"
          }} />
          {t("Loading settings...")}
        </div>
      </div>
    );
  }

  const roleName = authUser?.role?.toUpperCase() || "SUPERVISOR";
  const roleBgColor = roleName === "ADMIN" ? "#f0fdf4" : roleName === "SUPERVISOR" ? "#eff6ff" : "#fefce8";
  const roleTextColor = roleName === "ADMIN" ? "#166534" : roleName === "SUPERVISOR" ? "#1e40af" : "#854d0e";

  const displayAvatar = previewUrl || makeImageUrl(profile?.imageUrl);

  return (
    <div
      style={{
        margin: "0",
        padding: "20px 24px 48px",
        fontFamily: "Inter, system-ui, sans-serif",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* STATUS NOTIFICATION BANNER */}
      {message && (
        <div
          style={{
            padding: "14px 18px",
            marginBottom: "20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            backgroundColor: message.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: message.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {message.type === "success" ? (
              <Check size={18} color="#166534" />
            ) : (
              <X size={18} color="#991b1b" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: message.type === "success" ? "#166534" : "#991b1b",
              display: "flex",
              alignItems: "center",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* TWO-PANE LAYOUT: NAVIGATION PULLED TO TOP ON LEFT; EXPANDS TO FIT INNER PAGE */}
      <div
        className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start"
        style={{ width: "100%" }}
      >
        {/* ============================================================ */}
        {/* LEFT PANE (Navigation Pulled to Top & Session Details) */}
        {/* ============================================================ */}
        <div className="w-full lg:w-[280px] shrink-0">
          {/* Settings Navigation Tabs (At the very top) */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
                {t("Settings Navigation")}
              </h3>
              <span style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "10px",
                backgroundColor: "#f1f5f9",
                color: "#475569"
              }}>
                4 {t("Sections")}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: isActive ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                      backgroundColor: isActive ? "#f0fdf4" : "#ffffff",
                      color: isActive ? "#065f46" : "#475569",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      boxShadow: isActive ? "0 1px 3px rgba(6, 95, 70, 0.08)" : "none",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px",
                        borderRadius: "6px",
                        backgroundColor: isActive ? "#dcfce7" : "#f1f5f9",
                        color: isActive ? "#059669" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isActive ? 700 : 600, fontSize: "13px", color: isActive ? "#065f46" : "#1e293b" }}>
                        {tab.label}
                      </div>
                      <div style={{ fontSize: "11px", color: isActive ? "#047857" : "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {tab.sublabel}
                      </div>
                    </div>

                    {isActive && <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Pane Divider */}
          <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "20px 0" }} />

          {/* Quick Account Session Card */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t("Active Session")}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor: roleBgColor,
                  color: roleTextColor,
                }}
              >
                {roleName}
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b", marginBottom: "2px" }}>
              {profile?.firstName && profile?.lastName
                ? `${profile.firstName} ${profile.lastName}`
                : profile?.username || authUser?.username || t("Farm User")}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px", wordBreak: "break-all" }}>
              {profile?.email || "user@agrofarm.com"}
            </div>

            <button
              type="button"
              onClick={logout}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                fontWeight: 600,
                color: "#dc2626",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.15s",
              }}
            >
              <LogOut size={13} />
              {t("Sign out")}
            </button>
          </div>
        </div>

        {/* CENTER DIVIDER LINE (Visible on desktop) */}
        <div
          className="hidden lg:block"
          style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch" }}
        />

        {/* ============================================================ */}
        {/* RIGHT PANE (Active Settings Tab Content) */}
        {/* ============================================================ */}
        <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
          {/* TAB 1: PROFILE INFORMATION */}
          {activeTab === "profile" && profile && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ ...sectionHeaderStyle, marginBottom: "4px" }}>
                  <UserRound size={18} color="#059669" />
                  {t("Profile Information")}
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                  {t("Update your personal details, profile avatar photo, and registered contact information.")}
                </p>
              </div>

              {/* ACCOUNT MEDIA MOVED DIRECTLY INTO PROFILE SECTION */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  marginBottom: "24px",
                }}
              >
                <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Upload size={16} color="#059669" />
                  {t("Account Media")}
                </h4>

                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  {/* Avatar box */}
                  <div
                    style={{
                      position: "relative",
                      width: "88px",
                      height: "88px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {displayAvatar ? (
                      <>
                        <img
                          src={displayAvatar}
                          alt={t("Avatar")}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        {previewUrl && (
                          <button
                            type="button"
                            onClick={clearSelectedPhoto}
                            title={t("Cancel selected image")}
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              backgroundColor: "rgba(255,255,255,0.95)",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#64748b",
                              fontSize: "12px",
                              fontWeight: "bold",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          backgroundColor: "#064e3b",
                          color: "#ffffff",
                          fontSize: "20px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {getInitials(profile, authUser?.username)}
                      </div>
                    )}
                  </div>

                  {/* Actions & Help text */}
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "3px" }}>
                      {profileForm.firstName ? `${profileForm.firstName} ${profileForm.lastName}` : (profile?.username || authUser?.username || t("Profile Photo"))}
                    </div>
                    <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b" }}>
                      {t("JPG or PNG format, maximum file size 5 MB.")}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <input
                        type="file"
                        accept="image/jpeg, image/jpg, image/png"
                        ref={fileRef}
                        onChange={(e) => selectPhoto(e.target.files?.[0])}
                        style={{ display: "none" }}
                      />

                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        style={secondaryButtonStyle}
                      >
                        <Upload size={14} />
                        {t("Upload Photo")}
                      </button>

                      {selectedFile && (
                        <button
                          type="button"
                          onClick={updateProfile}
                          disabled={saving}
                          style={{
                            ...primaryButtonStyle,
                            padding: "10px 16px",
                            fontSize: "13px",
                            opacity: saving ? 0.7 : 1,
                          }}
                        >
                          <Save size={14} />
                          {saving ? t("Saving...") : t("Save Profile Photo")}
                        </button>
                      )}

                      {selectedFile && (
                        <button
                          type="button"
                          onClick={clearSelectedPhoto}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            fontSize: "12px",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {t("Cancel")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* EDITABLE PERSONAL DETAILS FORM */}
              <form onSubmit={updateProfile}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "20px",
                    marginBottom: "24px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      {t("First Name")} <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, firstName: e.target.value })
                      }
                      style={inputStyle}
                      placeholder={t("e.g. Supun")}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>{t("Last Name")}</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, lastName: e.target.value })
                      }
                      style={inputStyle}
                      placeholder={t("e.g. Bandara")}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      {t("Email Address")} <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, email: e.target.value })
                      }
                      style={inputStyle}
                      placeholder={t("e.g., alex@example.com")}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>{t("Phone Number")}</label>
                    <input
                      type="tel"
                      value={profileForm.phoneNumber}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phoneNumber: e.target.value })
                      }
                      style={inputStyle}
                      placeholder="+94 7X XXX XXXX"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    marginBottom: "32px",
                  }}
                >
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...primaryButtonStyle,
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    <Save size={16} />
                    {saving ? t("Saving...") : t("Save Changes")}
                  </button>
                </div>
              </form>

              {/* READ-ONLY ACCOUNT & SYSTEM ACCESS INFORMATION */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={18} color="#059669" />
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                      {t("Account & Access Information")}
                    </h4>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: "#f1f5f9",
                      color: "#64748b",
                    }}
                  >
                    {t("System Read-Only")}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "20px",
                  }}
                >
                  {/* Username */}
                  <div style={{ padding: "14px", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <Lock size={13} color="#64748b" />
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {t("Username")}
                      </span>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                      {profile.username}
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {t("Unique login handle")}
                    </span>
                  </div>

                  {/* Account Status */}
                  <div style={{ padding: "14px", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <CheckCircle2 size={13} color="#059669" />
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {t("Account Status")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "2px 10px",
                          borderRadius: "12px",
                          backgroundColor: profile.enabled !== false ? "#f0fdf4" : "#fef2f2",
                          color: profile.enabled !== false ? "#166534" : "#991b1b",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: profile.enabled !== false ? "#166534" : "#991b1b" }} />
                        {profile.enabled !== false ? t("Active") : t("Suspended")}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginTop: "4px" }}>
                      {t("Authentication permitted")}
                    </span>
                  </div>

                  {/* System Role */}
                  <div style={{ padding: "14px", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <ShieldCheck size={13} color="#64748b" />
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {t("System Role")}
                      </span>
                    </div>
                    <div style={{ marginTop: "2px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "2px 10px",
                          borderRadius: "12px",
                          backgroundColor: roleBgColor,
                          color: roleTextColor,
                          display: "inline-block",
                        }}
                      >
                        {roleName}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginTop: "4px" }}>
                      {t("Privilege tier")}
                    </span>
                  </div>

                  {/* Member Since */}
                  <div style={{ padding: "14px", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <Calendar size={13} color="#64748b" />
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {t("Member Since")}
                      </span>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                      {formatMemberDate(profile.createdAt)}
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {t("Account registration timestamp")}
                    </span>
                  </div>
                </div>

                {/* Allocated Farms */}
                <div style={{ marginBottom: "16px", padding: "14px", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <Building2 size={14} color="#059669" />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                      {t("Allocated Farms")}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {roleName === "ADMIN" ? (
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        {t("Global Access (All System Farms)")}
                      </span>
                    ) : (profile.assignedFarms && profile.assignedFarms.length > 0) ? (
                      profile.assignedFarms.map((farmName, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: "6px",
                            backgroundColor: "#ffffff",
                            color: "#1e293b",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          {farmName}
                        </span>
                      ))
                    ) : farms.length > 0 ? (
                      farms.map((f) => (
                        <span
                          key={f.id}
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: "6px",
                            backgroundColor: "#ffffff",
                            color: "#1e293b",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          {f.farmName}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {t("No specific farms allocated yet.")}
                      </span>
                    )}
                  </div>
                </div>

                {/* System Permissions */}
                <div style={{ padding: "14px", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <ShieldCheck size={14} color="#059669" />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                        {t("Assigned Permissions")}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                      {((profile.permissions && profile.permissions.length > 0) ? profile.permissions : (authUser?.permissions || [])).length} {t("Active")}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {((profile.permissions && profile.permissions.length > 0) ? profile.permissions : (authUser?.permissions || ["VIEW_DASHBOARD", "VIEW_FARM_MANAGEMENT", "VIEW_TASKS", "VIEW_WEATHER", "VIEW_ATTENDANCE", "VIEW_SETTINGS"])).map((perm, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#ffffff",
                          color: "#475569",
                          border: "1px solid #e2e8f0",
                          fontFamily: "monospace",
                        }}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FARM PREFERENCES & LANGUAGE */}
          {activeTab === "preferences" && system && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ ...sectionHeaderStyle, marginBottom: "4px" }}>
                  <Sliders size={18} color="#059669" />
                  {t("Farm Preferences")}
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                  {t("Configure your language preference, default farm, regional formats, and automation features.")}
                </p>
              </div>

              {/* 1. LANGUAGE SELECTION CARD IN PREFERENCE SECTION */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Globe size={18} color="#059669" />
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                    {t("Language & Localization")}
                  </h4>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                  {t("Choose your preferred system display language. Changes apply immediately.")}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {/* English Card */}
                  <button
                    type="button"
                    onClick={() => handleLanguageChange("en")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderRadius: "8px",
                      border: currentLang.startsWith("en") ? "2px solid #059669" : "1px solid #cbd5e1",
                      backgroundColor: currentLang.startsWith("en") ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: currentLang.startsWith("en") ? "#059669" : "#f1f5f9",
                            color: currentLang.startsWith("en") ? "#ffffff" : "#475569",
                          }}
                        >
                          EN
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                          {t("English")}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {t("International standard")}
                      </div>
                    </div>
                    {currentLang.startsWith("en") && (
                      <CheckCircle2 size={18} color="#059669" />
                    )}
                  </button>

                  {/* Sinhala Card */}
                  <button
                    type="button"
                    onClick={() => handleLanguageChange("si")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderRadius: "8px",
                      border: currentLang.startsWith("si") ? "2px solid #059669" : "1px solid #cbd5e1",
                      backgroundColor: currentLang.startsWith("si") ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: currentLang.startsWith("si") ? "#059669" : "#f1f5f9",
                            color: currentLang.startsWith("si") ? "#ffffff" : "#475569",
                          }}
                        >
                          සිං
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                          {t("Sinhala")}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {t("Sri Lanka")}
                      </div>
                    </div>
                    {currentLang.startsWith("si") && (
                      <CheckCircle2 size={18} color="#059669" />
                    )}
                  </button>

                  {/* Tamil Card */}
                  <button
                    type="button"
                    onClick={() => handleLanguageChange("ta")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderRadius: "8px",
                      border: currentLang.startsWith("ta") ? "2px solid #059669" : "1px solid #cbd5e1",
                      backgroundColor: currentLang.startsWith("ta") ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: currentLang.startsWith("ta") ? "#059669" : "#f1f5f9",
                            color: currentLang.startsWith("ta") ? "#ffffff" : "#475569",
                          }}
                        >
                          த
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                          {t("Tamil")}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {t("Sri Lanka")}
                      </div>
                    </div>
                    {currentLang.startsWith("ta") && (
                      <CheckCircle2 size={18} color="#059669" />
                    )}
                  </button>
                </div>
              </div>

              {/* 2. REGIONAL & FARM FORM */}
              <form onSubmit={updateSystem}>
                <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                  {t("Farm & Regional Settings")}
                </h4>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "20px",
                    marginBottom: "28px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      {t("Default Farm")} <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={system.farmName}
                      onChange={(e) => setSystem({ ...system, farmName: e.target.value })}
                      required
                      style={inputStyle}
                    >
                      <option value="">{t("Select default farm")}</option>
                      {farms.map((f) => (
                        <option key={f.id} value={f.farmName}>
                          {f.farmName}
                        </option>
                      ))}
                    </select>
                    {farms.length === 0 && !loadingFarms && (
                      <span style={{ fontSize: "11px", color: "#d97706", marginTop: "4px", display: "block" }}>
                        {t("No farms found. Default farm set to current workspace.")}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={labelStyle}>
                      {t("Timezone")} <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={system.timezone}
                      onChange={(e) => setSystem({ ...system, timezone: e.target.value })}
                      required
                      style={inputStyle}
                    >
                      <option value="">{t("Select timezone")}</option>
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      {t("Currency")} <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={system.currency}
                      onChange={(e) => setSystem({ ...system, currency: e.target.value })}
                      required
                      style={inputStyle}
                    >
                      <option value="">{t("Select currency")}</option>
                      {CURRENCIES.map((cur) => (
                        <option key={cur.value} value={cur.value}>
                          {cur.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>{t("Measurement Units")}</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setMeasurementUnit("metric")}
                        style={{
                          padding: "10px",
                          borderRadius: "6px",
                          border: measurementUnit === "metric" ? "2px solid #059669" : "1px solid #cbd5e1",
                          backgroundColor: measurementUnit === "metric" ? "#f0fdf4" : "#ffffff",
                          color: measurementUnit === "metric" ? "#065f46" : "#475569",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {t("Metric System (ha, kg, °C)")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeasurementUnit("imperial")}
                        style={{
                          padding: "10px",
                          borderRadius: "6px",
                          border: measurementUnit === "imperial" ? "2px solid #059669" : "1px solid #cbd5e1",
                          backgroundColor: measurementUnit === "imperial" ? "#f0fdf4" : "#ffffff",
                          color: measurementUnit === "imperial" ? "#065f46" : "#475569",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {t("Imperial System (ac, lbs, °F)")}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>{t("Date Format")}</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2026-09-29)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (29/09/2026)</option>
                    </select>
                  </div>
                </div>

                {/* 3. SMART AUTOMATIONS LIST */}
                <h4 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                  {t("Smart Farm Automations")}
                </h4>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginBottom: "32px",
                  }}
                >
                  {/* AI Disease Detection */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      gap: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          backgroundColor: "#f0fdf4",
                          color: "#059669",
                          marginTop: "2px",
                        }}
                      >
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "2px" }}>
                          {t("AI Disease Detection")}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                          {t("Automatically run neural network inference on uploaded crop images.")}
                        </div>
                      </div>
                    </div>
                    <Toggle
                      checked={Boolean(system.aiDiseaseDetection)}
                      onChange={(checked) =>
                        setSystem({ ...system, aiDiseaseDetection: checked })
                      }
                    />
                  </div>

                  {/* Weather Synchronization */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      gap: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          marginTop: "2px",
                        }}
                      >
                        <CloudRain size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "2px" }}>
                          {t("Weather Synchronization")}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                          {t("Keep localized weather information and forecasts automatically synchronized.")}
                        </div>
                      </div>
                    </div>
                    <Toggle
                      checked={Boolean(system.weatherSync)}
                      onChange={(checked) =>
                        setSystem({ ...system, weatherSync: checked })
                      }
                    />
                  </div>

                  {/* Automatic Backup */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      gap: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          backgroundColor: "#faf5ff",
                          color: "#9333ea",
                          marginTop: "2px",
                        }}
                      >
                        <Database size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "2px" }}>
                          {t("Automatic Cloud Backup")}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                          {t("Daily automated snapshots of farm records and inventory safely stored.")}
                        </div>
                      </div>
                    </div>
                    <Toggle
                      checked={Boolean(system.autoBackup)}
                      onChange={(checked) =>
                        setSystem({ ...system, autoBackup: checked })
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "20px",
                  }}
                >
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...primaryButtonStyle,
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    <Save size={16} />
                    {saving ? t("Saving...") : t("Save Changes")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: NOTIFICATION PREFERENCES */}
          {activeTab === "notifications" && notifications && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ ...sectionHeaderStyle, marginBottom: "4px" }}>
                    <Bell size={18} color="#059669" />
                    {t("Notification Preferences")}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                    {t("Configure automated alerts for crop anomalies, low inventory, task deadlines, and weather hazards.")}
                  </p>
                </div>

                {/* Quick Bulk Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => toggleAllNotifications(true)}
                    style={{
                      ...secondaryButtonStyle,
                      padding: "6px 12px",
                      fontSize: "12px",
                    }}
                  >
                    {t("Enable All")}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllNotifications(false)}
                    style={{
                      ...secondaryButtonStyle,
                      padding: "6px 12px",
                      fontSize: "12px",
                    }}
                  >
                    {t("Mute All")}
                  </button>
                </div>
              </div>

              <form onSubmit={updateNotifications}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginBottom: "32px",
                  }}
                >
                  {[
                    {
                      key: "diseaseAlerts" as keyof Notifications,
                      title: t("Disease alerts"),
                      desc: t("Get notified when crop disease risks or blights are detected."),
                      badge: "Critical",
                      badgeBg: "#fef2f2",
                      badgeColor: "#991b1b",
                    },
                    {
                      key: "lowStockWarnings" as keyof Notifications,
                      title: t("Low stock warnings"),
                      desc: t("Receive alerts when inventory items are running low."),
                      badge: "Inventory",
                      badgeBg: "#fefce8",
                      badgeColor: "#854d0e",
                    },
                    {
                      key: "taskReminders" as keyof Notifications,
                      title: t("Task reminders"),
                      desc: t("Receive reminders about upcoming farm and labor tasks."),
                      badge: "Tasks",
                      badgeBg: "#eff6ff",
                      badgeColor: "#1e40af",
                    },
                    {
                      key: "harvestUpdates" as keyof Notifications,
                      title: t("Harvest updates"),
                      desc: t("Get updates about harvest activities and recorded crop yields."),
                      badge: "Yield",
                      badgeBg: "#f0fdf4",
                      badgeColor: "#166534",
                    },
                    {
                      key: "weatherAlerts" as keyof Notifications,
                      title: t("Weather alerts"),
                      desc: t("Receive important weather warnings and severe forecast alerts."),
                      badge: "Forecast",
                      badgeBg: "#faf5ff",
                      badgeColor: "#7e22ce",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        gap: "16px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                            {item.title}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "10px",
                              backgroundColor: item.badgeBg,
                              color: item.badgeColor,
                            }}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                          {item.desc}
                        </p>
                      </div>

                      <Toggle
                        checked={Boolean(notifications[item.key])}
                        onChange={(value) =>
                          setNotifications({
                            ...notifications,
                            [item.key]: value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "20px",
                  }}
                >
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...primaryButtonStyle,
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    <Save size={16} />
                    {saving ? t("Saving...") : t("Save Changes")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: SECURITY & AUTHENTICATION */}
          {activeTab === "security" && security && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ ...sectionHeaderStyle, marginBottom: "4px" }}>
                  <ShieldCheck size={18} color="#059669" />
                  {t("Security")}
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                  {t("Manage your login password, two-factor authentication, and account access permissions.")}
                </p>
              </div>

              {/* Password Change Block */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <LockKeyhole size={18} color="#059669" />
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                    {t("Change Password")}
                  </h4>
                </div>
                <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#64748b" }}>
                  {t("Password must be at least 8 characters.")}
                </p>

                <form onSubmit={changePassword}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "18px",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>
                        {t("Current Password")} <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPasswords ? "text" : "password"}
                          required
                          value={passwords.currentPassword}
                          onChange={(e) =>
                            setPasswords({ ...passwords, currentPassword: e.target.value })
                          }
                          style={{ ...inputStyle, paddingRight: "40px" }}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>
                        {t("New Password")} <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPasswords ? "text" : "password"}
                          required
                          minLength={8}
                          value={passwords.newPassword}
                          onChange={(e) =>
                            setPasswords({ ...passwords, newPassword: e.target.value })
                          }
                          style={{ ...inputStyle, paddingRight: "40px" }}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>
                        {t("Confirm New Password")} <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPasswords ? "text" : "password"}
                          required
                          minLength={8}
                          value={passwords.confirmNewPassword}
                          onChange={(e) =>
                            setPasswords({ ...passwords, confirmNewPassword: e.target.value })
                          }
                          style={{ ...inputStyle, paddingRight: "40px" }}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        ...primaryButtonStyle,
                        opacity: saving ? 0.7 : 1,
                        cursor: saving ? "not-allowed" : "pointer",
                      }}
                    >
                      <Save size={16} />
                      {saving ? t("Saving...") : t("Change Password")}
                    </button>
                  </div>
                </form>
              </div>

              {/* Two-Factor Authentication Block */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                }}
              >
                <form onSubmit={updateSecurity}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          backgroundColor: "#f0fdf4",
                          color: "#059669",
                          marginTop: "2px",
                        }}
                      >
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "2px" }}>
                          {t("Two-Factor Authentication")}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                          {t("Require an additional verification step when signing in to protect your farm data.")}
                        </div>
                      </div>
                    </div>

                    <Toggle
                      checked={Boolean(security.twoFactorAuthentication)}
                      onChange={(checked) =>
                        setSecurity({ twoFactorAuthentication: checked })
                      }
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      borderTop: "1px solid #e2e8f0",
                      paddingTop: "16px",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        ...primaryButtonStyle,
                        opacity: saving ? 0.7 : 1,
                        cursor: saving ? "not-allowed" : "pointer",
                      }}
                    >
                      <Save size={16} />
                      {saving ? t("Saving...") : t("Save Changes")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}