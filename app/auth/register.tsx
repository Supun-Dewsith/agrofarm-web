import React, { useState } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { Leaf, User, Mail, Lock, Shield, Plus, X } from "lucide-react";
import type { Route } from "./+types/register";

// CHANGE: Changed to clientLoader for SPA Mode
export async function clientLoader() {
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;
  
  const allowedAuthorities = ["ADMIN", "USER_MGMT", "SUPERVISOR"];
  const hasAuthority = user?.authorities?.some((auth: string) => allowedAuthorities.includes(auth));

  if (!hasAuthority) {
    return redirect("/login");
  }
  return null;
}

// CHANGE: Changed to clientAction for SPA Mode
export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  
  const payload = {
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    permissions: formData.getAll("permissions")
  };

  try {
    const token = localStorage.getItem("token") || "";

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { error: errBody.message || "Failed to register user." };
    }

    return { success: true };
  } catch (err) {
    return { error: "Network error occurred." };
  }
}

export default function Register() {
  const actionData = useActionData() as { success?: boolean; error?: string } | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentPermission, setCurrentPermission] = useState("");

  const handleAddPermission = () => {
    if (currentPermission.trim() && !permissions.includes(currentPermission.trim())) {
      setPermissions([...permissions, currentPermission.trim()]);
      setCurrentPermission("");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 items-center justify-center p-6 font-sans text-gray-900">
      <div className="max-w-xl w-full bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#244A38] text-white p-2 rounded-full mb-2">
            <Leaf className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-gray-950">Register New Team Member</h2>
          <p className="text-xs text-gray-400">Only accessible by authorized administrators</p>
        </div>

        {actionData?.success && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100 text-center font-medium">
            User registered successfully!
          </div>
        )}

        {actionData?.error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center">
            {actionData.error}
          </div>
        )}

        <Form method="post" className="space-y-4">
          {permissions.map((perm, idx) => (
            <input key={idx} type="hidden" name="permissions" value={perm} />
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#244A38]"
                  placeholder="johndoe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#244A38]"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="password"
                name="password"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#244A38]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">System Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select
                name="role"
                defaultValue="SUPERVISOR"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#244A38] bg-white appearance-none"
              >
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="USER_MGMT">USER_MGMT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Assign Fine-grained Permissions</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentPermission}
                onChange={(e) => setCurrentPermission(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#244A38]"
                placeholder="e.g. crop:write"
              />
              <button
                type="button"
                onClick={handleAddPermission}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg text-gray-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
              {permissions.length === 0 && (
                <span className="text-xs text-gray-400 italic self-center px-1">No permissions assigned yet.</span>
              )}
              {permissions.map((perm, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-[#e2f3e9] text-[#244A38] text-xs font-medium px-2 py-0.5 rounded-full">
                  {perm}
                  <button type="button" onClick={() => setPermissions(permissions.filter((_, i) => i !== idx))}>
                    <X className="h-3 w-3 hover:text-red-500" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1b3b2b] hover:bg-[#152e22] text-white py-2.5 rounded-lg text-sm font-medium transition duration-200 mt-2 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create System User"}
          </button>
        </Form>
      </div>
    </div>
  );
}