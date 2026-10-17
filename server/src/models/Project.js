import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 2000 },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['Assigned', 'In Progress', 'Submitted', 'Revision Requested', 'Approved'], default: 'Assigned' }
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
