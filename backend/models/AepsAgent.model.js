import mongoose from "mongoose";

const aepsAgentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  companyBankName:  { type: String, required: true, trim: true },
  bankHolderName:   { type: String, required: true, trim: true },
  bankAccountNo:    { type: String, required: true, trim: true },
  ifscCode:  { type: String, required: true, uppercase: true, trim: true },
  email:     { type: String, required: true, lowercase: true, trim: true },
  mobile:    { type: String, required: true, trim: true },
  gstNumber: { type: String, trim: true },
  panNumber:     { type: String, required: true, uppercase: true, trim: true },
  aadhaarNumber: { type: String, required: true, trim: true },
  state:   { type: String, required: true, trim: true },
  city:    { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  shopName: { type: String, required: true, trim: true },

  outletId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },


  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "FAILED"],
    default: "PENDING",
  },


  kycStatus: {
    type: String,
    enum: ["PENDING", "DONE"],
    default: "PENDING",
  },

  ekoAgentId: { type: String },          
  apiResponse: { type: mongoose.Schema.Types.Mixed }, 
}, { timestamps: true }); 


// Indexes
aepsAgentSchema.index({ userId: 1 });
aepsAgentSchema.index({ mobile: 1 });
aepsAgentSchema.index({ email: 1 });
aepsAgentSchema.index({ status: 1 });

const AepsAgent = mongoose.model("AepsAgent", aepsAgentSchema);
export default AepsAgent;