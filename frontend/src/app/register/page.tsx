"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { AuthError, AuthFooterLink, AuthShell } from "@/components/AuthShell";

type RegisterStep = "register" | "verify";

const emptyOtp = ["", "", "", "", "", ""];

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<RegisterStep>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(emptyOtp);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const verificationEmail = registeredEmail || normalizedEmail;

  const passwordChecks = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { label: "One number", passed: /[0-9]/.test(password) },
    { label: "One symbol", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const strength = passwordChecks.filter((check) => check.passed).length;
  const passwordIsStrong = passwordChecks.every((check) => check.passed);
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;
  const canSubmitRegister = Boolean(normalizedEmail) && passwordIsStrong && passwordsMatch && !isLoading;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!passwordIsStrong) {
      setError("Password must include uppercase, lowercase, number, and symbol.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.register(normalizedEmail, password, name.trim() || undefined);

      if (result.error) {
        setError(result.error);
        return;
      }

      setRegisteredEmail(normalizedEmail);
      setOtp(emptyOtp);
      setNotice("Account created. Enter the verification code we sent to your email.");
      setStep("verify");
    } catch (err) {
      setError("Registration failed. Please try again.");
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

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedCode = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (!pastedCode) return;

    const nextOtp = emptyOtp.map((_, index) => pastedCode[index] || "");
    setOtp(nextOtp);

    const nextFocusIndex = Math.min(pastedCode.length, 5);
    document.getElementById(`otp-${nextFocusIndex}`)?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.verifyEmail(verificationEmail, code);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/login?verified=true");
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const result = await authApi.resendVerification(verificationEmail);

      if (result.error) {
        setError(result.error);
        return;
      }

      setOtp(emptyOtp);
      setNotice("A new verification code was sent.");
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColors = [
    "bg-accent-red",
    "bg-accent-red",
    "bg-accent-yellow",
    "bg-accent-yellow",
    "bg-accent-green",
  ];
  const strengthLabels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  const title =
    step === "register"
      ? "Create your account"
      : "Verify your email";

  const description =
    step === "register"
      ? "Start your Signal Service workspace with secure access to trading signals and MT5 account tools."
      : `Enter the 6-digit code sent to ${verificationEmail}.`;

  return (
    <AuthShell
      eyebrow="New account"
      title={title}
      description={description}
      footer={<AuthFooterLink label="Already have an account?" href="/login" action="Sign in" />}
    >
      {step === "register" ? (
        <form onSubmit={handleRegister} className="space-y-5">
          <AuthError message={error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="name">
                Name <span className="text-foreground-subtle">(optional)</span>
              </label>
              <div className="relative">
                <User className="auth-input-icon" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input-with-left-icon"
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
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

            <div className="space-y-2 sm:col-span-2">
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
                  placeholder="Create a strong password"
                  autoComplete="new-password"
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

              {password && (
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="mb-2 flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < strength ? strengthColors[strength - 1] : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Password strength: {strengthLabels[strength - 1] || "Very weak"}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-foreground-muted sm:grid-cols-2">
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
                </div>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="auth-input-icon" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input-with-icons"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />
                {passwordsMatch && (
                  <Check className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-green" />
                )}
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-accent-red">Passwords do not match yet.</p>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3 text-sm text-foreground-muted">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border bg-background-secondary"
              required
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmitRegister}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create account<ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6">
          <AuthError message={error} />
          {notice && (
            <div className="rounded-lg border border-accent-green/25 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">
              {notice}
            </div>
          )}

          <div className="rounded-lg border border-border bg-background/60 px-4 py-3 text-sm text-foreground-muted">
            Code sent to <span className="font-medium text-foreground">{verificationEmail}</span>
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
                onPaste={i === 0 ? handleOtpPaste : undefined}
                className="otp-input w-full"
                autoFocus={i === 0}
                aria-label={`Verification digit ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verify email<ArrowRight className="h-5 w-5" /></>}
          </button>

          <div className="flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setStep("register");
                setOtp(emptyOtp);
                setError("");
                setNotice("");
              }}
              className="inline-flex items-center justify-center gap-2 text-foreground-muted transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Edit account details
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
    </AuthShell>
  );
}
