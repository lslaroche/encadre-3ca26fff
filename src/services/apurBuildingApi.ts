/**
 * Service pour récupérer l'époque de construction via l'API APUR
 * https://carto2.apur.org/apur/rest/services/OPENDATA/EMPRISE_BATIE_PARIS/MapServer/0
 */

export interface ApurBuildingData {
  constructionPeriod: string | null;
  apurCode: number | null;
  apurLabel: string | null;
}

// Mapping des codes APUR vers les périodes d'encadrement des loyers
const APUR_TO_RENT_PERIOD: Record<number, string> = {
  1: 'avant-1946',   // avant 1800
  2: 'avant-1946',   // 1801-1850
  3: 'avant-1946',   // 1851-1914
  4: 'avant-1946',   // 1915-1939 (some sources use 4)
  5: 'avant-1946',   // 1915-1939
  6: '1946-1970',    // 1940-1967
  7: '1971-1990',    // 1968-1975
  8: '1971-1990',    // 1976-1981
  9: '1971-1990',    // 1982-1989
  10: 'apres-1990',  // 1990-1999
  11: 'apres-1990',  // 2000+
  12: 'apres-1990',  // 2010+
  13: 'apres-1990',  // 2015+
};

const APUR_CODE_LABELS: Record<number, string> = {
  1: 'Avant 1800',
  2: '1801-1850',
  3: '1851-1914',
  4: '1915-1939',
  5: '1915-1939',
  6: '1940-1967',
  7: '1968-1975',
  8: '1976-1981',
  9: '1982-1989',
  10: '1990-1999',
  11: '2000-2009',
  12: '2010-2014',
  13: 'Après 2015',
};

export async function fetchBuildingConstructionPeriod(
  latitude: number,
  longitude: number
): Promise<ApurBuildingData> {
  try {
    // Créer une enveloppe (bbox) autour du point pour augmenter les chances de toucher un bâtiment
    // Buffer de ~20 mètres (environ 0.0002 degrés)
    const buffer = 0.0002;
    const envelope = {
      xmin: longitude - buffer,
      ymin: latitude - buffer,
      xmax: longitude + buffer,
      ymax: latitude + buffer,
      spatialReference: { wkid: 4326 }
    };

    const url = new URL('https://carto2.apur.org/apur/rest/services/OPENDATA/EMPRISE_BATIE_PARIS/MapServer/0/query');
    url.searchParams.set('geometry', JSON.stringify(envelope));
    url.searchParams.set('geometryType', 'esriGeometryEnvelope');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'c_perconst');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('f', 'json');

    console.log('[APUR] Requête pour coordonnées:', { latitude, longitude });
    console.log('[APUR] URL:', url.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('[APUR] Erreur HTTP:', response.status);
      return { constructionPeriod: null, apurCode: null, apurLabel: null };
    }

    const data = await response.json();
    console.log('[APUR] Réponse:', data);

    if (data.features && data.features.length > 0) {
      const apurCode = data.features[0].attributes?.c_perconst;
      
      if (apurCode && APUR_TO_RENT_PERIOD[apurCode]) {
        const result: ApurBuildingData = {
          constructionPeriod: APUR_TO_RENT_PERIOD[apurCode],
          apurCode: apurCode,
          apurLabel: APUR_CODE_LABELS[apurCode] || null
        };
        console.log('[APUR] Période trouvée:', result);
        return result;
      }
    }

    console.log('[APUR] Aucune donnée de construction trouvée');
    return { constructionPeriod: null, apurCode: null, apurLabel: null };
  } catch (error) {
    console.error('[APUR] Erreur lors de la requête:', error);
    return { constructionPeriod: null, apurCode: null, apurLabel: null };
  }
}
