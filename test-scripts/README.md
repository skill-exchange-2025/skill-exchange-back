# Marketplace and Stripe Payment Testing

This directory contains scripts and guides for testing the marketplace functionality and Stripe payment integration.

## Contents

- `testing-guide.md` - Comprehensive guide for testing the marketplace and Stripe payment integration
- `test-stripe.js` - Script to test Stripe API integration directly
- `test-marketplace-api.js` - Script to test the marketplace API endpoints
- `package.json` - Dependencies and scripts for running the tests

## Setup

1. Install dependencies:

   ```bash
   cd test-scripts
   npm install
   ```

2. Set up environment variables:

   ```bash
   # For Windows PowerShell
   $env:STRIPE_SECRET_KEY="your_stripe_test_secret_key"
   $env:STRIPE_PUBLIC_KEY="your_stripe_test_public_key"
   $env:API_URL="http://localhost:3000"  # Your API URL

   # For Windows CMD
   set STRIPE_SECRET_KEY=your_stripe_test_secret_key
   set STRIPE_PUBLIC_KEY=your_stripe_test_public_key
   set API_URL=http://localhost:3000
   ```

## Running Tests

### Test Stripe Integration

```bash
npm run test:stripe
```

This script will:

1. Create a Stripe payment intent
2. Display the client secret (which would be used in a real frontend)
3. List recent payment intents

### Test Marketplace API

```bash
npm run test:marketplace
```

This script will:

1. Prompt you to log in
2. Create a test listing
3. Fetch and display listings
4. Create a transaction (purchase)
5. Complete the transaction
6. Create a review

### Run All Tests

```bash
npm run test:all
```

## Important Notes

1. Always use Stripe test keys, never production keys
2. Test cards for Stripe:

   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

3. For more detailed testing instructions, refer to `testing-guide.md`

## Troubleshooting

- If you encounter authentication issues, make sure your JWT token is valid
- For Stripe errors, check the Stripe dashboard for more details
- Ensure your API is running and accessible at the URL specified in API_URL
