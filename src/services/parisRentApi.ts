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
export function mapRoomCount(roomCount: string): string {
  return roomCount === "4+" ? "4" : roomCount;
}

export function mapConstructionPeriod(period: string): string {
  const mapping: Record<string, string> = {
    "avant-1946": "Avant 1946",
    "1946-1970": "1946-1970",
    "1971-1990": "1971-1990",
    "apres-1990": "Apres 1990" // Note: "Apres" sans accent dans l'API
  };
  return mapping[period] || period;
}

export function mapFurnished(isFurnished: string): string {
  return isFurnished === "meuble" ? "meublé" : "non meublé";
}

// Algorithme Ray Casting pour vérifier si un point est dans un polygone
// Retourne true si le point (lat, lon) est à l'intérieur du polygone
export function isPointInPolygon(lat: number, lon: number, polygon: number[][]): boolean {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    // polygon[i] = [lon, lat] (format GeoJSON)
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    // Ray casting: on trace une ligne horizontale depuis le point
    // et on compte combien de fois elle intersecte le polygone
    const intersect = ((yi > lat) !== (yj > lat))
        && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Extraire les coordonnées d'un polygone depuis geo_shape
function extractPolygonCoordinates(geoShape: any): number[][] | null {
  if (!geoShape || !geoShape.geometry) return null;
  
  const { type, coordinates } = geoShape.geometry;
  
  if (type === "Polygon") {
    // Polygon: coordinates[0] est l'anneau extérieur
    return coordinates[0];
  } else if (type === "MultiPolygon") {
    // MultiPolygon: on prend le premier polygone (le plus grand généralement)
    return coordinates[0]?.[0] || null;
  }
  
  return null;
}

// Trouver le quartier qui contient les coordonnées GPS
function findQuartierByCoordinates(
  results: any[], 
  targetLat: number, 
  targetLon: number
): any | null {
  if (!results || results.length === 0) return null;
  
  console.log(`🔍 Recherche du quartier contenant le point (${targetLat}, ${targetLon})`);
  
  // Méthode 1: Vérifier si le point est dans un polygone (Point-in-Polygon)
  for (const result of results) {
    if (result.geo_shape) {
      const polygon = extractPolygonCoordinates(result.geo_shape);
      
      if (polygon) {
        const isInside = isPointInPolygon(targetLat, targetLon, polygon);
        
        if (isInside) {
          console.log(`✅ Point trouvé dans le quartier "${result.nom_quartier}" (Point-in-Polygon)`);
          return result;
        }
      }
    }
  }
  
  console.log("⚠️ Aucun quartier ne contient le point exactement, fallback sur la distance au centre");
  
  // Méthode 2 (fallback): Trouver le quartier le plus proche par distance au centre
  let closest = null;
  let minDistance = Infinity;
  
  for (const result of results) {
    if (result.geo_point_2d) {
      const { lat, lon } = result.geo_point_2d;
      const distance = calculateDistance(targetLat, targetLon, lat, lon);
      
      console.log(`📍 Quartier "${result.nom_quartier}": distance au centre = ${distance.toFixed(3)} km`);
      
      if (distance < minDistance) {
        minDistance = distance;
        closest = result;
      }
    }
  }
  
  if (closest) {
    console.log(`🎯 Quartier le plus proche (fallback): "${closest.nom_quartier}" (${minDistance.toFixed(3)} km)`);
  }
  
  return closest;
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

export async function fetchRentControl(params: RentControlParams): Promise<RentControlResult | null> {
  const { latitude, longitude, roomCount, constructionPeriod, isFurnished } = params;
  
  // Conversion des paramètres
  const piece = mapRoomCount(roomCount);
  const epoque = mapConstructionPeriod(constructionPeriod);
  const meubleTxt = mapFurnished(isFurnished);
  const annee = "2025"; // Année la plus récente
  
  // Construction de la clause WHERE
  const whereClause = `piece="${piece}" AND epoque="${epoque}" AND meuble_txt="${meubleTxt}" AND annee="${annee}"`;
  
  // Construction de l'URL avec limite augmentée pour récupérer tous les quartiers (80 à Paris)
  const baseUrl = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records";
  
  const url = new URL(baseUrl);
  url.searchParams.set("where", whereClause);
  url.searchParams.set("limit", "100"); // Augmenté pour récupérer tous les quartiers
  
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
    
    // Trouver le quartier contenant les coordonnées GPS (Point-in-Polygon)
    const matchingResult = findQuartierByCoordinates(data.results, latitude, longitude);
    
    if (!matchingResult) {
      console.warn("⚠️ Impossible de trouver le quartier correspondant");
      return null;
    }
    
    console.log("✅ Quartier identifié:", matchingResult.nom_quartier);
    console.log("💰 Valeurs loyer:", {
      ref: matchingResult.ref,
      max: matchingResult.max,
      min: matchingResult.min
    });
    
    return {
      ref: parseFloat(matchingResult.ref),
      max: parseFloat(matchingResult.max),
      min: parseFloat(matchingResult.min),
      quartier: matchingResult.nom_quartier,
      annee: matchingResult.annee,
      piece: matchingResult.piece,
      epoque: matchingResult.epoque,
      meuble: matchingResult.meuble_txt
    };
    
  } catch (error) {
    console.error("❌ Erreur lors de l'appel API:", error);
    throw error;
  }
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
