import { Router } from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Submission from '../models/Submission.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const populateProject = (query) => query.populate('assignedTo', 'name email title').populate('createdBy', 'name email');

router.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };
    const projects = await populateProject(Project.find(filter).sort({ updatedAt: -1 }));
    res.json({ projects });
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { title, description = '', assignedTo, dueDate, priority = 'Medium' } = req.body;
    if (!title?.trim() || title.trim().length > 120) return res.status(400).json({ message: 'Project title is required (max 120 characters).' });
    if (!mongoose.isValidObjectId(assignedTo)) return res.status(400).json({ message: 'Choose a valid team member.' });
    const member = await User.findOne({ _id: assignedTo, role: 'member' });
    if (!member) return res.status(400).json({ message: 'Assigned user was not found.' });
    if (!dueDate || Number.isNaN(Date.parse(dueDate))) return res.status(400).json({ message: 'Choose a valid due date.' });
    if (!['Low', 'Medium', 'High'].includes(priority)) return res.status(400).json({ message: 'Invalid priority.' });
    const project = await Project.create({ title: title.trim(), description, assignedTo, dueDate: new Date(dueDate), priority, createdBy: req.user._id });
    res.status(201).json({ project: await populateProject(Project.findById(project._id)) });
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { title, description, assignedTo, dueDate, priority, status } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (title !== undefined) project.title = String(title).trim().slice(0, 120);
    if (description !== undefined) project.description = String(description).slice(0, 2000);
    if (assignedTo !== undefined) {
      if (!mongoose.isValidObjectId(assignedTo) || !await User.exists({ _id: assignedTo, role: 'member' })) return res.status(400).json({ message: 'Choose a valid team member.' });
      project.assignedTo = assignedTo;
    }
    if (dueDate !== undefined && !Number.isNaN(Date.parse(dueDate))) project.dueDate = new Date(dueDate);
    if (priority !== undefined && ['Low', 'Medium', 'High'].includes(priority)) project.priority = priority;
    if (status !== undefined && ['Assigned', 'In Progress', 'Submitted', 'Revision Requested', 'Approved'].includes(status)) project.status = status;
    await project.save();
    res.json({ project: await populateProject(Project.findById(project._id)) });
  } catch (err) { next(err); }
});

router.patch('/:id/progress', requireRole('member'), async (req, res, next) => {
  try {
    const progress = Number(req.body.progress);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) return res.status(400).json({ message: 'Progress must be a whole number from 0 to 100.' });
    const project = await Project.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!project) return res.status(404).json({ message: 'Assigned project not found.' });
    if (['Submitted', 'Approved'].includes(project.status)) return res.status(400).json({ message: 'Progress cannot be changed while submitted or after approval.' });
    project.progress = progress;
    project.status = progress > 0 ? 'In Progress' : 'Assigned';
    await project.save();
    res.json({ project: await populateProject(Project.findById(project._id)) });
  } catch (err) { next(err); }
});

router.post('/:id/submissions', requireRole('member'), async (req, res, next) => {
  try {
    const { link, notes = '' } = req.body;
    let parsed;
    try { parsed = new URL(link); } catch { return res.status(400).json({ message: 'Enter a valid project URL.' }); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ message: 'Submission URL must use HTTP or HTTPS.' });
    const project = await Project.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!project) return res.status(404).json({ message: 'Assigned project not found.' });
    if (project.status === 'Approved') return res.status(400).json({ message: 'This project has already been approved.' });
    const submission = await Submission.create({ project: project._id, submittedBy: req.user._id, link: parsed.toString(), notes: String(notes).slice(0, 3000) });
    project.status = 'Submitted';
    project.progress = 100;
    await project.save();
    res.status(201).json({ submission, project: await populateProject(Project.findById(project._id)) });
  } catch (err) { next(err); }
});

export default router;
