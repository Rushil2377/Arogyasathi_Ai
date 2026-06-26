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
import { useTranslation } from "@/lib/translationContext";

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

function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { language, t } = useTranslation();

  const features = [
    {
      icon: Bot,
      title: t("ai_assistant_title"),
      desc: t("ai_assistant_desc"),
      points: [t("ai_assistant_p1"), t("ai_assistant_p2"), t("ai_assistant_p3")],
      to: "/ai-health-assistant",
    },
    {
      icon: ScanLine,
      title: t("disease_detection_title"),
      desc: t("disease_detection_desc"),
      points: [t("disease_detection_p1"), t("disease_detection_p2"), t("disease_detection_p3")],
      to: "/disease-detection",
    },
    {
      icon: FileText,
      title: t("report_analyzer_title"),
      desc: t("report_analyzer_desc"),
      points: [t("report_analyzer_p1"), t("report_analyzer_p2"), t("report_analyzer_p3")],
      to: "/report-analysis",
    },
    {
      icon: Stethoscope,
      title: t("nearby_hospitals_title"),
      desc: t("nearby_hospitals_desc"),
      points: [t("nearby_hospitals_p1"), t("nearby_hospitals_p2"), t("nearby_hospitals_p3")],
      to: "/report-analysis",
    },
  ];

  const innovations = [
    {
      icon: Languages,
      title: language === "hi" ? "बहुभाषी सहायता" : language === "gu" ? "બહુભાષી સપોર્ટ" : "Multilingual Support",
      desc: language === "hi" ? "अंग्रेजी, हिंदी, गुजराती — अपनी भाषा में बात करें।" : language === "gu" ? "અંગ્રેજી, હિન્દી, ગુજરાતી — તમારી ભાષામાં વાત કરો." : "English, Hindi, Gujarati — speak naturally in your language.",
    },
    {
      icon: BrainCircuit,
      title: language === "hi" ? "एआई रोग पहचान" : language === "gu" ? "એઆઈ રોગ ઓળખ" : "AI Disease Detection",
      desc: language === "hi" ? "त्वरित परिणामों के लिए मेडिकल इमेजिंग पर प्रशिक्षित विज़न मॉडल।" : language === "gu" ? "ત્વરિત પરિણામો માટે મેડિકલ ઇમેજિંગ પર તાલીમ પામેલ વિઝન મોડલ્સ." : "Vision models trained on medical imaging for instant predictions.",
    },
    {
      icon: Mic,
      title: language === "hi" ? "आवाज पहचान" : language === "gu" ? "અવાજ ઓળખ" : "Easy Interaction",
      desc: language === "hi" ? "टाइप करें — बुजुर्गों और कम साक्षरता वाले उपयोगकर्ताओं के लिए सुलभ।" : language === "gu" ? "ટાઇપ કરો — વૃદ્ધો અને ઓછી સાક્ષરતાવાળા વપરાશકર્તાઓ માટે સગવડ." : "type — accessible for elderly and low-literacy users.",
    },
    {
      icon: FileText,
      title: language === "hi" ? "रिपोर्ट सारांश" : language === "gu" ? "રિપોર્ટ સારાંશ" : "Report Summarization",
      desc: language === "hi" ? "जटिल 10-पेज की लैब रिपोर्ट को 1-पैराग्राफ सारांश में बदलें।" : language === "gu" ? "જટિલ 10-પેજની લેબ રિપોર્ટને 1-પેરેગ્રાફ સારાંશમાં ફેરવો." : "Turn 10-page lab reports into a 1-paragraph summary.",
    },
    {
      icon: Stethoscope,
      title: language === "hi" ? "नजदीकी अस्पताल" : language === "gu" ? "નજીકની હોસ્પિટલો" : "Nearby Hospitals",
      desc: language === "hi" ? "नजदीकी अस्पतालों और डॉक्टरों से जुड़ें" : language === "gu" ? "નજીકની હોસ્પિટલો અને ક્લિનિક્સ સાથે જોડાઓ" : "Get connected to nearby hospitals",
    },
  ];

  const roadmap = [
    { phase: language === "hi" ? "चरण 1" : language === "gu" ? "તબક્કો 1" : "Phase 1", title: t("roadmap_phase1") },
    { phase: language === "hi" ? "चरण 2" : language === "gu" ? "તબક્કો 2" : "Phase 2", title: t("roadmap_phase2") },
    { phase: language === "hi" ? "चरण 3" : language === "gu" ? "તબક્કો 3" : "Phase 3", title: t("roadmap_phase3") },
    { phase: language === "hi" ? "चरण 4" : language === "gu" ? "તબક્કો 4" : "Phase 4", title: t("roadmap_phase4") },
    { phase: language === "hi" ? "चरण 5" : language === "gu" ? "તબક્કો 5" : "Phase 5", title: t("roadmap_phase5") },
  ];

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
              <Sparkles className="h-3.5 w-3.5 text-medical-light animate-pulse-glow" />
              {t("hero_pill")}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight"
            >
              <span className="text-gradient">ArogyaSathi AI</span>
              <br />
              <span className="text-medical-dark">{t("hero_title_1")}</span>
              <br />
              <span className="text-medical-dark/80">{t("hero_title_2")}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed"
            >
              {t("hero_desc")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-7 flex flex-wrap gap-3"
            >
              <Link
                to={isLoggedIn ? "/ai-health-assistant" : "/signup"}
                className="ripple inline-flex items-center gap-2 px-6 py-3 rounded-full gradient-medical text-white font-semibold shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition"
              >
                {t("get_started")} <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass font-semibold text-medical-dark hover:bg-white transition"
              >
                {language === "hi" ? "सुविधाएं देखें" : language === "gu" ? "સુવિધાઓ જુઓ" : "Explore Features"}
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
              {language === "hi" ? "समस्या" : language === "gu" ? "સમસ્યા" : "The problem"}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              {language === "hi" ? "ग्रामीण भारत बेहतर स्वास्थ्य सेवा का हकदार है" : language === "gu" ? "ગ્રામીણ ભારત વધુ સારી હેલ્થકેરને પાત્ર છે" : "Rural India deserves better healthcare"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {language === "hi"
                ? "९० करोड़ से अधिक भारतीय बड़े शहरों से बाहर रहते हैं। उन्हें लंबी यात्रा, डॉक्टरों की कमी और निदान में खतरनाक देरी का सामना करना पड़ता है।"
                : language === "gu"
                  ? "૯૦ કરોડથી વધુ ભારતીયો મોટા શહેરોની બહાર રહે છે. તેઓ લાંબી મુસાફરી, ડોકટરોની અછત અને નિદાનમાં જોખમી વિલંબનો સામનો કરે છે."
                  : "900 million Indians live outside major cities. They face long travel, specialist shortages, confusing reports, and dangerously delayed diagnoses."}
            </p>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <Reveal className="glass rounded-3xl p-7 hover-lift">
              <h3 className="font-display text-lg font-bold text-medical-dark mb-4">
                {language === "hi" ? "चुनौतियां" : language === "gu" ? "પડકારો" : "The challenges"}
              </h3>
              <ul className="space-y-3 text-sm">
                {(language === "hi"
                  ? [
                      "विशेषज्ञ तक पहुँचने के लिए 20+ किमी की यात्रा",
                      "ग्रामीण क्षेत्रों में प्रति 1,500 लोगों पर केवल 1 डॉक्टर",
                      "कठिन वैज्ञानिक शब्दों में लिखी गई लैब रिपोर्ट",
                      "महत्वपूर्ण निदान में हफ्तों की देरी",
                    ]
                  : language === "gu"
                    ? [
                        "નિષ્ણાત સુધી પહોંચવા માટે 20+ કિમીની મુસાફરી",
                        "ગ્રામીણ વિસ્તારોમાં દર 1,500 લોકો વચ્ચે માત્ર 1 ડૉક્ટર",
                        "મુશ્કેલ વૈજ્ઞાનિક શબ્દોમાં લખાયેલ લેબ રિપોર્ટ",
                        "મહત્વપૂર્ણ નિદાનમાં અઠવાડિયાઓનો વિલંબ",
                      ]
                    : [
                        "Travel of 20+ km to reach a specialist",
                        "1 doctor per 1,500 people in rural areas",
                        "Lab reports written in inaccessible jargon",
                        "Critical diagnosis delayed by weeks",
                      ]
                ).map((c) => (
                  <li key={c} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-medical-dark" />
                    <span className="text-muted-foreground">{c}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="rounded-3xl p-7 gradient-medical text-white hover-lift">
              <h3 className="font-display text-lg font-bold mb-4">
                {language === "hi" ? "आरोग्यसाथी इसे कैसे हल करता है" : language === "gu" ? "આરોગ્યસાથી તેને કેવી રીતે હલ કરે છે" : "How ArogyaSathi solves it"}
              </h3>
              <ul className="space-y-3 text-sm">
                {(language === "hi"
                  ? [
                      "3+ भाषाओं में एआई सहायक, 24×7 उपलब्ध",
                      "फोन फोटो से सीधे रोग की पहचान",
                      "सरल हिंदी/गुजराती/अंग्रेजी में रिपोर्ट का स्पष्टीकरण",
                      "सत्यापित विशेषज्ञों से सीधे जुड़ने की सुविधा",
                    ]
                  : language === "gu"
                    ? [
                        "3+ ભાષાઓમાં એઆઈ સહાયક, 24×7 ઉપલબ્ધ",
                        "ફોન ફોટો પરથી સીધી રોગની ઓળખ",
                        "સરળ હિન્દી/ગુજરાતી/અંગ્રેજીમાં રિપોર્ટની સ્પષ્ટતા",
                        "ચકાસાયેલ નિષ્ણાતો સાથે સીધા જોડાવાની સુવિધા",
                      ]
                    : [
                        "AI assistant in 3+ languages, available 24×7",
                        "On-device disease detection from a phone photo",
                        "Reports explained in plain Hindi/Gujarati/English",
                        "Direct consult with verified specialists",
                      ]
                ).map((c) => (
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
              {language === "hi" ? "मुख्य विशेषताएं" : language === "gu" ? "મુખ્ય વિશેષતાઓ" : "Core features"}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              {t("core_features")}
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
                      {language === "hi" ? "इसे आज़माएं" : language === "gu" ? "અજમાવી જુઓ" : "Try it"} <ArrowRight className="h-3 w-3" />
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
              {language === "hi" ? "नवाचार" : language === "gu" ? "નવીનતા" : "Innovation"}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              {language === "hi" ? "क्या हमें अलग बनाता है" : language === "gu" ? "અમને શું ખાસ બનાવે છે" : "What sets us apart"}
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
              {language === "hi" ? "प्रभाव" : language === "gu" ? "અસર" : "Impact"}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              {language === "hi" ? "हम किसकी सेवा करते हैं और यह कैसे मदद करता है" : language === "gu" ? "અમે કોની સેવા કરીએ છીએ અને તે કેવી રીતે મદદ કરે છે" : "Who we serve & how it helps"}
            </h2>
          </Reveal>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <Reveal className="glass rounded-3xl p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl gradient-medical text-white flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-medical-dark">
                  {language === "hi" ? "प्राथमिक उपयोगकर्ता" : language === "gu" ? "પ્રાથમિક વપરાશકર્તાઓ" : "Primary users"}
                </h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• {language === "hi" ? "ग्रामीण समुदाय जिनके पास क्लीनिक की सीमित पहुँच है" : language === "gu" ? "ગ્રામીણ સમુદાયો જેમની પાસે ક્લિનિક્સની મર્યાદિત પહોંચ છે" : "Rural communities with limited clinic access"}</li>
                <li>• {language === "hi" ? "निरंतर स्वास्थ्य मार्गदर्शन की आवश्यकता वाले बुजुर्ग" : language === "gu" ? "સતત આરોગ્ય માર્ગદર્શનની જરૂરિયાતવાળા વૃદ્ધો" : "Elderly people needing constant guidance"}</li>
                <li>• {language === "hi" ? "सीमित स्वास्थ्य साक्षरता वाले मरीज" : language === "gu" ? "મર્યાદિત આરોગ્ય સાક્ષરતાવાળા દર્દીઓ" : "Patients with limited healthcare literacy"}</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="glass rounded-3xl p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl gradient-medical text-white flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-medical-dark">
                  {language === "hi" ? "लाभ" : language === "gu" ? "લાભો" : "Benefits"}
                </h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• {language === "hi" ? "यात्रा और अतिरिक्त चिकित्सीय खर्चों में कमी" : language === "gu" ? "મુસાફરી અને વધારાના તબીબી ખર્ચમાં ઘટાડો" : "Reduced travel and out-of-pocket costs"}</li>
                <li>• {language === "hi" ? "जानलेवा बीमारियों की शुरुआती पहचान" : language === "gu" ? "જીવલેણ રોગોની પ્રારંભિક ઓળખ" : "Earlier detection of life-threatening conditions"}</li>
                <li>• {language === "hi" ? "त्वरित और बेहतर उपचार निर्णय" : language === "gu" ? "ઝડપી અને વધુ માહિતગાર સારવાર નિર્ણયો" : "Faster, better-informed treatment decisions"}</li>
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
              {language === "hi" ? "रोडमैप" : language === "gu" ? "રોડમેપ" : "Roadmap"}
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-medical-dark">
              {t("future_roadmap")}
            </h2>
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
                {language === "hi" ? "स्वास्थ्य सेवा आपकी जेब में। अभी।" : language === "gu" ? "હેલ્થકેર તમારા ખિસ્સામાં. હમણાં જ." : "Healthcare in your pocket. Right now."}
              </h2>
              <p className="mt-3 text-white/85 max-w-xl mx-auto">
                {language === "hi" ? "तेज़, स्मार्ट और अधिक सुलभ देखभाल के लिए आरोग्यसाथी से जुड़ें।" : language === "gu" ? "ઝડપી, સ્માર્ટ અને વધુ સુલભ સંભાળ માટે આરોગ્યસાથી સાથે જોડાઓ." : "Join ArogyaSathi for faster, smarter, more accessible care."}
              </p>
              <Link
                to="/signup"
                className="ripple mt-7 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-medical-dark font-bold hover:-translate-y-0.5 transition"
              >
                {language === "hi" ? "मुफ़्त खाता बनाएँ" : language === "gu" ? "મફત ખાતું બનાવો" : "Create free account"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      )}
    </PageShell>
  );
}
