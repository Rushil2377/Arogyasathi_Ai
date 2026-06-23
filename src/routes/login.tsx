import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login • ArogyaSathi AI" }] }),
  component: Login,
});

type Form = { email: string; password: string; remember: boolean };

function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const onSubmit = async (data: Form) => {
    setError("");
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.navigate({ to: "/" });
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
          <h1 className="font-display text-4xl font-bold leading-tight">Welcome back.<br />Your health, simplified.</h1>
          <p className="mt-3 text-white/85 max-w-md">Pick up where you left off — chats, reports, and detections stay synced on your device.</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-white/80 text-sm">
          <Heart className="h-4 w-4" /> Trusted by 50,000+ users
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
          <h2 className="font-display text-3xl font-bold text-medical-dark">Patient login</h2>
          <p className="mt-2 text-sm text-muted-foreground">New here?{" "}
            <Link to="/signup" className="text-medical-light font-semibold hover:underline">Create an account</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {error && <div className="text-sm bg-medical-tint text-medical-dark px-4 py-2.5 rounded-xl border border-medical-dark/20">{error}</div>}

            <Field label="Email" icon={Mail} error={errors.email?.message}>
              <input
                type="email"
                placeholder="you@example.com"
                {...register("email", { required: "Email is required" })}
                className="input"
              />
            </Field>

            <Field label="Password" icon={Lock} error={errors.password?.message}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                {...register("password", { required: "Password is required" })}
                className="input pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-medical-dark">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register("remember")} className="accent-medical-dark h-4 w-4 rounded" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <button type="button" className="text-medical-light font-semibold hover:underline">Forgot password?</button>
            </div>

            <button
              type="submit"
              className="ripple w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition"
            >
              Sign in <ArrowRight className="h-4 w-4" />
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
