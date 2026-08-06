const Student = require('../models/Student');
const bcrypt = require('bcrypt');
const Notification = require('../models/Notification');

async function register(req, res) {
  try {
    const { studentId, name, email, password, department, semester } = req.body;

    const existing = await Student.findOne({
      $or: [{ studentId }, { email }]
    });
    if (existing) {
      return res.status(400).json({ error: 'Student ID or email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = new Student({
      studentId,
      name,
      email,
      password: hashedPassword,
      department,
      semester,
      subscriptionPlan: 'No Plan'
    });

    await student.save();
    res.status(201).json({
      message: 'Registered successfully',
      studentId: student.studentId,
      name: student.name,
      subscriptionPlan: student.subscriptionPlan
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { studentId, password } = req.body;

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student ID not found.' });
    }

    const match = await bcrypt.compare(password, student.password);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const isPaidPlan = student.plan_name === 'One Way' || student.plan_name === 'Round Trip';
    const isExpired = isPaidPlan && student.plan_expires_at && new Date() > new Date(student.plan_expires_at);

    // If the paid plan has expired, clear it and notify the student
    if (isExpired) {
      const expiredPlanName = student.plan_name;
      await Student.findOneAndUpdate(
        { studentId: student.studentId },
        {
          plan_name: null,
          plan_fare: null,
          plan_route_id: null,
          plan_route_name: null,
          plan_stoppage_id: null,
          plan_stoppage_name: null,
          plan_expires_at: null
        }
      );
      // Send expiry notification (ignore errors — non-critical)
      try {
        await Notification.create({
          studentId: student.studentId,
          message: `📅 Your ${expiredPlanName} plan has expired. Please choose a new plan before booking your next seat.`,
          isRead: false
        });
      } catch (_) {}
    }

    res.json({
      message: 'Login successful',
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      department: student.department,
      semester: student.semester,
      subscriptionPlan: student.subscriptionPlan,
      // Return nulled plan fields if just expired, otherwise return saved values
      plan_name: isExpired ? null : (student.plan_name || null),
      plan_fare: isExpired ? null : (student.plan_fare || null),
      plan_route_id: isExpired ? null : (student.plan_route_id || null),
      plan_route_name: isExpired ? null : (student.plan_route_name || null),
      plan_stoppage_id: isExpired ? null : (student.plan_stoppage_id || null),
      plan_stoppage_name: isExpired ? null : (student.plan_stoppage_name || null),
      plan_expires_at: isExpired ? null : (student.plan_expires_at || null)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login };