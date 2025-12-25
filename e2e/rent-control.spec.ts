import { test, expect } from '@playwright/test';

test.describe('Encadrement des loyers Paris', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('affiche correctement la page d\'accueil', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /encadré/i })).toBeVisible();
    await expect(page.getByTestId('address-input')).toBeVisible();
    await expect(page.getByTestId('simulate-button')).toBeVisible();
  });

  test('le bouton de simulation est désactivé sans données', async ({ page }) => {
    await expect(page.getByTestId('simulate-button')).toBeDisabled();
  });

  test('identifie correctement le quartier Chapelle pour 3 Rue Romy Schneider 75018', async ({ page }) => {
    // Remplir l'adresse
    await page.getByTestId('address-input').fill('3 Rue Romy Schneider 75018 Paris');
    
    // Attendre les suggestions et cliquer sur la première
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 });
    await page.getByTestId('address-suggestion').first().click();
    
    // Vérifier que l'adresse est sélectionnée
    await expect(page.getByTestId('address-selected')).toBeVisible();
    
    // Remplir les autres champs
    await page.getByTestId('construction-avant-1946').click();
    await page.getByTestId('room-count-trigger').click();
    await page.getByTestId('room-count-2').click();
    await page.getByTestId('furnished-no').click();
    await page.getByTestId('surface-input').fill('50');
    await page.getByTestId('rent-input').fill('1200');
    
    // Lancer la simulation
    await page.getByTestId('simulate-button').click();
    
    // Attendre le résultat
    await page.waitForSelector('[data-testid="quartier-name"]', { timeout: 15000 });
    
    // Vérifier le quartier identifié - doit être "Chapelle" et non "Villette"
    const quartierText = await page.getByTestId('quartier-name').textContent();
    expect(quartierText).toContain('Chapelle');
  });

  test('identifie correctement le quartier pour 10 Rue de Rivoli 75001', async ({ page }) => {
    // Remplir l'adresse
    await page.getByTestId('address-input').fill('10 Rue de Rivoli 75001 Paris');
    
    // Attendre les suggestions et cliquer sur la première
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 });
    await page.getByTestId('address-suggestion').first().click();
    
    // Remplir les autres champs
    await page.getByTestId('construction-avant-1946').click();
    await page.getByTestId('room-count-trigger').click();
    await page.getByTestId('room-count-2').click();
    await page.getByTestId('furnished-no').click();
    await page.getByTestId('surface-input').fill('50');
    await page.getByTestId('rent-input').fill('1500');
    
    // Lancer la simulation
    await page.getByTestId('simulate-button').click();
    
    // Attendre le résultat
    await page.waitForSelector('[data-testid="quartier-name"]', { timeout: 15000 });
    
    // Vérifier qu'un quartier est identifié (1er arrondissement)
    const quartierText = await page.getByTestId('quartier-name').textContent();
    expect(quartierText).toBeTruthy();
    expect(quartierText!.length).toBeGreaterThan(0);
  });

  test('calcule correctement un loyer conforme', async ({ page }) => {
    // Remplir l'adresse
    await page.getByTestId('address-input').fill('50 Rue de Belleville 75020 Paris');
    
    // Attendre les suggestions et cliquer sur la première
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 });
    await page.getByTestId('address-suggestion').first().click();
    
    // Remplir les autres champs
    await page.getByTestId('construction-avant-1946').click();
    await page.getByTestId('room-count-trigger').click();
    await page.getByTestId('room-count-2').click();
    await page.getByTestId('furnished-no').click();
    await page.getByTestId('surface-input').fill('50');
    await page.getByTestId('rent-input').fill('1000'); // Loyer bas pour être conforme
    
    // Lancer la simulation
    await page.getByTestId('simulate-button').click();
    
    // Attendre le résultat
    await page.waitForSelector('[data-testid="compliance-badge"]', { timeout: 15000 });
    
    // Vérifier la conformité
    const badge = page.getByTestId('compliance-badge');
    await expect(badge).toContainText('Conforme');
  });

  test('calcule correctement un loyer non conforme', async ({ page }) => {
    // Remplir l'adresse
    await page.getByTestId('address-input').fill('50 Rue de Belleville 75020 Paris');
    
    // Attendre les suggestions et cliquer sur la première
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 });
    await page.getByTestId('address-suggestion').first().click();
    
    // Remplir les autres champs
    await page.getByTestId('construction-avant-1946').click();
    await page.getByTestId('room-count-trigger').click();
    await page.getByTestId('room-count-2').click();
    await page.getByTestId('furnished-no').click();
    await page.getByTestId('surface-input').fill('50');
    await page.getByTestId('rent-input').fill('3000'); // Loyer très élevé pour être non conforme
    
    // Lancer la simulation
    await page.getByTestId('simulate-button').click();
    
    // Attendre le résultat
    await page.waitForSelector('[data-testid="compliance-badge"]', { timeout: 15000 });
    
    // Vérifier la non-conformité
    const badge = page.getByTestId('compliance-badge');
    await expect(badge).toContainText('Non conforme');
  });

  test('affiche une erreur pour une adresse sans suggestions', async ({ page }) => {
    // Taper une adresse invalide
    await page.getByTestId('address-input').fill('adresse inexistante xyz');
    
    // Attendre un moment pour les suggestions
    await page.waitForTimeout(1000);
    
    // Vérifier que le message "aucune adresse" apparaît
    await expect(page.getByText(/Aucune adresse trouvée/i)).toBeVisible();
  });

  test('le formulaire est vide après rechargement de la page', async ({ page }) => {
    // Remplir quelques champs
    await page.getByTestId('surface-input').fill('45');
    await page.getByTestId('rent-input').fill('1100');
    await page.getByTestId('construction-1946-1970').click();
    
    // Recharger la page
    await page.reload();
    
    // Vérifier que les valeurs sont réinitialisées (pas de persistance)
    await expect(page.getByTestId('surface-input')).toHaveValue('');
    await expect(page.getByTestId('rent-input')).toHaveValue('');
    await expect(page.getByTestId('construction-1946-1970')).not.toBeChecked();
  });

  test('les résultats sont accessibles via URL avec paramètres', async ({ page }) => {
    // Faire une simulation complète
    await page.getByTestId('address-input').fill('50 Rue de Belleville 75020 Paris');
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 });
    await page.getByTestId('address-suggestion').first().click();
    
    await page.getByTestId('construction-avant-1946').click();
    await page.getByTestId('room-count-trigger').click();
    await page.getByTestId('room-count-2').click();
    await page.getByTestId('furnished-no').click();
    await page.getByTestId('surface-input').fill('50');
    await page.getByTestId('rent-input').fill('1200');
    
    await page.getByTestId('simulate-button').click();
    await page.waitForSelector('[data-testid="compliance-badge"]', { timeout: 15000 });
    
    // Vérifier que l'URL contient les paramètres
    const url = page.url();
    expect(url).toContain('/resultats?');
    expect(url).toContain('surface=50');
    expect(url).toContain('rent=1200');
  });

  test('les résultats persistent après rechargement de la page', async ({ page }) => {
    // Faire une simulation complète
    await page.getByTestId('address-input').fill('50 Rue de Belleville 75020 Paris');
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 });
    await page.getByTestId('address-suggestion').first().click();
    
    await page.getByTestId('construction-avant-1946').click();
    await page.getByTestId('room-count-trigger').click();
    await page.getByTestId('room-count-2').click();
    await page.getByTestId('furnished-no').click();
    await page.getByTestId('surface-input').fill('50');
    await page.getByTestId('rent-input').fill('1200');
    
    await page.getByTestId('simulate-button').click();
    await page.waitForSelector('[data-testid="compliance-badge"]', { timeout: 15000 });
    
    // Sauvegarder l'URL
    const resultUrl = page.url();
    
    // Recharger la page
    await page.reload();
    
    // Vérifier que les résultats sont toujours affichés
    await expect(page.getByTestId('compliance-badge')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('current-rent')).toContainText('1200');
  });

  test('un lien de résultat partagé affiche les mêmes données', async ({ page }) => {
    // Construire une URL avec des paramètres valides
    const params = new URLSearchParams({
      surface: '50',
      rent: '1200',
      address: '50 Rue de Belleville 75020 Paris',
      postcode: '75020',
      period: 'avant-1946',
      rooms: '2',
      furnished: 'non-meuble',
      lat: '48.8713',
      lng: '2.3851',
    });
    
    // Accéder directement à l'URL avec paramètres
    await page.goto(`/resultats?${params.toString()}`);
    
    // Vérifier que les résultats sont affichés
    await expect(page.getByTestId('compliance-badge')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('current-rent')).toContainText('1200');
  });

  test('auto-détecte l\'époque de construction via APUR', async ({ page }) => {
    // Remplir l'adresse (immeuble haussmannien typique)
    await page.getByTestId('address-input').fill('5 Rue Alasseur 75015 Paris');
    
    // Attendre les suggestions et cliquer sur la première
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 });
    await page.getByTestId('address-suggestion').first().click();
    
    // Vérifier que l'adresse est sélectionnée
    await expect(page.getByTestId('address-selected')).toBeVisible();
    
    // Attendre la fin du chargement de l'époque (soit le badge, soit que le loader disparaisse)
    await page.waitForFunction(
      () => {
        const loading = document.querySelector('[data-testid="loading-epoque"]');
        return !loading;
      },
      { timeout: 10000 }
    );
    
    // Vérifier qu'une époque de construction est sélectionnée automatiquement
    // L'un des radio buttons doit être coché
    const isAnyPeriodSelected = await page.evaluate(() => {
      const radios = document.querySelectorAll('[data-testid^="construction-"]');
      return Array.from(radios).some(r => (r as HTMLInputElement).getAttribute('data-state') === 'checked');
    });
    
    expect(isAnyPeriodSelected).toBe(true);
  });

  test('permet la sélection manuelle si auto-détection échoue', async ({ page }) => {
    // Taper une adresse qui pourrait ne pas être trouvée dans APUR
    await page.getByTestId('address-input').fill('1 Place de la Concorde 75008 Paris');
    
    // Attendre les suggestions et cliquer sur la première
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 });
    await page.getByTestId('address-suggestion').first().click();
    
    // Attendre la fin du chargement
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="loading-epoque"]'),
      { timeout: 10000 }
    );
    
    // Sélectionner manuellement une époque
    await page.getByTestId('construction-avant-1946').click();
    
    // Vérifier que la sélection manuelle fonctionne
    await expect(page.getByTestId('construction-avant-1946')).toBeChecked();
  });
});
