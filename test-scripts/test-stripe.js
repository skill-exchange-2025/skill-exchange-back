// test-stripe.js
// A simple script to test Stripe integration directly

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeIntegration() {
  try {
    console.log('Testing Stripe integration...');

    // 1. Create a payment intent
    console.log('Creating payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00 in cents
      currency: 'tnd',
      payment_method_types: ['card'],
      metadata: {
        userId: 'test-user-id',
      },
    });

    console.log(`Payment intent created with ID: ${paymentIntent.id}`);
    console.log(`Client secret: ${paymentIntent.client_secret}`);

    // 2. Simulate a successful payment (in a real scenario, this would be done on the client)
    console.log(
      '\nIn a real application, the client would use the client secret to complete the payment.'
    );
    console.log(
      'You can use the following test card details in your frontend:'
    );
    console.log('Card number: 4242 4242 4242 4242');
    console.log('Expiry: Any future date');
    console.log('CVC: Any 3 digits');

    // 3. Retrieve the payment intent to check its status
    console.log('\nRetrieving payment intent...');
    const retrievedIntent = await stripe.paymentIntents.retrieve(
      paymentIntent.id
    );
    console.log(`Payment intent status: ${retrievedIntent.status}`);

    // 4. List recent payment intents
    console.log('\nListing recent payment intents...');
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 3,
    });

    console.log(`Found ${paymentIntents.data.length} recent payment intents:`);
    paymentIntents.data.forEach((pi, index) => {
      console.log(
        `${index + 1}. ID: ${pi.id}, Amount: ${pi.amount / 100} ${pi.currency}, Status: ${pi.status}`
      );
    });

    console.log('\nStripe integration test completed successfully!');
    console.log(
      'Note: To fully test the payment flow, you need to implement the client-side payment confirmation.'
    );
  } catch (error) {
    console.error('Error testing Stripe integration:', error);
  }
}

// Check if Stripe key is configured
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY environment variable is not set.');
  console.log('Please set it by running:');
  console.log(
    '  set STRIPE_SECRET_KEY=your_stripe_secret_key     # For Windows CMD'
  );
  console.log(
    '  $env:STRIPE_SECRET_KEY="your_stripe_secret_key"  # For Windows PowerShell'
  );
  process.exit(1);
}

// Run the test
testStripeIntegration();
