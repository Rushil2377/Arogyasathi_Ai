import { Link, useRouter } from "@tanstack/react-router";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X, Activity, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/ai-health-assistant", label: "AI Assistant" },
  { to: "/disease-detection", label: "Detection" },
  { to: "/report-analysis", label: "Reports & Doctors" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const { scrollY } = useScroll();
  const router = useRouter();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", session.user.id)
          .single();
        setUser({
          name: profile?.name || session.user.user_metadata?.name || session.user.email,
          email: session.user.email,
        });
      } else {
        setUser(null);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", session.user.id)
          .single();
        setUser({
          name: profile?.name || session.user.user_metadata?.name || session.user.email,
          email: session.user.email,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.navigate({ to: "/" });
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "glass py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <img src={logo} alt="ArogyaSathi" className="h-9 w-9" width={36} height={36} />
            <span className="absolute inset-0 rounded-full animate-pulse-glow" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold text-gradient">ArogyaSathi</span>
            <span className="text-[10px] tracking-[0.2em] text-medical-dark/70 font-semibold">AI HEALTH</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const active = router.state.location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  active ? "text-medical-dark" : "text-foreground/70 hover:text-medical-dark"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full bg-medical-tint"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                <Activity className="h-3.5 w-3.5 text-medical-light" />
                <span className="text-xs font-medium">{user.name || user.email}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-full hover:bg-medical-tint transition"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4 text-medical-dark" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-medical-dark hover:bg-medical-tint rounded-full transition"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="ripple px-5 py-2 text-sm font-semibold text-white gradient-medical rounded-full shadow-[var(--shadow-glow)] hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 rounded-lg hover:bg-medical-tint"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="lg:hidden glass mt-2 mx-4 rounded-2xl p-4 space-y-1"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium rounded-xl hover:bg-medical-tint"
            >
              {item.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t border-border">
            {user ? (
              <button onClick={logout} className="flex-1 py-2 text-sm font-semibold text-medical-dark border border-medical-dark/20 rounded-xl">
                Log out ({user.name || user.email})
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="flex-1 text-center py-2 text-sm font-semibold text-medical-dark border border-medical-dark/20 rounded-xl">
                  Login
                </Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="flex-1 text-center py-2 text-sm font-semibold text-white gradient-medical rounded-xl">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
