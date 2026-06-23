import { Link } from "@tanstack/react-router";
import { Heart, Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border bg-medical-tint/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-gradient">ArogyaSathi AI</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI-powered healthcare companion built for rural and semi-urban India.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Made with <Heart className="h-3 w-3 fill-medical-light text-medical-light" /> for Biothon
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-medical-dark mb-3 text-sm">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/ai-health-assistant" className="hover:text-medical-dark transition">AI Assistant</Link></li>
            <li><Link to="/disease-detection" className="hover:text-medical-dark transition">Disease Detection</Link></li>
            <li><Link to="/report-analysis" className="hover:text-medical-dark transition">Report Analysis</Link></li>
            <li><Link to="/report-analysis" className="hover:text-medical-dark transition">Doctor Consultation</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-medical-dark mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#about" className="hover:text-medical-dark transition">About</a></li>
            <li><a href="#features" className="hover:text-medical-dark transition">Features</a></li>
            <li><a href="#" className="hover:text-medical-dark transition">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-medical-dark transition">Terms of Service</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-medical-dark mb-3 text-sm">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> hello@arogyasathi.ai</li>
            <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> +91 98765 43210</li>
            <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Ahmedabad, India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ArogyaSathi AI. All rights reserved.
      </div>
    </footer>
  );
}
