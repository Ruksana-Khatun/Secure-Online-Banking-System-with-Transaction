import mongoose from 'mongoose';

const ppiWalletSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true,
    index: true 
  },
  customerId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  mobile: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    default: '' 
  },
  
  // Wallet Limits (as per RBI guidelines for PPI)
  monthlyLimit: { 
    type: Number, 
    default: 25000,  // ₹25,000 monthly limit for semi-closed PPI
    min: 0 
  },
  remainingLimit: { 
    type: Number, 
    default: 25000,  // Start with full limit
    min: 0 
  },
  
  // KYC Status
  kycStatus: { 
    type: String, 
    enum: ['MIN', 'FULL'], 
    default: 'MIN' 
  },
  
  // Account Status
  status: { 
    type: String, 
    enum: ['ACTIVE', 'SUSPENDED', 'BLOCKED'], 
    default: 'ACTIVE' 
  },
  
  // Last monthly reset date
  lastResetDate: { 
    type: Date, 
    default: Date.now 
  },
  
  // Additional metadata from provider
  providerData: { 
    type: mongoose.Schema.Types.Mixed 
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
ppiWalletSchema.index({ user: 1, status: 1 });
ppiWalletSchema.index({ customerId: 1, status: 1 });

// Method to check and reset monthly limit
ppiWalletSchema.methods.resetMonthlyLimitIfNeeded = function() {
  const now = new Date();
  const lastReset = this.lastResetDate;
  
  // Reset if more than a month has passed
  if (now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    this.remainingLimit = this.monthlyLimit;
    this.lastResetDate = now;
    return true;
  }
  return false;
};

// Method to check if transaction is possible
ppiWalletSchema.methods.canTransact = function(amount) {
  this.resetMonthlyLimitIfNeeded();
  return this.remainingLimit >= amount && this.status === 'ACTIVE';
};

// Method to deduct balance
ppiWalletSchema.methods.deductBalance = function(amount) {
  if (!this.canTransact(amount)) {
    throw new Error('Insufficient balance or wallet not active');
  }
  this.remainingLimit -= amount;
  return this.save();
};

// Static method to find or create wallet
ppiWalletSchema.statics.findOrCreate = async function(userData) {
  const { user, customerId, mobile, name } = userData;
  
  let wallet = await this.findOne({ 
    $or: [{ user }, { customerId }] 
  });
  
  if (!wallet) {
    wallet = await this.create({
      user,
      customerId,
      mobile,
      name: name || ''
    });
  }
  
  return wallet;
};

export default mongoose.model('PpiWallet', ppiWalletSchema);
