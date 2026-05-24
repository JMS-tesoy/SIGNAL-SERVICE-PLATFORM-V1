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

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<"register" | "success" | "verify">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.register(email, password, name);

      if (result.error) {
        setError(result.error);
        return;
      }

      setStep("success");
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.verifyEmail(email, code);

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
    setIsLoading(true);

    try {
      const result = await authApi.resendVerification(email);

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

  const strength = passwordStrength();
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
      : step === "success"
        ? "Check your inbox"
        : "Verify your email";

  const description =
    step === "register"
      ? "Start your SignalService workspace with secure access to trading signals and MT5 account tools."
      : step === "success"
        ? "We sent a verification code so you can protect your account from the start."
        : `Enter the 6-digit code sent to ${email}.`;

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
                {confirmPassword && password === confirmPassword && (
                  <Check className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-green" />
                )}
              </div>
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
            disabled={isLoading}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create account<ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>
      ) : step === "success" ? (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/10">
            <CheckCircle className="h-8 w-8 text-accent-green" />
          </div>
          <p className="mb-6 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm text-foreground-muted">
            Verification code sent to <span className="font-medium text-foreground">{email}</span>
          </p>
          <button
            onClick={() => setStep("verify")}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3"
          >
            Enter verification code
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 w-full text-sm text-foreground-muted transition hover:text-foreground"
          >
            I will verify later
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6">
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
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verify email<ArrowRight className="h-5 w-5" /></>}
          </button>

          <div className="flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStep("success")}
              className="inline-flex items-center justify-center gap-2 text-foreground-muted transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
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
