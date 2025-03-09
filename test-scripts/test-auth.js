// test-auth.js
// A script to test authentication and token validity

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000';
let authToken = '';

// Helper function to prompt for input
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

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
      data: data ? data : undefined
    };

    console.log(`Making ${method.toUpperCase()} request to ${endpoint}`);
    if (token) {
      console.log(`Using token: ${token.substring(0, 15)}...`);
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Login function
async function login() {
  console.log('\n--- Login ---');
  const email = await prompt('Enter email: ');
  const password = await prompt('Enter password: ');

  const result = await apiRequest('post', '/auth/login', { email, password });
  
  if (result.success && result.data.access_token) {
    authToken = result.data.access_token;
    console.log('Login successful!');
    console.log(`Token: ${authToken.substring(0, 15)}...`);
    return true;
  } else {
    console.log('Login failed. Please check your credentials.');
    return false;
  }
}

// Test token validity
async function testTokenValidity() {
  if (!authToken) {
    console.log('No token available. Please login first.');
    return false;
  }

  console.log('\n--- Testing Token Validity ---');
  
  // Try to access a protected endpoint
  const result = await apiRequest('get', '/users/profile', null, authToken);
  
  if (result.success) {
    console.log('Token is valid! Successfully accessed protected endpoint.');
    console.log('User profile:', result.data);
    return true;
  } else {
    console.log('Token validation failed!');
    console.log(`Status: ${result.status}`);
    console.log(`Error: ${JSON.stringify(result.error)}`);
    
    if (result.status === 401) {
      console.log('\nYour token appears to be invalid or expired.');
      console.log('Please try logging in again to get a new token.');
    }
    
    return false;
  }
}

// Test creating a listing with current token
async function testCreateListing() {
  if (!authToken) {
    console.log('No token available. Please login first.');
    return false;
  }
  
  console.log('\n--- Test Creating a Listing ---');
  
  const listingData = {
    title: 'Test Listing - ' + new Date().toISOString(),
    description: 'This is a test listing to verify authentication',
    skillName: 'JavaScript',
    proficiencyLevel: 'Expert',
    price: 50,
    tags: ['test', 'authentication']
  };

  console.log('Attempting to create listing with data:', listingData);
  
  const result = await apiRequest('post', '/marketplace/listings', listingData, authToken);
  
  if (result.success) {
    console.log('Listing created successfully!');
    console.log('Listing ID:', result.data._id);
    return true;
  } else {
    console.log('Failed to create listing');
    console.log(`Status: ${result.status}`);
    console.log(`Error: ${JSON.stringify(result.error)}`);
    
    if (result.status === 401) {
      console.log('\nAuthentication failed. Your token appears to be invalid or expired.');
      console.log('Please try logging in again to get a new token.');
    }
    
    return false;
  }
}

// Decode JWT token to check expiration
function decodeToken(token) {
  if (!token) {
    console.log('No token provided');
    return null;
  }
  
  try {
    // JWT tokens are in format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('Invalid token format');
      return null;
    }
    
    // Decode the payload (middle part)
    const payload = Buffer.from(parts[1], 'base64').toString();
    const decoded = JSON.parse(payload);
    
    console.log('\n--- Token Information ---');
    console.log('Issued at:', new Date(decoded.iat * 1000).toLocaleString());
    
    if (decoded.exp) {
      const expiryDate = new Date(decoded.exp * 1000);
      const now = new Date();
      
      console.log('Expires at:', expiryDate.toLocaleString());
      console.log('Current time:', now.toLocaleString());
      
      if (expiryDate < now) {
        console.log('STATUS: TOKEN EXPIRED');
      } else {
        const timeLeft = Math.floor((expiryDate - now) / 1000 / 60);
        console.log(`STATUS: VALID (expires in ${timeLeft} minutes)`);
      }
    } else {
      console.log('No expiration found in token');
    }
    
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('=== Authentication Test Tool ===');
  console.log(`API URL: ${API_URL}`);
  
  let option = '';
  let loggedIn = false;
  
  while (option !== '6') {
    console.log('\nOptions:');
    console.log('1. Login (get new token)');
    console.log('2. Test token validity');
    console.log('3. Decode and check token expiration');
    console.log('4. Test creating a listing');
    console.log('5. Enter token manually');
    console.log('6. Exit');
    
    option = await prompt('\nSelect an option (1-6): ');
    
    switch (option) {
      case '1':
        loggedIn = await login();
        break;
      case '2':
        await testTokenValidity();
        break;
      case '3':
        decodeToken(authToken);
        break;
      case '4':
        await testCreateListing();
        break;
      case '5':
        authToken = await prompt('Enter your JWT token: ');
        console.log('Token set manually');
        break;
      case '6':
        console.log('Exiting...');
        break;
      default:
        console.log('Invalid option. Please try again.');
    }
  }
  
  rl.close();
}

// Run the main function
main(); 