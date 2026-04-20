const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

/* USER: GET ALL AVAILABLE MENU ITEMS */
router.get('/', async (req, res) => {
  const sql = `
    SELECT * FROM menu_items
    WHERE is_available = 1
    ORDER BY is_special DESC, category ASC, item_name ASC
  `;

  try {
    const [results] = await db.promise().query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch menu' });
  }
});

/* ADMIN: GET ALL MENU ITEMS */
router.get('/admin/all', authMiddleware, async (req, res) => {
  const sql = `
    SELECT * FROM menu_items
    ORDER BY updated_at DESC, item_name ASC
  `;

  try {
    const [results] = await db.promise().query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin menu data' });
  }
});

/* ADMIN: ADD NEW MENU ITEM WITH IMAGE */
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  const { item_name, description, price, price_quarter, price_half, price_full, category, food_type, is_special, is_available } = req.body;
  const image_path = req.file ? `/uploads/menu/${req.file.filename}` : null;

  const sql = `
    INSERT INTO menu_items (item_name, description, price, price_quarter, price_half, price_full, category, food_type, is_special, is_available, image_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    item_name, 
    description, 
    price, 
    price_quarter === '' ? null : price_quarter,
    price_half === '' ? null : price_half,
    price_full === '' ? null : price_full,
    category, 
    food_type || 'Veg', 
    (is_special === 'true' || is_special === true) ? 1 : 0, 
    (is_available === 'true' || is_available === true) ? 1 : 0, 
    image_path
  ];

  try {
    const [result] = await db.promise().query(sql, values);

    res.json({
      success: true,
      message: 'Menu item added successfully',
      id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add menu item' });
  }
});


/* ADMIN: UPDATE MENU ITEM WITH IMAGE */
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { item_name, description, price, price_quarter, price_half, price_full, category, food_type, is_special, is_available, remove_image } = req.body;
  
  let image_path = null;
  if (req.file) {
    image_path = `/uploads/menu/${req.file.filename}`;
  }

  const isSpecialInt = (is_special === 'true' || is_special === true) ? 1 : 0;
  const isAvailableInt = (is_available === 'true' || is_available === true) ? 1 : 0;

  try {
    let sql, values;
    if (image_path) {
      sql = `
        UPDATE menu_items 
        SET item_name=?, description=?, price=?, price_quarter=?, price_half=?, price_full=?, category=?, food_type=?, is_special=?, is_available=?, image_path=?
        WHERE id=?
      `;
      values = [item_name, description, price, price_quarter === '' ? null : price_quarter, price_half === '' ? null : price_half, price_full === '' ? null : price_full, category, food_type, isSpecialInt, isAvailableInt, image_path, id];
    } else if (remove_image === 'true') {
      sql = `
        UPDATE menu_items 
        SET item_name=?, description=?, price=?, price_quarter=?, price_half=?, price_full=?, category=?, food_type=?, is_special=?, is_available=?, image_path=NULL
        WHERE id=?
      `;
      values = [item_name, description, price, price_quarter === '' ? null : price_quarter, price_half === '' ? null : price_half, price_full === '' ? null : price_full, category, food_type, isSpecialInt, isAvailableInt, id];
    } else {
      sql = `
        UPDATE menu_items 
        SET item_name=?, description=?, price=?, price_quarter=?, price_half=?, price_full=?, category=?, food_type=?, is_special=?, is_available=?
        WHERE id=?
      `;
      values = [item_name, description, price, price_quarter === '' ? null : price_quarter, price_half === '' ? null : price_half, price_full === '' ? null : price_full, category, food_type, isSpecialInt, isAvailableInt, id];
    }

    await db.promise().query(sql, values);
    res.json({ success: true, message: 'Item updated' });
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ success: false, message: 'Error updating item' });
  }
});

/* ADMIN: DELETE MENU ITEM */
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM menu_items WHERE id = ?';

  try {
    await db.promise().query(sql, [id]);
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete menu item' });
  }
});

module.exports = router;

module.exports = router;