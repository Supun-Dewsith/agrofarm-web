import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  Bell,
  Check,
  CircleUserRound,
  Eye,
  EyeOff,
  LockKeyhole,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Upload,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

import { fetchWithAuth } from "../utils/auth";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:80"
).replace(/\/+$/, "");

const SETTINGS_API = `${API_BASE_URL}/api/v1/settings`;

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

const TIMEZONES = [
  { value: "Asia/Colombo", label: "Asia/Colombo (UTC+05:30)" },
  { value: "UTC", label: "UTC (UTC+00:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+07:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+08:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
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

type Tab = "profile" | "notifications" | "security" | "system";

interface Profile {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  imageUrl: string | null;
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
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getInitials(profile: Profile | null) {
  const first = profile?.firstName?.trim()?.[0] || "";
  const last = profile?.lastName?.trim()?.[0] || "";
  const initials = `${first}${last}`;

  return (
    initials ||
    profile?.username?.slice(0, 2) ||
    "US"
  ).toUpperCase();
}

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
      className={`
        relative h-6 w-11 rounded-full
        transition-colors
        ${checked ? "bg-emerald-600" : "bg-slate-300"}
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          absolute top-1 h-4 w-4
          rounded-full bg-white
          shadow-sm transition-transform
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Bell;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5">
        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-11 w-full rounded-xl
          border border-slate-200
          bg-white px-3.5
          text-sm text-slate-800
          outline-none
          transition
          focus:border-emerald-500
          focus:ring-2
          focus:ring-emerald-100
        "
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>

      <select
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-11 w-full rounded-xl
          border border-slate-200
          bg-white px-3.5
          text-sm text-slate-800
          outline-none transition
          focus:border-emerald-500
          focus:ring-2
          focus:ring-emerald-100
          disabled:bg-slate-50
          disabled:text-slate-400
        "
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveButton({
  loading,
  children = "Save changes",
}: {
  loading: boolean;
  children?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        inline-flex h-10
        items-center gap-2
        rounded-xl
        bg-emerald-700
        px-4
        text-sm font-semibold
        text-white
        shadow-sm
        transition
        hover:bg-emerald-800
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
    >
      {loading ? (
        <span
          className="
            h-4 w-4
            animate-spin
            rounded-full
            border-2
            border-white/40
            border-t-white
          "
        />
      ) : (
        <Save className="h-4 w-4" />
      )}

      {loading ? "Saving..." : children}
    </button>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notifications | null>(null);
  const [security, setSecurity] = useState<Security | null>(null);
  const [system, setSystem] = useState<SystemSettings | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);

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

  const tabs = useMemo(
    () => [
      { id: "profile" as Tab, label: "Profile", icon: UserRound },
      { id: "notifications" as Tab, label: "Notifications", icon: Bell },
      { id: "security" as Tab, label: "Security", icon: ShieldCheck },
      { id: "system" as Tab, label: "System", icon: Wrench },
    ],
    []
  );

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

      if (!response.ok) {
        throw new Error(
          await readError(response, `Failed to load farms (${response.status})`)
        );
      }

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
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Failed to load farms"
      );
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
        throw new Error(await readError(profileResponse, "Failed to load profile"));
      }
      if (!notificationsResponse.ok) {
        throw new Error(await readError(notificationsResponse, "Failed to load notifications"));
      }
      if (!securityResponse.ok) {
        throw new Error(await readError(securityResponse, "Failed to load security settings"));
      }
      if (!systemResponse.ok) {
        throw new Error(await readError(systemResponse, "Failed to load system settings"));
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
        error instanceof Error ? error.message : "Failed to load settings"
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
      notify("error", "Profile image must not exceed 5 MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      notify("error", "Profile image must be JPG or PNG.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const updateProfile = async (event: FormEvent) => {
    event.preventDefault();

    if (!profileForm.firstName.trim()) {
      notify("error", "First name is required.");
      return;
    }
    if (!profileForm.email.trim()) {
      notify("error", "Email is required.");
      return;
    }
    if (selectedFile && selectedFile.size > MAX_PROFILE_IMAGE_SIZE) {
      notify("error", "Profile image must not exceed 5 MB.");
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
          await readError(response, `Failed to update profile (${response.status})`)
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

      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      if (fileRef.current) {
        fileRef.current.value = "";
      }

      notify("success", "Profile updated successfully.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!passwords.currentPassword) {
      notify("error", "Current password is required.");
      return;
    }
    if (passwords.newPassword.length < 8) {
      notify("error", "New password must be at least 8 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmNewPassword) {
      notify("error", "New password and confirmation do not match.");
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
          await readError(
            response,
            `Failed to change password (${response.status})`
          )
        );
      }

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });

      notify("success", "Password changed successfully.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Failed to change password."
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
          await readError(response, "Failed to update notifications.")
        );
      }

      const updated = (await response.json()) as Notifications;
      setNotifications(updated);

      notify("success", "Notification settings saved successfully.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Failed to update notifications."
      );
    } finally {
      setSaving(false);
    }
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
          await readError(response, "Failed to update security settings.")
        );
      }

      const updated = (await response.json()) as Security;
      setSecurity(updated);

      notify("success", "Security settings saved successfully.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Failed to update security settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateSystem = async (event: FormEvent) => {
    event.preventDefault();
    if (!system) return;

    if (!system.farmName) {
      notify("error", "Please select a farm.");
      return;
    }
    if (!system.timezone) {
      notify("error", "Please select a timezone.");
      return;
    }
    if (!system.currency) {
      notify("error", "Please select a currency.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetchWithAuth("/api/v1/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(system),
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, "Failed to update system preferences.")
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

      notify("success", "System preferences saved successfully.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Failed to update system preferences."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-emerald-700">
          <SettingsIcon className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.18em]">
            Account settings
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, notifications, security and farm preferences.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {message.text}
          </div>
          <button type="button" onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Preferences
            </p>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition
                    ${
                      active
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      active ? "text-emerald-700" : "text-slate-400"
                    }`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {activeTab === "profile" && profile && (
            <>
              <SectionCard
                title="Profile information"
                description="Update the personal details associated with your account."
                icon={CircleUserRound}
              >
                <form onSubmit={updateProfile} className="space-y-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative h-20 w-20 shrink-0">
                      {previewUrl || makeImageUrl(profile.imageUrl) ? (
                        <img
                          src={
                            previewUrl ||
                            makeImageUrl(profile.imageUrl) ||
                            ""
                          }
                          alt="Profile"
                          className="h-20 w-20 rounded-2xl object-cover ring-4 ring-emerald-50"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-800 text-xl font-bold text-white ring-4 ring-emerald-50">
                          {getInitials(profile)}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {profile.username}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        JPG or PNG, maximum 5 MB
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg, image/jpg, image/png"
                        className="hidden"
                        onChange={(e) => selectPhoto(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Change photo
                      </button>
                      {selectedFile && (
                        <p className="mt-2 max-w-xs truncate text-xs text-emerald-700">
                          {selectedFile.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="First name"
                      required
                      value={profileForm.firstName}
                      onChange={(value) =>
                        setProfileForm({ ...profileForm, firstName: value })
                      }
                    />
                    <Field
                      label="Last name"
                      value={profileForm.lastName}
                      onChange={(value) =>
                        setProfileForm({ ...profileForm, lastName: value })
                      }
                    />
                    <Field
                      label="Email"
                      required
                      type="email"
                      value={profileForm.email}
                      onChange={(value) =>
                        setProfileForm({ ...profileForm, email: value })
                      }
                    />
                    <Field
                      label="Phone number"
                      value={profileForm.phoneNumber}
                      onChange={(value) =>
                        setProfileForm({ ...profileForm, phoneNumber: value })
                      }
                      placeholder="+94 7X XXX XXXX"
                    />
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-5">
                    <SaveButton loading={saving} />
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                title="Change password"
                description="Password must contain at least 8 characters."
                icon={LockKeyhole}
              >
                <form onSubmit={changePassword} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-3">
                    {(
                      [
                        "currentPassword",
                        "newPassword",
                        "confirmNewPassword",
                      ] as const
                    ).map((key) => (
                      <label key={key} className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          {key === "currentPassword"
                            ? "Current password"
                            : key === "newPassword"
                            ? "New password"
                            : "Confirm new password"}
                        </span>
                        <div className="relative">
                          <input
                            type={showPasswords ? "text" : "password"}
                            required
                            minLength={key === "newPassword" ? 8 : undefined}
                            value={passwords[key]}
                            onChange={(e) =>
                              setPasswords({
                                ...passwords,
                                [key]: e.target.value,
                              })
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 px-3.5 pr-10 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          />
                          <button
                            type="button"
                            aria-label={
                              showPasswords ? "Hide password" : "Show password"
                            }
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showPasswords ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <SaveButton loading={saving}>Change password</SaveButton>
                  </div>
                </form>
              </SectionCard>
            </>
          )}

          {activeTab === "notifications" && notifications && (
            <SectionCard
              title="Notification preferences"
              description="Choose which farm alerts and reminders you want to receive."
              icon={Bell}
            >
              <form onSubmit={updateNotifications} className="divide-y divide-slate-100">
                {[
                  [
                    "diseaseAlerts",
                    "Disease alerts",
                    "Get notified when crop disease risks are detected.",
                  ],
                  [
                    "lowStockWarnings",
                    "Low stock warnings",
                    "Receive alerts when inventory items are running low.",
                  ],
                  [
                    "taskReminders",
                    "Task reminders",
                    "Receive reminders about upcoming farm tasks.",
                  ],
                  [
                    "harvestUpdates",
                    "Harvest updates",
                    "Get updates about harvest activities and records.",
                  ],
                  [
                    "weatherAlerts",
                    "Weather alerts",
                    "Receive important weather and forecast alerts.",
                  ],
                ].map(([key, title, description]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {description}
                      </p>
                    </div>
                    <Toggle
                      checked={notifications[key as keyof Notifications]}
                      onChange={(value) =>
                        setNotifications({
                          ...notifications,
                          [key]: value,
                        })
                      }
                    />
                  </div>
                ))}
                <div className="flex justify-end pt-5">
                  <SaveButton loading={saving} />
                </div>
              </form>
            </SectionCard>
          )}

          {activeTab === "security" && security && (
            <SectionCard
              title="Security settings"
              description="Protect your account with additional authentication."
              icon={ShieldCheck}
            >
              <form onSubmit={updateSecurity} className="space-y-5">
                <div className="flex items-center justify-between gap-5 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm">
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Two-factor authentication
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Require an additional verification step when signing in.
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={security.twoFactorAuthentication}
                    onChange={(value) =>
                      setSecurity({ twoFactorAuthentication: value })
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <SaveButton loading={saving} />
                </div>
              </form>
            </SectionCard>
          )}

          {activeTab === "system" && system && (
            <SectionCard
              title="System preferences"
              description="Configure your default farm, regional settings and automation preferences."
              icon={Wrench}
            >
              <form onSubmit={updateSystem} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField
                    label="Farm"
                    required
                    value={system.farmName}
                    onChange={(value) => setSystem({ ...system, farmName: value })}
                    disabled={loadingFarms && farms.length === 0}
                    options={farms.map((farm) => ({
                      value: farm.farmName,
                      label: farm.farmName,
                    }))}
                  />
                  <SelectField
                    label="Timezone"
                    required
                    value={system.timezone}
                    onChange={(value) => setSystem({ ...system, timezone: value })}
                    options={TIMEZONES}
                  />
                  <SelectField
                    label="Currency"
                    required
                    value={system.currency}
                    onChange={(value) => setSystem({ ...system, currency: value })}
                    options={CURRENCIES}
                  />
                </div>

                {farms.length === 0 && !loadingFarms && (
                  <p className="text-xs text-amber-600">
                    No farms were found. Create a farm first in Farm Management.
                  </p>
                )}

                <div className="space-y-1 divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {[
                    [
                      "autoBackup",
                      "Automatic backup",
                      "Keep your farm settings and data protected with automatic backups.",
                    ],
                    [
                      "aiDiseaseDetection",
                      "AI disease detection",
                      "Enable AI-powered crop disease detection features.",
                    ],
                    [
                      "weatherSync",
                      "Weather synchronization",
                      "Keep weather information synchronized with the system.",
                    ],
                  ].map(([key, title, description]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-5 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {description}
                        </p>
                      </div>
                      <Toggle
                        checked={Boolean(system[key as keyof SystemSettings])}
                        onChange={(value) =>
                          setSystem({
                            ...system,
                            [key]: value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <SaveButton loading={saving} />
                </div>
              </form>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}