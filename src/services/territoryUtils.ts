/**
 * Utilitaires pour identifier le territoire (Paris, Est Ensemble, etc.)
 */

export type Territory = 'paris' | 'est-ensemble';

// Codes postaux des villes Est Ensemble
const EST_ENSEMBLE_POSTCODES: Record<string, string> = {
  '93170': 'Bagnolet',
  '93000': 'Bobigny',
  '93140': 'Bondy',
  '93310': 'Le Pré-Saint-Gervais',
  '93260': 'Les Lilas',
  '93100': 'Montreuil',
  '93130': 'Noisy-le-Sec',
  '93500': 'Pantin',
  '93230': 'Romainville',
};

// Codes INSEE des villes Est Ensemble
const EST_ENSEMBLE_INSEE: Record<string, string> = {
  '93006': 'Bagnolet',
  '93008': 'Bobigny',
  '93010': 'Bondy',
  '93061': 'Le Pré-Saint-Gervais',
  '93045': 'Les Lilas',
  '93048': 'Montreuil',
  '93053': 'Noisy-le-Sec',
  '93055': 'Pantin',
  '93063': 'Romainville',
};

/**
 * Identifie le territoire à partir du code postal
 */
export function getTerritoryFromPostcode(postcode: string): Territory | null {
  if (postcode.startsWith('75')) {
    return 'paris';
  }
  
  if (EST_ENSEMBLE_POSTCODES[postcode]) {
    return 'est-ensemble';
  }
  
  return null;
}

/**
 * Identifie le territoire à partir du code INSEE
 */
export function getTerritoryFromInsee(inseeCode: string): Territory | null {
  if (inseeCode.startsWith('75')) {
    return 'paris';
  }
  
  if (EST_ENSEMBLE_INSEE[inseeCode]) {
    return 'est-ensemble';
  }
  
  return null;
}

/**
 * Vérifie si un code postal est supporté (Paris ou Est Ensemble)
 */
export function isSupportedPostcode(postcode: string): boolean {
  return getTerritoryFromPostcode(postcode) !== null;
}

/**
 * Retourne le nom de la ville Est Ensemble à partir du code postal
 */
export function getEstEnsembleCity(postcode: string): string | null {
  return EST_ENSEMBLE_POSTCODES[postcode] || null;
}

/**
 * Retourne le nom du territoire pour l'affichage
 */
export function getTerritoryLabel(territory: Territory): string {
  switch (territory) {
    case 'paris':
      return 'Paris';
    case 'est-ensemble':
      return 'Est Ensemble';
    default:
      return territory;
  }
}

/**
 * Liste des codes postaux Est Ensemble
 */
export function getEstEnsemblePostcodes(): string[] {
  return Object.keys(EST_ENSEMBLE_POSTCODES);
}

/**
 * Liste des codes postaux supportés (Paris + Est Ensemble)
 */
export function getSupportedPostcodePrefixes(): string[] {
  return ['75', '93170', '93000', '93140', '93310', '93260', '93100', '93130', '93500', '93230'];
}
