import React, { useState, useEffect, useRef } from "react";
import {
  fetchWithAuth,
  registerUserByAdmin,
  updateUserByAdmin,
  getAuthData,
  type RegisterUserPayload,
} from "~/utils/auth";
import { AVAILABLE_PERMISSIONS } from "../utils/constants";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound, Copy, Check, Search, Pencil, UserCheck, X, Users, ChevronDown, ChevronUp } from "lucide-react";

export interface RegisteredUser {
  id?: string | number;
  username: string;
  email: string;
  role: "SUPERVISOR" | "ADMIN" | "FARMER";
  permissions: string[];
  imageUrl?: string | null;
  farmIds?: number[];
}

export interface FarmSummary {
  id: number;
  ownerId: number;
  farmName: string;
  farmAddress: string;
  latitude: number;
  longitude: number;
  supervisorNames?: string[];
  farmerNames?: string[];
}

export interface AvailableFarmsResponse {
  farms: FarmSummary[];
  totalCount: number;
}

export interface ExtendedRegisterPayload extends RegisterUserPayload {
  farmIds: number[];
}

// Admin is removed from registerable roles: only SUPERVISOR and FARMER can be registered/managed
export type RegisterableRole = "SUPERVISOR" | "FARMER";

// Permissions that are always enabled and cannot be unticked for any role
const DEFAULT_PERMISSIONS = [
  "VIEW_DASHBOARD",
  "VIEW_FARM_MANAGEMENT",
  "VIEW_ATTENDANCE",
  "VIEW_WEATHER",
  "VIEW_TASKS",
  "VIEW_SETTINGS",
];

export default function UserRegistration() {
  const { t } = useTranslation();

  const authData = getAuthData();
  const currentUserRole = authData?.role?.toUpperCase();
  const isSupervisorUser = currentUserRole === "SUPERVISOR";

  // Role options: Admin can register Supervisor and Farmer, but Supervisor can only register Farmer
  const availableRolesToRegister: RegisterableRole[] = isSupervisorUser
    ? ["FARMER"]
    : ["SUPERVISOR", "FARMER"];

  const defaultRole: RegisterableRole = isSupervisorUser ? "FARMER" : "SUPERVISOR";

  const [formData, setFormData] = useState<ExtendedRegisterPayload>(() => ({
    username: "",
    email: "",
    password: "",
    role: defaultRole,
    permissions: [...DEFAULT_PERMISSIONS],
    farmIds: [],
  }));

  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [hoveredFarmId, setHoveredFarmId] = useState<number | null>(null);
  const [openDropdownFarmId, setOpenDropdownFarmId] = useState<number | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableFarms, setAvailableFarms] = useState<FarmSummary[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const generateTemporaryPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%&*";
    const allChars = upper + lower + numbers + symbols;

    let pass = "";
    pass += upper[Math.floor(Math.random() * upper.length)];
    pass += lower[Math.floor(Math.random() * lower.length)];
    pass += numbers[Math.floor(Math.random() * numbers.length)];
    pass += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 10; i++) {
      pass += allChars[Math.floor(Math.random() * allChars.length)];
    }

    const shuffled = pass.split("").sort(() => Math.random() - 0.5).join("");
    setFormData((prev) => ({ ...prev, password: shuffled }));
    setShowPassword(true);
  };

  const handleCopyPassword = () => {
    if (!formData.password) return;
    navigator.clipboard.writeText(formData.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const fetchAvailableFarms = async () => {
    const auth = getAuthData();
    const userId = auth?.id;
    const userRole = auth?.role?.toUpperCase();

    if (!userId && userRole !== "ADMIN") {
      console.warn("No active user ID found in session.");
      return;
    }

    setLoadingFarms(true);
    try {
      // Admin sees all farms, Supervisor sees assigned/owned farms
      const endpoint = userRole === "ADMIN" ? "/api/users/farms" : `/api/users/farms/${userId}`;
      const response = await fetchWithAuth(endpoint, {
        method: "GET",
      });
      if (response.ok) {
        const data = (await response.json()) as AvailableFarmsResponse;
        setAvailableFarms(data.farms || []);
      }
    } catch (err) {
      console.error("Failed to load available farms:", err);
    } finally {
      setLoadingFarms(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetchWithAuth("/api/users", { method: "GET" });
      if (response.ok) {
        const data = (await response.json()) as RegisteredUser[];
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAvailableFarms();
  }, []);

  useEffect(() => {
    const handleDocClick = () => {
      setOpenDropdownFarmId(null);
    };
    window.addEventListener("click", handleDocClick);
    return () => window.removeEventListener("click", handleDocClick);
  }, []);

  const handleStartEdit = (u: RegisteredUser) => {
    setEditingUser(u);
    setStatusMessage(null);

    const targetRole: RegisterableRole = isSupervisorUser
      ? "FARMER"
      : (u.role === "ADMIN" ? "SUPERVISOR" : u.role as RegisterableRole);

    setFormData({
      username: u.username,
      email: u.email,
      password: "", // empty means keep existing password on update
      role: targetRole,
      permissions: Array.from(new Set([...DEFAULT_PERMISSIONS, ...(u.permissions || [])])),
      farmIds: u.farmIds || [],
    });

    setAvatarFile(null);
    setAvatarPreview(u.imageUrl || null);
    setShowPassword(false);

    // Scroll smoothly to top of form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      role: defaultRole,
      permissions: [...DEFAULT_PERMISSIONS],
      farmIds: [],
    });
    clearImage();
    setShowPassword(false);
    setStatusMessage(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "role" && value === "FARMER") {
        // Rule: Can register user permission should be disabled when system role selected to farmer
        updated.permissions = updated.permissions.filter(
          (p) => p !== "CAN_REGISTER_USERS"
        );
        // Farmers can only be assigned to a single farm
        if (updated.farmIds.length > 1) {
          updated.farmIds = [updated.farmIds[0]];
        }
      }
      return updated;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: t("Please select a valid image file.") });
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePermissionToggle = (permission: string) => {
    // Default permissions cannot be toggled off
    if (DEFAULT_PERMISSIONS.includes(permission)) return;

    // Rule: CAN_REGISTER_USERS permission is disabled when system role is Farmer
    if (permission === "CAN_REGISTER_USERS" && formData.role === "FARMER") {
      return;
    }

    setFormData((prev) => {
      const exists = prev.permissions.includes(permission);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  const handleFarmToggle = (farmId: number) => {
    setFormData((prev) => {
      if (prev.role === "FARMER") {
        const isSelected = prev.farmIds.includes(farmId);
        return { ...prev, farmIds: isSelected ? [] : [farmId] };
      } else {
        const exists = prev.farmIds.includes(farmId);
        return {
          ...prev,
          farmIds: exists
            ? prev.farmIds.filter((id) => id !== farmId)
            : [...prev.farmIds, farmId],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setStatusMessage(null);

    // Rule: Make unable to register/update user without farm allocation
    if (formData.farmIds.length === 0) {
      setStatusMessage({
        type: "error",
        text: t("Farm allocation is required. Please select at least one farm."),
      });
      setLoadingSubmit(false);
      return;
    }

    if (formData.role === "FARMER" && formData.farmIds.length > 1) {
      setStatusMessage({
        type: "error",
        text: t("Farmers can only be assigned to a single farm."),
      });
      setLoadingSubmit(false);
      return;
    }

    // Role validation: Supervisor can only register or edit Farmer
    if (isSupervisorUser && formData.role !== "FARMER") {
      setStatusMessage({
        type: "error",
        text: t("Supervisors can only register or edit Farmers."),
      });
      setLoadingSubmit(false);
      return;
    }

    try {
      // Ensure CAN_REGISTER_USERS is stripped for FARMER
      const payloadToSubmit = {
        ...formData,
        permissions:
          formData.role === "FARMER"
            ? formData.permissions.filter((p) => p !== "CAN_REGISTER_USERS")
            : formData.permissions,
      };

      if (editingUser) {
        await updateUserByAdmin(editingUser.id!, payloadToSubmit, avatarFile);
        setStatusMessage({
          type: "success",
          text: t('Staff member "{{username}}" updated successfully!', {
            username: formData.username,
          }),
        });
      } else {
        await registerUserByAdmin(payloadToSubmit as any, avatarFile);
        setStatusMessage({
          type: "success",
          text: t('User "{{username}}" registered successfully!', {
            username: formData.username,
          }),
        });
      }

      setFormData({
        username: "",
        email: "",
        password: "",
        role: defaultRole,
        permissions: [...DEFAULT_PERMISSIONS],
        farmIds: [],
      });
      setEditingUser(null);
      clearImage();
      setShowPassword(false);
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || t("An error occurred while saving user."),
      });
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Staff filtering: Admin sees all Supervisors & Farmers; Supervisor sees ONLY Farmers allocated to their farms
  const availableStaff = users.filter((u) => {
    if (currentUserRole === "ADMIN") {
      if (u.role !== "SUPERVISOR" && u.role !== "FARMER") return false;
    } else if (currentUserRole === "SUPERVISOR") {
      if (u.role !== "FARMER") return false;

      // Supervisor should only see farmers that are allocated to their farms only
      const supervisorFarmIds = availableFarms.map((f) => f.id);
      if (supervisorFarmIds.length > 0) {
        const farmerFarmIds = u.farmIds || [];
        const isAllocatedToSupervisorFarms = farmerFarmIds.some((fid) =>
          supervisorFarmIds.includes(fid)
        );
        if (!isAllocatedToSupervisorFarms) return false;
      }
    } else {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const isFarmer = formData.role === "FARMER";

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
    marginBottom: "8px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#1e293b",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 700,
    color: "#334155",
    marginTop: 0,
    marginBottom: "24px",
  };

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

      {statusMessage && (
        <div style={{
          padding: "16px", marginBottom: "32px", borderRadius: "8px", fontSize: "14px", fontWeight: 500,
          backgroundColor: statusMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
          color: statusMessage.type === "success" ? "#166534" : "#991b1b",
          border: `1px solid ${statusMessage.type === "success" ? "#bbf7d0" : "#fecaca"}`,
        }}>
          {statusMessage.text}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start"
        style={{ width: "100%" }}
      >

        {/* LEFT PANE (Media & Available Staff) */}
        <div className="w-full lg:w-[280px] shrink-0">

          {/* Media Block */}
          <div>
            <h3 style={sectionHeaderStyle}>{t("Account Media")}</h3>

            <div style={{
              position: "relative", width: "100%", aspectRatio: "4/3", backgroundColor: "#f8fafc",
              borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: "16px",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {avatarPreview ? (
                <>
                  <img src={avatarPreview} alt={t("Avatar")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={clearImage} style={{
                    position: "absolute", top: "12px", right: "12px", width: "28px", height: "28px",
                    borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.9)", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#64748b", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}>✕</button>
                </>
              ) : (
                <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>{t("No Image Selected")}</span>
              )}
            </div>

            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} style={{ display: "none" }} />

            <button type="button" onClick={() => fileInputRef.current?.click()} style={{
              width: "100%", padding: "12px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1",
              borderRadius: "6px", color: "#334155", fontSize: "14px", fontWeight: 600, cursor: "pointer", marginBottom: "16px"
            }}>
              {t("Upload Photo")}
            </button>

            <button type="submit" disabled={loadingSubmit} style={{
              width: "100%", padding: "14px", backgroundColor: "#059669", color: "#ffffff",
              border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: loadingSubmit ? "not-allowed" : "pointer",
              opacity: loadingSubmit ? 0.7 : 1, transition: "background-color 0.2s, opacity 0.2s"
            }}>
              {loadingSubmit
                ? (editingUser ? t("Updating...") : t("Processing..."))
                : (editingUser ? t("Save Changes") : t("Register New User"))}
            </button>

            {editingUser && (
              <button type="button" onClick={handleCancelEdit} style={{
                width: "100%", padding: "10px", marginTop: "10px", backgroundColor: "#f8fafc",
                color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "6px",
                fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
              }}>
                ✕ {t("Cancel Edit / New User")}
              </button>
            )}
          </div>

          {/* Left Pane Divider */}
          <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "32px 0" }} />

          {/* Available Staff Block */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
                {t("Available Staff")}
              </h3>
              <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", backgroundColor: "#f1f5f9", color: "#475569" }}>
                {availableStaff.length}
              </span>
            </div>

            {/* Search Bar */}
            <div style={{ position: "relative", marginBottom: "14px" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("Search by name, email, role...")}
                style={{
                  width: "100%",
                  padding: "8px 30px 8px 34px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  color: "#1e293b",
                  boxSizing: "border-box",
                  outline: "none",
                  backgroundColor: "#ffffff",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title={t("Clear search")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {loadingUsers ? (
              <div className="space-y-2.5 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#e2e8f0", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ width: "70px", height: "12px", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
                        <div style={{ width: "50px", height: "14px", backgroundColor: "#f1f5f9", borderRadius: "10px" }} />
                      </div>
                      <div style={{ width: "110px", height: "10px", backgroundColor: "#f1f5f9", borderRadius: "4px" }} />
                    </div>
                    <div style={{ width: "42px", height: "24px", backgroundColor: "#f1f5f9", borderRadius: "4px", flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            ) : availableStaff.length === 0 ? (
              <div style={{ padding: "20px 16px", border: "1px dashed #cbd5e1", borderRadius: "8px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                {searchQuery ? t("No staff found matching query.") : t("No staff registered yet.")}
              </div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxHeight: "440px",
                overflowY: "auto",
                paddingRight: "4px"
              }}>
                {availableStaff.map((u, idx) => {
                  const isEditingThis = editingUser?.id === u.id;
                  const roleBgColor = u.role === "SUPERVISOR" ? "#f0fdf4" : "#eff6ff";
                  const roleTextColor = u.role === "SUPERVISOR" ? "#166534" : "#1e40af";

                  return (
                    <div key={u.id || idx} style={{
                      display: "flex", alignItems: "center", gap: "10px", padding: "10px",
                      border: isEditingThis ? "2px solid #059669" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      backgroundColor: isEditingThis ? "#f0fdf4" : "#ffffff",
                      transition: "all 0.15s",
                    }}>
                      {u.imageUrl ? (
                        <img
                          src={u.imageUrl}
                          alt={u.username}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector<HTMLElement>(".user-avatar-fallback");
                            if (fallback) {
                              fallback.style.display = "flex";
                            }
                          }}
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            flexShrink: 0,
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      ) : null}
                      <div
                        className="user-avatar-fallback"
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                          display: u.imageUrl ? "none" : "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "13px",
                          flexShrink: 0,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                          <span style={{ fontWeight: 700, fontSize: "13px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {u.username}
                          </span>
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "10px", backgroundColor: roleBgColor, color: roleTextColor }}>
                            {t(u.role)}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(u)}
                        style={{
                          padding: "5px 8px",
                          borderRadius: "4px",
                          border: isEditingThis ? "1px solid #059669" : "1px solid #cbd5e1",
                          backgroundColor: isEditingThis ? "#059669" : "#ffffff",
                          color: isEditingThis ? "#ffffff" : "#475569",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                        title={isEditingThis ? t("Currently editing") : t("Edit staff details")}
                      >
                        <Pencil size={11} />
                        {isEditingThis ? t("Editing") : t("Edit")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CENTER DIVIDER LINE (Visible on desktop) */}
        <div
          className="hidden lg:block"
          style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch" }}
        />

        {/* RIGHT PANE (Data Entry / Editing) */}
        <div style={{ flex: 1, minWidth: 0, width: "100%" }}>

          {/* Edit Mode Notice Banner */}
          {editingUser && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 18px",
              backgroundColor: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "8px",
              marginBottom: "28px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <UserCheck size={18} color="#059669" />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#065f46" }}>
                  {t("Editing Staff:")} <span style={{ fontWeight: 700 }}>{editingUser.username}</span>
                </span>
                <span style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor: "#059669",
                  color: "#ffffff"
                }}>
                  {t(editingUser.role)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ✕ {t("Cancel Edit")}
              </button>
            </div>
          )}

          <h3 style={sectionHeaderStyle}>
            {editingUser ? t("Edit Profile Information") : t("Profile Information")}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "48px" }}>
            <div>
              <label style={labelStyle}>
                {t("Username")} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                style={inputStyle}
                placeholder={t("Enter username (3-50 characters)")}
                minLength={3}
                maxLength={50}
              />
            </div>
            <div>
              <label style={labelStyle}>
                {t("Email Address")} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={inputStyle}
                placeholder={t("e.g., alex@example.com")}
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  {t("Temporary Password")} {!editingUser && <span style={{ color: "#ef4444" }}>*</span>}
                  {editingUser && (
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 400, marginLeft: "4px" }}>
                      ({t("leave empty to keep current")})
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={generateTemporaryPassword}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#059669",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#ecfdf5")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  title={t("Generate a secure temporary password")}
                >
                  <KeyRound size={13} />
                  {t("Generate Password")}
                </button>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                  style={{ ...inputStyle, paddingRight: formData.password ? "72px" : "42px" }}
                  placeholder={
                    editingUser
                      ? t("Leave blank to keep existing password, or enter new")
                      : t("Enter password (min 6 characters)")
                  }
                  minLength={formData.password ? 6 : undefined}
                  maxLength={100}
                />
                <div style={{ position: "absolute", right: "8px", display: "flex", alignItems: "center", gap: "2px" }}>
                  {formData.password ? (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      title={copiedPassword ? t("Copied!") : t("Copy password")}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedPassword ? "#059669" : "#94a3b8",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px",
                        borderRadius: "4px",
                      }}
                    >
                      {copiedPassword ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? t("Hide temporary password") : t("Show temporary password")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px",
                      borderRadius: "4px",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                {t("System Role")} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={availableRolesToRegister.length === 1}
                style={{
                  ...inputStyle,
                  cursor: availableRolesToRegister.length === 1 ? "not-allowed" : "pointer",
                  backgroundColor: availableRolesToRegister.length === 1 ? "#f8fafc" : "#fff",
                  color: availableRolesToRegister.length === 1 ? "#475569" : "#1e293b",
                }}
              >
                {availableRolesToRegister.map((role) => (
                  <option key={role} value={role}>{t(role)}</option>
                ))}
              </select>
              {isSupervisorUser && (
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  {t("Supervisors can only register or edit Farmers.")}
                </span>
              )}
            </div>
          </div>

          <h3 style={sectionHeaderStyle}>
            {editingUser ? t("Edit System Permissions") : t("System Permissions")}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "48px"
            }}
          >
            {AVAILABLE_PERMISSIONS.map((perm) => {
              const isDefault = DEFAULT_PERMISSIONS.includes(perm);
              const isCanRegisterUsers = perm === "CAN_REGISTER_USERS";
              const isRegistrationDisabled = isCanRegisterUsers && isFarmer;
              const isControlDisabled = isDefault || isRegistrationDisabled;

              const isChecked = isRegistrationDisabled
                ? false
                : formData.permissions.includes(perm);

              return (
                <label
                  key={perm}
                  title={
                    isRegistrationDisabled
                      ? t("Can Register Users permission is disabled for Farmers")
                      : isDefault
                        ? t("Default permission required for system access")
                        : ""
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "13px",
                    color: isControlDisabled ? "#94a3b8" : "#475569",
                    cursor: isControlDisabled ? "not-allowed" : "pointer",
                    opacity: isControlDisabled ? 0.6 : 1,
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handlePermissionToggle(perm)}
                    disabled={isControlDisabled}
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: isControlDisabled ? "#94a3b8" : "#059669",
                      cursor: isControlDisabled ? "not-allowed" : "pointer",
                    }}
                  />
                  <span style={{ textTransform: "capitalize", display: "flex", alignItems: "center", gap: "6px" }}>
                    {t(perm.replace(/_/g, ' '))}
                    {isRegistrationDisabled && (
                      <span style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        backgroundColor: "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 600,
                        textTransform: "none",
                      }}>
                        {t("Disabled for Farmers")}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
              {editingUser ? t("Edit Farm Allocations") : t("Farm Allocations")} <span style={{ color: "#ef4444" }}>*</span>
            </h3>
            <span style={{ fontSize: "12px", color: formData.farmIds.length === 0 ? "#e11d48" : "#059669", fontWeight: 600 }}>
              {formData.farmIds.length === 0
                ? `* ${t("Farm allocation required")}`
                : `${formData.farmIds.length} ${t("allocated")}`}
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
            {isFarmer
              ? t("Select exactly 1 farm to assign to this farmer (Required).")
              : t("Select at least 1 farm to assign to this supervisor (Required).")}
          </p>

          <div>
            {loadingFarms ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "16px",
                }}
                className="animate-pulse"
              >
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ width: "100px", height: "14px", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
                      <div style={{ width: "16px", height: "16px", backgroundColor: "#f1f5f9", borderRadius: "4px" }} />
                    </div>
                    <div style={{ width: "150px", height: "12px", backgroundColor: "#f1f5f9", borderRadius: "4px", marginBottom: "14px" }} />
                    <div style={{ width: "70px", height: "20px", backgroundColor: "#f1f5f9", borderRadius: "12px" }} />
                  </div>
                ))}
              </div>
            ) : availableFarms.length === 0 ? (
              <div style={{ padding: "24px", border: "1px dashed #cbd5e1", borderRadius: "8px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                {t("No farms available for allocation. At least one farm is required to save staff.")}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {availableFarms.map((farm) => {
                  const isSelected = formData.farmIds.includes(farm.id);

                  // Merge backend staff with client users for 100% precision
                  const supervisorsFromUsers = users
                    .filter((u) => u.role === "SUPERVISOR" && u.farmIds?.includes(farm.id))
                    .map((u) => u.username);
                  const farmersFromUsers = users
                    .filter((u) => u.role === "FARMER" && u.farmIds?.includes(farm.id))
                    .map((u) => u.username);

                  const allSupervisors = Array.from(
                    new Set([...(farm.supervisorNames || []), ...supervisorsFromUsers])
                  );
                  const allFarmers = Array.from(
                    new Set([...(farm.farmerNames || []), ...farmersFromUsers])
                  );
                  const totalAllocated = allSupervisors.length + allFarmers.length;
                  const isDropdownOpen = hoveredFarmId === farm.id || openDropdownFarmId === farm.id;

                  return (
                    <div
                      key={farm.id}
                      onClick={() => handleFarmToggle(farm.id)}
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        border: `1px solid ${isSelected ? "#059669" : "#e2e8f0"}`,
                        backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
                        position: "relative",
                        zIndex: isDropdownOpen ? 30 : 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: isSelected ? "#065f46" : "#334155" }}>
                          {farm.farmName}
                        </span>
                        <input
                          type={isFarmer ? "radio" : "checkbox"}
                          checked={isSelected}
                          readOnly
                          style={{ accentColor: "#059669" }}
                        />
                      </div>

                      <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px 0" }}>
                        {farm.farmAddress}
                      </p>

                      {/* Small hover expandable dropdown badge */}
                      <div
                        style={{ position: "relative", display: "inline-block" }}
                        onMouseEnter={() => setHoveredFarmId(farm.id)}
                        onMouseLeave={() => setHoveredFarmId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownFarmId((prev) => (prev === farm.id ? null : farm.id));
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 8px",
                            borderRadius: "14px",
                            backgroundColor: isDropdownOpen ? "#dcfce7" : "#f1f5f9",
                            border: `1px solid ${isDropdownOpen ? "#86efac" : "#e2e8f0"}`,
                            color: isDropdownOpen ? "#166534" : "#475569",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          title={t("Hover or click to view allocated supervisors and farmers")}
                        >
                          <Users size={12} />
                          <span>
                            {totalAllocated === 0
                              ? t("0 Staff")
                              : t("{{count}} Staff", { count: totalAllocated })}
                          </span>
                          {isDropdownOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </div>

                        {/* Expandable Dropdown Popover */}
                        {isDropdownOpen && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              paddingTop: "6px",
                              zIndex: 100,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                width: "260px",
                                backgroundColor: "#ffffff",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
                                padding: "12px",
                                cursor: "default",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #f1f5f9" }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  {t("Allocated Staff")}
                                </span>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "8px", backgroundColor: "#f1f5f9", color: "#64748b" }}>
                                  {totalAllocated}
                                </span>
                              </div>

                              {/* Supervisors Section */}
                              <div style={{ marginBottom: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#065f46", marginBottom: "4px" }}>
                                  <span>👑</span>
                                  <span>{t("Supervisors")} ({allSupervisors.length})</span>
                                </div>
                                {allSupervisors.length === 0 ? (
                                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>
                                    {t("No supervisors assigned")}
                                  </p>
                                ) : (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                    {allSupervisors.map((name) => (
                                      <span
                                        key={name}
                                        style={{
                                          fontSize: "10px",
                                          fontWeight: 600,
                                          padding: "2px 6px",
                                          borderRadius: "4px",
                                          backgroundColor: "#ecfdf5",
                                          color: "#047857",
                                          border: "1px solid #a7f3d0",
                                        }}
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Farmers Section */}
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#1e40af", marginBottom: "4px" }}>
                                  <span>🌾</span>
                                  <span>{t("Farmers")} ({allFarmers.length})</span>
                                </div>
                                {allFarmers.length === 0 ? (
                                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>
                                    {t("No farmers assigned")}
                                  </p>
                                ) : (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: "100px", overflowY: "auto" }}>
                                    {allFarmers.map((name) => (
                                      <span
                                        key={name}
                                        style={{
                                          fontSize: "10px",
                                          fontWeight: 600,
                                          padding: "2px 6px",
                                          borderRadius: "4px",
                                          backgroundColor: "#eff6ff",
                                          color: "#1d4ed8",
                                          border: "1px solid #bfdbfe",
                                        }}
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}