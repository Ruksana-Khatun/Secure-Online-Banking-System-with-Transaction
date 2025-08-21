import mongoose from 'mongoose';


const accountSchema = new mongoose.Schema({
user: {type: mongoose.Schema.Types.ObjectId, ref: 'User',required: true, index: true },
accountNumber: { type: String, required: true, unique: true },
balance: { type: Number, default: 0 },
currency: { type: String, default: 'INR' },
status: { type: String, enum: ['ACTIVE', 'BLOCKED'], default: 'ACTIVE' },
}, { timestamps: true });


export default mongoose.model('Account', accountSchema);