import Account from '../models/Account.model.js';
import { v4 as uuidv4 } from 'uuid';


export async function createAccount(req, res) {
const existing = await Account.findOne({ user: req.user.id });
if (existing) return res.status(400).json({ error: 'Account already exists' });
const accountNumber = uuidv4().replace(/-/g, '').slice(0, 12);
const account = await Account.create({ user: req.user.id, accountNumber, balance: 0 });
return res.status(201).json(account);
}


export async function myAccounts(req, res) {
const accounts = await Account.find({ user: req.user.id });
return res.json(accounts);
}


export async function getAccountById(req, res) {
const acc = await Account.findOne({ _id: req.params.id, user: req.user.id });
if (!acc) return res.status(404).json({ error: 'Not found' });
return res.json(acc);
}