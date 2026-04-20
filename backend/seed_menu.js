const mysql = require('mysql2/promise');
const path = require('path');

// Load .env from its own folder
require('dotenv').config({ path: path.join(__dirname, '.env') });

const menuItems = [
  // --- BIRYANI ---
  { item_name: 'Chicken Dum Biryani', description: 'Flavorful basmati rice cooked with tender chicken and spices.', price: 220, category: 'Biryani', food_type: 'Non-Veg' },
  { item_name: 'Mutton Biryani', description: 'Classic slow-cooked mutton biryani with rich spices.', price: 320, category: 'Biryani', food_type: 'Non-Veg' },
  { item_name: 'Egg Biryani', description: 'Spiced basmati rice with boiled eggs and aromatic herbs.', price: 180, category: 'Biryani', food_type: 'Non-Veg' },
  { item_name: 'Prawn Biryani', description: 'Delicious prawns cooked in a traditional biryani style.', price: 350, category: 'Biryani', food_type: 'Non-Veg' },
  { item_name: 'Hyderabadi Chicken Biryani', description: 'Spicy and authentic Hyderabadi style chicken biryani.', price: 240, category: 'Biryani', food_type: 'Non-Veg' },
  { item_name: 'Paneer Dum Biryani', description: 'Soft paneer cubes layered with spiced basmati rice.', price: 190, category: 'Biryani', food_type: 'Veg' },
  { item_name: 'Veg Hyderabadi Biryani', description: 'Mixed vegetables cooked in a spicy Hyderabadi masala.', price: 170, category: 'Biryani', food_type: 'Veg' },
  { item_name: 'Mushroom Biryani', description: 'Fresh mushrooms cooked with aromatic spices and rice.', price: 185, category: 'Biryani', food_type: 'Veg' },
  { item_name: 'Soya Chaap Biryani', description: 'Protein-rich soya chaap layered with fragrant rice.', price: 180, category: 'Biryani', food_type: 'Veg' },
  { item_name: 'Shahi Veg Biryani', description: 'Royal vegetable biryani with nuts and cream.', price: 200, category: 'Biryani', food_type: 'Veg' },

  // --- RICE ---
  { item_name: 'Chicken Fried Rice', description: 'Stir-fried rice with chicken, eggs, and veggies.', price: 180, category: 'Rice', food_type: 'Non-Veg' },
  { item_name: 'Schezwan Egg Rice', description: 'Spicy fried rice with scrambled eggs and Schezwan sauce.', price: 170, category: 'Rice', food_type: 'Non-Veg' },
  { item_name: 'Mixed Meat Fried Rice', description: 'Fried rice loaded with chicken and eggs.', price: 210, category: 'Rice', food_type: 'Non-Veg' },
  { item_name: 'Garlic Chicken Rice', description: 'Aromatic garlic-flavored fried rice with chicken.', price: 190, category: 'Rice', food_type: 'Non-Veg' },
  { item_name: 'Veg Fried Rice', description: 'Freshly tossed rice with garden vegetables.', price: 140, category: 'Rice', food_type: 'Veg' },
  { item_name: 'Mushroom Fried Rice', description: 'Delicious fried rice with fresh mushroom chunks.', price: 155, category: 'Rice', food_type: 'Veg' },
  { item_name: 'Ghee Rice', description: 'Pure basmati rice cooked in premium ghee and spices.', price: 130, category: 'Rice', food_type: 'Veg' },
  { item_name: 'Jeera Rice', description: 'Basmati rice tempered with cumin and ghee.', price: 120, category: 'Rice', food_type: 'Veg' },
  { item_name: 'Paneer Fried Rice', description: 'Delicious fried rice with golden paneer cubes.', price: 165, category: 'Rice', food_type: 'Veg' },

  // --- STARTERS ---
  { item_name: 'Chicken 65', description: 'Deep fried spicy chicken chunks.', price: 180, category: 'Starters', food_type: 'Non-Veg' },
  { item_name: 'Fish 65', description: 'Crispy battered fish strips.', price: 220, category: 'Starters', food_type: 'Non-Veg' },
  { item_name: 'Chilli Paneer', description: 'Fried paneer tossed in spicy chili sauce.', price: 170, category: 'Starters', food_type: 'Veg' },

  // --- GRAVY ---
  { item_name: 'Paneer Butter Masala', description: 'Sweet and creamy tomato gravy with paneer.', price: 190, category: 'Gravy', food_type: 'Veg' },

  // --- GRILL & TANDOORI ---
  { item_name: 'Pepper Chicken Grill', description: 'Juicy chicken grilled with black pepper.', price: 0, category: 'Grill', food_type: 'Non-Veg', price_quarter: 120, price_half: 220, price_full: 420 },
  { item_name: 'Tandoori Chicken', description: 'Whole chicken roasted in clay oven.', price: 0, category: 'Tandoori', food_type: 'Non-Veg', price_quarter: 140, price_half: 260, price_full: 500 }
];

async function seed() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Clearing existing menu items (handling foreign keys)...');
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    await db.execute('DELETE FROM menu_items');
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log(`Seeding ${menuItems.length} menu items (NO IMAGES)...`);
    for (const item of menuItems) {
      await db.execute(
        `INSERT INTO menu_items (item_name, description, price, category, food_type, price_quarter, price_half, price_full, image_path) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          item.item_name, 
          item.description, 
          item.price, 
          item.category, 
          item.food_type,
          item.price_quarter || null,
          item.price_half || null,
          item.price_full || null
        ]
      );
    }
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    if (db) await db.end();
  }
}

seed();
