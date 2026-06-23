import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, ArrowRight, Heart, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password • ArogyaSathi AI" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<{ password: string; confirm: string }>();
  const pw = watch("password");

  useEffect(() => {
    const checkSession = async () => {
      // Small timeout to allow Supabase client to parse the URL hash fragment and set session
      await new Promise((resolve) => setTimeout(resolve, 500));
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setHasSession(true);
      } else {
        setHasSession(false);
      }
      setSessionChecked(true);
    };
    checkSession();
  }, []);

  const onSubmit = async (data: { password: string; confirm: string }) => {
    if (data.password !== data.confirm) {
      setError("Passwords don't match");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);
      toast.success("Password updated successfully!");

      // Sign out to clear recovery session and navigate to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.navigate({ to: "/login" });
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update password.");
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative grid lg:grid-cols-2 bg-background">
      {/* left brand panel */}
      <div className="hidden lg:flex relative gradient-medical text-white p-12 flex-col justify-between overflow-hidden">
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <img src={logo} alt="" width={36} height={36} className="h-9 w-9 brightness-0 invert" />
          <span className="font-display text-xl font-bold">ArogyaSathi AI</span>
        </Link>
        <div className="relative z-10">
          <h1 className="font-display text-4xl font-bold leading-tight">Reset your password.<br />Secure & simple.</h1>
          <p className="mt-3 text-white/85 max-w-md">Update your password to regain access to your smart healthcare companion.</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-white/80 text-sm">
          <Heart className="h-4 w-4" /> Secure Account Management
        </div>
        <div aria-hidden className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-medical-light/30 blur-3xl" />
      </div>

      {/* form */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <Link to="/" className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display font-bold text-gradient">ArogyaSathi</span>
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {!sessionChecked ? (
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-medical-light" />
              <p className="text-muted-foreground text-sm">Verifying reset session...</p>
            </div>
          ) : success ? (
            <div className="text-center space-y-6 flex flex-col items-center">
              <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h2 className="font-display text-2xl font-bold text-emerald-800">Password Updated!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your password has been changed successfully. Redirecting you to the login screen in a few seconds...
              </p>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          ) : !hasSession ? (
            <div className="text-center space-y-5">
              <div className="p-4 bg-rose-50 rounded-full text-rose-600 w-16 h-16 flex items-center justify-center mx-auto">
                <KeyRound className="h-8 w-8 text-rose-800" />
              </div>
              <h2 className="font-display text-2xl font-bold text-rose-800">Invalid Reset Session</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This password reset link is invalid, expired, or has already been used. Please request a new link from the login page.
              </p>
              <Link
                to="/login"
                className="ripple w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl gradient-medical text-white font-semibold shadow-sm hover:opacity-95 transition"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-3xl font-bold text-medical-dark">Create new password</h2>
              <p className="mt-2 text-sm text-muted-foreground">Please enter a secure new password for your account.</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
                {error && <div className="text-sm bg-medical-tint text-medical-dark px-4 py-2.5 rounded-xl border border-medical-dark/20">{error}</div>}

                <Field label="New Password" icon={Lock} error={errors.password?.message}>
                  <input
                    className="input pr-10"
                    type={showPw ? "text" : "password"}
                    placeholder="At least 8 characters"
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 8, message: "Password must be at least 8 characters long" },
                      validate: {
                        hasCapital: (v: string) => /[A-Z]/.test(v) || "Password must contain at least one uppercase letter",
                        hasSmall: (v: string) => /[a-z]/.test(v) || "Password must contain at least one lowercase letter",
                        hasNumber: (v: string) => /[0-9]/.test(v) || "Password must contain at least one number",
                        hasSpecial: (v: string) => /[!@#$%^&*(),.?":{}|<>]/.test(v) || "Password must contain at least one special character",
                      }
                    })}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-medical-dark"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </Field>

                <Field label="Confirm New Password" icon={Lock} error={errors.confirm?.message}>
                  <input
                    className="input pr-10"
                    type={showConfirmPw ? "text" : "password"}
                    placeholder="Repeat password"
                    {...register("confirm", { required: "Please confirm", validate: v => v === pw || "Passwords don't match" })}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-medical-dark"
                  >
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </Field>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ripple w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      Update Password <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>

      <style>{`.input{width:100%;padding:0.75rem 0.95rem 0.75rem 2.5rem;border-radius:0.85rem;background:var(--color-card);border:1px solid var(--color-border);font-size:0.9rem;outline:none;transition:all .15s}.input:focus{border-color:var(--medical-light);box-shadow:0 0 0 4px color-mix(in oklab, var(--medical-light) 18%, transparent)}`}</style>
    </div>
  );
}

function Field({ label, icon: Icon, error, children }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-medical-dark mb-1.5 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-medical-dark/80">{error}</p>}
    </div>
  );
}
