import { Router } from 'express';
import mongoose from 'mongoose';
import Submission from '../models/Submission.js';
import Project from '../models/Project.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { submittedBy: req.user._id };
    const submissions = await Submission.find(filter)
      .populate('project', 'title status dueDate assignedTo')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ submissions });
  } catch (err) { next(err); }
});

router.patch('/:id/review', requireRole('admin'), async (req, res, next) => {
  try {
    const { status, feedback = '' } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid submission ID.' });
    if (!['Approved', 'Revision Requested'].includes(status)) return res.status(400).json({ message: 'Choose Approved or Revision Requested.' });
    if (String(feedback).length > 3000) return res.status(400).json({ message: 'Feedback is too long.' });
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    submission.status = status;
    submission.feedback = String(feedback);
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();
    const project = await Project.findById(submission.project);
    if (project) project.status = status === 'Approved' ? 'Approved' : 'Revision Requested';
    if (project) await project.save();
    const populated = await Submission.findById(submission._id).populate('project', 'title status dueDate').populate('submittedBy', 'name email').populate('reviewedBy', 'name');
    res.json({ submission: populated });
  } catch (err) { next(err); }
});
export default router;
