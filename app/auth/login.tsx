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
              <a
                href="#"
                className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline transition-colors"
              >
                {t("Forgot Password?")}
              </a>
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

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium uppercase tracking-wider text-[11px]">
                  {t("Or")}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.273 0 3.164 2.709 1.145 6.655l4.12 3.11z"
                />
                <path
                  fill="#4285F4"
                  d="M23.755 12.218c0-.827-.073-1.627-.209-2.409H12v4.582h6.6c-.282 1.527-1.145 2.818-2.436 3.69l3.782 2.928c2.209-2.036 3.809-5.036 3.809-8.79z"
                />
                <path
                  fill="#34A853"
                  d="M5.266 14.235L1.145 17.345C3.164 21.291 7.273 24 12 24c3.055 0 5.782-1.01 7.91-2.736l-3.782-2.928a6.99 6.99 0 0 1-4.128 1.173 7.077 7.077 0 0 1-6.734-4.855z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.266 9.765A7.043 7.043 0 0 1 4.909 12c0 .79.127 1.545.357 2.235l-4.12 3.11A11.907 11.907 0 0 1 0 12c0-1.927.455-3.755 1.255-5.382l4.01 3.147z"
                />
              </svg>
              <span>{t("sign in with google")}</span>
            </button>
          </Form>
        </div>

        {/* Bottom Bar: Security & Copyright */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>256-bit SSL Encrypted</span>
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
              Smart Agriculture Platform
            </span>
          </div>

          <button
            type="button"
            onClick={handleShuffle}
            title="Next Insight"
            className="inline-flex items-center gap-1.5 text-xs text-slate-300/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`h-3 w-3 ${isTyping ? "animate-spin" : ""}`} />
            <span>Shuffle</span>
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
    </div>
  );
}