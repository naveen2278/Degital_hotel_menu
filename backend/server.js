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
app.use(express.static(path.join(__dirname, '../public_html')));

// Root route serves index.html from public_html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public_html/index.html'));
});


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

// --- SHOP STATUS ROUTES ---
app.get('/api/settings/shop-status', async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT key_name, key_value FROM settings WHERE key_name IN ('shop_status', 'closed_at')");
    const statusRow = rows.find(r => r.key_name === 'shop_status');
    const closedAtRow = rows.find(r => r.key_name === 'closed_at');
    
    const status = statusRow ? statusRow.key_value : 'open';
    const closedAt = closedAtRow ? closedAtRow.key_value : null;
    
    res.json({ success: true, status, closedAt });
  } catch (error) {
    console.error('FETCH SHOP STATUS ERROR:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shop status' });
  }
});

const authMiddleware = require('./middleware/authMiddleware');
app.post('/api/settings/shop-status', authMiddleware, async (req, res) => {
  const { status, closedAt } = req.body;
  if (!status || !['open', 'closed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid status (open/closed) is required' });
  }
  try {
    await db.promise().query("INSERT INTO settings (key_name, key_value) VALUES ('shop_status', ?) ON DUPLICATE KEY UPDATE key_value = ?", [status, status]);
    
    if (status === 'closed' && closedAt) {
      await db.promise().query("INSERT INTO settings (key_name, key_value) VALUES ('closed_at', ?) ON DUPLICATE KEY UPDATE key_value = ?", [closedAt, closedAt]);
    }
    
    res.json({ success: true, message: 'Shop status updated successfully!', status, closedAt });
  } catch (error) {
    console.error('UPDATE SHOP STATUS ERROR:', error);
    res.status(500).json({ success: false, message: 'Failed to update shop status' });
  }
});

// --- PARCEL STATUS ROUTES ---
app.get('/api/settings/parcel-status', async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT key_value FROM settings WHERE key_name = 'parcel_status' LIMIT 1");
    const status = rows.length > 0 ? rows[0].key_value : 'open';
    res.json({ success: true, status });
  } catch (error) {
    console.error('FETCH PARCEL STATUS ERROR:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch parcel status' });
  }
});

app.post('/api/settings/parcel-status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!status || !['open', 'closed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid status (open/closed) is required' });
  }

  try {
    await db.promise().query(
      "INSERT INTO settings (key_name, key_value) VALUES ('parcel_status', ?) ON DUPLICATE KEY UPDATE key_value = ?",
      [status, status]
    );

    res.json({ success: true, message: 'Parcel status updated successfully!', status });
  } catch (error) {
    console.error('UPDATE PARCEL STATUS ERROR:', error);
    res.status(500).json({ success: false, message: 'Failed to update parcel status' });
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

    // Create settings table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS settings (
        key_name VARCHAR(100) PRIMARY KEY,
        key_value VARCHAR(255) NOT NULL
      )
    `);

    // Seed default shop status if empty
    const [existingSettings] = await db.promise().query("SELECT COUNT(*) as count FROM settings WHERE key_name = 'shop_status'");
    if (existingSettings[0].count === 0) {
      await db.promise().query("INSERT INTO settings (key_name, key_value) VALUES ('shop_status', 'open')");
      console.log('Seeded default shop status: open');
    }

    const [existingParcelStatus] = await db.promise().query("SELECT COUNT(*) as count FROM settings WHERE key_name = 'parcel_status'");
    if (existingParcelStatus[0].count === 0) {
      await db.promise().query("INSERT INTO settings (key_name, key_value) VALUES ('parcel_status', 'open')");
      console.log('Seeded default parcel status: open');
    }

    // Seed default store hours if empty
    const [existingHours] = await db.promise().query("SELECT COUNT(*) as count FROM settings WHERE key_name = 'store_hours'");
    if (existingHours[0].count === 0) {
      await db.promise().query("INSERT INTO settings (key_name, key_value) VALUES ('store_hours', '6:00 PM - 3:00 AM')");
      console.log('Seeded default store hours: 6:00 PM - 3:00 AM');
    }

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
        food_type ENUM('Veg', 'Non-Veg', 'Combo') NOT NULL DEFAULT 'Veg',
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
      await db.promise().query("ALTER TABLE menu_items ADD COLUMN food_type ENUM('Veg', 'Non-Veg', 'Combo') NOT NULL DEFAULT 'Veg' AFTER category");
      console.log('Added food_type to menu_items');
    }

    // Migrate food_type ENUM to include Combo if it exists but lacks it
    const foodTypeCol = menuColumns.find(c => c.Field === 'food_type');
    if (foodTypeCol && !foodTypeCol.Type.includes("'Combo'")) {
      await db.promise().query("ALTER TABLE menu_items MODIFY COLUMN food_type ENUM('Veg', 'Non-Veg', 'Combo') NOT NULL DEFAULT 'Veg'");
      console.log('Migrated food_type to include Combo');
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
        daily_order_number INT DEFAULT NULL,
        table_number VARCHAR(20) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('Pending', 'Accepted', 'Processing', 'Delivered', 'Completed', 'Cancelled') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        customer_name VARCHAR(100) DEFAULT NULL,
        order_type ENUM('Dine-in', 'Parcel') DEFAULT 'Dine-in'
      )
    `);

    // Migrate status ENUM to include Accepted and add daily_order_number
    try {
      await db.promise().query("ALTER TABLE orders MODIFY COLUMN status ENUM('Pending', 'Accepted', 'Processing', 'Delivered', 'Completed', 'Cancelled') DEFAULT 'Pending'");
      await db.promise().query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS daily_order_number INT DEFAULT NULL AFTER id");
      await db.promise().query("UPDATE orders SET status = 'Accepted' WHERE status = ''");
      
      // Auto-fix historical orders to guarantee strict daily sequence (1, 2, 3...)
      const [allOrders] = await db.promise().query("SELECT id, created_at FROM orders ORDER BY created_at ASC");
      let currentDateStr = '';
      let currentCounter = 1;
      for (const ord of allOrders) {
          const dateObj = new Date(ord.created_at);
          const dateStr = dateObj.getFullYear() + '-' + dateObj.getMonth() + '-' + dateObj.getDate();
          if (dateStr !== currentDateStr) {
              currentDateStr = dateStr;
              currentCounter = 1;
          }
          await db.promise().query("UPDATE orders SET daily_order_number = ? WHERE id = ?", [currentCounter, ord.id]);
          currentCounter++;
      }
    } catch (err) {
      console.log('Migration note: order status enum migration failed or already applied:', err.message);
    }

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

// --- AI DESCRIPTION ROUTE ---
app.post('/api/generate-description', async (req, res) => {
  const { itemName, category } = req.body;
  if (!itemName) return res.status(400).json({ success: false, message: 'Item name is required' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your backend/.env file.' });
  }

  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ 
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    
    const prompt = `Write a short, appetizing, 1 to 2 sentence menu description for a premium restaurant dish named '${itemName}' in the '${category || 'Other'}' category. Focus on taste, texture, and premium quality. Do not include the name of the dish in the description itself. Just the description.`;
    
    const response = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
    });
    
    const text = response.choices[0].message.content.trim();
    
    res.json({ success: true, description: text });
  } catch (error) {
    console.error('AI GENERATION ERROR:', error);
    res.status(500).json({ success: false, message: 'Failed to generate description via AI. ' + error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

async function startServer() {
  try {
    await db.promise().getConnection().then(conn => conn.release());
    await checkDatabaseSchema();

    app.listen(PORT, () => {
      console.log(`Hotel Menu System Backend running on http://localhost:${PORT}`);
    });

    const [existingItems] = await db.promise().query('SELECT COUNT(*) as count FROM menu_items');
    if (existingItems[0].count === 0) {
      console.log('Menu is empty. Auto-seeding...');
      try {
        const { exec } = require('child_process');
        exec('node backend/seed_menu.js');
      } catch (e) {
        console.error('Auto-seed execution error:', e);
      }
    }
  } catch (error) {
    console.error('Failed to start server due to database error:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
