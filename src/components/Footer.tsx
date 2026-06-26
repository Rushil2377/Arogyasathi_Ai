import { Link } from "@tanstack/react-router";
import { Heart, Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { useTranslation } from "@/lib/translationContext";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative mt-24 border-t border-border bg-medical-tint/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-gradient">ArogyaSathi AI</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("footer_tagline")}
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-medical-dark mb-3 text-sm">{t("reports_doctors").split(" ")[0]}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/ai-health-assistant" className="hover:text-medical-dark transition">
                {t("ai_assistant")}
              </Link>
            </li>
            <li>
              <Link to="/disease-detection" className="hover:text-medical-dark transition">
                {t("detection")}
              </Link>
            </li>
            <li>
              <Link to="/report-analysis" className="hover:text-medical-dark transition">
                {t("reports_doctors")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-medical-dark mb-3 text-sm">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> arogyasathi46@gmail.com
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> +91 7567304075
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" /> Vadodara, India
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground px-4">
        <div>© {new Date().getFullYear()} ArogyaSathi AI. {t("footer_rights")}</div>
        <div className="mt-1.5 text-[10px] text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed">
          {t("footer_disclaimer")}
        </div>
      </div>
    </footer>
  );
}
