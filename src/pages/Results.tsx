import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Home, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { RentComplianceResult } from "@/services/parisRentApi";
import RentScale from "@/components/RentScale";

interface FormData {
  surface: string;
  rent: string;
  selectedAddress: {
    label: string;
    postcode: string;
  };
  constructionPeriod: string;
  roomCount: string;
  isFurnished: string;
}

interface ResultsState {
  result: RentComplianceResult;
  formData: FormData;
}

const constructionPeriodLabels: Record<string, string> = {
  "avant-1946": "Avant 1946",
  "1946-1970": "1946-1970",
  "1971-1990": "1971-1990",
  "apres-1990": "Après 1990",
};

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultsState | null;

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const { result, formData } = state;
  const isCompliant = result.isCompliant;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
      {/* Header */}
      <header className="bg-background/90 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Modifier ma recherche
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Résultat de votre vérification</h1>

        {/* Carte 1 : Votre situation */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Votre situation</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Adresse</div>
                <div className="font-medium">{formData.selectedAddress.label}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-muted-foreground">Surface</div>
                <div className="font-medium">{formData.surface} m²</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-muted-foreground">Loyer actuel</div>
                <div className="font-medium">{parseFloat(formData.rent).toLocaleString("fr-FR")} €</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-muted-foreground">Type</div>
                <div className="font-medium">
                  {formData.isFurnished === "meuble" ? "Meublé" : "Non meublé"} • {formData.roomCount === "4+" ? "4+ pièces" : `${formData.roomCount} pièce${formData.roomCount !== "1" ? "s" : ""}`}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
              <Home className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Quartier identifié :</span>
              <span className="font-medium">{result.rentData.quartier}</span>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              {constructionPeriodLabels[formData.constructionPeriod] || formData.constructionPeriod} • Données {result.rentData.annee}
            </div>
          </CardContent>
        </Card>

        {/* Carte 2 : Verdict */}
        <Card 
          className={`shadow-sm border-2 ${isCompliant ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}
          data-testid="result-card"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <Badge 
                variant={isCompliant ? "default" : "destructive"} 
                className="text-sm px-4 py-2"
                data-testid="compliance-badge"
              >
                {isCompliant ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Conforme</>
                ) : (
                  <><AlertTriangle className="w-4 h-4 mr-2" /> Non conforme</>
                )}
              </Badge>
              
              {!isCompliant && (
                <div className="text-right" data-testid="rent-difference">
                  <div className="text-sm text-muted-foreground">Dépassement</div>
                  <div className="text-xl font-bold text-red-600">+{result.difference.toFixed(2)} €/mois</div>
                </div>
              )}
            </div>

            {/* Rent scale visualization */}
            <div className="bg-background/50 rounded-lg p-4 py-6">
              <RentScale
                minRent={result.minRent}
                referenceRent={result.maxAuthorizedRent}
                maxRent={result.maxMajoredRent}
                currentRent={result.currentRent}
                isCompliant={isCompliant}
              />
            </div>

            {/* Explanation */}
            <div className="mt-4 p-4 bg-background/70 rounded-lg text-sm">
              {isCompliant ? (
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

        {/* Carte 3 : Prochaines étapes (seulement si non conforme) */}
        {!isCompliant && (
          <Card className="shadow-sm bg-muted/30">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">💡 Que faire maintenant ?</h3>
              <div className="text-sm text-muted-foreground space-y-3">
                <p>
                  Vous pouvez adresser une demande de mise en conformité à votre propriétaire par courrier recommandé. 
                  Si le propriétaire refuse, vous pouvez saisir la commission départementale de conciliation.
                </p>
                <a 
                  href="https://www.service-public.fr/particuliers/vosdroits/F1314" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  En savoir plus sur vos recours
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bouton retour */}
        <div className="pt-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Modifier ma recherche
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
