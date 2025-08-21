import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Calculator, Info } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const Index = () => {
  const [location, setLocation] = useState(() => localStorage.getItem('location') || "");
  const [selectedCity, setSelectedCity] = useState<string>(() => localStorage.getItem('selectedCity') || "");
  const [surface, setSurface] = useState(() => localStorage.getItem('surface') || "");
  const [rent, setRent] = useState(() => localStorage.getItem('rent') || "");
  const [constructionPeriod, setConstructionPeriod] = useState(() => localStorage.getItem('constructionPeriod') || "");
  const [roomCount, setRoomCount] = useState(() => localStorage.getItem('roomCount') || "");
  const [isFurnished, setIsFurnished] = useState(() => localStorage.getItem('isFurnished') || "");
  const [result, setResult] = useState<{
    isCompliant: boolean;
    maxRent: number;
    difference: number;
  } | null>(null);

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    localStorage.setItem('location', location);
  }, [location]);
  
  useEffect(() => {
    localStorage.setItem('selectedCity', selectedCity);
  }, [selectedCity]);
  
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

  const handleAddressChange = (value: string, result?: any) => {
    setLocation(value);
    if (result) {
      setSelectedCity(result.properties.city);
    } else {
      setSelectedCity("");
    }
  };

  const handleSimulation = async () => {
    if (!selectedCity || !surface || !rent || !constructionPeriod || !roomCount || !isFurnished) return;
    
    // Utilisation de l'API officielle de Paris pour les données d'encadrement
    if (selectedCity.toLowerCase().includes("paris")) {
      try {
        // Récupérons d'abord la structure complète de l'API pour voir tous les champs disponibles
        const schemaUrl = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers`;
        const schemaResponse = await fetch(schemaUrl);
        const schemaData = await schemaResponse.json();
        
        console.log("Structure complète du dataset:", schemaData);
        console.log("Champs disponibles:", schemaData.dataset?.fields);
        
        // Récupérons quelques exemples pour voir les valeurs exactes
        const exampleUrl = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records?limit=10`;
        const exampleResponse = await fetch(exampleUrl);
        const exampleData = await exampleResponse.json();
        
        console.log("Exemples de données:", exampleData.results?.slice(0, 5));
        
        // Analysons les valeurs uniques pour chaque champ
        if (exampleData.results?.length > 0) {
          const uniquePieces = [...new Set(exampleData.results.map(r => r.piece))];
          const uniqueEpoques = [...new Set(exampleData.results.map(r => r.epoque))];
          const uniqueMeuble = [...new Set(exampleData.results.map(r => r.meuble_txt))];
          
          console.log("Valeurs uniques pour 'piece':", uniquePieces);
          console.log("Valeurs uniques pour 'epoque':", uniqueEpoques);
          console.log("Valeurs uniques pour 'meuble_txt':", uniqueMeuble);
        }
        
        // Conversion des valeurs selon la documentation officielle de l'API
        const pieceValue = roomCount === "4+" ? "4" : roomCount; // Simplement "1", "2", "3", "4"
        const epoqueValue = constructionPeriod === "avant-1946" ? "Avant 1946" :
                           constructionPeriod === "1946-1970" ? "1946-1970" :
                           constructionPeriod === "1971-1990" ? "1971-1990" : "Apres 1990"; // Attention: "Apres" sans accent
        const meubleTxt = isFurnished === "meuble" ? "meublé" : "non meublé";
        
        console.log("Paramètres de recherche:", { pieceValue, epoqueValue, meubleTxt });
        
        const apiUrl = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records?where=piece%3D%22${encodeURIComponent(pieceValue)}%22%20AND%20epoque%3D%22${encodeURIComponent(epoqueValue)}%22%20AND%20meuble_txt%3D%22${encodeURIComponent(meubleTxt)}%22&limit=1`;
        
        console.log("URL API appelée:", apiUrl);
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        console.log("Réponse API complète:", data);
        console.log("Nombre de résultats:", data.results?.length);
        
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          console.log("Premier résultat:", result);
          console.log("Prix max au m²:", result.max);
          
          const maxRentPerM2 = parseFloat(result.max);
          const maxRent = parseFloat(surface) * maxRentPerM2;
          const rentNum = parseFloat(rent);
          
          console.log("Calculs:", { 
            surface: parseFloat(surface), 
            maxRentPerM2, 
            maxRent, 
            rentActuel: rentNum, 
            conforme: rentNum <= maxRent 
          });
          
          setResult({
            isCompliant: rentNum <= maxRent,
            maxRent,
            difference: rentNum - maxRent
          });
        } else {
          console.log("Aucune donnée trouvée, utilisation du fallback");
          // Fallback vers simulation simple si pas de données trouvées
          const surfaceNum = parseFloat(surface);
          const rentNum = parseFloat(rent);
          const maxRentPerM2 = 35; // Prix moyen Paris
          const maxRent = surfaceNum * maxRentPerM2;
          
          setResult({
            isCompliant: rentNum <= maxRent,
            maxRent,
            difference: rentNum - maxRent
          });
        }
      } catch (error) {
        console.error("Erreur API:", error);
        // Fallback vers simulation simple
        const surfaceNum = parseFloat(surface);
        const rentNum = parseFloat(rent);
        const maxRentPerM2 = 35;
        const maxRent = surfaceNum * maxRentPerM2;
        
        setResult({
          isCompliant: rentNum <= maxRent,
          maxRent,
          difference: rentNum - maxRent
        });
      }
    } else {
      // Pour les autres villes, garde la simulation simple
      const surfaceNum = parseFloat(surface);
      const rentNum = parseFloat(rent);
      let maxRentPerM2 = 25;
      
      if (constructionPeriod === "avant-1946") maxRentPerM2 *= 0.95;
      else if (constructionPeriod === "apres-1990") maxRentPerM2 *= 1.05;
      
      if (isFurnished === "meuble") maxRentPerM2 *= 1.2;
      
      const maxRent = surfaceNum * maxRentPerM2;
      
      setResult({
        isCompliant: rentNum <= maxRent,
        maxRent,
        difference: rentNum - maxRent
      });
    }
  };

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
              <h1 className="text-xl font-bold text-foreground">EncadrementLoyer</h1>
              <p className="text-sm text-muted-foreground">Vérifiez si votre loyer respecte l'encadrement</p>
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
              Entrez les informations de votre logement pour vérifier si le loyer respecte l'encadrement en vigueur
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            {/* Localisation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Localisation</label>
              <AddressAutocomplete
                value={location}
                onChange={handleAddressChange}
                placeholder="Tapez votre commune..."
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-muted-foreground">Essayez avec</span>
                {["Paris", "Lille", "Lyon", "Marseille", "Bordeaux", "Montpellier"].map((city) => (
                  <Button
                    key={city}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocation(city);
                      setSelectedCity(city);
                    }}
                    className="h-6 px-2 text-xs border-primary/20 hover:bg-primary/10"
                  >
                    {city}
                  </Button>
                ))}
              </div>
            </div>

            {/* Époque de construction */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Époque de construction</Label>
              <RadioGroup value={constructionPeriod} onValueChange={setConstructionPeriod}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avant-1946" id="avant-1946" />
                  <Label htmlFor="avant-1946">Avant 1946</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1946-1970" id="1946-1970" />
                  <Label htmlFor="1946-1970">1946-1970</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1971-1990" id="1971-1990" />
                  <Label htmlFor="1971-1990">1971-1990</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="apres-1990" id="apres-1990" />
                  <Label htmlFor="apres-1990">Après 1990</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Nombre de pièces */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nombre de pièces</Label>
              <Select value={roomCount} onValueChange={setRoomCount}>
                <SelectTrigger className="bg-muted/50 border-primary/20 focus:border-primary">
                  <SelectValue placeholder="Sélectionnez le nombre de pièces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 pièce</SelectItem>
                  <SelectItem value="2">2 pièces</SelectItem>
                  <SelectItem value="3">3 pièces</SelectItem>
                  <SelectItem value="4+">4 pièces et plus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type de location */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Type de location</Label>
              <RadioGroup value={isFurnished} onValueChange={setIsFurnished}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non-meuble" id="non-meuble" />
                  <Label htmlFor="non-meuble">Non meublé</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="meuble" id="meuble" />
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
              />
            </div>

            <Button 
              onClick={handleSimulation}
              disabled={!selectedCity || !surface || !rent || !constructionPeriod || !roomCount || !isFurnished}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Vérifier l'encadrement
            </Button>

            {/* Results */}
            {result && (
              <Card className={`border-2 ${result.isCompliant ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant={result.isCompliant ? "default" : "destructive"}>
                      {result.isCompliant ? "Conforme" : "Non conforme"}
                    </Badge>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Loyer maximum autorisé :</span>
                      <span className="font-semibold">{result.maxRent.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Votre loyer :</span>
                      <span className="font-semibold">{rent} €</span>
                    </div>
                    {!result.isCompliant && (
                      <div className="flex justify-between text-red-600">
                        <span>Dépassement :</span>
                        <span className="font-semibold">+{result.difference.toFixed(2)} €</span>
                      </div>
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
              À propos de l'encadrement des loyers
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L'encadrement des loyers est un dispositif qui limite le montant des loyers dans certaines zones tendues. 
              Il vise à rendre le logement plus accessible en fixant des plafonds de loyer au m² selon la localisation et le type de logement.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
