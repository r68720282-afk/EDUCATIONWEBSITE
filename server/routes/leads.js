const express = require('express');
const Lead = require('../models/Lead');

const router = express.Router();

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    'Unknown'
  );
}

router.post('/', async (req, res) => {
  try {
    const { name, mobile, city, course } = req.body;

    if (!name || !mobile || !city || !course) {
      return res.status(400).json({ message: 'Name, mobile, city and course are required.' });
    }

    const lead = await Lead.create({ name, mobile, city, course, ip: getClientIp(req) });
    return res.status(201).json({ message: 'Application submitted successfully.', lead });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Unable to save lead.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, course } = req.query;
    const filter = {};

    if (search) {
      filter.name = { $regex: String(search), $options: 'i' };
    }

    if (course) {
      filter.course = String(course);
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    return res.json(leads);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch leads.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }

    return res.json({ message: 'Lead deleted successfully.' });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid lead id.' });
  }
});

module.exports = router;
