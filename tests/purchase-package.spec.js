// @ts-check
import { test, expect, chromium } from '@playwright/test';

/**
 * Interactive purchase test - browser stays open for you to complete sign-in
 * 
 * Run: npx playwright test tests/purchase-package.spec.js --grep "interactive" --headed --timeout=600000
 */
test('interactive purchase test', async () => {
  // Launch with slow-mo so you can see what's happening
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('\n========================================');
  console.log('INTERACTIVE PURCHASE TEST');
  console.log('========================================\n');
  
  // Go to homepage
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  console.log('1. Loaded homepage');
  
  // Scroll to packages
  await page.locator('#packages').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  console.log('2. Scrolled to packages');
  
  // Click trial button
  const trialButton = page.locator('button:has-text("Book Trial")').first();
  await trialButton.click();
  console.log('3. Clicked Book Trial');
  
  // Wait and check what happened
  await page.waitForTimeout(2000);
  
  // Check for login modal
  const loginModal = page.locator('.login-prompt-modal');
  if (await loginModal.isVisible().catch(() => false)) {
    console.log('\n4. Login modal appeared');
    console.log('   → Please click "Sign in with Google" in the browser');
    console.log('   → Complete the Google sign-in');
    console.log('   → The test will continue automatically\n');
    
    // Wait for login modal to disappear (user completed sign-in)
    // or for redirect to happen
    let attempts = 0;
    while (attempts < 150) { // 5 minutes max
      await page.waitForTimeout(2000);
      
      const url = page.url();
      const modalStillVisible = await loginModal.isVisible().catch(() => false);
      
      // Check if we got redirected to Stripe
      if (url.includes('stripe.com') || url.includes('checkout')) {
        console.log('\n✅ REDIRECTED TO STRIPE CHECKOUT!');
        await page.screenshot({ path: 'tests/screenshots/stripe-checkout.png', fullPage: true });
        break;
      }
      
      // Check if modal closed and we're still on the site
      if (!modalStillVisible && url.includes('localhost:3000')) {
        console.log('5. Login modal closed, retrying purchase...');
        
        // Re-scroll to packages and click again
        await page.locator('#packages').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        const retryButton = page.locator('button:has-text("Book Trial")').first();
        if (await retryButton.isVisible()) {
          await retryButton.click();
          console.log('6. Clicked Book Trial again');
        }
      }
      
      attempts++;
      if (attempts % 15 === 0) {
        console.log(`   Still waiting... (${attempts * 2}s elapsed)`);
      }
    }
  } else {
    // Check if we went straight to Stripe
    const url = page.url();
    if (url.includes('stripe.com') || url.includes('checkout')) {
      console.log('\n✅ REDIRECTED TO STRIPE CHECKOUT!');
      await page.screenshot({ path: 'tests/screenshots/stripe-checkout.png', fullPage: true });
    }
  }
  
  // Final screenshot
  await page.screenshot({ path: 'tests/screenshots/final-state.png' });
  console.log('\nScreenshots saved to tests/screenshots/');
  
  // Keep browser open for inspection
  console.log('\nBrowser will stay open for 60 seconds for inspection...');
  await page.waitForTimeout(60000);
  
  await browser.close();
});

/**
 * Quick UI test (no login needed)
 */
test('verify packages display correctly', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  await page.locator('#packages').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  // Verify prices
  await expect(page.getByText('$30').first()).toBeVisible();
  await expect(page.getByText('$100').first()).toBeVisible();
  await expect(page.getByText('$250').first()).toBeVisible();
  
  // Verify buttons
  const trialButton = page.locator('button:has-text("Book Trial")');
  await expect(trialButton.first()).toBeVisible();
  
  console.log('✅ All package elements verified');
});
