"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { AuthError, AuthFooterLink, AuthShell } from "@/components/AuthShell";

type Step = "email" | "otp" | "newPassword" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordChecks = [
    { label: "At least 8 characters", passed: newPassword.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(newPassword) },
    { label: "One lowercase letter", passed: /[a-z]/.test(newPassword) },
    { label: "One number", passed: /[0-9]/.test(newPassword) },
    { label: "One symbol", passed: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const newPasswordIsStrong = passwordChecks.every((check) => check.passed);
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authApi.forgotPassword(email);

      if (result.error) {
        setError(result.error);
        return;
      }

      setStep("otp");
    } catch (err) {
      setError("Failed to send reset code. Please try again.");
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

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      setOtp(pastedData.split(""));
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setStep("newPassword");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPasswordIsStrong) {
      setError("Password must include uppercase, lowercase, number, and symbol.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const code = otp.join("");
      const result = await authApi.resetPassword(email, code, newPassword);

      if (result.error) {
        setError(result.error);
        if (result.error.toLowerCase().includes("code") || result.error.toLowerCase().includes("expired")) {
          setOtp(["", "", "", "", "", ""]);
          setStep("otp");
        }
        return;
      }

      setStep("success");
    } catch (err) {
      setError("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await authApi.forgotPassword(email);

      if (result.error) {
        setError(result.error);
        return;
      }

      setOtp(["", "", "", "", "", ""]);
      setError("");
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const pageCopy = {
    email: {
      eyebrow: "Account recovery",
      title: "Reset your password",
      description: "Enter your account email and we will send a verification code to start the reset.",
    },
    otp: {
      eyebrow: "Verification",
      title: "Check your email",
      description: `Enter the 6-digit reset code sent to ${email}.`,
    },
    newPassword: {
      eyebrow: "New password",
      title: "Create a new password",
      description: "Use a strong password that is different from passwords you use elsewhere.",
    },
    success: {
      eyebrow: "Complete",
      title: "Password reset",
      description: "Your password has been updated. You can now sign in with the new password.",
    },
  }[step];

  return (
    <AuthShell
      eyebrow={pageCopy.eyebrow}
      title={pageCopy.title}
      description={pageCopy.description}
      footer={step !== "success" ? <AuthFooterLink label="Remember your password?" href="/login" action="Sign in" /> : undefined}
    >
      {step === "email" && (
        <form onSubmit={handleRequestReset} className="space-y-5">
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

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send reset code<ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <AuthError message={error} />

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
                onPaste={i === 0 ? handleOtpPaste : undefined}
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
            Verify code
            <ArrowRight className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
              className="inline-flex items-center justify-center gap-2 text-foreground-muted transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to email
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </form>
      )}

      {step === "newPassword" && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <AuthError message={error} />

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="newPassword">
              New password
            </label>
            <div className="relative">
              <Lock className="auth-input-icon" />
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="auth-input-with-icons"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
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
            {newPassword && (
              <div className="mt-3 grid gap-2 rounded-lg border border-border bg-background/60 p-3 text-xs text-foreground-muted sm:grid-cols-2">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={`flex items-center gap-2 ${
                      check.passed ? "text-accent-green" : "text-foreground-muted"
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirmPassword">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="auth-input-icon" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input-with-icons"
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-subtle transition hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-accent-red">Passwords do not match yet.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Reset password<ArrowRight className="h-5 w-5" /></>}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("otp");
              setError("");
            }}
            className="flex w-full items-center justify-center gap-2 text-sm text-foreground-muted transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to verification
          </button>
        </form>
      )}

      {step === "success" && (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/10">
            <CheckCircle className="h-8 w-8 text-accent-green" />
          </div>
          <button
            onClick={() => router.push("/login")}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            Go to login
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </AuthShell>
  );
}
