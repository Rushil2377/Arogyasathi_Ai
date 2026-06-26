import { Globe } from "lucide-react";
import { useTranslation, Language } from "@/lib/translationContext";

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();

  const langs = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "gu", label: "ગુજરાતી" },
  ];

  return (
    <div className="glass rounded-full p-1.5 flex items-center gap-0.5 border border-white/20 shadow-sm bg-white/30 shrink-0">
      <Globe className="h-3.5 w-3.5 ml-2 mr-1.5 text-medical-light shrink-0" />
      <div className="flex items-center gap-1.5">
        {langs.map((l) => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code as Language)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
              language === l.code
                ? "gradient-medical text-white shadow-[0_2px_10px_rgba(14,165,233,0.3)] scale-[1.03]"
                : "text-medical-dark hover:bg-medical-tint/50 hover:text-medical-dark"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
