import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'member'], default: 'member', required: true },
  title: { type: String, default: 'Team Member', maxlength: 80 }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
