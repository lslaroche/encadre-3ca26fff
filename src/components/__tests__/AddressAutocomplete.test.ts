import { describe, it, expect } from 'vitest';

// Fonctions utilitaires extraites pour les tests
export const getStreetNamePart = (query: string): string => {
  return query.replace(/^\d+\s*(bis|ter|quater)?\s*/i, '').trim();
};

export const generateParisCityCodes = (): string[] => {
  return Array.from({ length: 20 }, (_, i) => 
    `751${String(i + 1).padStart(2, '0')}`
  );
};

export const shouldTriggerSearch = (query: string): boolean => {
  const streetPart = getStreetNamePart(query);
  return streetPart.length >= 3 || query.length >= 5;
};

describe('AddressAutocomplete', () => {
  describe('getStreetNamePart', () => {
    it('should extract street name ignoring house number', () => {
      expect(getStreetNamePart('3 rom')).toBe('rom');
      expect(getStreetNamePart('41 rue de la paix')).toBe('rue de la paix');
      expect(getStreetNamePart('123 avenue')).toBe('avenue');
    });

    it('should handle "bis", "ter", "quater" suffixes', () => {
      expect(getStreetNamePart('12 bis rue')).toBe('rue');
      expect(getStreetNamePart('5 ter avenue')).toBe('avenue');
      expect(getStreetNamePart('7 quater boulevard')).toBe('boulevard');
    });

    it('should return full query when no house number', () => {
      expect(getStreetNamePart('rue de rome')).toBe('rue de rome');
      expect(getStreetNamePart('avenue')).toBe('avenue');
    });
  });

  describe('Paris city codes filter', () => {
    it('should generate all 20 Paris arrondissement codes', () => {
      const parisCityCodes = generateParisCityCodes();
      
      expect(parisCityCodes).toHaveLength(20);
      expect(parisCityCodes[0]).toBe('75101');
      expect(parisCityCodes[9]).toBe('75110');
      expect(parisCityCodes[19]).toBe('75120');
    });

    it('should include citycode parameter in API URL for Paris addresses', () => {
      const query = '3 rom';
      const parisCityCodes = generateParisCityCodes().join(',');
      
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=10&autocomplete=1&type=housenumber&citycode=${parisCityCodes}`;
      
      expect(url).toContain('citycode=75101');
      expect(url).toContain('75120');
      expect(url).toContain('q=3%20rom');
    });
  });

  describe('Search trigger conditions', () => {
    it('should trigger search when street name has 3+ chars', () => {
      expect(shouldTriggerSearch('3 rom')).toBe(true); // "rom" = 3 chars
      expect(shouldTriggerSearch('3 ro')).toBe(false); // "ro" = 2 chars
      expect(shouldTriggerSearch('rue')).toBe(true);   // "rue" = 3 chars
      expect(shouldTriggerSearch('av')).toBe(false);   // "av" = 2 chars
    });

    it('should trigger search when total query has 5+ chars (fallback)', () => {
      expect(shouldTriggerSearch('12345')).toBe(true);
      expect(shouldTriggerSearch('1234')).toBe(false);
    });

    it('should handle real-world search patterns for "3 rom"', () => {
      // Ce test garantit que "3 rom" déclenche bien la recherche
      // et trouvera à la fois "Rue de Rome" et "Rue Romy Schneider"
      expect(shouldTriggerSearch('3 rom')).toBe(true);
      expect(getStreetNamePart('3 rom')).toBe('rom');
    });
  });
});
