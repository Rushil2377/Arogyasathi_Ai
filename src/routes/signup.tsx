import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import logo from "@/assets/logo.png";

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

  const onSubmit = async (data: Form) => {
    if (data.password !== data.confirm) { setError("Passwords don't match"); return; }
    setError("");
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: data.phone,
        }
      }
    });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.navigate({ to: "/" });
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <h2 className="font-display text-3xl font-bold text-medical-dark">Create account</h2>
          <p className="mt-2 text-sm text-muted-foreground">Already have one?{" "}
            <Link to="/login" className="text-medical-light font-semibold hover:underline">Log in</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {error && <div className="text-sm bg-medical-tint text-medical-dark px-4 py-2.5 rounded-xl border border-medical-dark/20">{error}</div>}

            <Field label="Full Name" icon={User} error={errors.name?.message}>
              <input className="input" placeholder="Rohan Sharma" {...register("name", { required: "Name is required" })} />
            </Field>
            <Field label="Email" icon={Mail} error={errors.email?.message}>
              <input className="input" type="email" placeholder="you@example.com" {...register("email", { required: "Email is required" })} />
            </Field>
            <Field label="Phone Number" icon={Phone} error={errors.phone?.message}>
              <input className="input" placeholder="+91 98765 43210" {...register("phone", { required: "Phone is required" })} />
            </Field>
            <Field label="Password" icon={Lock} error={errors.password?.message}>
              <input className="input" type="password" placeholder="At least 6 characters" {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })} />
            </Field>
            <Field label="Confirm Password" icon={Lock} error={errors.confirm?.message}>
              <input className="input" type="password" placeholder="Repeat password" {...register("confirm", { required: "Please confirm", validate: v => v === pw || "Passwords don't match" })} />
            </Field>

            <button type="submit" className="ripple w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition">
              Create account <ArrowRight className="h-4 w-4" />
            </button>
          </form>
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
