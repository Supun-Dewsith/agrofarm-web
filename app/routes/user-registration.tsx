import React, { useState, useEffect, useRef } from "react";
import {
  fetchWithAuth,
  registerUserByAdmin,
  getAuthData,
  type RegisterUserPayload,
} from "~/utils/auth";
import { AVAILABLE_PERMISSIONS } from "../utils/constants";
import { useTranslation } from "react-i18next";

export interface RegisteredUser {
  id?: string | number;
  username: string;
  email: string;
  role: "SUPERVISOR" | "ADMIN" | "FARMER";
  permissions: string[];
  imageUrl?: string | null;
}

export interface FarmSummary {
  id: number;
  ownerId: number;
  farmName: string;
  farmAddress: string;
  latitude: number;
  longitude: number;
}

export interface AvailableFarmsResponse {
  farms: FarmSummary[];
  totalCount: number;
}

export interface ExtendedRegisterPayload extends RegisterUserPayload {
  farmIds: number[];
}

const AVAILABLE_ROLES = ["SUPERVISOR", "ADMIN", "FARMER"] as const;

export default function UserRegistration() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ExtendedRegisterPayload>({
    username: "",
    email: "",
    password: "",
    role: "SUPERVISOR",
    permissions: [],
    farmIds: [],
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableFarms, setAvailableFarms] = useState<FarmSummary[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(false);

  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchAvailableFarms = async () => {
    const authData = getAuthData();
    const userId = authData?.id;

    if (!userId) {
      console.warn("No active user ID found in session.");
      return;
    }

    setLoadingFarms(true);
    try {
      const response = await fetchWithAuth(`/api/users/farms/${userId}`, {
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "role" && value === "ADMIN") {
        updated.farmIds = [];
      }
      if (name === "role" && value === "FARMER" && updated.farmIds.length > 1) {
        updated.farmIds = [updated.farmIds[0]];
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
    if (formData.role === "ADMIN") return;

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

    if (formData.role === "FARMER" && formData.farmIds.length > 1) {
      setStatusMessage({ type: "error", text: t("Farmers can only be assigned to a single farm.") });
      setLoadingSubmit(false);
      return;
    }

    try {
      await registerUserByAdmin(formData as any, avatarFile);
      setStatusMessage({
        type: "success",
        text: t('User "{{username}}" registered successfully!', {
          username: formData.username,
        }),
      });

      setFormData({ username: "", email: "", password: "", role: "SUPERVISOR", permissions: [], farmIds: [] });
      clearImage();
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || t("An error occurred while registering user.") });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const isAdmin = formData.role === "ADMIN";
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
    <div style={{ margin: "10px auto", padding: "0 24px", fontFamily: "Inter, system-ui, sans-serif" }}>

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

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "60px", alignItems: "flex-start" }}>

        {/* LEFT PANE (Media & Registered Accounts) */}
        <div style={{ width: "300px", flexShrink: 0 }}>

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
              borderRadius: "6px", color: "#334155", fontSize: "14px", fontWeight: 600, cursor: "pointer", marginBottom: "40px"
            }}>
              {t("Upload Photo")}
            </button>

            <button type="submit" disabled={loadingSubmit} style={{
              width: "100%", padding: "14px", backgroundColor: "#059669", color: "#ffffff",
              border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: loadingSubmit ? "not-allowed" : "pointer",
              opacity: loadingSubmit ? 0.7 : 1
            }}>
              {loadingSubmit ? t("Processing...") : t("Register New User")}
            </button>
          </div>

          {/* Left Pane Divider */}
          <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "40px 0" }} />

          {/* Registered Accounts Block */}
          <div>
            <h3 style={{ ...sectionHeaderStyle, marginBottom: "16px" }}>{t("Registered Accounts")}</h3>

            {loadingUsers ? (
              <p style={{ fontSize: "14px", color: "#64748b" }}>{t("Loading accounts...")}</p>
            ) : users.length === 0 ? (
              <p style={{ fontSize: "14px", color: "#64748b" }}>{t("No users registered.")}</p>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "450px", // Enables scrolling if the list gets too long
                overflowY: "auto",
                paddingRight: "6px" // Prevents scrollbar from overlapping border
              }}>
                {users.map((u, idx) => (
                  <div key={u.id || idx} style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "12px",
                    border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#ffffff"
                  }}>
                    {u.imageUrl ? (
                      <img src={u.imageUrl} alt={u.username} style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#f1f5f9",
                        color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "14px", flexShrink: 0
                      }}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "13px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis" }}>{u.username}</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "12px", backgroundColor: "#f1f5f9", color: "#475569" }}>
                          {u.role}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER DIVIDER LINE */}
        <div style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch" }} />

        {/* RIGHT PANE (Data Entry) */}
        <div style={{ flex: 1 }}>
          <h3 style={sectionHeaderStyle}>{t("Profile Information")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "48px" }}>
            <div>
              <label style={labelStyle}>{t("Username")}</label>
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
              <label style={labelStyle}>{t("Email Address")}</label>
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
              <label style={labelStyle}>{t("Temporary Password")}</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                style={inputStyle}
                placeholder={t("Enter password (min 6 characters)")}
                minLength={6}
                maxLength={100}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("System Role")}</label>
              <select name="role" value={formData.role} onChange={handleInputChange} style={{ ...inputStyle, cursor: "pointer", backgroundColor: "#fff" }}>
                {AVAILABLE_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={sectionHeaderStyle}>{t("System Permissions")}</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "48px"
            }}
          >
            {AVAILABLE_PERMISSIONS.map((perm) => (
              <label
                key={perm}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "13px",
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.permissions.includes(perm)}
                  onChange={() => handlePermissionToggle(perm)}
                  style={{ width: "16px", height: "16px", accentColor: "#059669" }}
                />
                <span style={{ textTransform: "capitalize" }}>
                  {perm.replace(/_/g, ' ')}
                </span>
              </label>
            ))}
          </div>


          <h3 style={sectionHeaderStyle}>{t("Farm Allocations")}</h3>
          <div style={{ opacity: isAdmin ? 0.5 : 1, pointerEvents: isAdmin ? "none" : "auto" }}>
            {isAdmin && <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>{t("Admins have global access. Farm assignment is disabled.")}</p>}

            {loadingFarms ? (
              <p style={{ fontSize: "14px", color: "#64748b" }}>{t("Loading your farms...")}</p>
            ) : availableFarms.length === 0 ? (
              <div style={{ padding: "24px", border: "1px dashed #cbd5e1", borderRadius: "8px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                {t("No farms available for allocation.")}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {availableFarms.map((farm) => {
                  const isSelected = formData.farmIds.includes(farm.id);
                  return (
                    <div key={farm.id} onClick={() => handleFarmToggle(farm.id)} style={{
                      padding: "16px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
                      border: `1px solid ${isSelected ? "#059669" : "#e2e8f0"}`,
                      backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: isSelected ? "#065f46" : "#334155" }}>{farm.farmName}</span>
                        <input type={isFarmer ? "radio" : "checkbox"} checked={isSelected} readOnly style={{ accentColor: "#059669" }} />
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>{farm.farmAddress}</p>
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