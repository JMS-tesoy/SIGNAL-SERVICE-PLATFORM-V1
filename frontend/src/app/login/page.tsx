"use client";

import { Suspense } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AuthError, AuthFooterLink, AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShellFallback />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginShellFallback() {
  return (
    <AuthShell
      eyebrow="Secure sign in"
      title="Welcome back"
      description="Access your trading dashboard, signal history, MT5 accounts, and subscription tools."
      footer={<AuthFooterLink label="Don't have an account?" href="/register" action="Create one" />}
    >
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </AuthShell>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setTokens } = useAuthStore();
  const isVerifiedRedirect = searchParams.get("verified") === "true";

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [tempToken, setTempToken] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authApi.login(email, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data?.requiresTwoFactor) {
        setTempToken(result.data.tempToken || "");
        setTwoFactorMethod(result.data.twoFactorMethod || "EMAIL");
        setStep("otp");
      } else if (result.data?.accessToken) {
        setUser(result.data.user);
        setTokens(result.data.accessToken, result.data.refreshToken!);
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      setIsLoading(false);
      return;
    }

    try {
      const result = await authApi.verify2FA(tempToken, code, twoFactorMethod);

      if (result.error) {
        setError(result.error);
        setOtp(["", "", "", "", "", ""]);
        return;
      }

      if (result.data?.accessToken) {
        setUser(result.data.user);
        setTokens(result.data.accessToken, result.data.refreshToken);
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={step === "credentials" ? "Secure sign in" : "Second step"}
      title={step === "credentials" ? "Welcome back" : "Verify your identity"}
      description={
        step === "credentials"
          ? "Access your trading dashboard, signal history, MT5 accounts, and subscription tools."
          : `Enter the 6-digit code from your ${
              twoFactorMethod === "TOTP" ? "authenticator app" : "email"
            }.`
      }
      footer={<AuthFooterLink label="Don't have an account?" href="/register" action="Create one" />}
    >
      {step === "credentials" ? (
        <form onSubmit={handleLogin} className="space-y-5">
          {isVerifiedRedirect && (
            <div className="rounded-lg border border-accent-green/25 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Email verified. You can now sign in.</span>
              </div>
            </div>
          )}

          <AuthError message={error} />

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="auth-input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input-with-left-icon"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="auth-input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input-with-icons"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-subtle transition hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border bg-background-secondary text-primary focus:ring-primary"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Sign in<ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <AuthError message={error} />

          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-foreground-muted">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Two-factor authentication
            </div>
            This extra check keeps your signal account protected.
          </div>

          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="otp-input w-full"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verify<ArrowRight className="h-5 w-5" /></>}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setOtp(["", "", "", "", "", ""]);
              setError("");
            }}
            className="flex w-full items-center justify-center gap-2 text-sm text-foreground-muted transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>
        </form>
      )}
    </AuthShell>
  );
}
