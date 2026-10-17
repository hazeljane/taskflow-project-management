import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
router.get('/', async (_req, res, next) => {
  try {
    const users = await User.find({ role: 'member' }).select('name email role title createdAt').sort({ name: 1 });
    res.json({ users: users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, title: u.title, createdAt: u.createdAt })) });
  } catch (err) { next(err); }
});
export default router;
