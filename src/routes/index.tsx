import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Bot,
  Camera,
  FileText,
  Stethoscope,
  ArrowRight,
  Sparkles,
  Languages,
  ShieldCheck,
  Activity,
  Users,
  Clock,
  TrendingUp,
  HeartPulse,
  MapPin,
  Mic,
  ScanLine,
  BrainCircuit,
  Star,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Reveal, { Counter } from "@/components/Reveal";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ArogyaSathi AI — Your Smart Healthcare Companion" },
      {
        name: "description",
        content:
          "24×7 AI-powered healthcare for rural India: symptom guidance, disease detection, report analysis, expert consultation.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: Bot,
    title: "AI Health Assistant",
    desc: "Symptom analysis & 24×7 guidance in your language.",
    points: ["Symptom analysis", "Healthcare guidance", "24×7 support"],
    to: "/ai-health-assistant",
  },
  {
    icon: ScanLine,
    title: "Disease Detection",
    desc: "Upload an image, get an AI-powered prediction in seconds.",
    points: ["Skin disease detection", "AI-powered analysis", "Instant prediction"],
    to: "/disease-detection",
  },
  {
    icon: FileText,
    title: "Medical Report Analyzer",
    desc: "Turn complex lab reports into plain-language insights.",
    points: ["Simplified explanations", "Abnormal value detection", "Risk insights"],
    to: "/report-analysis",
  },
  {
    icon: Stethoscope,
    title: "Nearby Hospitals",
    desc: "Connect to nearby hospitals and doctors with AI-prepared summary.",
    points: ["Variable distance search", "City wise search", "One-click navigation"],
    to: "/report-analysis",
  },
];

const innovations = [
  {
    icon: Languages,
    title: "Multilingual Support",
    desc: "English, Hindi, Gujarati — speak naturally in your language.",
  },
  {
    icon: BrainCircuit,
    title: "AI Disease Detection",
    desc: "Vision models trained on medical imaging for instant predictions.",
  },
  {
    icon: Mic,
    title: "Text Interaction",
    desc: "type — accessible for elderly and low-literacy users.",
  },
  {
    icon: FileText,
    title: "Report Summarization",
    desc: "Turn 10-page lab reports into a 1-paragraph summary.",
  },
  {
    icon: Stethoscope,
    title: "Nearby Hospitals",
    desc: "Get connected to nearby hospitals",
  },
];

const roadmap = [
  { phase: "Phase 1", title: "Live Sessions With Doctors" },
  { phase: "Phase 2", title: "Speech Recognisation" },
  { phase: "Phase 3", title: "Hospital Links" },
  { phase: "Phase 4", title: "Show Government schemes" },
  { phase: "Phase 5", title: "Recommend Doctors and Specialists" },
];

function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative px-4 sm:px-6 pt-6 pb-24">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs font-semibold text-medical-dark"
            >
              <Sparkles className="h-3.5 w-3.5 text-medical-light" />
              AI Healthcare • Built for rural India
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight"
            >
              <span className="text-gradient">ArogyaSathi AI</span>
              <br />
              <span className="text-medical-dark">Your smart healthcare</span>
              <br />
              <span className="text-medical-dark/80">companion.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed"
            >
              AI-powered healthcare assistance available 24×7 for symptom guidance, disease
              detection, medical report understanding, and expert consultation.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-7 flex flex-wrap gap-3"
            >
              <Link
                to="/signup"
                className="ripple inline-flex items-center gap-2 px-6 py-3 rounded-full gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass font-semibold text-medical-dark hover:bg-white transition"
              >
                Explore Features
              </a>
            </motion.div>
          </div>

          {/* Hero illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 rounded-[40%_60%_60%_40%_/_50%_50%_50%_50%] gradient-soft blur-2xl animate-float" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-[0.2em] text-medical-light uppercase">
              The problem
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              Rural India deserves better healthcare
            </h2>
            <p className="mt-3 text-muted-foreground">
              900 million Indians live outside major cities. They face long travel, specialist
              shortages, confusing reports, and dangerously delayed diagnoses.
            </p>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <Reveal className="glass rounded-3xl p-7 hover-lift">
              <h3 className="font-display text-lg font-bold text-medical-dark mb-4">
                The challenges
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  "Travel of 20+ km to reach a specialist",
                  "1 doctor per 1,500 people in rural areas",
                  "Lab reports written in inaccessible jargon",
                  "Critical diagnosis delayed by weeks",
                ].map((c) => (
                  <li key={c} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-medical-dark" />
                    <span className="text-muted-foreground">{c}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="rounded-3xl p-7 gradient-medical text-white hover-lift">
              <h3 className="font-display text-lg font-bold mb-4">How ArogyaSathi solves it</h3>
              <ul className="space-y-3 text-sm">
                {[
                  "AI assistant in 3+ languages, available 24×7",
                  "On-device disease detection from a phone photo",
                  "Reports explained in plain Hindi/Gujarati/English",
                  "Direct consult with verified specialists",
                ].map((c) => (
                  <li key={c} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white" />
                    <span className="text-white/90">{c}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-[0.2em] text-medical-light uppercase">
              Core features
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              Everything you need to stay healthy
            </h2>
          </Reveal>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <Link
                  to={f.to}
                  className="group block h-full glass rounded-3xl p-6 hover-lift relative overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-medical-light/10 group-hover:bg-medical-light/30 transition" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl gradient-medical flex items-center justify-center text-white mb-4 shadow-[var(--shadow-glow)]">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-medical-dark">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                    <ul className="mt-4 space-y-1.5">
                      {f.points.map((p) => (
                        <li
                          key={p}
                          className="flex items-center gap-2 text-xs text-medical-dark/80"
                        >
                          <span className="h-1 w-1 rounded-full bg-medical-light" /> {p}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-medical-light group-hover:gap-2 transition-all">
                      Try it <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* INNOVATION TIMELINE */}
      <section className="px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-[0.2em] text-medical-light uppercase">
              Innovation
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              What sets us apart
            </h2>
          </Reveal>
          <div className="mt-14 relative">
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px gradient-medical -translate-x-1/2 hidden sm:block" />
            <div className="absolute left-4 top-0 bottom-0 w-px gradient-medical sm:hidden" />
            <div className="space-y-8">
              {innovations.map((it, i) => (
                <Reveal key={it.title} delay={i * 0.06}>
                  <div
                    className={`flex sm:items-center gap-5 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"}`}
                  >
                    <div className="relative z-10 shrink-0 ml-0 sm:ml-0">
                      <div className="h-9 w-9 rounded-full gradient-medical flex items-center justify-center text-white shadow-[var(--shadow-glow)]">
                        <it.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 glass rounded-2xl p-5 hover-lift">
                      <h3 className="font-display font-bold text-medical-dark">{it.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section className="px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-[0.2em] text-medical-light uppercase">
              Impact
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              Who we serve & how it helps
            </h2>
          </Reveal>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <Reveal className="glass rounded-3xl p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl gradient-medical text-white flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-medical-dark">Primary users</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• Rural communities with limited clinic access</li>
                <li>• Elderly people needing constant guidance</li>
                <li>• Patients with limited healthcare literacy</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="glass rounded-3xl p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl gradient-medical text-white flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-medical-dark">Benefits</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• Reduced travel and out-of-pocket costs</li>
                <li>• Earlier detection of life-threatening conditions</li>
                <li>• Faster, better-informed treatment decisions</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-[0.2em] text-medical-light uppercase">
              Roadmap
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">Future vision</h2>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {roadmap.map((r, i) => (
              <Reveal key={r.phase} delay={i * 0.08}>
                <div className="glass rounded-2xl p-5 h-full hover-lift relative">
                  <div className="text-xs font-bold text-medical-light tracking-widest">
                    {r.phase}
                  </div>
                  <div className="mt-2 font-display text-base font-bold text-medical-dark">
                    {r.title}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isLoggedIn && (
        <section className="px-4 sm:px-6 pb-20">
          <Reveal className="mx-auto max-w-5xl rounded-[2rem] gradient-medical text-white p-10 sm:p-14 text-center relative overflow-hidden shadow-[var(--shadow-elegant)]">
            <div className="absolute inset-0 opacity-30">
              <Activity className="absolute top-6 left-6 h-10 w-10" />
              <HeartPulse className="absolute bottom-6 right-6 h-12 w-12" />
              <MapPin className="absolute top-10 right-1/3 h-8 w-8" />
              <Clock className="absolute bottom-10 left-1/3 h-9 w-9" />
            </div>
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Healthcare in your pocket. Right now.
              </h2>
              <p className="mt-3 text-white/85 max-w-xl mx-auto">
                Join ArogyaSathi for faster, smarter, more accessible care.
              </p>
              <Link
                to="/signup"
                className="ripple mt-7 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-medical-dark font-bold hover:-translate-y-0.5 transition"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      )}
    </PageShell>
  );
}
