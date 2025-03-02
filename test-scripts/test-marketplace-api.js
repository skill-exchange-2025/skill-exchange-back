// test-marketplace-api.js
// A script to test the marketplace API endpoints

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000';
let authToken = '';
let currentUserId = '';
let createdListingId = '';
let createdTransactionId = '';

// Helper function to prompt for input
const prompt = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

// Helper function for API requests
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers,
      data: data ? data : undefined,
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    return null;
  }
}

// Login function
async function login() {
  console.log('\n--- Login ---');
  const email = await prompt('Enter email: ');
  const password = await prompt('Enter password: ');

  const response = await apiRequest('post', '/auth/login', { email, password });

  if (response && response.access_token) {
    authToken = response.access_token;
    currentUserId = response.userId;
    console.log('Login successful!');
    return true;
  } else {
    console.log('Login failed. Please try again.');
    return false;
  }
}

// Test marketplace listing creation
async function createListing() {
  console.log('\n--- Create Listing ---');

  const listingData = {
    title: 'Test Listing - ' + new Date().toISOString(),
    description: 'This is a test listing created by the API test script',
    skillName: 'JavaScript',
    proficiencyLevel: 'Expert',
    price: 50,
    tags: ['test', 'api', 'javascript'],
  };

  console.log('Creating listing with data:', listingData);

  const response = await apiRequest(
    'post',
    '/marketplace/listings',
    listingData,
    authToken
  );

  if (response && response._id) {
    createdListingId = response._id;
    console.log(`Listing created successfully with ID: ${createdListingId}`);
    return true;
  } else {
    console.log('Failed to create listing');
    return false;
  }
}

// Test getting listings
async function getListings() {
  console.log('\n--- Get Listings ---');

  const response = await apiRequest('get', '/marketplace/listings');

  if (response && response.data) {
    console.log(`Found ${response.data.length} listings`);
    console.log('First few listings:');
    response.data.slice(0, 3).forEach((listing, i) => {
      console.log(
        `${i + 1}. ${listing.title} - $${listing.price} - ${listing.skillName}`
      );
    });
    return true;
  } else {
    console.log('Failed to get listings');
    return false;
  }
}

// Test getting a specific listing
async function getListingById() {
  if (!createdListingId) {
    console.log('No listing ID available. Create a listing first.');
    return false;
  }

  console.log(`\n--- Get Listing ${createdListingId} ---`);

  const response = await apiRequest(
    'get',
    `/marketplace/listings/${createdListingId}`
  );

  if (response && response._id) {
    console.log('Listing details:');
    console.log(`- Title: ${response.title}`);
    console.log(`- Description: ${response.description}`);
    console.log(`- Price: ${response.price}`);
    console.log(
      `- Skill: ${response.skillName} (${response.proficiencyLevel})`
    );
    console.log(`- Status: ${response.status}`);
    return true;
  } else {
    console.log('Failed to get listing details');
    return false;
  }
}

// Test creating a transaction (purchase)
async function createTransaction() {
  if (!createdListingId) {
    console.log('No listing ID available. Create a listing first.');
    return false;
  }

  console.log(`\n--- Create Transaction for Listing ${createdListingId} ---`);

  const transactionData = {
    listingId: createdListingId,
  };

  const response = await apiRequest(
    'post',
    '/marketplace/transactions',
    transactionData,
    authToken
  );

  if (response && response._id) {
    createdTransactionId = response._id;
    console.log(
      `Transaction created successfully with ID: ${createdTransactionId}`
    );
    console.log(`Status: ${response.status}`);
    return true;
  } else {
    console.log('Failed to create transaction');
    return false;
  }
}

// Test completing a transaction
async function completeTransaction() {
  if (!createdTransactionId) {
    console.log('No transaction ID available. Create a transaction first.');
    return false;
  }

  console.log(`\n--- Complete Transaction ${createdTransactionId} ---`);

  const response = await apiRequest(
    'patch',
    `/marketplace/transactions/${createdTransactionId}/complete`,
    null,
    authToken
  );

  if (response && response._id) {
    console.log(`Transaction completed successfully`);
    console.log(`Status: ${response.status}`);
    return true;
  } else {
    console.log('Failed to complete transaction');
    return false;
  }
}

// Test creating a review
async function createReview() {
  if (!createdTransactionId) {
    console.log('No transaction ID available. Create a transaction first.');
    return false;
  }

  console.log(
    `\n--- Create Review for Transaction ${createdTransactionId} ---`
  );

  const reviewData = {
    transactionId: createdTransactionId,
    rating: 5,
    comment: 'Great service! This is a test review.',
  };

  const response = await apiRequest(
    'post',
    '/marketplace/reviews',
    reviewData,
    authToken
  );

  if (response && response._id) {
    console.log(`Review created successfully with ID: ${response._id}`);
    return true;
  } else {
    console.log('Failed to create review');
    return false;
  }
}

// Main test flow
async function runTests() {
  console.log('=== Marketplace API Test ===');
  console.log(`API URL: ${API_URL}`);

  // Login first
  if (!(await login())) {
    console.log('Cannot proceed without login. Exiting...');
    rl.close();
    return;
  }

  // Run tests
  const tests = [
    { name: 'Create Listing', fn: createListing },
    { name: 'Get Listings', fn: getListings },
    { name: 'Get Listing by ID', fn: getListingById },
    { name: 'Create Transaction', fn: createTransaction },
    { name: 'Complete Transaction', fn: completeTransaction },
    { name: 'Create Review', fn: createReview },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\nRunning test: ${test.name}`);
    const startTime = Date.now();
    const success = await test.fn();
    const duration = Date.now() - startTime;

    results.push({
      name: test.name,
      success,
      duration,
    });

    // Pause between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n=== Test Results Summary ===');
  results.forEach((result) => {
    console.log(
      `${result.success ? '✅' : '❌'} ${result.name} - ${result.duration}ms`
    );
  });

  const successCount = results.filter((r) => r.success).length;
  console.log(`\nPassed: ${successCount}/${results.length} tests`);

  rl.close();
}

// Run the tests
runTests();
