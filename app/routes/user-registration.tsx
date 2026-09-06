import React, { useState, useEffect } from "react";
import {
  fetchWithAuth,
  registerUserByAdmin,
  type RegisterUserPayload,
} from "~/utils/auth";
import { AVAILABLE_PERMISSIONS } from "../utils/constants";

export interface RegisteredUser {
  id?: string | number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  imageUrl?: string | null; // Added to support avatar images
}

const AVAILABLE_ROLES = ["SUPERVISOR", "ADMIN", "FARMER"];

export default function UserRegistration() {
  const [formData, setFormData] = useState<RegisterUserPayload>({
    username: "",
    email: "",
    password: "",
    role: "SUPERVISOR",
    permissions: [],
  });

  // Profile image state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch users from backend
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetchWithAuth("/api/users", { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to fetch registered users");
      }
      const data = (await response.json()) as RegisteredUser[];
      setUsers(data);
    } catch (err: any) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: "Please select an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "Image size must be under 5MB." });
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setStatusMessage(null);

    try {
      // Pass both formData and the binary image file
      await registerUserByAdmin(formData, avatarFile);

      setStatusMessage({
        type: "success",
        text: `User "${formData.username}" registered successfully!`,
      });

      // Reset form and image preview
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "SUPERVISOR",
        permissions: [],
      });
      setAvatarFile(null);
      setAvatarPreview(null);

      // Refresh registered users list
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "An error occurred while registering user.",
      });
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: "40px",
        maxWidth: "1100px",
        margin: "20px auto",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#333",
      }}
    >
      {/* LEFT COLUMN: Registration Form */}
      <div>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#222",
            marginBottom: "4px",
          }}
        >
          Admin User Registration
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#666",
            marginTop: 0,
            marginBottom: "24px",
          }}
        >
          Create a new user profile and configure their system permissions.
        </p>

        {statusMessage && (
          <div
            style={{
              padding: "10px 14px",
              marginBottom: "20px",
              borderRadius: "4px",
              fontSize: "14px",
              backgroundColor:
                statusMessage.type === "success" ? "#d4edda" : "#f8d7da",
              color: statusMessage.type === "success" ? "#155724" : "#721c24",
              border: `1px solid ${statusMessage.type === "success" ? "#c3e6cb" : "#f5c6cb"
                }`,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Profile Picture Upload & Preview */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#333",
                marginBottom: "8px",
              }}
            >
              Profile Picture:
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #059669",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9ca3af",
                    fontSize: "12px",
                  }}
                >
                  No Image
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ fontSize: "13px", color: "#555" }}
              />
            </div>
          </div>

          {/* Username */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#333",
                marginBottom: "6px",
              }}
            >
              Username:
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#333",
                marginBottom: "6px",
              }}
            >
              Email:
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#333",
                marginBottom: "6px",
              }}
            >
              Password:
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Role */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#333",
                marginBottom: "6px",
              }}
            >
              Role:
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#fff",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              {AVAILABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Permissions Grid */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#333",
                marginBottom: "12px",
              }}
            >
              Permissions:
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                rowGap: "12px",
                columnGap: "16px",
              }}
            >
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "#333",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    style={{
                      width: "15px",
                      height: "15px",
                      cursor: "pointer",
                      accentColor: "#059669",
                    }}
                  />
                  {permission}
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loadingSubmit}
            style={{
              padding: "10px 24px",
              backgroundColor: "#059669",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loadingSubmit ? "not-allowed" : "pointer",
              opacity: loadingSubmit ? 0.7 : 1,
              transition: "background-color 0.2s",
            }}
          >
            {loadingSubmit ? "Registering..." : "Register User"}
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: Registered Users Side List */}
      <div
        style={{
          borderLeft: "1px solid #e5e7eb",
          paddingLeft: "24px",
        }}
      >
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#222",
            marginBottom: "6px",
            marginTop: 0,
          }}
        >
          Registered Users
        </h3>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
          Current users registered in the system.
        </p>

        {loadingUsers ? (
          <p style={{ fontSize: "14px", color: "#888" }}>Loading users...</p>
        ) : users.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#888" }}>No users found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {users.map((u, idx) => (
              <div
                key={u.id || idx}
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {/* User Avatar or Initials Fallback */}
                {u.imageUrl ? (
                  <img
                    src={u.imageUrl}
                    alt={u.username}
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1px solid #e5e7eb",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      backgroundColor: "#059669",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {u.username}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        backgroundColor: "#d1fae5",
                        color: "#065f46",
                        flexShrink: 0,
                      }}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {u.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}