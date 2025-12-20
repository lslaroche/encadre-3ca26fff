import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MapPin, Calculator, Info, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { AddressAutocomplete, SelectedAddress } from "@/components/AddressAutocomplete";
import { fetchRentControl, calculateCompliance } from "@/services/parisRentApi";
import { fetchBuildingConstructionPeriod } from "@/services/apurBuildingApi";

const Index = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState(() => localStorage.getItem('location') || "");
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(() => {
    const saved = localStorage.getItem('selectedAddress');
    return saved ? JSON.parse(saved) : null;
  });
  const [surface, setSurface] = useState(() => localStorage.getItem('surface') || "");
  const [rent, setRent] = useState(() => localStorage.getItem('rent') || "");
  const [constructionPeriod, setConstructionPeriod] = useState(() => localStorage.getItem('constructionPeriod') || "");
  const [roomCount, setRoomCount] = useState(() => localStorage.getItem('roomCount') || "");
  const [isFurnished, setIsFurnished] = useState(() => localStorage.getItem('isFurnished') || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingEpoque, setIsLoadingEpoque] = useState(false);
  const [autoDetectedPeriod, setAutoDetectedPeriod] = useState<string | null>(null);

  // Auto-détection de l'époque au chargement si adresse présente mais pas d'époque
  useEffect(() => {
    const detectConstructionPeriod = async () => {
      if (selectedAddress && !constructionPeriod) {
        setIsLoadingEpoque(true);
        try {
          const buildingData = await fetchBuildingConstructionPeriod(selectedAddress.latitude, selectedAddress.longitude);
          if (buildingData.constructionPeriod) {
            setConstructionPeriod(buildingData.constructionPeriod);
            setAutoDetectedPeriod(buildingData.apurLabel);
            console.log('[Index] Époque auto-détectée au chargement:', buildingData);
          }
        } catch (err) {
          console.error('[Index] Erreur auto-détection époque:', err);
        } finally {
          setIsLoadingEpoque(false);
        }
      }
    };
    detectConstructionPeriod();
  }, []); // Run once on mount

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    localStorage.setItem('location', location);
  }, [location]);
  
  useEffect(() => {
    if (selectedAddress) {
      localStorage.setItem('selectedAddress', JSON.stringify(selectedAddress));
    } else {
      localStorage.removeItem('selectedAddress');
    }
  }, [selectedAddress]);
  
  useEffect(() => {
    localStorage.setItem('surface', surface);
  }, [surface]);
  
  useEffect(() => {
    localStorage.setItem('rent', rent);
  }, [rent]);
  
  useEffect(() => {
    localStorage.setItem('constructionPeriod', constructionPeriod);
  }, [constructionPeriod]);
  
  useEffect(() => {
    localStorage.setItem('roomCount', roomCount);
  }, [roomCount]);
  
  useEffect(() => {
    localStorage.setItem('isFurnished', isFurnished);
  }, [isFurnished]);

  const handleAddressChange = async (value: string, address?: SelectedAddress) => {
    setLocation(value);
    if (address) {
      setSelectedAddress(address);
      
      // Auto-détection de l'époque de construction via APUR
      setIsLoadingEpoque(true);
      setAutoDetectedPeriod(null);
      try {
        const buildingData = await fetchBuildingConstructionPeriod(address.latitude, address.longitude);
        if (buildingData.constructionPeriod) {
          setConstructionPeriod(buildingData.constructionPeriod);
          setAutoDetectedPeriod(buildingData.apurLabel);
          console.log('[Index] Époque auto-détectée:', buildingData);
        } else {
          console.log('[Index] Époque non trouvée, sélection manuelle requise');
        }
      } catch (err) {
        console.error('[Index] Erreur auto-détection époque:', err);
      } finally {
        setIsLoadingEpoque(false);
      }
    } else {
      setSelectedAddress(null);
      setAutoDetectedPeriod(null);
    }
    setError(null);
  };

  const handleSimulation = async () => {
    if (!selectedAddress || !surface || !rent || !constructionPeriod || !roomCount || !isFurnished) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const rentData = await fetchRentControl({
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
        roomCount,
        constructionPeriod,
        isFurnished
      });
      
      if (!rentData) {
        setError("Impossible de trouver les données d'encadrement pour cette adresse. Vérifiez que l'adresse est bien à Paris.");
        return;
      }
      
      const complianceResult = calculateCompliance(
        rentData,
        parseFloat(surface),
        parseFloat(rent)
      );
      
      // Navigate to results page with data
      navigate("/resultats", {
        state: {
          result: complianceResult,
          formData: {
            surface,
            rent,
            selectedAddress: {
              label: selectedAddress.label,
              postcode: selectedAddress.postcode,
            },
            constructionPeriod,
            roomCount,
            isFurnished,
          },
        },
      });
      
    } catch (err) {
      console.error("Erreur:", err);
      setError("Une erreur s'est produite lors de la vérification. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.clear();
    setLocation("");
    setSelectedAddress(null);
    setSurface("");
    setRent("");
    setConstructionPeriod("");
    setRoomCount("");
    setIsFurnished("");
    setError(null);
    setAutoDetectedPeriod(null);
  };

  const isFormValid = selectedAddress && surface && rent && constructionPeriod && roomCount && isFurnished;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
      {/* Header */}
      <header className="bg-background/90 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">EncadrementLoyer Paris</h1>
                <p className="text-sm text-muted-foreground">Vérifiez si votre loyer respecte l'encadrement (données 2025)</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
              Réinitialiser
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="bg-secondary/50">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Simulateur d'encadrement des loyers
            </CardTitle>
            <CardDescription>
              Entrez l'adresse exacte de votre logement à Paris pour obtenir les données d'encadrement précises de votre quartier.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            {/* Localisation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Adresse du logement à Paris</Label>
              <AddressAutocomplete
                value={location}
                onChange={handleAddressChange}
                placeholder="Tapez une adresse à Paris..."
              />
            </div>

            {/* Époque de construction */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Époque de construction</Label>
                {isLoadingEpoque && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="loading-epoque">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Détection automatique...</span>
                  </div>
                )}
                {autoDetectedPeriod && !isLoadingEpoque && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1" data-testid="auto-detected-badge">
                    <Sparkles className="w-3 h-3" />
                    Auto-détecté : {autoDetectedPeriod}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "avant-1946", label: "Avant 1946" },
                  { value: "1946-1970", label: "1946-1970" },
                  { value: "1971-1990", label: "1971-1990" },
                  { value: "apres-1990", label: "Après 1990" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setConstructionPeriod(option.value);
                      setAutoDetectedPeriod(null);
                    }}
                    data-testid={`construction-${option.value}`}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                      constructionPeriod === option.value
                        ? "border-primary bg-primary/20"
                        : "border-border bg-white hover:bg-primary/10 hover:border-primary/40"
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      constructionPeriod === option.value
                        ? "border-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {constructionPeriod === option.value && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre de pièces */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nombre de pièces</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "1", label: "1 pièce" },
                  { value: "2", label: "2 pièces" },
                  { value: "3", label: "3 pièces" },
                  { value: "4+", label: "4+ pièces" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRoomCount(option.value)}
                    data-testid={`room-count-${option.value === "4+" ? "4" : option.value}`}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                      roomCount === option.value
                        ? "border-primary bg-primary/20"
                        : "border-border bg-white hover:bg-primary/10 hover:border-primary/40"
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      roomCount === option.value
                        ? "border-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {roomCount === option.value && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Type de location */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Type de location</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "non-meuble", label: "Non meublé" },
                  { value: "meuble", label: "Meublé" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setIsFurnished(option.value)}
                    data-testid={option.value === "meuble" ? "furnished-yes" : "furnished-no"}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                      isFurnished === option.value
                        ? "border-primary bg-primary/20"
                        : "border-border bg-white hover:bg-primary/10 hover:border-primary/40"
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      isFurnished === option.value
                        ? "border-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {isFurnished === option.value && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Surface */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Surface du logement (m²)</Label>
              <Input
                type="number"
                placeholder="Ex: 45"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                className="bg-muted/50 border-primary/20 focus:border-primary"
                data-testid="surface-input"
              />
            </div>

            {/* Loyer */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Loyer hors charges (€)</Label>
              <Input
                type="number"
                placeholder="Ex: 1200"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="bg-muted/50 border-primary/20 focus:border-primary"
                data-testid="rent-input"
              />
            </div>

            <Button 
              onClick={handleSimulation}
              disabled={!isFormValid || isLoading}
              className="w-full bg-primary hover:bg-primary/90"
              data-testid="simulate-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification en cours...
                </>
              ) : (
                "Vérifier l'encadrement"
              )}
            </Button>

            {/* Error */}
            {error && (
              <Card className="border-2 border-orange-500 bg-orange-50" data-testid="error-message">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

          </CardContent>
        </Card>

        {/* Info section */}
        <Card className="mt-8 bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Comment fonctionne l'encadrement des loyers à Paris ?
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                L'encadrement des loyers à Paris fixe trois valeurs par m² selon le quartier, le type de logement et l'époque de construction :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Loyer de référence</strong> : valeur médiane du quartier</li>
                <li><strong>Loyer majoré (+20%)</strong> : plafond maximum autorisé</li>
                <li><strong>Loyer minoré (-30%)</strong> : plancher minimum</li>
              </ul>
              <p>
                Votre loyer ne peut pas dépasser le <strong>loyer majoré</strong> sauf si le logement présente des caractéristiques exceptionnelles 
                (vue, équipements haut de gamme, etc.) justifiant un "complément de loyer".
              </p>
              <p className="text-xs mt-4">
                Source : <a href="https://opendata.paris.fr/explore/dataset/logement-encadrement-des-loyers" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">OpenData Paris - Données 2025</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
