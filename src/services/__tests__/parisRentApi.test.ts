import { describe, it, expect } from 'vitest';
import {
  isPointInPolygon,
  mapRoomCount,
  mapConstructionPeriod,
  mapFurnished,
  calculateCompliance,
  RentControlResult,
} from '../parisRentApi';

describe('mapRoomCount', () => {
  it('retourne "4" pour "4+"', () => {
    expect(mapRoomCount('4+')).toBe('4');
  });

  it('retourne la valeur inchangée pour "1", "2", "3"', () => {
    expect(mapRoomCount('1')).toBe('1');
    expect(mapRoomCount('2')).toBe('2');
    expect(mapRoomCount('3')).toBe('3');
  });
});

describe('mapConstructionPeriod', () => {
  it('convertit "avant-1946" en "Avant 1946"', () => {
    expect(mapConstructionPeriod('avant-1946')).toBe('Avant 1946');
  });

  it('convertit "1946-1970" en "1946-1970"', () => {
    expect(mapConstructionPeriod('1946-1970')).toBe('1946-1970');
  });

  it('convertit "1971-1990" en "1971-1990"', () => {
    expect(mapConstructionPeriod('1971-1990')).toBe('1971-1990');
  });

  it('convertit "apres-1990" en "Apres 1990"', () => {
    expect(mapConstructionPeriod('apres-1990')).toBe('Apres 1990');
  });

  it('retourne la valeur inchangée pour une valeur inconnue', () => {
    expect(mapConstructionPeriod('unknown')).toBe('unknown');
  });
});

describe('mapFurnished', () => {
  it('convertit "meuble" en "meublé"', () => {
    expect(mapFurnished('meuble')).toBe('meublé');
  });

  it('convertit "non-meuble" en "non meublé"', () => {
    expect(mapFurnished('non-meuble')).toBe('non meublé');
  });
});

describe('isPointInPolygon', () => {
  // Polygone carré simple: (0,0), (10,0), (10,10), (0,10)
  // Note: format GeoJSON = [lon, lat]
  const squarePolygon = [
    [0, 0],   // [lon, lat]
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],   // Fermeture du polygone
  ];

  it('retourne true pour un point à l\'intérieur du carré', () => {
    expect(isPointInPolygon(5, 5, squarePolygon)).toBe(true);
  });

  it('retourne false pour un point à l\'extérieur du carré', () => {
    expect(isPointInPolygon(15, 15, squarePolygon)).toBe(false);
  });

  it('retourne false pour un point à gauche du carré', () => {
    expect(isPointInPolygon(5, -5, squarePolygon)).toBe(false);
  });

  it('retourne true pour un point proche du bord intérieur', () => {
    expect(isPointInPolygon(1, 1, squarePolygon)).toBe(true);
  });

  // Polygone triangulaire
  const trianglePolygon = [
    [0, 0],
    [10, 0],
    [5, 10],
    [0, 0],
  ];

  it('retourne true pour un point à l\'intérieur du triangle', () => {
    expect(isPointInPolygon(3, 5, trianglePolygon)).toBe(true);
  });

  it('retourne false pour un point à l\'extérieur du triangle', () => {
    expect(isPointInPolygon(9, 9, trianglePolygon)).toBe(false);
  });

  // Test avec coordonnées réelles de Paris (approximation)
  // Polygone simplifié représentant une zone de Paris
  const parisQuartierPolygon = [
    [2.35, 48.85],
    [2.36, 48.85],
    [2.36, 48.86],
    [2.35, 48.86],
    [2.35, 48.85],
  ];

  it('retourne true pour un point dans un quartier parisien simulé', () => {
    expect(isPointInPolygon(48.855, 2.355, parisQuartierPolygon)).toBe(true);
  });

  it('retourne false pour un point hors du quartier parisien simulé', () => {
    expect(isPointInPolygon(48.90, 2.40, parisQuartierPolygon)).toBe(false);
  });
});

describe('calculateCompliance', () => {
  const mockRentData: RentControlResult = {
    ref: 25.0,
    max: 30.0,
    min: 17.5,
    quartier: 'Test Quartier',
    annee: '2025',
    piece: '2',
    epoque: 'Avant 1946',
    meuble: 'non meublé',
  };

  it('calcule correctement un loyer conforme', () => {
    const result = calculateCompliance(mockRentData, 50, 1400);
    
    expect(result.isCompliant).toBe(true);
    expect(result.maxAuthorizedRent).toBe(1250); // 25 * 50
    expect(result.maxMajoredRent).toBe(1500);    // 30 * 50
    expect(result.minRent).toBe(875);             // 17.5 * 50
    expect(result.difference).toBe(-100);         // 1400 - 1500
  });

  it('calcule correctement un loyer non conforme', () => {
    const result = calculateCompliance(mockRentData, 50, 1600);
    
    expect(result.isCompliant).toBe(false);
    expect(result.difference).toBe(100); // 1600 - 1500
  });

  it('calcule correctement un loyer exactement au maximum', () => {
    const result = calculateCompliance(mockRentData, 50, 1500);
    
    expect(result.isCompliant).toBe(true);
    expect(result.difference).toBe(0);
  });

  it('conserve les données de loyer originales', () => {
    const result = calculateCompliance(mockRentData, 50, 1400);
    
    expect(result.rentData).toEqual(mockRentData);
    expect(result.surface).toBe(50);
    expect(result.currentRent).toBe(1400);
  });
});
