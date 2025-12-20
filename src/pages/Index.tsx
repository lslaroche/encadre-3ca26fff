import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, Calculator, Info, AlertTriangle, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { AddressAutocomplete, SelectedAddress } from "@/components/AddressAutocomplete";
import { fetchRentControl, calculateCompliance, RentComplianceResult } from "@/services/parisRentApi";
import { fetchBuildingConstructionPeriod } from "@/services/apurBuildingApi";

const Index = () => {
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
  const [result, setResult] = useState<RentComplianceResult | null>(null);
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
    // Reset result when address changes
    setResult(null);
    setError(null);
  };

  const handleSimulation = async () => {
    if (!selectedAddress || !surface || !rent || !constructionPeriod || !roomCount || !isFurnished) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
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
      
      setResult(complianceResult);
      
    } catch (err) {
      console.error("Erreur:", err);
      setError("Une erreur s'est produite lors de la vérification. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = selectedAddress && surface && rent && constructionPeriod && roomCount && isFurnished;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
      {/* Header */}
      <header className="bg-background/90 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">EncadrementLoyer Paris</h1>
              <p className="text-sm text-muted-foreground">Vérifiez si votre loyer respecte l'encadrement (données 2025)</p>
            </div>
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
              {selectedAddress && (
                <div 
                  data-testid="address-selected"
                  className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Adresse sélectionnée : {selectedAddress.postcode} Paris</span>
                </div>
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
                  <Badge variant="secondary" className="text-xs flex items-center gap-1" data-testid="auto-detected-badge">
                    <Sparkles className="w-3 h-3" />
                    Auto-détecté : {autoDetectedPeriod}
                  </Badge>
                )}
              </div>
              <RadioGroup 
                value={constructionPeriod} 
                onValueChange={(value) => {
                  setConstructionPeriod(value);
                  setAutoDetectedPeriod(null); // Clear auto-detected if user changes manually
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avant-1946" id="avant-1946" data-testid="construction-avant-1946" />
                  <Label htmlFor="avant-1946">Avant 1946</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1946-1970" id="1946-1970" data-testid="construction-1946-1970" />
                  <Label htmlFor="1946-1970">1946-1970</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1971-1990" id="1971-1990" data-testid="construction-1971-1990" />
                  <Label htmlFor="1971-1990">1971-1990</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="apres-1990" id="apres-1990" data-testid="construction-apres-1990" />
                  <Label htmlFor="apres-1990">Après 1990</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Nombre de pièces */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nombre de pièces</Label>
              <Select value={roomCount} onValueChange={setRoomCount}>
                <SelectTrigger 
                  className="bg-muted/50 border-primary/20 focus:border-primary"
                  data-testid="room-count-trigger"
                >
                  <SelectValue placeholder="Sélectionnez le nombre de pièces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" data-testid="room-count-1">1 pièce</SelectItem>
                  <SelectItem value="2" data-testid="room-count-2">2 pièces</SelectItem>
                  <SelectItem value="3" data-testid="room-count-3">3 pièces</SelectItem>
                  <SelectItem value="4+" data-testid="room-count-4">4 pièces et plus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type de location */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Type de location</Label>
              <RadioGroup value={isFurnished} onValueChange={setIsFurnished}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non-meuble" id="non-meuble" data-testid="furnished-no" />
                  <Label htmlFor="non-meuble">Non meublé</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="meuble" id="meuble" data-testid="furnished-yes" />
                  <Label htmlFor="meuble">Meublé</Label>
                </div>
              </RadioGroup>
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

            {/* Results */}
            {result && (
              <Card 
                className={`border-2 ${result.isCompliant ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}
                data-testid="result-card"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge 
                      variant={result.isCompliant ? "default" : "destructive"} 
                      className="text-sm px-3 py-1"
                      data-testid="compliance-badge"
                    >
                      {result.isCompliant ? (
                        <><CheckCircle className="w-4 h-4 mr-1" /> Conforme</>
                      ) : (
                        <><AlertTriangle className="w-4 h-4 mr-1" /> Non conforme</>
                      )}
                    </Badge>
                  </div>
                  
                  {/* Quartier info */}
                  <div className="mb-4 p-3 bg-background/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Quartier identifié</div>
                    <div className="font-semibold" data-testid="quartier-name">{result.rentData.quartier}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Données {result.rentData.annee} • {result.rentData.piece} pièce(s) • {result.rentData.epoque} • {result.rentData.meuble}
                    </div>
                  </div>
                  
                  {/* Rent breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <span className="text-sm">Loyer de référence</span>
                        <span className="text-xs text-muted-foreground ml-2">({result.rentData.ref.toFixed(2)} €/m²)</span>
                      </div>
                      <span className="font-semibold" data-testid="ref-rent">{result.maxAuthorizedRent.toFixed(2)} €</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b bg-primary/5 -mx-4 px-4">
                      <div>
                        <span className="text-sm font-medium">Loyer majoré (max autorisé)</span>
                        <span className="text-xs text-muted-foreground ml-2">({result.rentData.max.toFixed(2)} €/m²)</span>
                      </div>
                      <span className="font-bold text-primary" data-testid="max-rent">{result.maxMajoredRent.toFixed(2)} €</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <span className="text-sm">Loyer minoré</span>
                        <span className="text-xs text-muted-foreground ml-2">({result.rentData.min.toFixed(2)} €/m²)</span>
                      </div>
                      <span className="font-semibold" data-testid="min-rent">{result.minRent.toFixed(2)} €</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Votre loyer</span>
                      <span className="font-semibold" data-testid="current-rent">{result.currentRent.toFixed(2)} €</span>
                    </div>
                    
                    {!result.isCompliant && (
                      <div className="flex justify-between items-center py-2 text-red-600 font-semibold" data-testid="rent-difference">
                        <span>Dépassement</span>
                        <span>+{result.difference.toFixed(2)} €/mois</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Explanation */}
                  <div className="mt-4 p-3 bg-background/50 rounded-lg text-sm">
                    {result.isCompliant ? (
                      <p className="text-green-700">
                        ✓ Votre loyer de {result.currentRent.toFixed(2)} € est inférieur au loyer majoré de {result.maxMajoredRent.toFixed(2)} €. 
                        Il respecte l'encadrement des loyers.
                      </p>
                    ) : (
                      <p className="text-red-700">
                        ✗ Votre loyer dépasse le loyer majoré de {result.difference.toFixed(2)} € par mois. 
                        Vous pouvez demander une mise en conformité à votre propriétaire.
                      </p>
                    )}
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
