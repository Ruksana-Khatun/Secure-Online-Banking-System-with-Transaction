import mongoose from 'mongoose';


const transactionSchema = new mongoose.Schema({
fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
amount: { type: Number, required: true, min: 0.01 },
type: { type: String, enum: ['TRANSFER', 'DEPOSIT', 'WITHDRAWAL'], required: true },
status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
idempotencyKey: { type: String, index: true },
meta: { type: Object }
}, { timestamps: true });


export default mongoose.model('Transaction', transactionSchema);