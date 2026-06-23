import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { verifyTokenFn } from "@/lib/verification-service";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Heart } from "lucide-react";
import logo from "@/assets/logo.png";

type SearchParams = {
  token?: string;
};

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      token: search.token as string | undefined,
    };
  },
  head: () => ({ meta: [{ title: "Verify Email • ArogyaSathi AI" }] }),
  component: VerifyEmail,
});

function VerifyEmail() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email address...");
  const router = useRouter();
  const verificationStarted = useRef(false);

  useEffect(() => {
    // Prevent double verification on double-mount in dev mode React 18
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const performVerification = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing. Please sign up again.");
        return;
      }

      try {
        // 1. Verify token on server and get registration data
        const res = await verifyTokenFn({ data: { token } });
        if (!res.success || !res.data) {
          throw new Error("Invalid or expired verification token.");
        }

        const formData = res.data;
        setMessage("Creating your account...");

        // 2. Complete sign up in Supabase
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              phone: formData.phone,
            }
          }
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        setStatus("success");
        setMessage("Email verified successfully! Creating your profile and redirecting you to dashboard...");
        toast.success("Account created successfully!");

        // Redirect to homepage after 3 seconds
        setTimeout(() => {
          router.navigate({ to: "/" });
        }, 3000);

      } catch (err: any) {
        console.error("Verification failed:", err);
        setStatus("error");
        setMessage(err?.message || "Failed to verify email. Please try signing up again.");
        toast.error(err?.message || "Verification failed.");
      }
    };

    performVerification();
  }, [token, router]);

  return (
    <div className="min-h-screen relative grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex relative gradient-medical text-white p-12 flex-col justify-between overflow-hidden">
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <img src={logo} alt="" width={36} height={36} className="h-9 w-9 brightness-0 invert" />
          <span className="font-display text-xl font-bold">ArogyaSathi AI</span>
        </Link>
        <div className="relative z-10">
          <h1 className="font-display text-4xl font-bold leading-tight">Verification in progress.<br />Setting up your portal.</h1>
          <p className="mt-3 text-white/85 max-w-md">We secure your patient account to keep all health records, chats, and detections private on your device And dont reply.</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-white/80 text-sm">
          <Heart className="h-4 w-4" /> Secure Health Data Protection
        </div>
        <div aria-hidden className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-medical-light/30 blur-3xl" />
      </div>

      {/* Main card section */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <Link to="/" className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display font-bold text-gradient">ArogyaSathi</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 rounded-2xl border border-border bg-card shadow-lg text-center flex flex-col items-center space-y-6"
        >
          {status === "loading" && (
            <>
              <div className="p-4 bg-medical-tint rounded-full text-medical-light animate-pulse">
                <Loader2 className="h-12 w-12 animate-spin text-medical-dark" />
              </div>
              <h2 className="font-display text-2xl font-bold text-medical-dark">Verifying Email</h2>
              <p className="text-muted-foreground text-sm">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h2 className="font-display text-2xl font-bold text-emerald-800">Verified!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="p-4 bg-rose-50 rounded-full text-rose-600">
                <AlertCircle className="h-12 w-12" />
              </div>
              <h2 className="font-display text-2xl font-bold text-rose-800">Verification Failed</h2>
              <p className="text-rose-700/80 text-sm leading-relaxed">{message}</p>

              <div className="flex flex-col gap-3 w-full pt-4">
                <Link
                  to="/signup"
                  className="ripple w-full inline-flex items-center justify-center py-2.5 rounded-xl gradient-medical text-white font-semibold shadow-sm hover:opacity-95 transition"
                >
                  Return to Signup
                </Link>
                <Link
                  to="/"
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-xl border border-border bg-background text-muted-foreground font-semibold hover:bg-muted transition"
                >
                  Go Home
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
