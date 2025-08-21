import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
fullName: { type: String, trim: true },
email: { type: String, unique: true, required: true, lowercase: true, index: true },
passwordHash: { type: String, required: true },
role: { type: String, enum: ['USER', 'ADMIN'], default: 'ADMIN' },
twoFactorEnabled: { type: Boolean, default: false },
twoFactorMethod: { type: String, enum: ["EMAIL"], default: "EMAIL" }, // simple email OTP
require2FAForTransfers: { type: Boolean, default: true },
status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },

isActive: { type: Boolean, default: true },
}, { timestamps: true });


export default mongoose.model('User', userSchema);