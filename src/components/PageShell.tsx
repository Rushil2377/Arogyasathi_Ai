import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import logo from "@/assets/logo.png";
import { Link } from "@tanstack/react-router";
import ParticleBackground from "./ParticleBackground";

export default function PageShell({
  children,
  showWatermark = false,
  showFooter = true,
}: {
  children: ReactNode;
  showWatermark?: boolean;
  showFooter?: boolean;
}) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background text-foreground">
      {/* Neural particle network background effect */}
      <ParticleBackground />

      {/* Scroll progress */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 inset-x-0 h-[3px] gradient-medical origin-left z-[60]"
      />

      {/* Watermark */}
      {showWatermark && (
        <div
          aria-hidden
          className="fixed inset-0 -z-10 pointer-events-none flex items-center justify-center"
        >
          <img
            src={logo}
            alt=""
            width={900}
            height={900}
            className="max-w-[80vw] max-h-[80vh] opacity-[0.05]"
          />
        </div>
      )}

      {/* Ambient gradient blobs */}
      <div aria-hidden className="fixed -z-20 inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-medical-light/20 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-medical-dark/10 blur-3xl" />
      </div>

      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pt-24 relative z-10"
      >
        {children}
      </motion.main>
      {showFooter && (
        <div className="relative z-10">
          <Footer />
        </div>
      )}

      {/* Floating support */}
      <Link
        to="/ai-health-assistant"
        className="fixed bottom-6 right-6 z-40 group"
        aria-label="Open AI Assistant"
      >
        <span className="absolute inset-0 rounded-full animate-pulse-glow" />
        <span className="relative flex items-center justify-center h-14 w-14 rounded-full gradient-medical text-white shadow-[var(--shadow-glow)] hover:scale-110 transition-transform">
          <MessageCircle className="h-6 w-6" />
        </span>
      </Link>

      {/* Back to top */}
      <motion.button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: showTop ? 1 : 0, scale: showTop ? 1 : 0.6 }}
        className="fixed bottom-24 right-6 z-40 h-11 w-11 rounded-full glass flex items-center justify-center text-medical-dark hover:bg-white"
        aria-label="Back to top"
      >
        <ArrowUp className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
