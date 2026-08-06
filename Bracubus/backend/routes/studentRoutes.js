const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

router.put('/:studentId/plan', async (req, res) => {
  try {
    const { plan_name, plan_fare, plan_route_id, plan_route_name, plan_stoppage_id, plan_stoppage_name, plan_expires_at } = req.body;

    // Guard: block plan changes while a paid plan is still active
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const hasPaidPlan = student.plan_name === 'One Way' || student.plan_name === 'Round Trip';
    const planIsActive = hasPaidPlan && student.plan_expires_at && new Date() < new Date(student.plan_expires_at);

    if (planIsActive) {
      const expiry = new Date(student.plan_expires_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      return res.status(403).json({
        error: `Your ${student.plan_name} plan is active until ${expiry}. You cannot change your plan until it expires.`
      });
    }

    const updated = await Student.findOneAndUpdate(
      { studentId: req.params.studentId },
      { plan_name, plan_fare, plan_route_id, plan_route_name, plan_stoppage_id, plan_stoppage_name, plan_expires_at },
      { new: true }
    );
    res.json({ message: 'Plan updated', student: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ← new: dismiss an announcement
router.patch('/:studentId/dismiss-announcement', async (req, res) => {
  try {
    const { announcementId } = req.body;
    const student = await Student.findOneAndUpdate(
      { studentId: req.params.studentId },
      { $addToSet: { dismissedAnnouncements: announcementId } },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json({ message: 'Announcement dismissed', dismissedAnnouncements: student.dismissedAnnouncements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ← new: get dismissed announcements
router.get('/:studentId/dismissed-announcements', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json({ dismissedAnnouncements: student.dismissedAnnouncements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student profile
router.get('/:studentId', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;