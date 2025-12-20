import { describe, it, expect } from 'vitest';

const API_URL = "https://wxs.ign.fr/essentiels/geoportail/geocodage/rest/0.1/completion";

describe('Address Autocomplete API - IGN Géoplateforme', () => {
  
  it('should find "10 Rue Jean-Jacques Rousseau" addresses in Paris', async () => {
    const params = new URLSearchParams({
      text: "10 rue jean-jacques rousseau",
      terr: "75",
      type: "StreetAddress",
      maximumResponses: "5"
    });
    
    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();
    
    expect(data.status).toBe('OK');
    expect(data.results.length).toBeGreaterThan(0);
    
    const firstResult = data.results[0];
    expect(firstResult.fulltext.toLowerCase()).toContain('jean-jacques rousseau');
    expect(firstResult.zipcode).toMatch(/^75/);
    expect(firstResult.city).toBe('Paris');
  });

  it('should find "3 rue romy schneider" in Paris 18', async () => {
    const params = new URLSearchParams({
      text: "3 rue romy schneider",
      terr: "75",
      type: "StreetAddress",
      maximumResponses: "5"
    });
    
    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();
    
    expect(data.status).toBe('OK');
    expect(data.results.length).toBeGreaterThan(0);
    
    const firstResult = data.results[0];
    expect(firstResult.fulltext.toLowerCase()).toContain('romy schneider');
    expect(firstResult.zipcode).toBe('75018');
    expect(firstResult.city).toBe('Paris');
  });

  it('should find addresses with partial input "10 rue jean"', async () => {
    const params = new URLSearchParams({
      text: "10 rue jean",
      terr: "75",
      type: "StreetAddress",
      maximumResponses: "10"
    });
    
    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();
    
    expect(data.status).toBe('OK');
    expect(data.results.length).toBeGreaterThan(0);
    
    // Verify all results are in Paris
    data.results.forEach((result: any) => {
      expect(result.zipcode).toMatch(/^75/);
    });
  });

  it('should return results with correct structure', async () => {
    const params = new URLSearchParams({
      text: "1 rue de rivoli",
      terr: "75",
      type: "StreetAddress",
      maximumResponses: "5"
    });
    
    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();
    
    expect(data.status).toBe('OK');
    expect(data.results.length).toBeGreaterThan(0);
    
    const firstResult = data.results[0];
    
    // Verify all expected fields are present
    expect(firstResult).toHaveProperty('fulltext');
    expect(firstResult).toHaveProperty('x'); // longitude
    expect(firstResult).toHaveProperty('y'); // latitude
    expect(firstResult).toHaveProperty('city');
    expect(firstResult).toHaveProperty('zipcode');
    expect(firstResult).toHaveProperty('street');
    
    // Verify coordinate types
    expect(typeof firstResult.x).toBe('number');
    expect(typeof firstResult.y).toBe('number');
    
    // Verify coordinates are in Paris area (roughly)
    expect(firstResult.x).toBeGreaterThan(2.2);
    expect(firstResult.x).toBeLessThan(2.5);
    expect(firstResult.y).toBeGreaterThan(48.8);
    expect(firstResult.y).toBeLessThan(49.0);
  });

  it('should only return Paris addresses with terr=75', async () => {
    const params = new URLSearchParams({
      text: "1 rue de la paix",
      terr: "75",
      type: "StreetAddress",
      maximumResponses: "10"
    });
    
    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();
    
    expect(data.status).toBe('OK');
    
    // All results should be in Paris (75xxx postcodes)
    data.results.forEach((result: any) => {
      expect(result.zipcode).toMatch(/^75/);
    });
  });

  it('should return empty results for very specific non-existent address', async () => {
    const params = new URLSearchParams({
      text: "99999 rue imaginaire inexistante xyz",
      terr: "75",
      type: "StreetAddress",
      maximumResponses: "5"
    });
    
    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();
    
    expect(data.status).toBe('OK');
    expect(data.results.length).toBe(0);
  });
});
