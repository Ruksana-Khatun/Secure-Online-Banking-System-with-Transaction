import jwt from 'jsonwebtoken';


export const signAccessToken = (payload) => jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
export const signRefreshToken = (payload) => jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
export const verifyAccess = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);
export const verifyRefresh = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);