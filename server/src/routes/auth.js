import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

function setSession(res, user) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('taskflow_token', token, cookieOptions());
}
const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, title: user.title });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || name.trim().length > 80) return res.status(400).json({ message: 'Enter a name up to 80 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
      return res.status(400).json({ message: 'Password must be between 10 and 128 characters.' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: 'member' });
    setSession(res, user);
    res.status(201).json({ user: safeUser(user) });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = req.body.password;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    setSession(res, user);
    res.json({ user: safeUser(user) });
  } catch (err) { next(err); }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('taskflow_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.json({ message: 'Signed out.' });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));

export default router;
