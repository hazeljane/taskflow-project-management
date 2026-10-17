import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in .env');
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');

await mongoose.connect(process.env.MONGO_URI);
const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
const user = await User.findOneAndUpdate(
  { email },
  { $set: { name: process.env.ADMIN_NAME || 'TaskFlow Admin', email, passwordHash, role: 'admin', title: 'Administrator' } },
  { upsert: true, new: true, runValidators: true }
);
console.log(`Admin account ready: ${user.email}`);
await mongoose.disconnect();
