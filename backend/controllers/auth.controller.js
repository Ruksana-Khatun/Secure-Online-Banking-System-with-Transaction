import bcrypt from 'bcrypt';
import User from '../models/User.model.js';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../utils/token.js';
import { z } from 'zod';


const registerSchema = z.object({
fullName: z.string().min(2),
email: z.string().email(),
password: z.string().min(6)
});


export async function register(req, res) {
try {
const { fullName, email, password } = registerSchema.parse(req.body);
const exists = await User.findOne({ email });
if (exists) return res.status(409).json({ error: 'Email already registered' });
const passwordHash = await bcrypt.hash(password, 12);
const user = await User.create({ fullName, email, passwordHash });
return res.status(201).json({ id: user._id, email: user.email });
} catch (e) {
return res.status(400).json({ error: e.errors?.[0]?.message || e.message });
}
}


const loginSchema = z.object({ email: z.string().email(), password: z.string() });


export async function login(req, res) {
try {
const { email, password } = loginSchema.parse(req.body);
const user = await User.findOne({ email });
if (!user) return res.status(401).json({ error: 'Invalid credentials' });
const ok = await bcrypt.compare(password, user.passwordHash);
if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
const accessToken = signAccessToken({ id: user._id, role: user.role });
const refreshToken = signRefreshToken({ id: user._id });
return res.json({ accessToken, refreshToken, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });
} catch (e) {
return res.status(400).json({ error: e.errors?.[0]?.message || e.message });
}
}


export async function refresh(req, res) {
try {
const { token } = req.body;
const decoded = verifyRefresh(token);
const accessToken = signAccessToken({ id: decoded.id, role: decoded.role });
return res.json({ accessToken });
} catch (e) {
return res.status(401).json({ error: 'Invalid refresh token' });
}
}