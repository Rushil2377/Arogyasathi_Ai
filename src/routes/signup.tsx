import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, ArrowRight, Check, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { sendVerificationEmailFn } from "@/lib/verification-service";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign Up • ArogyaSathi AI" }] }),
  component: Signup,
});

type Form = { name: string; email: string; phone: string; password: string; confirm: string };

function Signup() {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<Form>();
  const [error, setError] = useState("");
  const router = useRouter();
  const pw = watch("password");

  const [step, setStep] = useState<"form" | "sent">("form");
  const [tempEmail, setTempEmail] = useState("");
  const [devVerifyUrl, setDevVerifyUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempFormData, setTempFormData] = useState<Form | null>(null);

  const onSubmit = async (data: Form) => {
    if (data.password !== data.confirm) { setError("Passwords don't match"); return; }
    setError("");
    setIsSubmitting(true);
    try {
      const origin = window.location.origin;
      const res = await sendVerificationEmailFn({ data: { data, origin } });
      
      setTempEmail(data.email);
      setTempFormData(data);
      setStep("sent");
      
      if (res.devVerifyUrl) {
        setDevVerifyUrl(res.devVerifyUrl);
        toast.info("SMTP not configured or failed. Verification link generated for testing.");
      } else {
        toast.success("Verification link sent to your email!");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send verification link.");
      toast.error("Failed to send verification link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendLink = async () => {
    if (!tempFormData) return;
    setIsSubmitting(true);
    try {
      const origin = window.location.origin;
      const res = await sendVerificationEmailFn({ data: { data: tempFormData, origin } });
      if (res.devVerifyUrl) {
        setDevVerifyUrl(res.devVerifyUrl);
        toast.info("Verification link generated (SMTP helper active).");
      } else {
        toast.success("Verification link resent to your email!");
      }
    } catch (err: any) {
      toast.error("Failed to resend verification email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative gradient-medical text-white p-12 flex-col justify-between overflow-hidden">
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <img src={logo} alt="" width={36} height={36} className="h-9 w-9 brightness-0 invert" />
          <span className="font-display text-xl font-bold">ArogyaSathi AI</span>
        </Link>
        <div className="relative z-10 space-y-5">
          <h1 className="font-display text-4xl font-bold leading-tight">Start your healthcare<br />journey today.</h1>
          <ul className="space-y-2.5 text-white/90 text-sm">
            {["24×7 AI health assistant", "Instant disease detection", "Plain-language report analysis", "Verified specialist consultation"].map(t => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-white/70 text-xs">Your data stays on your device. Always.</div>
        <div aria-hidden className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-medical-light/30 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <Link to="/" className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display font-bold text-gradient">ArogyaSathi</span>
        </Link>

        {step === "form" ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <h2 className="font-display text-3xl font-bold text-medical-dark">Create account</h2>
            <p className="mt-2 text-sm text-muted-foreground">Already have one?{" "}
              <Link to="/login" className="text-medical-light font-semibold hover:underline">Log in</Link>
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
              {error && <div className="text-sm bg-medical-tint text-medical-dark px-4 py-2.5 rounded-xl border border-medical-dark/20">{error}</div>}

              <Field label="Full Name" icon={User} error={errors.name?.message}>
                <input className="input" placeholder="Rohan Sharma" {...register("name", { required: "Name is required" })} disabled={isSubmitting} />
              </Field>
              <Field label="Email" icon={Mail} error={errors.email?.message}>
                <input className="input" type="email" placeholder="you@example.com" {...register("email", { required: "Email is required" })} disabled={isSubmitting} />
              </Field>
              <Field label="Phone Number" icon={Phone} error={errors.phone?.message}>
                <input className="input" placeholder="+91 98765 43210" {...register("phone", { required: "Phone is required" })} disabled={isSubmitting} />
              </Field>
              <Field label="Password" icon={Lock} error={errors.password?.message}>
                <input className="input" type="password" placeholder="At least 6 characters" {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })} disabled={isSubmitting} />
              </Field>
              <Field label="Confirm Password" icon={Lock} error={errors.confirm?.message}>
                <input className="input" type="password" placeholder="Repeat password" {...register("confirm", { required: "Please confirm", validate: v => v === pw || "Passwords don't match" })} disabled={isSubmitting} />
              </Field>

              <button
                type="submit"
                disabled={isSubmitting}
                className="ripple w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Preparing link...
                  </>
                ) : (
                  <>
                    Create account <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
            <div className="flex items-center gap-3 mb-6 text-left">
              <button
                onClick={() => { setStep("form"); setError(""); }}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition"
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="font-display text-3xl font-bold text-medical-dark">Verify email</h2>
            </div>
            
            <div className="p-4 bg-medical-tint rounded-full text-medical-light w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-medical-dark" />
            </div>

            <h3 className="font-display text-2xl font-bold text-medical-dark mb-3">Verification Link Sent</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              We have sent a verification link to <span className="font-semibold text-foreground">{tempEmail}</span>. Please click on the link to verify your email and activate your account.
            </p>

            {devVerifyUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left animate-pulse">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>🔧 Developer Mode Helper</span>
                </h4>
                <p className="text-xs text-amber-700/90 leading-relaxed mb-3">
                  SMTP configuration is not set up or failed. Use this button to verify the account directly:
                </p>
                <a
                  href={devVerifyUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2.5 rounded-lg shadow-sm transition"
                >
                  Verify Directly <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleResendLink}
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  "Resend Verification Link"
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-xs font-semibold text-medical-light hover:underline mt-2"
                disabled={isSubmitting}
              >
                Change Email Address
              </button>
            </div>
          </motion.div>
        )}
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

