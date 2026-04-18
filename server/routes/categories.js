const express = require('express');
const Category = require('../models/Category');
const Course = require('../models/Course');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch categories.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const category = await Category.findOneAndUpdate(
      { name: name.trim() },
      { name: name.trim() },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ message: 'Category saved successfully.', category });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Unable to save category.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    await Course.updateMany({ category: category.name }, { category: 'General' });

    return res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid category id.' });
  }
});

module.exports = router;
