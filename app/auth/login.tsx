import { useState } from "react";
import { Form, replace, useActionData, useNavigation } from "react-router";
import { Leaf, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import type { Route } from "../auth/+types/login";
import { loginRequest, setAuthData } from "../utils/auth";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  try {
    const data = await loginRequest(username, password);
    setAuthData(data);
    return replace("/home/dashboard");
  } catch (err: any) {
    return { error: err.message || "Invalid credentials"};
  }

}

export default function Login() {
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex font-sans bg-slate-50/50 text-slate-950 antialiased">
      {/* LEFT FORM SIDE */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 bg-white z-10 relative">
        <div className="w-full max-w-[440px] flex flex-col items-center">

          {/* Large Circular Brand Logo */}
          <div className="bg-[#2a5e47] text-white p-7 rounded-full mb-4 shadow-xl shadow-emerald-950/10 flex items-center justify-center transition-transform duration-300 hover:scale-105">
            <Leaf className="h-14 w-14" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#163626]">AgriSense AI</h1>
          <p className="text-[11px] font-semibold text-[#3d7a5a] uppercase tracking-wider mt-1.5 mb-8">
            Smart Agriculture Management System
          </p>

          {/* Form Container Box with Soft Light-Blue Background */}
          <div className="w-full bg-[#f0f4fa] border border-slate-200/60 rounded-3xl p-8 shadow-sm">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-[#1e293b]">Welcome Back</h2>
              <p className="text-xs text-slate-500 mt-1">Sign in to your account to continue</p>
            </div>

            {actionData?.error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 text-center">
                {actionData.error}
              </div>
            )}

            <Form method="post" className="space-y-4">
              <div>
                <label htmlFor="username" className="text-sm font-bold text-[#1e293b] block mb-1.5">
                  Email Address:
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-[#2a5e47] transition-colors" />
                  <input
                    id="username"
                    type="text"
                    name="username"
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-[#4ade80] focus:ring-2 focus:ring-[#4ade80]/10 text-slate-800 font-medium placeholder:text-slate-400/70 shadow-sm"
                    placeholder="admin@agrismart.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-bold text-[#1e293b] block mb-1.5">
                  Password:
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-[#2a5e47] transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="w-full pl-11 pr-11 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-[#4ade80] focus:ring-2 focus:ring-[#4ade80]/10 text-slate-800 font-medium placeholder:text-slate-400/70 shadow-sm"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-[#2a5e47] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center text-[#1e293b] font-semibold cursor-pointer select-none">
                  <input type="checkbox" className="mr-2 h-4 w-4 rounded border-slate-300 text-[#2a5e47] focus:ring-[#2a5e47] accent-[#2a5e47] cursor-pointer" />
                  Remember me
                </label>
                <a href="#" className="text-[#1e293b] font-semibold hover:underline">
                  Forgot Password?
                </a>
              </div>

              {/* Solid Green Main Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1e4633] hover:bg-[#153123] text-white py-3 rounded-xl text-base font-bold tracking-wide shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              {/* Native Clean Google OAuth Wrapper Button */}
              <button
                type="button"
                className="w-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.273 0 3.164 2.709 1.145 6.655l4.12 3.11z" />
                  <path fill="#4285F4" d="M23.755 12.218c0-.827-.073-1.627-.209-2.409H12v4.582h6.6c-.282 1.527-1.145 2.818-2.436 3.69l3.782 2.928c2.209-2.036 3.809-5.036 3.809-8.79z" />
                  <path fill="#34A853" d="M5.266 14.235L1.145 17.345C3.164 21.291 7.273 24 12 24c3.055 0 5.782-1.01 7.91-2.736l-3.782-2.928a6.99 6.99 0 0 1-4.128 1.173 7.077 7.077 0 0 1-6.734-4.855z" />
                  <path fill="#FBBC05" d="M5.266 9.765A7.043 7.043 0 0 1 4.909 12c0 .79.127 1.545.357 2.235l-4.12 3.11A11.907 11.907 0 0 1 0 12c0-1.927.455-3.755 1.255-5.382l4.01 3.147z" />
                </svg>
                <span>sign in with google</span>
              </button>
            </Form>
          </div>

        </div>
      </div>

      {/* RIGHT DISPLAY ART SIDE */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center items-center justify-center relative p-16"
        style={{ backgroundImage: `linear-gradient(rgba(27, 59, 43, 0.9), rgba(36, 74, 56, 0.88)), url('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=1000')` }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="max-w-md text-white relative z-10">
          <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
            Enterprise Intelligence
          </span>
          <h2 className="text-4xl font-extrabold leading-tight mb-6 mt-4 tracking-tight">
            Transform Your Farm with AI-Powered Operations
          </h2>
          <ul className="space-y-4 text-sm font-light text-slate-200/90">
            <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Real-time crop analytics & biological health profiling</span>
            </li>
            <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Predictive yield telemetry and automated log tracking</span>
            </li>
            <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Optimized task, labor, and attendance scheduling matrix</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}