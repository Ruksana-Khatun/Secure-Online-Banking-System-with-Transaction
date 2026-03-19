# 🚀 AEPS Cash Withdrawal System - Complete Implementation

A comprehensive **Aadhaar Enabled Payment System (AEPS)** built with React and Node.js for providing cash withdrawal services with biometric authentication.

## 📋 Features Overview

### 🏠 Complete User Flow
1. **Registration Form** - Multi-step agent registration with validation
2. **Pending Approval** - Auto-check status every 30 seconds
3. **Admin Approval** - Auto-generate Outlet ID (OT_XXXXXX)
4. **Success Popup** - Display outlet ID with copy functionality
5. **OTP Verification** - Mobile number verification
6. **KYC Process** - Fingerprint + document upload
7. **Biometric Verification** - Aadhaar + fingerprint scan
8. **Cash Withdrawal** - Complete withdrawal process

### 🎯 Key Features
- ✅ **Multi-step Registration** with form validation
- ✅ **Real-time Status Updates** with auto-refresh
- ✅ **Biometric Authentication** (mock mode supported)
- ✅ **Document Upload** (Aadhaar, PAN cards)
- ✅ **Cash Withdrawal** with commission calculation
- ✅ **Transaction History** with filtering and statistics
- ✅ **Admin Panel** for agent approval
- ✅ **Mock Mode** for testing without real devices

---

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication and authorization
- **EKO API** - External payment provider

### Frontend
- **React 18** - Modern UI framework
- **Ant Design** - Professional UI components
- **Axios** - HTTP client for API calls
- **React Router** - Navigation and routing

### Security
- **Role-based access control** (AGENT/ADMIN)
- **JWT authentication** with token validation
- **Input validation** and sanitization
- **Error handling** and logging

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- MongoDB running locally
- Backend server running on port 3000

### 1. Environment Setup

#### Backend .env file:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/banking-system
JWT_SECRET=your-super-secret-jwt-key

# EKO API Credentials
EKO_BASE_URL=https://staging.eko.in:25004
INITIATOR_ID=9962981729
DEVELOPER_KEY=becbbce45f79c6f5109f848acd540567

# Mock Mode (for testing)
USE_AEPS_MOCK=true
USE_PPI_MOCK=true
```

### 2. Start Backend Server
```bash
cd backend
npm run dev
```

### 3. Start Frontend
```bash
cd fronted/vite-project
npm run dev
```

---

## 📱 API Endpoints

### Agent Management
```bash
POST /api/aeps/agent/register        # Register new agent
GET  /api/aeps/agent/profile         # Get agent profile
GET  /api/aeps/agent/status/:id       # Check agent status
```

### Authentication
```bash
POST /api/aeps/send-otp              # Send OTP to mobile
POST /api/aeps/authenticate          # Verify OTP
```

### Transactions
```bash
POST /api/aeps/withdrawal            # Process cash withdrawal
GET  /api/aeps/transactions         # Get transaction history
GET  /api/aeps/reports/commission    # Commission report
```

### Admin Routes
```bash
PUT  /api/aeps/admin/agents/:id/approve # Approve agent
GET  /api/aeps/admin/agents           # List all agents
```

---

## 🎯 Complete Testing Guide

### Step 1: Register as Agent
```bash
POST /api/aeps/agent/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "mobile": "9999999999",
  "panNumber": "ABCDE1234F",
  "aadhaarNumber": "123456789012",
  "bankAccountNo": "1234567890",
  "ifscCode": "HDFC0001234",
  "companyBankName": "HDFC Bank",
  "shopName": "John's Store",
  "state": "Maharashtra",
  "city": "Mumbai",
  "pincode": "400001",
  "address": "123 Main Street"
}
```

### Step 2: Admin Approval (in Admin Panel)
```bash
PUT /api/admin/agents/:id/approve
# Auto-generates: OT_123456
```

### Step 3: OTP Verification
```bash
POST /api/aeps/send-otp
{
  "mobile": "9999999999"
}

POST /api/aeps/authenticate
{
  "mobile": "9999999999",
  "otp": "123456"  # Mock OTP
}
```

### Step 4: Complete KYC
- Upload Aadhaar card (mock)
- Upload PAN card (mock)
- Fingerprint verification (mock)

### Step 5: Cash Withdrawal
```bash
POST /api/aeps/withdrawal
{
  "customerAadhaar": "123456789012",
  "customerMobile": "9999999999",
  "bankAccountNo": "1234567890",
  "amount": 1000,
  "fingerprintData": "MOCK_FINGER_DATA"
}
```

### Step 6: Verify Transaction
```bash
GET /api/aeps/transactions
# Should show the successful transaction
```

---

## 🎨 Frontend Components

### 1. AepsRegistration.jsx
- **Multi-step form** with validation
- **Progress indicator** with 4 steps
- **Real-time validation** for all fields
- **Auto-save** form data between steps

### 2. AepsPendingApproval.jsx
- **Auto-refresh** every 30 seconds
- **Progress bar** showing approval status
- **Success popup** with outlet ID
- **Copy functionality** for outlet ID

### 3. AepsOtpVerification.jsx
- **Mobile number input** with validation
- **OTP input** with 6-digit format
- **Countdown timer** for resend OTP
- **Mock OTP**: 123456

### 4. AepsKyc.jsx
- **3-step KYC process**
- **Fingerprint simulation**
- **Document upload** (drag & drop)
- **Verification summary**

### 5. AepsWithdrawal.jsx
- **Customer details form**
- **Fingerprint verification**
- **Amount validation** (₹100 - ₹10,000)
- **Success receipt** with details

### 6. AepsTransactionHistory.jsx
- **Transaction table** with pagination
- **Statistics cards** showing totals
- **Filter by status** and date range
- **Export functionality**

---

## 📊 Database Models

### AepsAgent Model
```javascript
{
  userId: ObjectId,
  firstName: String,
  lastName: String,
  companyBankName: String,
  bankHolderName: String,
  bankAccountNo: String,
  ifscCode: String,
  email: String,
  mobile: String,
  gstNumber: String,
  panNumber: String,
  aadhaarNumber: String,
  state: String,
  city: String,
  address: String,
  pincode: String,
  shopName: String,
  outletId: String,        // Auto-generated: OT_XXXXXX
  status: String,          // PENDING, APPROVED, REJECTED
  kycStatus: String,       // PENDING, DONE
  createdAt: Date,
  updatedAt: Date
}
```

### AepsTransaction Model
```javascript
{
  agentId: ObjectId,
  customerAadhaar: String,
  customerMobile: String,
  bankAccountNo: String,
  amount: Number,
  transactionType: String,  // CASH_WITHDRAWAL, BALANCE_ENQUIRY
  status: String,          // PENDING, SUCCESS, FAILED, REFUNDED
  outletId: String,
  ekoTransactionId: String,
  clientRefId: String,
  commission: Number,      // 2% of amount
  fingerprintData: String,
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date
}
```

---

## 🔧 Mock Mode Features

### Fingerprint Verification
```javascript
// Use this for testing
const fingerprintData = "MOCK_FINGER_DATA";
```

### OTP Verification
```javascript
// Test OTP for all mobile numbers
const testOtp = "123456";
```

### EKO API Mock Responses
```javascript
// Agent Registration
{
  success: true,
  data: {
    agent_id: "AGENT_123456",
    status: "PENDING"
  }
}

// Cash Withdrawal
{
  success: true,
  data: {
    transaction_id: "TXN_123456",
    status: "SUCCESS",
    amount: 1000,
    commission: 20
  }
}
```

---

## 🎯 Testing Scenarios

### Scenario 1: Complete Agent Registration
1. Fill registration form with valid data
2. Submit for admin approval
3. Check pending status page
4. Admin approves in admin panel
5. Receive outlet ID notification

### Scenario 2: Cash Withdrawal Process
1. Login as approved agent
2. Complete OTP verification
3. Complete KYC process
4. Perform cash withdrawal
5. Verify transaction in history

### Scenario 3: Error Handling
1. Test invalid mobile numbers
2. Test invalid OTP
3. Test insufficient funds
4. Test fingerprint failure
5. Test network errors

---

## 🔐 Security Features

### Authentication
- **JWT tokens** for all API calls
- **Role-based access** (AGENT/ADMIN)
- **Session management** with expiration
- **Password hashing** with bcrypt

### Data Validation
- **Input sanitization** for all forms
- **Phone number validation** (10-digit)
- **Aadhaar validation** (12-digit)
- **PAN card validation** (format check)
- **Amount limits** (₹100 - ₹10,000)

### API Security
- **Rate limiting** on all endpoints
- **CORS configuration** for frontend
- **Helmet.js** for security headers
- **Request size limits**

---

## 📱 Frontend Routes

### AEPS Routes
```javascript
/aeps/register           # Agent registration
/aeps/pending            # Pending approval
/aeps/otp-verification   # OTP verification
/aeps/kyc                # KYC process
/aeps/withdrawal         # Cash withdrawal
/aeps/transactions       # Transaction history
/aeps/commission-report  # Commission report
```

### Admin Routes
```javascript
/admin/aeps-agents       # Manage AEPS agents
/admin/aeps-approve      # Approve agents
```

---

## 🎨 UI Features

### Design System
- **Ant Design** components
- **Responsive design** for all screen sizes
- **Dark theme** support
- **Loading states** for all async operations
- **Error boundaries** for graceful failures

### User Experience
- **Progress indicators** for multi-step forms
- **Real-time validation** feedback
- **Auto-save** form data
- **Copy to clipboard** functionality
- **Mobile-friendly** interface

---

## 🔄 Commission Calculation

### Commission Structure
```javascript
// 2% commission on all successful transactions
const commission = amount * 0.02;

// Example:
// ₹1000 withdrawal → ₹20 commission
// ₹5000 withdrawal → ₹100 commission
// ₹10000 withdrawal → ₹200 commission
```

### Commission Reporting
- **Daily commission totals**
- **Monthly commission reports**
- **Agent-wise commission tracking**
- **Transaction-wise commission details**

---

## 🚨 Error Handling

### Common Errors
```javascript
// Registration Errors
"Agent already exists"
"Invalid mobile number"
"PAN number already registered"

// Transaction Errors
"Insufficient balance"
"Invalid fingerprint"
"Transaction failed"

// System Errors
"EKO API error"
"Database connection failed"
"Authentication required"
```

### Error Recovery
- **Retry mechanisms** for failed requests
- **Fallback to mock mode** on API failures
- **User-friendly error messages**
- **Logging for debugging**

---

## 📊 Performance Optimization

### Database Optimization
- **Indexes** on frequently queried fields
- **Pagination** for large datasets
- **Connection pooling** for MongoDB
- **Query optimization** for transactions

### Frontend Optimization
- **Lazy loading** for components
- **Debounced search** inputs
- **Cached API responses**
- **Optimized re-renders**

---

## 🎯 Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://prod-server/banking-system
JWT_SECRET=super-secure-production-secret

# EKO Production API
EKO_BASE_URL=https://eko.in:25004
INITIATOR_ID=production_initiator_id
DEVELOPER_KEY=production_developer_key

# Disable mock mode in production
USE_AEPS_MOCK=false
USE_PPI_MOCK=false
```

### Deployment Steps
1. **Build frontend** for production
2. **Set up MongoDB** cluster
3. **Configure environment** variables
4. **Deploy backend** to server
5. **Set up reverse proxy** (nginx)
6. **Enable SSL** certificate
7. **Monitor performance** and logs

---

## 📞 Support and Troubleshooting

### Common Issues
1. **Server not starting** - Check MongoDB connection
2. **API errors** - Verify environment variables
3. **Frontend not loading** - Check CORS configuration
4. **Mock mode not working** - Set USE_AEPS_MOCK=true

### Debug Mode
```bash
# Enable debug logging
DEBUG=aeps:* npm run dev

# Check MongoDB connection
node -e "require('./models/AepsAgent.model.js')"

# Test API endpoints
curl http://localhost:3000/api/aeps/agent/profile
```

### Support Contact
- **Email**: support@aeps.com
- **Phone**: +91-XXXXXX-XXXXX
- **Documentation**: https://docs.aeps.com
- **GitHub Issues**: https://github.com/aeps-system/issues

---

## 🎉 Ready to Use!

Your **AEPS Cash Withdrawal System** is now complete with:

- ✅ **Complete user flow** from registration to withdrawal
- ✅ **Admin panel** for agent management
- ✅ **Mock mode** for testing without real devices
- ✅ **Real-time updates** and notifications
- ✅ **Commission tracking** and reporting
- ✅ **Secure authentication** and authorization
- ✅ **Responsive design** for all devices
- ✅ **Error handling** and recovery

**Start providing AEPS cash withdrawal services today!** 🚀
