const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/image_assets', express.static(path.join(__dirname, '../image_and_icon')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// --- CATEGORY ROUTES ---
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('FETCH CATEGORIES ERROR:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
  try {
    const [result] = await db.promise().query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.json({ success: true, message: 'Category added!', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Category already exists or server error' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await db.promise().query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Category removed!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove category' });
  }
});

// Automatic Schema Check and Table Creation
async function checkDatabaseSchema() {
  try {
    console.log('Checking database tables...');
    
    // Create admin table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Create categories table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);

    // Create menu_items table (VARCHAR category)
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_name VARCHAR(150) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        price_quarter DECIMAL(10,2) DEFAULT NULL,
        price_half DECIMAL(10,2) DEFAULT NULL,
        price_full DECIMAL(10,2) DEFAULT NULL,
        category VARCHAR(100) NOT NULL,
        food_type ENUM('Veg', 'Non-Veg') NOT NULL DEFAULT 'Veg',
        is_special TINYINT(1) DEFAULT 0,
        is_available TINYINT(1) DEFAULT 1,
        image_path VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Check for missing columns in menu_items
    const [menuColumns] = await db.promise().query('SHOW COLUMNS FROM menu_items');
    const columnNames = menuColumns.map(c => c.Field);

    if (!columnNames.includes('food_type')) {
      await db.promise().query("ALTER TABLE menu_items ADD COLUMN food_type ENUM('Veg', 'Non-Veg') NOT NULL DEFAULT 'Veg' AFTER category");
      console.log('Added food_type to menu_items');
    }

    // Migrate ENUM to VARCHAR if needed
    const categoryCol = menuColumns.find(c => c.Field === 'category');
    if (categoryCol && categoryCol.Type.includes('enum')) {
      await db.promise().query("ALTER TABLE menu_items MODIFY COLUMN category VARCHAR(100) NOT NULL");
      console.log('Migrated category to VARCHAR');
    }

    // Seed categories if empty
    const [existingCats] = await db.promise().query('SELECT COUNT(*) as count FROM categories');
    if (existingCats[0].count === 0) {
      const defaultCats = ['Biryani', 'Rice', 'Noodles', 'Grill', 'Tandoori', 'Gravy', 'Starters'];
      for (const cat of defaultCats) {
        await db.promise().query('INSERT IGNORE INTO categories (name) VALUES (?)', [cat]);
      }
      console.log('Seeded default categories');
    }

    // Force remove Main Course
    await db.promise().query("DELETE FROM categories WHERE name = 'Main Course'");

    // Price columns check
    if (!columnNames.includes('price_quarter')) {
      await db.promise().query("ALTER TABLE menu_items ADD COLUMN price_quarter DECIMAL(10,2) DEFAULT NULL AFTER price");
      await db.promise().query("ALTER TABLE menu_items ADD COLUMN price_half DECIMAL(10,2) DEFAULT NULL AFTER price_quarter");
      await db.promise().query("ALTER TABLE menu_items ADD COLUMN price_full DECIMAL(10,2) DEFAULT NULL AFTER price_half");
      console.log('Added tiered pricing columns');
    }

    // Create orders table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        table_number VARCHAR(20) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('Pending', 'Processing', 'Delivered', 'Completed', 'Cancelled') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        customer_name VARCHAR(100) DEFAULT NULL,
        order_type ENUM('Dine-in', 'Parcel') DEFAULT 'Dine-in'
      )
    `);

    // Create order_items table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES menu_items(id)
      )
    `);

    // Ensure at least one admin exists
    const [admins] = await db.promise().query('SELECT * FROM admin');
    if (admins.length === 0) {
      await db.promise().query("INSERT INTO admin (username, password) VALUES ('admin', 'admin123')");
      console.log('Created default admin: admin/admin123');
    }
    
    console.log('Database schema check completed successfully.');
  } catch (err) {
    console.error('DATABASE SETUP ERROR:', err);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Hotel Menu System Backend running on http://localhost:${PORT}`);
  await checkDatabaseSchema();

  // Auto-seed logic
  const [existingItems] = await db.promise().query('SELECT COUNT(*) as count FROM menu_items');
  if (existingItems[0].count === 0) {
    console.log('Menu is empty. Auto-seeding...');
    try {
      const { exec } = require('child_process');
      exec('node backend/seed_menu.js');
    } catch (e) {}
  }
});

module.exports = app;
