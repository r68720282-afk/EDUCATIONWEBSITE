const express = require('express');
const Lead = require('../models/Lead');
const Course = require('../models/Course');
const Visitor = require('../models/Visitor');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || '1234';

  if (username === adminUsername && password === adminPassword) {
    return res.json({ success: true, message: 'Login successful.' });
  }

  return res.status(401).json({ success: false, message: 'Invalid username or password.' });
});

router.get('/stats', async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 29);

    const [totalVisitors, totalLeads, totalCourses, leadCountsByDate, courseStats] = await Promise.all([
      Visitor.countDocuments(),
      Lead.countDocuments(),
      Course.countDocuments(),
      Lead.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } },
      ]),
      Lead.aggregate([
        {
          $group: {
            _id: '$course',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
        { $project: { _id: 0, course: '$_id', count: 1 } },
      ]),
    ]);

    const leadCountMap = leadCountsByDate.reduce((map, item) => {
      map[item.date] = item.count;
      return map;
    }, {});
    const dailyLeads = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const formattedDate = date.toISOString().slice(0, 10);
      return { date: formattedDate, count: leadCountMap[formattedDate] || 0 };
    });

    return res.json({ totalLeads, totalVisitors, totalCourses, dailyLeads, courseStats });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch dashboard stats.' });
  }
});

module.exports = router;
