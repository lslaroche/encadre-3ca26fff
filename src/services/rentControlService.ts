/**
 * Service unifié d'encadrement des loyers
 * Route vers Paris ou Est Ensemble selon le territoire
 */

import { fetchRentControl, RentControlParams, RentControlResult, calculateCompliance, RentComplianceResult } from './parisRentApi';
import { fetchEstEnsembleRentControl, EstEnsembleRentParams, EstEnsembleRentResult } from './estEnsembleRentApi';
import { getTerritoryFromPostcode, Territory } from './territoryUtils';

export interface UnifiedRentParams {
  latitude: number;
  longitude: number;
  postcode: string;
  roomCount: string;
  constructionPeriod: string;
  isFurnished: string;
  buildingType: string;  // "appartement" | "maison"
}

export interface UnifiedRentResult {
  territory: Territory;
  ref: number;
  max: number;
  min: number;
  quartier: string;      // Nom du quartier ou de la zone
  annee: string;
  piece: string;
  epoque: string;
  meuble: string;
  buildingType?: string;
}

/**
 * Récupère les données d'encadrement selon le territoire
 */
export async function fetchUnifiedRentControl(params: UnifiedRentParams): Promise<UnifiedRentResult | null> {
  const territory = getTerritoryFromPostcode(params.postcode);
  
  if (!territory) {
    console.warn('[RentControl] Territoire non supporté pour le code postal:', params.postcode);
    return null;
  }
  
  console.log(`[RentControl] Territoire détecté: ${territory}`);
  
  if (territory === 'paris') {
    // Utiliser l'API Paris
    const parisParams: RentControlParams = {
      latitude: params.latitude,
      longitude: params.longitude,
      roomCount: params.roomCount,
      constructionPeriod: params.constructionPeriod,
      isFurnished: params.isFurnished,
    };
    
    const result = await fetchRentControl(parisParams);
    
    if (!result) return null;
    
    return {
      territory: 'paris',
      ref: result.ref,
      max: result.max,
      min: result.min,
      quartier: result.quartier,
      annee: result.annee,
      piece: result.piece,
      epoque: result.epoque,
      meuble: result.meuble,
    };
  }
  
  if (territory === 'est-ensemble') {
    // Utiliser l'API Est Ensemble
    const eeParams: EstEnsembleRentParams = {
      latitude: params.latitude,
      longitude: params.longitude,
      roomCount: params.roomCount,
      constructionPeriod: params.constructionPeriod,
      isFurnished: params.isFurnished,
      buildingType: params.buildingType,
    };
    
    const result = await fetchEstEnsembleRentControl(eeParams);
    
    if (!result) return null;
    
    return {
      territory: 'est-ensemble',
      ref: result.ref,
      max: result.max,
      min: result.min,
      quartier: result.zone,
      annee: result.annee,
      piece: result.piece.toString(),
      epoque: result.epoque,
      meuble: result.meuble ? 'meublé' : 'non meublé',
      buildingType: result.maison ? 'maison' : 'appartement',
    };
  }
  
  return null;
}

/**
 * Calcule la conformité du loyer (réutilise la logique existante)
 */
export function calculateUnifiedCompliance(
  rentData: UnifiedRentResult,
  surface: number,
  currentRent: number
): RentComplianceResult {
  // Adapter pour la fonction existante
  const adaptedData: RentControlResult = {
    ref: rentData.ref,
    max: rentData.max,
    min: rentData.min,
    quartier: rentData.quartier,
    annee: rentData.annee,
    piece: rentData.piece,
    epoque: rentData.epoque,
    meuble: rentData.meuble,
  };
  
  return calculateCompliance(adaptedData, surface, currentRent);
}

// Réexporter les types et fonctions utiles
export type { Territory } from './territoryUtils';
export { getTerritoryFromPostcode, getTerritoryLabel, isSupportedPostcode } from './territoryUtils';
