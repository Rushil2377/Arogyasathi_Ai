import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Hospital {
  name: string;
  distance: string;
  phone: string;
  website?: string;
  lat: number;
  lon: number;
}

interface HospitalMapProps {
  userLocation: { lat: number; lon: number; name: string } | null;
  hospitals: Hospital[];
  loading: boolean;
  selectedHospitalIndex: number | null;
  onSelectHospital: (index: number | null) => void;
}

const getHospitalIcon = (isActive: boolean) => L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="38" height="38"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${isActive ? "#0F4C81" : "#4DA8DA"}" stroke="white" stroke-width="1.5"/><path d="M10.5 6h3v2.5h2.5v3h-2.5V14h-3v-2.5h-2.5v-3h2.5V6z" fill="white"/></svg>`,
  className: "custom-map-marker",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

export default function HospitalMap({
  userLocation,
  hospitals,
  loading,
  selectedHospitalIndex,
  onSelectHospital,
}: HospitalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<{ marker: L.Marker; index: number }[]>([]);
  const isProgrammaticSelectionRef = useRef(false);

  const [mapInitialized, setMapInitialized] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initialCenter = userLocation
      ? [userLocation.lat, userLocation.lon]
      : [23.0225, 72.5714]; // Default to Ahmedabad

    const map = L.map(mapRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapInitialized(true);

    map.on("popupclose", () => {
      if (!isProgrammaticSelectionRef.current) {
        onSelectHospital(null);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Markers (User + Hospitals)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapInitialized || !map) return;

    // 1. Update User Marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userMarkerIcon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><circle cx="12" cy="12" r="7" fill="#0F4C81" stroke="white" stroke-width="2.5"/><circle cx="12" cy="12" r="11" fill="none" stroke="#4DA8DA" stroke-width="1.5" opacity="0.6"/></svg>`,
        className: "custom-map-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lon], {
        icon: userMarkerIcon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup("<b>Your Location</b>");
    }

    // 2. Update Hospital Markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);
    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lon]);
    }

    hospitals.forEach((h, index) => {
      bounds.extend([h.lat, h.lon]);

      const isActive = index === selectedHospitalIndex;
      const icon = getHospitalIcon(isActive);

      const websiteHtml = h.website
        ? `<a href="${h.website}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #4DA8DA; text-decoration: none; font-weight: 600; margin-top: 4px;">
           🌐 Website
         </a>`
        : "";

      const contentString = `
        <div style="font-family: inherit; padding: 6px 4px; max-width: 220px;">
          <h4 style="margin: 0 0 4px 0; color: #0F4C81; font-weight: 700; font-size: 13px; line-height: 1.4;">${h.name}</h4>
          <div style="color: #64748b; font-size: 11px; font-weight: 500; display: flex; align-items: center; gap: 3px;">
            <span>📍</span> ${h.distance} away
          </div>
          ${
            websiteHtml
              ? `<div style="margin-top: 6px; display: flex; align-items: center; flex-wrap: wrap;">${websiteHtml}</div>`
              : ""
          }
          <div style="margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, #0F4C81 0%, #4DA8DA 100%); color: white; padding: 5px 10px; border-radius: 9999px; text-decoration: none; font-size: 11px; font-weight: 600; box-shadow: 0 2px 4px rgba(15, 76, 129, 0.15); text-align: center;">
               Get Directions
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([h.lat, h.lon], {
        icon,
        zIndexOffset: isActive ? 2000 : 10,
      })
        .addTo(map)
        .bindPopup(contentString);

      marker.on("click", () => {
        onSelectHospital(index);
      });

      markersRef.current.push({ marker, index });
    });

    // Fit map bounds
    if (hospitals.length > 0 || userLocation) {
      if (hospitals.length === 0 && userLocation) {
        map.setView([userLocation.lat, userLocation.lon], 14);
      } else {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, hospitals, mapInitialized]);

  // Handle selected index change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapInitialized || !map) return;

    isProgrammaticSelectionRef.current = true;

    markersRef.current.forEach(({ marker, index }) => {
      const isActive = index === selectedHospitalIndex;
      marker.setIcon(getHospitalIcon(isActive));
      marker.setZIndexOffset(isActive ? 2000 : 10);

      if (isActive) {
        marker.openPopup();
        map.panTo(marker.getLatLng());

        if (map.getZoom() < 14) {
          map.setZoom(14);
        }
      }
    });

    if (selectedHospitalIndex === null) {
      map.closePopup();
    }

    setTimeout(() => {
      isProgrammaticSelectionRef.current = false;
    }, 100);
  }, [selectedHospitalIndex, mapInitialized]);

  return (
    <div className="relative w-full h-full min-h-[300px] md:min-h-[400px]">
      <style>{`
        .custom-map-marker {
          background: transparent !important;
          border: none !important;
        }
        /* Leaflet Popup Styling Customization to match theme */
        .leaflet-popup-content-wrapper {
          border-radius: 1rem;
          padding: 4px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .leaflet-popup-content {
          margin: 12px 14px;
          line-height: 1.4;
        }
        .leaflet-popup-close-button {
          top: 8px !important;
          right: 8px !important;
        }
      `}</style>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-sm transition-all duration-300">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-medical-light mx-auto mb-2" />
            <span className="text-xs font-semibold text-medical-dark">
              Loading nearby hospitals...
            </span>
          </div>
        </div>
      )}

      {/* Map Target Div */}
      <div ref={mapRef} className="w-full h-full rounded-3xl z-0" />
    </div>
  );
}
