import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  link: { type: String, required: true, trim: true, maxlength: 500 },
  notes: { type: String, default: '', maxlength: 3000 },
  status: { type: String, enum: ['Pending Review', 'Approved', 'Revision Requested'], default: 'Pending Review' },
  feedback: { type: String, default: '', maxlength: 3000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Submission', submissionSchema);
