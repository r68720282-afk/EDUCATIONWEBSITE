const express = require('express');
const Course = require('../models/Course');

const router = express.Router();

function normalizeSlug(slug) {
  return String(slug || '').toLowerCase().trim();
}

function normalizeKeywords(keywords) {
  if (Array.isArray(keywords)) {
    return keywords.map((keyword) => String(keyword).trim()).filter(Boolean);
  }

  return String(keywords || '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    return res.json(courses);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch courses.' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const course = await Course.findOne({ slug: normalizeSlug(req.params.slug) });

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    return res.json(course);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch course.' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { title, slug, description, content, category, keywords } = req.body;

    if (!title || !slug || !description || !content) {
      return res.status(400).json({ message: 'Title, slug, description and content are required.' });
    }

    const cleanSlug = normalizeSlug(slug);
    const course = await Course.findOneAndUpdate(
      { slug: cleanSlug },
      {
        title,
        slug: cleanSlug,
        description,
        content,
        category: category || 'General',
        keywords: normalizeKeywords(keywords),
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ message: 'Course saved successfully.', course });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Unable to save course.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, slug, description, content, category, keywords } = req.body;

    if (!title || !slug || !description || !content) {
      return res.status(400).json({ message: 'Title, slug, description and content are required.' });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        title,
        slug: normalizeSlug(slug),
        description,
        content,
        category: category || 'General',
        keywords: normalizeKeywords(keywords),
      },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    return res.json({ message: 'Course updated successfully.', course });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Unable to update course.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    return res.json({ message: 'Course deleted successfully.' });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid course id.' });
  }
});

module.exports = router;
