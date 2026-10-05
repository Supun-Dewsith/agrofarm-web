import { useState, useEffect } from "react";
import { Form, replace, useActionData, useNavigation } from "react-router";
import {
  Sprout,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Activity,
  RefreshCw,
  KeyRound,
  X,
  CheckCircle2,
  Send,
  ShieldAlert,
} from "lucide-react";
import type { Route } from "../auth/+types/login";
import { loginRequest, setAuthData } from "../utils/auth";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

interface AiInsight {
  category: string;
  text: string;
  metric: string;
}

const AI_INSIGHTS: AiInsight[] = [
  {
    category: "Microclimate & Soil Telemetry",
    text: "Microclimate telemetry across Sector 4 confirms soil moisture at optimal threshold. Automated drip irrigation suspended to preserve reserves.",
    metric: "Soil Moisture: 68% • Stable",
  },
  {
    category: "Foliage Pathology Scan",
    text: "Autonomous drone patrol completed for North Valley plots. Zero invasive leaf blight lesions or infectious spore clusters identified.",
    metric: "Pathogen Risk: Zero",
  },
  {
    category: "Canopy Spectral Index",
    text: "Multispectral imaging across 120 hectares shows photosynthetic vitality tracking 14% higher than the seasonal highland average.",
    metric: "NDVI Index: +14% Healthy",
  },
  {
    category: "Automated Weather Sync",
    text: "Nutrient replenishment schedule automatically calibrated against tomorrow morning's forecasted rainfall and temperature curve.",
    metric: "Rainfall: 18mm Expected",
  },
  {
    category: "Yield & Harvest Forecast",
    text: "Yield trajectory projecting 42.8 metric tons for upcoming harvest window. Warehouse cold-storage capacity pre-allocated.",
    metric: "Target Yield: 42.8t",
  },
  {
    category: "Highland Root Vitality",
    text: "Subsurface probe telemetry confirms robust biological root formation across newly cultivated highland tea beds.",
    metric: "Vitality Score: 98/100",
  },
];

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const remember = formData.get("remember") === "on";

  try {
    const data = await loginRequest(username, password);
    setAuthData(data);

    if (typeof localStorage !== "undefined") {
      if (remember) {
        localStorage.setItem("remember_username", username);
      } else {
        localStorage.removeItem("remember_username");
      }
    }

    return replace("/home/dashboard");
  } catch (err: any) {
    const message = i18n.t("Invalid credentials");
    return { error: err.message || message };
  }
}

export default function Login() {
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const isSubmitting = navigation.state === "submitting";
  const { t } = useTranslation();

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const handleCloseModal = () => {
    setShowForgotModal(false);
    setRequestSubmitted(false);
    setResetUsername("");
    setIsSubmittingReset(false);
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername.trim() || isSubmittingReset) return;

    setIsSubmittingReset(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
      await fetch(`${baseUrl}/api/auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: resetUsername.trim() }),
      });
      setRequestSubmitted(true);
    } catch {
      // Transition to submitted screen regardless so UX is resilient
      setRequestSubmitted(true);
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showForgotModal) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showForgotModal]);

  // Load remembered username on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("remember_username");
      if (savedUser) {
        setUsername(savedUser);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage errors if disabled
    }
  }, []);

  // Dynamic AI insight typewriter effect
  const [insightIndex, setInsightIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Typewriter stream effect for active insight
  useEffect(() => {
    const fullText = AI_INSIGHTS[insightIndex].text;
    let charIndex = 0;
    setDisplayedText("");
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      charIndex++;
      setDisplayedText(fullText.slice(0, charIndex));

      if (charIndex >= fullText.length) {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 20);

    return () => clearInterval(typeInterval);
  }, [insightIndex]);

  // Pause and pick next random insight
  useEffect(() => {
    if (isTyping) return;

    const timeout = setTimeout(() => {
      setInsightIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * AI_INSIGHTS.length);
        } while (next === prev && AI_INSIGHTS.length > 1);
        return next;
      });
    }, 4500);

    return () => clearTimeout(timeout);
  }, [isTyping, insightIndex]);

  const handleShuffle = () => {
    setInsightIndex((prev) => {
      let next;
      do {
        next = Math.floor(Math.random() * AI_INSIGHTS.length);
      } while (next === prev && AI_INSIGHTS.length > 1);
      return next;
    });
  };

  const currentInsight = AI_INSIGHTS[insightIndex];

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* LEFT: AUTHENTICATION FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 relative bg-white">
        {/* Top Bar */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-sm shadow-emerald-950/20">
              <Sprout className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
                AgriSense AI
              </span>
              <span className="text-[10px] font-medium text-emerald-800 tracking-wider uppercase mt-0.5">
                Enterprise
              </span>
            </div>
          </div>

          <LanguageSwitcher />
        </div>

        {/* Center: Auth Card */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {t("Welcome Back")}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {t("Sign in to your account to continue")}
            </p>
          </div>

          {actionData?.error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-relaxed">{actionData.error}</span>
            </div>
          )}

          <Form method="post" className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="text-xs font-semibold text-slate-700 tracking-wide block mb-1.5"
              >
                {t("Email / Username:")}
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-700 transition-colors pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
                  placeholder="admin@agrismart.com"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-xs font-semibold text-slate-700 tracking-wide block mb-1.5"
              >
                {t("Password:")}
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-700 transition-colors pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
                  placeholder={t("Enter your password")}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center text-slate-600 hover:text-slate-900 font-medium cursor-pointer select-none gap-2">
                <input
                  type="checkbox"
                  name="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 accent-emerald-700 cursor-pointer"
                />
                <span>{t("Remember me")}</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetUsername(username);
                  setShowForgotModal(true);
                }}
                className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline transition-colors cursor-pointer"
              >
                {t("Forgot Password?")}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1b4332] hover:bg-[#143427] active:scale-[0.99] text-white py-2.5 px-4 rounded-xl text-sm font-semibold tracking-wide shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                  <span>{t("Signing In...")}</span>
                </>
              ) : (
                <span>{t("Sign In")}</span>
              )}
            </button>
          </Form>
        </div>

        {/* Bottom Bar: Security & Copyright */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>{t("256-bit SSL Encrypted")}</span>
          </div>
          <span>AgriSense AI &copy; {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* RIGHT: DYNAMIC AI FIELD INTELLIGENCE DIRECTLY OVER IMAGE */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative p-12 xl:p-16 flex-col justify-between overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(4, 18, 11, 0.96) 0%, rgba(6, 26, 17, 0.82) 40%, rgba(8, 32, 21, 0.45) 100%), url('https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=1600')`,
        }}
      >
        {/* Soft Ambient Radiance */}
        <div className="absolute bottom-0 left-0 w-full h-80 bg-gradient-to-t from-emerald-950/60 to-transparent pointer-events-none" />
        <div className="absolute top-12 right-12 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header (Directly on Image) */}
        <div className="relative z-10 flex items-center justify-between text-xs tracking-wider text-slate-300/80">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-emerald-200 tracking-wide text-xs">
              {t("Smart Agriculture Platform")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleShuffle}
            title={t("Next Insight")}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`h-3 w-3 ${isTyping ? "animate-spin" : ""}`} />
            <span>{t("Shuffle")}</span>
          </button>
        </div>

        {/* Bottom AI Description & Controls (Directly on Image) */}
        <div className="relative z-10 max-w-xl">
          {/* Category Chip */}
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">
            <Activity className="h-3.5 w-3.5" />
            <span>{currentInsight.category}</span>
          </div>

          {/* AI Message Stream */}
          <div className="min-h-[6.5rem] sm:min-h-[7.5rem] flex items-start">
            <p className="text-xl sm:text-2xl xl:text-3xl font-light text-white leading-relaxed tracking-tight">
              "{displayedText}"
              <span className="inline-block w-0.5 h-5 sm:h-6 bg-emerald-400 ml-1.5 translate-y-1 animate-pulse" />
            </p>
          </div>

          {/* Metric (Clean Borderless) & Navigation Bars */}
          <div className="flex items-center justify-between pt-5 mt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-300/90 tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{currentInsight.metric}</span>
            </div>

            {/* Navigation Progress Bars */}
            <div className="flex items-center gap-1.5">
              {AI_INSIGHTS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInsightIndex(idx)}
                  aria-label={`Jump to insight ${idx + 1}`}
                  className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${idx === insightIndex
                    ? "w-7 bg-emerald-400 shadow-sm shadow-emerald-400/80"
                    : "w-2 bg-white/25 hover:bg-white/50"
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD ASSISTANCE MODAL */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"
        >
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 sm:p-7 relative overflow-hidden text-slate-900">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              aria-label="Close modal"
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Lockup */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                <KeyRound className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                  {t("Access Recovery")}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                  {t("AgriSense Security")}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              {t("Account credentials within the AgriSense network are centrally regulated to safeguard operational telemetry and sensitive crop logs.")}
            </p>

            {!requestSubmitted ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <ShieldAlert className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>{t("Admin Verification Required")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal pl-6">
                    {t("Farm Supervisors can reset passwords on-demand via the User Management portal.")}
                  </p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-3">
                  <div>
                    <label
                      htmlFor="reset-user"
                      className="text-xs font-semibold text-slate-700 tracking-wide block mb-1.5"
                    >
                      {t("Username or Registered Email")}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="reset-user"
                        type="text"
                        required
                        value={resetUsername}
                        onChange={(e) => setResetUsername(e.target.value)}
                        placeholder="e.g. admin@agrismart.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 rounded-xl text-sm text-slate-900 outline-none transition-all font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReset}
                    className="w-full bg-[#1b4332] hover:bg-[#143427] active:scale-[0.99] text-white py-2.5 px-4 rounded-xl text-sm font-semibold tracking-wide shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  >
                    {isSubmittingReset ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                        <span>{t("Sending Request...")}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{t("Submit Reset Request")}</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{t("Farm Helpdesk:")}</span>
                  <span className="font-semibold text-slate-800">admin@agrismart.com</span>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{t("Request Dispatched")}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {t("A credential recovery alert for")} <span className="font-semibold text-emerald-900">{resetUsername}</span> {t("has been routed to the farm administrator. Temporary credentials will be provided shortly.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full bg-[#1b4332] hover:bg-[#143427] text-white py-2 px-4 rounded-xl text-xs font-semibold tracking-wide shadow-sm transition-colors mt-2 cursor-pointer"
                >
                  {t("Return to Login")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}