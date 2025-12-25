import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Info, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { AddressAutocomplete, SelectedAddress } from "@/components/AddressAutocomplete";
import { fetchUnifiedRentControl, calculateUnifiedCompliance, getTerritoryFromPostcode, getTerritoryLabel } from "@/services/rentControlService";
import { fetchBuildingConstructionPeriod } from "@/services/apurBuildingApi";
import Footer from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [surface, setSurface] = useState("");
  const [rent, setRent] = useState("");
  const [constructionPeriod, setConstructionPeriod] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [isFurnished, setIsFurnished] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingEpoque, setIsLoadingEpoque] = useState(false);
  const [autoDetectedPeriod, setAutoDetectedPeriod] = useState<string | null>(null);
  const [autoDetectedType, setAutoDetectedType] = useState<string | null>(null);
  const [territory, setTerritory] = useState<string | null>(null);

  const handleAddressChange = async (value: string, address?: SelectedAddress) => {
    setLocation(value);
    if (address) {
      setSelectedAddress(address);
      
      // Détecter le territoire
      const detectedTerritory = getTerritoryFromPostcode(address.postcode);
      setTerritory(detectedTerritory);

      // Auto-détection via APUR
      setIsLoadingEpoque(true);
      setAutoDetectedPeriod(null);
      setAutoDetectedType(null);
      try {
        const buildingData = await fetchBuildingConstructionPeriod(address.latitude, address.longitude, address.postcode);
        if (buildingData.constructionPeriod) {
          setConstructionPeriod(buildingData.constructionPeriod);
          setAutoDetectedPeriod(buildingData.apurLabel);
        }
        if (buildingData.buildingType) {
          setBuildingType(buildingData.buildingType);
          setAutoDetectedType(buildingData.buildingType === 'maison' ? 'Maison' : 'Appartement');
        }
        console.log("[Index] Auto-détection:", buildingData);
      } catch (err) {
        console.error("[Index] Erreur auto-détection:", err);
      } finally {
        setIsLoadingEpoque(false);
      }
    } else {
      setSelectedAddress(null);
      setAutoDetectedPeriod(null);
      setAutoDetectedType(null);
      setTerritory(null);
    }
    setError(null);
  };

  const handleSimulation = async () => {
    if (!selectedAddress || !surface || !rent || !constructionPeriod || !roomCount || !isFurnished) return;
    // Pour Est Ensemble, le type de bien est requis
    if (territory === 'est-ensemble' && !buildingType) return;

    setIsLoading(true);
    setError(null);

    try {
      const rentData = await fetchUnifiedRentControl({
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
        postcode: selectedAddress.postcode,
        roomCount,
        constructionPeriod,
        isFurnished,
        buildingType: buildingType || 'appartement',
      });

      if (!rentData) {
        setError("Impossible de trouver les données d'encadrement pour cette adresse.");
        return;
      }

      const complianceResult = calculateUnifiedCompliance(rentData, parseFloat(surface), parseFloat(rent));

      const params = new URLSearchParams({
        surface,
        rent,
        address: selectedAddress.label,
        postcode: selectedAddress.postcode,
        period: constructionPeriod,
        rooms: roomCount,
        furnished: isFurnished,
        buildingType: buildingType || 'appartement',
        territory: rentData.territory,
        lat: selectedAddress.latitude.toString(),
        lng: selectedAddress.longitude.toString(),
        quartier: rentData.quartier,
        refPrice: rentData.ref.toString(),
        minPrice: rentData.min.toString(),
        maxPrice: rentData.max.toString(),
        currentRent: complianceResult.currentRent.toString(),
        maxAuthorizedRent: complianceResult.maxAuthorizedRent.toString(),
        maxMajoredRent: complianceResult.maxMajoredRent.toString(),
        minRent: complianceResult.minRent.toString(),
        isCompliant: complianceResult.isCompliant.toString(),
        difference: complianceResult.difference.toString(),
      });
      navigate(`/resultats?${params.toString()}`);
    } catch (err) {
      console.error("Erreur:", err);
      setError("Une erreur s'est produite lors de la vérification. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = selectedAddress && surface && rent && constructionPeriod && roomCount && isFurnished && 
    (territory !== 'est-ensemble' || buildingType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="bg-secondary/50">
            <CardTitle className="text-2xl font-bold">🔳 encadré</CardTitle>
            <CardDescription className="text-base">
              Vérifiez si votre loyer respecte l'encadrement à Paris et Est Ensemble
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Localisation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Adresse du logement</Label>
              <AddressAutocomplete
                value={location}
                onChange={handleAddressChange}
              />
              {territory && (
                <Badge variant="outline" className="text-xs">
                  {getTerritoryLabel(territory as any)} {territory === 'est-ensemble' ? '(données 2023)' : '(données 2025)'}
                </Badge>
              )}
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
                  <Badge
                    className="text-xs flex items-center gap-1 animate-ai-nudge bg-primary text-primary-foreground"
                    data-testid="auto-detected-badge"
                  >
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
                        : "border-border bg-card hover:bg-primary/10 hover:border-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        constructionPeriod === option.value ? "border-primary" : "border-muted-foreground/40",
                      )}
                    >
                      {constructionPeriod === option.value && <span className="w-2 h-2 rounded-full bg-primary" />}
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
                        : "border-border bg-card hover:bg-primary/10 hover:border-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        roomCount === option.value ? "border-primary" : "border-muted-foreground/40",
                      )}
                    >
                      {roomCount === option.value && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </span>
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Type de bien (visible uniquement pour Est Ensemble ou si auto-détecté) */}
            {(territory === 'est-ensemble' || autoDetectedType) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Type de bien</Label>
                  {autoDetectedType && !isLoadingEpoque && (
                    <Badge className="text-xs flex items-center gap-1 animate-ai-nudge bg-primary text-primary-foreground">
                      <Sparkles className="w-3 h-3" />
                      Auto-détecté : {autoDetectedType}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "appartement", label: "Appartement" },
                    { value: "maison", label: "Maison" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setBuildingType(option.value);
                        setAutoDetectedType(null);
                      }}
                      data-testid={`building-type-${option.value}`}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                        buildingType === option.value
                          ? "border-primary bg-primary/20"
                          : "border-border bg-card hover:bg-primary/10 hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                          buildingType === option.value ? "border-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {buildingType === option.value && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                      <span className="text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                        : "border-border bg-card hover:bg-primary/10 hover:border-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        isFurnished === option.value ? "border-primary" : "border-muted-foreground/40",
                      )}
                    >
                      {isFurnished === option.value && <span className="w-2 h-2 rounded-full bg-primary" />}
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
                "Vérifier le loyer"
              )}
            </Button>

            {/* Error */}
            {error && (
              <Card className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/30" data-testid="error-message">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
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
              Comment fonctionne l'encadrement des loyers ?
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                L'encadrement des loyers fixe trois valeurs par m² selon le quartier, le type de logement et
                l'époque de construction :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>Loyer de référence</strong> : valeur médiane du quartier
                </li>
                <li>
                  <strong>Loyer majoré (+20%)</strong> : plafond maximum autorisé
                </li>
                <li>
                  <strong>Loyer minoré (-30%)</strong> : plancher minimum
                </li>
              </ul>
              <p>
                Votre loyer ne peut pas dépasser le <strong>loyer majoré</strong> sauf si le logement présente des
                caractéristiques exceptionnelles justifiant un "complément de loyer".
              </p>
              <p className="text-xs mt-4">
                Sources :{" "}
                <a href="https://opendata.paris.fr/explore/dataset/logement-encadrement-des-loyers" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                  OpenData Paris 2025
                </a>
                {" • "}
                <a href="https://www.data.gouv.fr/fr/datasets/encadrement-des-loyers-de-est-ensemble/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                  Est Ensemble 2023
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
