import mongoose from 'mongoose';
import Account from '../models/Account.model.js';
import Transaction from '../models/Transaction.model.js';
export async function transfer(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { fromAccountId, toAccountNumber, amount, idempotencyKey } = req.body;

    const from = await Account.findOne({ _id: fromAccountId, user: req.user.id }).session(session);
    const to = await Account.findOne({ accountNumber: toAccountNumber }).session(session);

    if (!from || !to) throw new Error('Account not found');
    if (from.status !== 'ACTIVE' || to.status !== 'ACTIVE') throw new Error('Account blocked');
    if (from.balance < amount) throw new Error('Insufficient funds');

    from.balance -= amount;
    to.balance += amount;

    await from.save({ session });
    await to.save({ session });

    const tx = await Transaction.create([{
      fromAccount: from._id,
      toAccount: to._id,
      amount,
      type: 'TRANSFER',
      status: 'SUCCESS',
      initiatedBy: req.user.id,
      idempotencyKey
    }], { session });

    await session.commitTransaction();
    return res.status(201).json({ message: 'Transfer success', tx });
  } catch (e) {
    await session.abortTransaction();
    return res.status(400).json({ error: e.message });
  } finally {
    session.endSession();
  }
}

export async function history(req, res) {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const tx = await Transaction.find({ initiatedBy: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('fromAccount toAccount');

  return res.json(tx);
}
