/**
 * Service pour l'API d'encadrement des loyers d'Est Ensemble
 * Source: https://www.data.gouv.fr/fr/datasets/encadrement-des-loyers-de-est-ensemble/
 */

import { isPointInPolygon } from './parisRentApi';

export interface EstEnsembleRentResult {
  ref: number;           // Loyer de référence (prix_med)
  max: number;           // Loyer majoré (prix_max)
  min: number;           // Loyer minoré (prix_min)
  zone: string;          // Nom de la zone/ville
  annee: string;         // Année de référence
  piece: number;         // Nombre de pièces
  epoque: string;        // Époque de construction
  meuble: boolean;       // Meublé ou non
  maison: boolean;       // Maison ou appartement
}

export interface EstEnsembleRentParams {
  latitude: number;
  longitude: number;
  roomCount: string;        // "1", "2", "3", "4+"
  constructionPeriod: string; // "avant-1946", "1946-1970", "1971-1990", "apres-1990"
  isFurnished: string;      // "meuble", "non-meuble"
  buildingType: string;     // "appartement", "maison"
}

// Cache pour les données (évite de recharger à chaque requête)
let rentDataCache: any[] | null = null;
let geoDataCache: any | null = null;

const RENT_DATA_URL = 'https://static.data.gouv.fr/resources/encadrement-des-loyers-de-est-ensemble/20230601-202658/encadrements-est-ensemble-2023.json';
const GEO_DATA_URL = 'https://static.data.gouv.fr/resources/encadrement-des-loyers-de-est-ensemble/20220608-121232/quartier-est-ensemble-geodata.json';

// Mapping des zones vers les noms de villes
const ZONE_NAMES: Record<number, string> = {
  307: 'Bagnolet',
  308: 'Bobigny',
  309: 'Bondy',
  310: 'Le Pré-Saint-Gervais',
  311: 'Les Lilas',
  312: 'Montreuil',
  313: 'Noisy-le-Sec',
  314: 'Pantin',
  315: 'Romainville',
};

/**
 * Convertit les paramètres du formulaire vers le format Est Ensemble
 */
function mapConstructionPeriod(period: string): string {
  const mapping: Record<string, string> = {
    'avant-1946': 'avant 1946',
    '1946-1970': '1946-1970',
    '1971-1990': '1971-1990',
    'apres-1990': 'apres 1990',
  };
  return mapping[period] || period;
}

function mapRoomCount(roomCount: string): number | string {
  if (roomCount === '4+') return '4 et plus';
  return parseInt(roomCount, 10);
}

/**
 * Charge les données de loyers Est Ensemble
 */
async function loadRentData(): Promise<any[]> {
  if (rentDataCache) return rentDataCache;
  
  console.log('[Est Ensemble] Chargement des données de loyers...');
  const response = await fetch(RENT_DATA_URL);
  if (!response.ok) {
    throw new Error(`Erreur chargement données Est Ensemble: ${response.status}`);
  }
  
  rentDataCache = await response.json();
  console.log('[Est Ensemble] Données chargées:', rentDataCache?.length, 'entrées');
  return rentDataCache!;
}

/**
 * Charge les données géographiques Est Ensemble
 */
async function loadGeoData(): Promise<any> {
  if (geoDataCache) return geoDataCache;
  
  console.log('[Est Ensemble] Chargement des données géographiques...');
  const response = await fetch(GEO_DATA_URL);
  if (!response.ok) {
    throw new Error(`Erreur chargement geodata Est Ensemble: ${response.status}`);
  }
  
  geoDataCache = await response.json();
  console.log('[Est Ensemble] GeoData chargée:', geoDataCache?.features?.length, 'zones');
  return geoDataCache;
}

/**
 * Trouve la zone Est Ensemble contenant les coordonnées GPS
 */
async function findZoneByCoordinates(lat: number, lon: number): Promise<number | null> {
  const geoData = await loadGeoData();
  
  if (!geoData?.features) return null;
  
  console.log(`[Est Ensemble] Recherche zone pour (${lat}, ${lon})`);
  
  for (const feature of geoData.features) {
    if (feature.geometry?.type === 'Polygon' && feature.geometry.coordinates?.[0]) {
      const polygon = feature.geometry.coordinates[0];
      
      if (isPointInPolygon(lat, lon, polygon)) {
        const zone = feature.properties?.zone || feature.properties?.Zone;
        console.log(`[Est Ensemble] Point trouvé dans zone ${zone}`);
        return zone;
      }
    }
  }
  
  console.log('[Est Ensemble] Aucune zone trouvée pour ces coordonnées');
  return null;
}

/**
 * Parse un prix au format français ("16,9") vers nombre
 */
function parsePrice(price: string | number): number {
  if (typeof price === 'number') return price;
  return parseFloat(price.replace(',', '.'));
}

/**
 * Récupère les données d'encadrement pour Est Ensemble
 */
export async function fetchEstEnsembleRentControl(params: EstEnsembleRentParams): Promise<EstEnsembleRentResult | null> {
  const { latitude, longitude, roomCount, constructionPeriod, isFurnished, buildingType } = params;
  
  try {
    // Charger les données en parallèle
    const [rentData, zone] = await Promise.all([
      loadRentData(),
      findZoneByCoordinates(latitude, longitude),
    ]);
    
    if (!zone) {
      console.warn('[Est Ensemble] Zone non trouvée');
      return null;
    }
    
    // Convertir les paramètres
    const piece = mapRoomCount(roomCount);
    const epoque = mapConstructionPeriod(constructionPeriod);
    const meuble = isFurnished === 'meuble';
    const maison = buildingType === 'maison';
    
    console.log('[Est Ensemble] Recherche:', { zone, piece, epoque, meuble, maison });
    
    // Trouver l'entrée correspondante
    const match = rentData.find((entry: any) => 
      entry.zone === zone &&
      entry.nombre_de_piece === piece &&
      entry.annee_de_construction === epoque &&
      entry.meuble === meuble &&
      entry.maison === maison
    );
    
    if (!match) {
      console.warn('[Est Ensemble] Aucune correspondance trouvée pour ces critères');
      
      // Fallback: essayer sans le critère maison (pour les appartements par défaut)
      if (!maison) {
        const fallbackMatch = rentData.find((entry: any) => 
          entry.zone === zone &&
          entry.nombre_de_piece === piece &&
          entry.annee_de_construction === epoque &&
          entry.meuble === meuble &&
          entry.maison === false
        );
        
        if (fallbackMatch) {
          console.log('[Est Ensemble] Match trouvé avec fallback (appartement)');
          return {
            ref: parsePrice(fallbackMatch.prix_med),
            max: parsePrice(fallbackMatch.prix_max),
            min: parsePrice(fallbackMatch.prix_min),
            zone: ZONE_NAMES[zone] || `Zone ${zone}`,
            annee: '2023',
            piece: fallbackMatch.nombre_de_piece,
            epoque: fallbackMatch.annee_de_construction,
            meuble: fallbackMatch.meuble,
            maison: fallbackMatch.maison,
          };
        }
      }
      
      return null;
    }
    
    console.log('[Est Ensemble] Match trouvé:', match);
    
    return {
      ref: parsePrice(match.prix_med),
      max: parsePrice(match.prix_max),
      min: parsePrice(match.prix_min),
      zone: ZONE_NAMES[zone] || `Zone ${zone}`,
      annee: '2023',
      piece: match.nombre_de_piece,
      epoque: match.annee_de_construction,
      meuble: match.meuble,
      maison: match.maison,
    };
    
  } catch (error) {
    console.error('[Est Ensemble] Erreur:', error);
    throw error;
  }
}
