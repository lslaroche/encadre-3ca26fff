import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Interface pour la réponse de l'API Géoplateforme /search (format GeoJSON)
interface GeocodageFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    street?: string;
    postcode: string;
    citycode: string;
    city: string;
    context: string;
    id: string;
  };
}

interface GeocodageResponse {
  type: "FeatureCollection";
  features: GeocodageFeature[];
}

export interface SelectedAddress {
  label: string;
  city: string;
  postcode: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, address?: SelectedAddress) => void;
  placeholder?: string;
  className?: string;
}

// Codes INSEE des 20 arrondissements de Paris
const PARIS_CITY_CODES = Array.from(
  { length: 20 },
  (_, i) => `751${(i + 1).toString().padStart(2, '0')}`
).join(',');

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Tapez une adresse à Paris...",
  className
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeocodageFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // API Géoplateforme /search avec mode autocomplete (activé par défaut)
      // index=address pour les adresses uniquement
      // citycode filtre sur les 20 arrondissements de Paris
      const response = await fetch(
        `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(query)}&index=address&limit=10&citycode=${PARIS_CITY_CODES}`
      );
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data: GeocodageResponse = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresses:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (value) {
        searchAddresses(value);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSuggestionClick = (feature: GeocodageFeature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    
    const selectedAddress: SelectedAddress = {
      label: feature.properties.label,
      city: feature.properties.city,
      postcode: feature.properties.postcode,
      latitude,
      longitude
    };
    
    console.log("📍 Adresse sélectionnée:", selectedAddress);
    
    onChange(feature.properties.label, selectedAddress);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
          className={cn("pl-10 bg-muted/50 border-primary/20 focus:border-primary", className)}
          data-testid="address-input"
        />
        {isLoading && (
          <div className="absolute right-3 top-3 w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((feature, index) => (
            <button
              key={feature.properties.id || index}
              className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-2 transition-colors"
              onClick={() => handleSuggestionClick(feature)}
              data-testid="address-suggestion"
            >
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium">{feature.properties.label}</div>
                <div className="text-sm text-muted-foreground">
                  {feature.properties.postcode} • {feature.properties.city}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && value.length >= 3 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-4 text-center text-muted-foreground text-sm">
          Aucune adresse trouvée à Paris. Essayez une autre recherche.
        </div>
      )}
    </div>
  );
}
