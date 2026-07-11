import { useState } from "react";
import { Form, replace, useActionData, useNavigation } from "react-router";
import { Leaf, Mail, Lock, Eye, EyeOff } from "lucide-react";
import type { Route } from "./+types/login";
import { loginRequest, setAuthData } from "../utils/auth";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  try {
    const data = await loginRequest(username, password);
    setAuthData(data);
    return replace("/home");
  } catch (err: any) {
    return { error: err.message || "Invalid credentials" };
  }
}

export default function Login() {
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex font-sans bg-white text-gray-900">
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 bg-white">
        <div className="flex flex-col items-center mt-8">
          <div className="bg-[#244A38] text-white p-2 rounded-full mb-2">
            <Leaf className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AgriSmart AI</h1>
          <p className="text-xs text-gray-500">Smart Agriculture Management System</p>
        </div>

        <div className="max-w-md w-full mx-auto border border-gray-100 shadow-sm rounded-2xl p-8 my-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-950">Welcome Back</h2>
            <p className="text-sm text-gray-400">Sign in to your account to continue</p>
          </div>

          {actionData?.error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email Address / Username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#244A38]"
                  placeholder="admin@agrismart.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#244A38]"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-gray-600 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded accent-[#244A38]" />
                Remember me
              </label>
              <a href="#" className="text-[#244A38] font-medium hover:underline">Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1b3b2b] hover:bg-[#152e22] text-white py-2.5 rounded-lg text-sm font-medium transition duration-200 disabled:opacity-50"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </Form>

          <div className="mt-6 bg-[#f4fbf7] border border-[#e2f3e9] rounded-xl p-4 text-xs text-center">
            <p className="text-gray-400 uppercase font-semibold tracking-wider text-[10px] mb-1">Demo Credentials</p>
            <p className="text-gray-700 font-medium">Email: <span className="text-[#244A38]">admin@agrismart.com</span></p>
            <p className="text-gray-700 font-medium">Password: <span className="text-[#244A38]">admin123</span></p>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          © 2026 AgriSmart AI. All rights reserved.
        </p>
      </div>

      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center items-center justify-center relative p-12"
        style={{ backgroundImage: `linear-gradient(rgba(36, 74, 56, 0.85), rgba(36, 74, 56, 0.85)), url('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=1000')` }}
      >
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold leading-tight mb-6">
            Transform Your Farm with AI-Powered Intelligence
          </h2>
          <ul className="space-y-4 text-sm opacity-90 font-light">
            <li className="flex items-start gap-2"><span className="text-emerald-400 font-bold">•</span> Real-time crop monitoring and disease detection</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 font-bold">•</span> Smart inventory and resource management</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 font-bold">•</span> Advanced analytics and yield predictions</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 font-bold">•</span> Automated task management and attendance tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
}