/**
 * API-level tests for the purchase flow
 * No browser needed - tests the backend directly
 * 
 * Run: node tests/api-purchase.test.js
 */

const BASE_URL = 'http://localhost:3000';

async function testCreateCheckoutWithoutAuth() {
  console.log('\n=== Test 1: Create checkout without authentication ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/stripe/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: 'trial' })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 401) {
      console.log('✅ Correctly rejected unauthenticated request');
    } else if (response.ok && data.url) {
      console.log('✅ Checkout URL created:', data.url);
    } else {
      console.log('⚠️ Unexpected response');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function testCreateCheckoutWithInvalidPackage() {
  console.log('\n=== Test 2: Create checkout with invalid package ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/stripe/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: 'invalid_package_123' })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 400 || data.error) {
      console.log('✅ Correctly rejected invalid package');
    } else {
      console.log('⚠️ Should have rejected invalid package');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function testAllPackageIds() {
  console.log('\n=== Test 3: Test all valid package IDs ===');
  
  const packages = ['trial', 'single', 'package3', 'package5'];
  
  for (const packageId of packages) {
    try {
      const response = await fetch(`${BASE_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId })
      });
      
      const data = await response.json();
      
      if (response.status === 401) {
        console.log(`  ${packageId}: Auth required (expected)`);
      } else if (data.url || data.sessionId) {
        console.log(`  ${packageId}: ✅ Checkout created`);
      } else if (data.error) {
        console.log(`  ${packageId}: ⚠️ ${data.error}`);
      }
    } catch (error) {
      console.log(`  ${packageId}: ❌ ${error.message}`);
    }
  }
}

async function testStripeWebhook() {
  console.log('\n=== Test 4: Test Stripe webhook endpoint exists ===');
  
  try {
    // Just check the endpoint exists (won't process without valid signature)
    const response = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({ type: 'test' })
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 400 || response.status === 401) {
      console.log('✅ Webhook endpoint exists and rejects invalid signatures');
    } else {
      console.log('⚠️ Unexpected response');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function testCalendarAvailability() {
  console.log('\n=== Test 5: Test calendar availability endpoint ===');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`${BASE_URL}/api/calendar?date=${today}`);
    
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log(`✅ Got availability for ${today}`);
      console.log(`   Available slots: ${data.slots?.length || 0}`);
    } else {
      console.log(`⚠️ ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function testProfileEndpoint() {
  console.log('\n=== Test 6: Test profile endpoint requires auth ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/profile`);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 400 || response.status === 401 || data.error) {
      console.log('✅ Profile endpoint requires authentication');
    } else {
      console.log('⚠️ Profile endpoint should require auth');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('========================================');
  console.log('API PURCHASE FLOW TESTS');
  console.log('Testing against:', BASE_URL);
  console.log('========================================');
  
  await testCreateCheckoutWithoutAuth();
  await testCreateCheckoutWithInvalidPackage();
  await testAllPackageIds();
  await testStripeWebhook();
  await testCalendarAvailability();
  await testProfileEndpoint();
  
  console.log('\n========================================');
  console.log('TESTS COMPLETE');
  console.log('========================================\n');
}

runTests();

