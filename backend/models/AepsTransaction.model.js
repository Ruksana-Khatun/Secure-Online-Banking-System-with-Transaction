import mongoose from "mongoose";

const aepsTransactionSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AepsAgent",
    required: true,
  },
  customerAadhaar: {
    type: String,
    required: true,
    trim: true,
  },
  customerMobile: {
    type: String,
    required: true,
    trim: true,
  },
  bankAccountNo: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
    max: 10000, // Maximum withdrawal limit
  },
  transactionType: {
    type: String,
    enum: ["CASH_WITHDRAWAL", "BALANCE_ENQUIRY"],
    default: "CASH_WITHDRAWAL",
  },
  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
    default: "PENDING",
  },
  outletId: {
    type: String,
    required: true,
  },
  ekoTransactionId: String,
  clientRefId: {
    type: String,
    required: true,
    unique: true,
    index: true,  // Keep only one definition
  },
  commission: {
    type: Number,
    default: 0,
  },
  bankName: String,
  bankResponse: mongoose.Schema.Types.Mixed,
  failureReason: String,
  fingerprintData: String,
  otpVerified: {
    type: Boolean,
    default: false,
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
});

// Update the updatedAt field before saving
aepsTransactionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.status === "SUCCESS" || this.status === "FAILED") {
    this.completedAt = new Date();
  }
  next();
});

// Create index for faster queries
aepsTransactionSchema.index({ agentId: 1 });
aepsTransactionSchema.index({ customerMobile: 1 });
aepsTransactionSchema.index({ status: 1 });
// clientRefId index already defined in schema, no need to duplicate
aepsTransactionSchema.index({ ekoTransactionId: 1 });
aepsTransactionSchema.index({ createdAt: -1 });

// Generate unique client reference ID
aepsTransactionSchema.statics.generateClientRefId = function () {
  return `AEPS_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

// Calculate commission (2% of transaction amount)
aepsTransactionSchema.methods.calculateCommission = function () {
  this.commission = this.amount * 0.02;
  return this.commission;
};

const AepsTransaction = mongoose.model("AepsTransaction", aepsTransactionSchema);

export default AepsTransaction;
