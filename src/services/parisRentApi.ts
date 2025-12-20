// Service pour l'API d'encadrement des loyers de Paris
// Documentation: https://opendata.paris.fr/explore/dataset/logement-encadrement-des-loyers

export interface RentControlResult {
  ref: number;           // Loyer de référence (€/m²)
  max: number;           // Loyer de référence majoré (€/m² - max autorisé)
  min: number;           // Loyer de référence minoré (€/m²)
  quartier: string;      // Nom du quartier
  annee: string;         // Année de référence
  piece: string;         // Nombre de pièces
  epoque: string;        // Époque de construction
  meuble: string;        // Meublé ou non meublé
}

export interface RentControlParams {
  latitude: number;
  longitude: number;
  roomCount: string;        // "1", "2", "3", "4+"
  constructionPeriod: string; // "avant-1946", "1946-1970", "1971-1990", "apres-1990"
  isFurnished: string;      // "meuble", "non-meuble"
}

// Conversion des valeurs du formulaire vers les valeurs API
function mapRoomCount(roomCount: string): string {
  return roomCount === "4+" ? "4" : roomCount;
}

function mapConstructionPeriod(period: string): string {
  const mapping: Record<string, string> = {
    "avant-1946": "Avant 1946",
    "1946-1970": "1946-1970",
    "1971-1990": "1971-1990",
    "apres-1990": "Apres 1990" // Note: "Apres" sans accent dans l'API
  };
  return mapping[period] || period;
}

function mapFurnished(isFurnished: string): string {
  return isFurnished === "meuble" ? "meublé" : "non meublé";
}

export async function fetchRentControl(params: RentControlParams): Promise<RentControlResult | null> {
  const { latitude, longitude, roomCount, constructionPeriod, isFurnished } = params;
  
  // Conversion des paramètres
  const piece = mapRoomCount(roomCount);
  const epoque = mapConstructionPeriod(constructionPeriod);
  const meubleTxt = mapFurnished(isFurnished);
  const annee = "2025"; // Année la plus récente
  
  // Construction de la clause WHERE
  const whereClause = `piece="${piece}" AND epoque="${epoque}" AND meuble_txt="${meubleTxt}" AND annee="${annee}"`;
  
  // Construction de l'URL avec filtre géographique
  // L'API utilise geofilter.distance=lat,lon,distance pour filtrer par position
  const baseUrl = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records";
  
  const url = new URL(baseUrl);
  url.searchParams.set("where", whereClause);
  url.searchParams.set("limit", "20"); // On prend plusieurs résultats pour trouver le bon quartier
  
  console.log("📍 Coordonnées GPS:", { latitude, longitude });
  console.log("🔍 Paramètres de recherche:", { piece, epoque, meubleTxt, annee });
  console.log("🌐 URL API:", url.toString());
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("📊 Nombre de résultats:", data.results?.length);
    
    if (!data.results || data.results.length === 0) {
      console.warn("⚠️ Aucun résultat trouvé pour ces critères");
      return null;
    }
    
    // Trouver le quartier le plus proche des coordonnées GPS
    const closestResult = findClosestQuartier(data.results, latitude, longitude);
    
    if (!closestResult) {
      console.warn("⚠️ Impossible de trouver le quartier correspondant");
      return null;
    }
    
    console.log("✅ Quartier trouvé:", closestResult.nom_quartier);
    console.log("💰 Valeurs loyer:", {
      ref: closestResult.ref,
      max: closestResult.max,
      min: closestResult.min
    });
    
    return {
      ref: parseFloat(closestResult.ref),
      max: parseFloat(closestResult.max),
      min: parseFloat(closestResult.min),
      quartier: closestResult.nom_quartier,
      annee: closestResult.annee,
      piece: closestResult.piece,
      epoque: closestResult.epoque,
      meuble: closestResult.meuble_txt
    };
    
  } catch (error) {
    console.error("❌ Erreur lors de l'appel API:", error);
    throw error;
  }
}

// Calcul de la distance entre deux points GPS (formule de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Trouver le quartier le plus proche des coordonnées GPS
function findClosestQuartier(
  results: any[], 
  targetLat: number, 
  targetLon: number
): any | null {
  if (!results || results.length === 0) return null;
  
  let closest = null;
  let minDistance = Infinity;
  
  for (const result of results) {
    // L'API retourne les coordonnées dans geo_point_2d
    if (result.geo_point_2d) {
      const { lat, lon } = result.geo_point_2d;
      const distance = calculateDistance(targetLat, targetLon, lat, lon);
      
      console.log(`📍 Quartier "${result.nom_quartier}": distance = ${distance.toFixed(3)} km`);
      
      if (distance < minDistance) {
        minDistance = distance;
        closest = result;
      }
    }
  }
  
  if (closest) {
    console.log(`🎯 Quartier le plus proche: "${closest.nom_quartier}" (${minDistance.toFixed(3)} km)`);
  }
  
  return closest;
}

// Types pour les résultats de calcul
export interface RentComplianceResult {
  isCompliant: boolean;
  rentData: RentControlResult;
  surface: number;
  currentRent: number;
  maxAuthorizedRent: number;    // ref × surface (loyer de référence)
  maxMajoredRent: number;       // max × surface (loyer majoré - max absolu)
  minRent: number;              // min × surface (loyer minoré)
  difference: number;           // currentRent - maxMajoredRent
}

export function calculateCompliance(
  rentData: RentControlResult,
  surface: number,
  currentRent: number
): RentComplianceResult {
  const maxAuthorizedRent = rentData.ref * surface;
  const maxMajoredRent = rentData.max * surface;
  const minRent = rentData.min * surface;
  
  // Le loyer est conforme s'il ne dépasse pas le loyer de référence majoré
  const isCompliant = currentRent <= maxMajoredRent;
  const difference = currentRent - maxMajoredRent;
  
  return {
    isCompliant,
    rentData,
    surface,
    currentRent,
    maxAuthorizedRent,
    maxMajoredRent,
    minRent,
    difference
  };
}
