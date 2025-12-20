import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Interface pour la réponse de l'API IGN Géoplateforme /completion
interface CompletionResult {
  fulltext: string;      // "10 Rue Jean-Jacques Rousseau 75001 Paris"
  x: number;             // longitude
  y: number;             // latitude
  city: string;          // "Paris"
  zipcode: string;       // "75001"
  street: string;        // "Rue Jean-Jacques Rousseau"
  classification: number;
}

interface CompletionResponse {
  status: string;
  results: CompletionResult[];
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

// API IGN Géoplateforme - Autocomplétion dédiée
const API_URL = "https://wxs.ign.fr/essentiels/geoportail/geocodage/rest/0.1/completion";

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Tapez une adresse à Paris...",
  className
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CompletionResult[]>([]);
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
      const params = new URLSearchParams({
        text: query,
        terr: "75",              // Paris uniquement (département 75)
        type: "StreetAddress",   // Adresses seulement (pas POI)
        maximumResponses: "10"
      });
      
      const response = await fetch(`${API_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data: CompletionResponse = await response.json();
      setSuggestions(data.results || []);
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

  const handleSuggestionClick = (result: CompletionResult) => {
    const selectedAddress: SelectedAddress = {
      label: result.fulltext,
      city: result.city,
      postcode: result.zipcode,
      latitude: result.y,      // y = latitude
      longitude: result.x      // x = longitude
    };
    
    console.log("📍 Adresse sélectionnée:", selectedAddress);
    
    onChange(result.fulltext, selectedAddress);
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
          {suggestions.map((result, index) => (
            <button
              key={`${result.fulltext}-${index}`}
              className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-2 transition-colors"
              onClick={() => handleSuggestionClick(result)}
              data-testid="address-suggestion"
            >
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium">{result.fulltext}</div>
                <div className="text-sm text-muted-foreground">
                  {result.zipcode} • {result.city}
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
