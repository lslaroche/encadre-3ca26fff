import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, AlertTriangle, CheckCircle, ExternalLink, Share2, Copy, Lightbulb } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { RentComplianceResult } from "@/services/parisRentApi";
import { toast } from "sonner";
import Footer from "@/components/Footer";

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
  const [searchParams] = useSearchParams();
  const stateData = location.state as ResultsState | null;

  // Parse data from URL params or use state
  const data = useMemo(() => {
    // Priority: state (initial navigation) > URL params (reload/share)
    if (stateData) {
      return stateData;
    }

    // Try to read from URL params
    const surface = searchParams.get("surface");
    const rent = searchParams.get("rent");
    const address = searchParams.get("address");
    const postcode = searchParams.get("postcode");
    const period = searchParams.get("period");
    const rooms = searchParams.get("rooms");
    const furnished = searchParams.get("furnished");
    const quartier = searchParams.get("quartier");
    const refPrice = searchParams.get("refPrice");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const currentRent = searchParams.get("currentRent");
    const maxAuthorizedRent = searchParams.get("maxAuthorizedRent");
    const maxMajoredRent = searchParams.get("maxMajoredRent");
    const minRent = searchParams.get("minRent");
    const isCompliant = searchParams.get("isCompliant");
    const difference = searchParams.get("difference");

    // Check if we have all required params
    if (!surface || !rent || !address || !refPrice || !currentRent) {
      return null;
    }

    return {
      formData: {
        surface,
        rent,
        selectedAddress: {
          label: address,
          postcode: postcode || "",
        },
        constructionPeriod: period || "",
        roomCount: rooms || "",
        isFurnished: furnished || "",
      },
      result: {
        currentRent: parseFloat(currentRent),
        maxAuthorizedRent: parseFloat(maxAuthorizedRent || "0"),
        maxMajoredRent: parseFloat(maxMajoredRent || "0"),
        minRent: parseFloat(minRent || "0"),
        isCompliant: isCompliant === "true",
        difference: parseFloat(difference || "0"),
        rentData: {
          quartier: quartier || "",
          ref: parseFloat(refPrice),
          min: parseFloat(minPrice || "0"),
          max: parseFloat(maxPrice || "0"),
        },
      },
    } as ResultsState;
  }, [stateData, searchParams]);

  useEffect(() => {
    if (!data) {
      navigate("/", { replace: true });
    }
  }, [data, navigate]);

  if (!data) {
    return null;
  }

  const { result, formData } = data;
  const isCompliant = result.isCompliant;

  const isMobile = useIsMobile();

  const handleShare = async () => {
    const url = window.location.href;

    if (isMobile && navigator.share) {
      const shareData = {
        title: "Vérification encadrement des loyers - Paris",
        text: isCompliant
          ? "Mon loyer est conforme à l'encadrement des loyers parisien ✓"
          : "Mon loyer dépasse l'encadrement des loyers parisien",
        url: url,
      };
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          toast.error("Impossible de partager");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié !", {
          description: "Collez-le où vous voulez pour partager.",
        });
      } catch (err) {
        toast.error("Impossible de copier le lien");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="bg-secondary/50">
            <CardTitle className="text-2xl font-bold">🔳 encadré</CardTitle>
            <CardDescription className="text-base">
              Vérifiez si votre loyer respecte l'encadrement à Paris (données 2025)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Carte 1 : Votre situation */}
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">Votre logement</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Adresse</div>
                    <div className="font-medium">{formData.selectedAddress.label}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground">Quartier</div>
                    <div className="font-medium">{result.rentData.quartier}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground">Surface</div>
                    <div className="font-medium">{formData.surface} m²</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground">Construction</div>
                    <div className="font-medium">
                      {constructionPeriodLabels[formData.constructionPeriod] || formData.constructionPeriod}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground">Type</div>
                    <div className="font-medium">
                      {formData.isFurnished === "meuble" ? "Meublé" : "Non meublé"} •{" "}
                      {formData.roomCount === "4+"
                        ? "4+ pièces"
                        : `${formData.roomCount} pièce${formData.roomCount !== "1" ? "s" : ""}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carte 2 : Verdict */}
            <Card
              className={`shadow-sm border-2 ${isCompliant ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
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
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" /> Conforme
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-2" /> Non conforme
                      </>
                    )}
                  </Badge>

                  {!isCompliant && (
                    <div className="text-right" data-testid="rent-difference">
                      <div className="text-sm text-muted-foreground">Dépassement</div>
                      <div className="text-xl font-bold text-red-600">+{result.difference.toFixed(2)} €/mois</div>
                    </div>
                  )}
                </div>

                {/* Rent breakdown - sorted descending with user rent intercalated */}
                {(() => {
                  const rentItems = [
                    {
                      label: "Loyer majoré (max autorisé)",
                      value: result.maxMajoredRent,
                      perSqm: result.rentData.max,
                      isUserRent: false,
                      testId: "max-rent",
                    },
                    {
                      label: "Loyer de référence",
                      value: result.maxAuthorizedRent,
                      perSqm: result.rentData.ref,
                      isUserRent: false,
                      testId: "ref-rent",
                    },
                    {
                      label: "Loyer minoré",
                      value: result.minRent,
                      perSqm: result.rentData.min,
                      isUserRent: false,
                      testId: "min-rent",
                    },
                    {
                      label: "Votre loyer",
                      value: result.currentRent,
                      perSqm: null,
                      isUserRent: true,
                      testId: "current-rent",
                    },
                  ].sort((a, b) => b.value - a.value);

                  return (
                    <div className="space-y-3 bg-background/50 rounded-lg p-4">
                      {rentItems.map((item, index) => (
                        <div
                          key={item.label}
                          className={`flex justify-between items-center py-2 ${
                            index < rentItems.length - 1 ? "border-b border-border/50" : ""
                          } ${
                            item.isUserRent
                              ? isCompliant
                                ? "bg-green-100 -mx-4 px-4 rounded"
                                : "bg-red-100 -mx-4 px-4 rounded"
                              : ""
                          }`}
                        >
                          <div>
                            <span className={`text-sm ${item.isUserRent ? "font-bold" : ""}`}>{item.label}</span>
                            {item.perSqm && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({item.perSqm.toFixed(2)} €/m²)
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-semibold ${item.isUserRent ? (isCompliant ? "text-green-700 font-bold" : "text-red-700 font-bold") : ""}`}
                            data-testid={item.testId}
                          >
                            {item.value.toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Explanation */}
                <div className="mt-4 p-4 bg-background/70 rounded-lg text-sm">
                  {isCompliant ? (
                    <p className="text-green-700">
                      ✓ Votre loyer de {result.currentRent.toFixed(2)} € est inférieur au loyer majoré de{" "}
                      {result.maxMajoredRent.toFixed(2)} €. Il respecte l'encadrement des loyers.
                    </p>
                  ) : (
                    <p className="text-red-700">
                      ✗ Votre loyer dépasse le loyer majoré de {result.difference.toFixed(2)} € par mois. Vous pouvez
                      demander une mise en conformité à votre propriétaire.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Carte 3 : Prochaines étapes (seulement si non conforme) */}
            {!isCompliant && (
              <Card className="shadow-sm bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Que faire maintenant ?</h3>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-3">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Écrivez au propriétaire du logement.</li>
                      <li>Demandez une mise en conformité du loyer.</li>
                      <li>Si besoin, saisissez la commission départementale de conciliation.</li>
                    </ol>
                    <a
                      href="https://www.service-public.gouv.fr/particuliers/vosdroits/F1314"
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

            {/* Boutons d'action */}
            <div className="pt-4 space-y-3">
              <Button onClick={handleShare} className="w-full">
                {isMobile ? (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Partager le résultat
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier le lien du résultat
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Vérifier un autre loyer
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Results;
