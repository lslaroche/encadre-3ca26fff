import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AddressResult {
  geometry: {
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    label: string;
    city: string;
    postcode: string;
    citycode: string;
    context: string;
  };
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

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Tapez une adresse à Paris...",
  className
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
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
      // Recherche d'adresses avec type=housenumber pour avoir des adresses précises
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=10&autocomplete=1&type=housenumber`
      );
      const data = await response.json();
      
      // Filtrer pour garder uniquement Paris (codes postaux 75xxx)
      const parisResults = (data.features || []).filter((feature: AddressResult) => 
        feature.properties.postcode?.startsWith("75")
      );
      
      setSuggestions(parisResults.slice(0, 5));
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

  const handleSuggestionClick = (suggestion: AddressResult) => {
    const [longitude, latitude] = suggestion.geometry.coordinates;
    
    const selectedAddress: SelectedAddress = {
      label: suggestion.properties.label,
      city: suggestion.properties.city,
      postcode: suggestion.properties.postcode,
      latitude,
      longitude
    };
    
    console.log("📍 Adresse sélectionnée:", selectedAddress);
    
    onChange(suggestion.properties.label, selectedAddress);
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
        />
        {isLoading && (
          <div className="absolute right-3 top-3 w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-2 transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium">{suggestion.properties.label}</div>
                <div className="text-sm text-muted-foreground">
                  {suggestion.properties.postcode} • {suggestion.properties.city}
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
