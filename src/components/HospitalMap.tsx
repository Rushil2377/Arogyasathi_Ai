import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

// Google Maps Custom Styles: A clean, light slate/teal palette
const mapStyles = [
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }, { weight: 2 }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ weight: 0.6 }, { color: "#cbd5e1" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f8fafc" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#f1f5f9" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "poi.business",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#f1f5f9" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#f8fafc" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e0f2fe" }],
  },
];

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

// Extend Window interface for the dynamic callback safely without explicit any
declare global {
  interface Window {
    initGoogleMapsCallback?: () => void;
  }
}

let googleMapsLoadingPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (googleMapsLoadingPromise) return googleMapsLoadingPromise;

  googleMapsLoadingPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const callbackName = "initGoogleMapsCallback";
    window[callbackName] = () => {
      resolve();
      delete window[callbackName];
    };

    const script = document.createElement("script");
    const keyParam = apiKey ? `key=${apiKey}&` : "";
    script.src = `https://maps.googleapis.com/maps/api/js?${keyParam}callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = (err) => {
      googleMapsLoadingPromise = null;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadingPromise;
}

export default function HospitalMap({
  userLocation,
  hospitals,
  loading,
  selectedHospitalIndex,
  onSelectHospital,
}: HospitalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [apiLoaded, setApiLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const hasApiKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Load API Script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    loadGoogleMapsScript(apiKey)
      .then(() => setApiLoaded(true))
      .catch((err) => {
        console.error("Failed to load Google Maps script:", err);
        setLoadError(true);
      });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!apiLoaded || !mapRef.current) return;

    const initialCenter = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lon }
      : { lat: 23.0225, lng: 72.5714 }; // Default to Ahmedabad

    const map = new google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: 13,
      styles: mapStyles,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    const infoWindow = new google.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    // Cleanup on unmount
    return () => {
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiLoaded]);

  // Open Info Window Helper
  const openHospitalInfoWindow = useCallback(
    (h: Hospital, marker: google.maps.Marker, index: number) => {
      const infoWindow = infoWindowRef.current;
      const map = mapInstanceRef.current;
      if (!infoWindow || !map) return;

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

      infoWindow.setContent(contentString);
      infoWindow.open(map, marker);

      // Setup close click listener to deselect
      const closeListener = infoWindow.addListener("closeclick", () => {
        onSelectHospital(null);
        closeListener.remove();
      });
    },
    [onSelectHospital],
  );

  // Update Markers (User + Hospitals)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!apiLoaded || !map) return;

    // 1. Update User Marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userPos = { lat: userLocation.lat, lng: userLocation.lon };

      const userMarkerIcon = {
        url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><circle cx="12" cy="12" r="7" fill="%230F4C81" stroke="white" stroke-width="2.5"/><circle cx="12" cy="12" r="11" fill="none" stroke="%234DA8DA" stroke-width="1.5" opacity="0.6"/></svg>',
        size: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18),
      };

      userMarkerRef.current = new google.maps.Marker({
        position: userPos,
        map,
        title: "Your Location",
        icon: userMarkerIcon,
      });
    }

    // 2. Update Hospital Markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    if (userLocation) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lon });
    }

    hospitals.forEach((h, index) => {
      const pos = { lat: h.lat, lng: h.lon };
      bounds.extend(pos);

      const isActive = index === selectedHospitalIndex;

      const icon = {
        url: `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="38" height="38"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${isActive ? "%230F4C81" : "%234DA8DA"}" stroke="white" stroke-width="1.5"/><path d="M10.5 6h3v2.5h2.5v3h-2.5V14h-3v-2.5h-2.5v-3h2.5V6z" fill="white"/></svg>`,
        size: new google.maps.Size(38, 38),
        anchor: new google.maps.Point(19, 38),
      };

      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: h.name,
        icon,
        zIndex: isActive ? 1000 : 10,
      });

      marker.addListener("click", () => {
        onSelectHospital(index);
        openHospitalInfoWindow(h, marker, index);
      });

      markersRef.current.push(marker);
    });

    // Fit map bounds to show everything
    if (hospitals.length > 0 || userLocation) {
      if (hospitals.length === 0 && userLocation) {
        map.setCenter({ lat: userLocation.lat, lng: userLocation.lon });
        map.setZoom(14);
      } else {
        map.fitBounds(bounds);

        // Prevent map from zooming in too far on single/close pins
        const listener = google.maps.event.addListenerOnce(map, "bounds_changed", () => {
          if (map.getZoom()! > 16) {
            map.setZoom(16);
          }
        });
      }
    }
  }, [
    userLocation,
    hospitals,
    apiLoaded,
    selectedHospitalIndex,
    onSelectHospital,
    openHospitalInfoWindow,
  ]);

  // Handle selected index change from external sidebar clicks
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!apiLoaded || !map) return;

    // Update marker styles Reactively
    markersRef.current.forEach((marker, index) => {
      const isActive = index === selectedHospitalIndex;
      const icon = {
        url: `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="38" height="38"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${isActive ? "%230F4C81" : "%234DA8DA"}" stroke="white" stroke-width="1.5"/><path d="M10.5 6h3v2.5h2.5v3h-2.5V14h-3v-2.5h-2.5v-3h2.5V6z" fill="white"/></svg>`,
        size: new google.maps.Size(38, 38),
        anchor: new google.maps.Point(19, 38),
      };
      marker.setIcon(icon);
      marker.setZIndex(isActive ? 1000 : 10);
    });

    // Pan & open InfoWindow for external click
    if (selectedHospitalIndex !== null) {
      const marker = markersRef.current[selectedHospitalIndex];
      const h = hospitals[selectedHospitalIndex];
      if (marker && h) {
        openHospitalInfoWindow(h, marker, selectedHospitalIndex);
        map.panTo(marker.getPosition()!);

        // Adjust zoom if too far out
        if (map.getZoom()! < 14) {
          map.setZoom(14);
        }
      }
    } else {
      infoWindowRef.current?.close();
    }
  }, [selectedHospitalIndex, apiLoaded, hospitals, openHospitalInfoWindow]);

  if (loadError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-destructive/5 border border-destructive/20 rounded-3xl p-6 text-center">
        <div>
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h4 className="font-semibold text-medical-dark text-sm">Failed to load Map</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Please check your network connection or verify your Google Maps configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px] md:min-h-[400px]">
      {/* Loading Overlay */}
      {(!apiLoaded || loading) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm transition-all duration-300">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-medical-light mx-auto mb-2" />
            <span className="text-xs font-semibold text-medical-dark">
              {!apiLoaded ? "Initializing Google Maps..." : "Loading nearby hospitals..."}
            </span>
          </div>
        </div>
      )}

      {/* Map Target Div */}
      <div ref={mapRef} className="w-full h-full rounded-3xl" />
    </div>
  );
}
