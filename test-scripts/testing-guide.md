# Marketplace and Stripe Payment Testing Guide

## Prerequisites

Before testing, make sure you have:

1. A Stripe test account with API keys configured
2. Environment variables set up:
   - `STRIPE_SECRET_KEY` - Your Stripe secret key (use test key)
   - `STRIPE_PUBLIC_KEY` - Your Stripe publishable key (use test key)
   - `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret (for webhook testing)
3. At least two test user accounts (seller and buyer)
4. MongoDB database running

## 1. Manual Testing Flow

### 1.1 Testing Marketplace Listings

1. **Create a Static Course Listing**:

   - Log in as a seller user
   - Create a new static course listing with the following data:
     ```json
     {
       "title": "JavaScript Fundamentals Course",
       "description": "Comprehensive JavaScript course with downloadable materials",
       "skillName": "JavaScript",
       "proficiencyLevel": "Intermediate",
       "category": "Programming",
       "type": "course",
       "price": 50,
       "tags": ["programming", "web development"],
       "contentUrls": [
         "https://example.com/js-basics.pdf",
         "https://example.com/js-advanced.mp4"
       ],
       "contentDescription": "This course includes 5 PDFs and 3 video tutorials"
     }
     ```
   - Endpoint: `POST /marketplace/courses`
   - Expected result: Listing created successfully with status 201

2. **Create an Interactive Online Course Listing**:

   - Log in as a seller user
   - Create a new interactive online course listing with the following data:
     ```json
     {
       "title": "Live JavaScript Tutoring",
       "description": "One-on-one JavaScript tutoring sessions",
       "skillName": "JavaScript",
       "proficiencyLevel": "Expert",
       "category": "Programming",
       "type": "onlineCourse",
       "price": 75,
       "tags": ["programming", "web development", "live tutoring"],
       "location": "Zoom Meeting",
       "maxStudents": 5,
       "startDate": "2023-12-01",
       "endDate": "2023-12-15",
       "durationHours": 10
     }
     ```
   - Endpoint: `POST /marketplace/online-courses`
   - Expected result: Listing created successfully with status 201

3. **Browse All Listings**:

   - Fetch all listings
   - Endpoint: `GET /marketplace/listings`
   - Expected result: List of all active listings including both types

4. **Browse Static Course Listings**:

   - Fetch all static course listings
   - Endpoint: `GET /marketplace/courses`
   - Expected result: List of active static course listings

5. **Browse Interactive Online Course Listings**:

   - Fetch all interactive online course listings
   - Endpoint: `GET /marketplace/online-courses`
   - Expected result: List of active interactive online course listings

6. **Filter Listings**:

   - Test search functionality
   - Endpoint: `GET /marketplace/courses?search=JavaScript&minPrice=40&maxPrice=60`
   - Expected result: Filtered list containing your static course listing
   - Endpoint: `GET /marketplace/online-courses?search=JavaScript&minPrice=70&maxPrice=80`
   - Expected result: Filtered list containing your interactive online course listing

7. **View Listing Details**:
   - Get details of a specific listing
   - Endpoint: `GET /marketplace/listings/{listingId}`
   - Expected result: Complete details of the listing

### 1.2 Testing Stripe Payment Integration

1. **Add Funds to Wallet (Buyer)**:

   - Log in as a buyer user
   - Create a payment intent:
     - Endpoint: `POST /payments/create-intent`
     - Payload: `{ "amount": 100 }`
   - Expected result: Client secret and public key for Stripe
   - Complete the payment using Stripe test cards:
     - Use Stripe test card: `4242 4242 4242 4242` (successful payment)
     - Expiry: Any future date
     - CVC: Any 3 digits
     - ZIP: Any 5 digits
   - Process the payment:
     - Endpoint: `POST /payments/process`
     - Payload: `{ "paymentIntentId": "pi_...", "amount": 100 }`
   - Expected result: Wallet balance increased by 100

2. **Check Wallet Balance**:
   - Endpoint: `GET /payments/wallet`
   - Expected result: Wallet with balance of 100

### 1.3 Testing Marketplace Transactions

1. **Purchase a Static Course Listing**:

   - Log in as a buyer user
   - Create a transaction:
     - Endpoint: `POST /marketplace/transactions`
     - Payload: `{ "listingId": "static_course_listing_id_from_step_1" }`
   - Expected result:
     - Transaction created with status "pending"
     - Funds deducted from buyer's wallet
     - Listing status remains "active" (since static courses can be purchased multiple times)
     - Buyer gets immediate access to course content

2. **Purchase an Interactive Online Course Listing**:

   - Log in as a buyer user
   - Create a transaction:
     - Endpoint: `POST /marketplace/transactions`
     - Payload: `{ "listingId": "online_course_listing_id_from_step_2" }`
   - Expected result:
     - Transaction created with status "pending"
     - Funds deducted from buyer's wallet
     - Listing status changed to "sold" if maxStudents limit is reached
     - Buyer gets access to course details (meeting links, etc.)

3. **Complete the Transaction**:

   - Log in as a buyer user
   - Complete the transaction:
     - Endpoint: `PATCH /marketplace/transactions/{transactionId}/complete`
   - Expected result:
     - Transaction status changed to "completed"
     - Skill added to buyer's profile

4. **Check Seller's Wallet**:

   - Log in as the seller
   - Endpoint: `GET /payments/wallet`
   - Expected result: Wallet balance increased by the listing price (minus any platform fees)

5. **Leave a Review**:
   - Log in as the buyer
   - Create a review:
     - Endpoint: `POST /marketplace/reviews`
     - Payload: `{ "transactionId": "transaction_id", "rating": 5, "comment": "Great course content!" }`
   - Expected result: Review created successfully

## 2. Automated Testing

### 2.1 Unit Tests for Marketplace Service

Create unit tests for the MarketplaceService:

```typescript
// test/marketplace/marketplace.service.spec.ts
describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let mockListingModel: any;
  let mockTransactionModel: any;
  let mockReviewModel: any;
  let mockUsersService: any;
  let mockPaymentService: any;

  beforeEach(async () => {
    // Mock setup...

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        {
          provide: getModelToken(Listing.name),
          useValue: mockListingModel,
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(Review.name),
          useValue: mockReviewModel,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
  });

  it('should create a static course listing', async () => {
    // Test implementation...
  });

  it('should create an interactive online course listing', async () => {
    // Test implementation...
  });

  it('should get listings by type', async () => {
    // Test implementation...
  });

  it('should handle static course purchase correctly', async () => {
    // Test implementation...
  });

  it('should handle interactive online course purchase correctly', async () => {
    // Test implementation...
  });
});
```

### 2.2 Integration Tests for Marketplace Flow

Create integration tests for the complete marketplace flow:

```typescript
// test/marketplace/marketplace.e2e-spec.ts
describe('Marketplace Flow (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let staticCourseListingId: string;
  let onlineCourseListingId: string;
  let transactionId: string;

  beforeAll(async () => {
    // Setup app and get JWT token
  });

  it('should create a static course listing', async () => {
    // Test implementation...
  });

  it('should create an interactive online course listing', async () => {
    // Test implementation...
  });

  it('should get static course listings', async () => {
    // Test implementation...
  });

  it('should get interactive online course listings', async () => {
    // Test implementation...
  });

  it('should create a payment intent', async () => {
    // Test implementation...
  });

  it('should process a payment', async () => {
    // Test implementation...
  });

  it('should purchase a static course', async () => {
    // Test implementation...
  });

  it('should purchase an interactive online course', async () => {
    // Test implementation...
  });

  it('should complete a transaction', async () => {
    // Test implementation...
  });

  it('should create a review', async () => {
    // Test implementation...
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## 3. Testing Stripe Webhooks

1. **Install Stripe CLI**:

   - Download from: https://stripe.com/docs/stripe-cli
   - Login: `stripe login`

2. **Forward Webhooks**:

   ```bash
   stripe listen --forward-to http://localhost:3000/payments/webhook
   ```

3. **Trigger Test Events**:

   ```bash
   stripe trigger payment_intent.succeeded
   ```

4. **Check Application Logs**:
   - Verify webhook received and processed
   - Check database for payment record
   - Verify wallet balance updated

## 4. Common Test Scenarios

1. **Successful Static Course Purchase Flow**:

   - Create static course listing → Add funds to wallet → Purchase course → Get immediate access to content

2. **Successful Interactive Online Course Purchase Flow**:

   - Create interactive online course listing → Add funds to wallet → Purchase course → Get access to course details

3. **Failed Payment Flow**:

   - Use test card `4000 0000 0000 0002` (decline)
   - Verify error handling

4. **Insufficient Funds**:

   - Attempt to purchase listing with insufficient wallet balance
   - Verify transaction fails with appropriate error

5. **Student Limit Reached for Interactive Course**:

   - Have multiple buyers purchase the same interactive online course until maxStudents is reached
   - Verify subsequent purchases are rejected with appropriate error
   - Verify listing status changes to "sold" when limit is reached

6. **Multiple Purchases of Static Course**:

   - Have multiple buyers purchase the same static course
   - Verify all purchases succeed
   - Verify listing status remains "active"

7. **Refund Flow**:
   - Process a refund through Stripe Dashboard
   - Verify webhook handling updates transaction status

## 5. Troubleshooting

1. **Payment Intent Creation Fails**:

   - Check Stripe API keys
   - Verify amount is valid (>0 and properly formatted)
   - Check Stripe Dashboard for errors

2. **Webhook Events Not Processing**:

   - Verify webhook secret is correct
   - Check webhook endpoint is accessible
   - Verify signature verification

3. **Static Course Content Not Accessible**:

   - Verify contentUrls are valid and accessible
   - Check permissions on content files
   - Verify transaction was completed successfully

4. **Interactive Online Course Purchase Issues**:

   - Check if maxStudents limit has been reached
   - Verify startDate and endDate are valid
   - Check if the course has already started

5. **Transaction Processing Issues**:
   - Check wallet balances
   - Verify listing status
   - Check for race conditions in transaction processing
