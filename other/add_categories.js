const db = require('../backend/db');

async function run() {
  try {
    const promiseDb = db.promise();

    console.log("Inserting new categories into the categories table...");
    const newCategories = ['Fresh Juice', 'Soda', 'Ice Cream', 'Desserts'];
    for (let cat of newCategories) {
      await promiseDb.query('INSERT IGNORE INTO categories (name) VALUES (?)', [cat]);
    }
    
    console.log("Inserting sample data for new categories...");
    const items = [
      ['Orange Juice', 'Freshly squeezed sweet oranges', 80.00, 'Fresh Juice', 'Veg', 0, 1],
      ['Watermelon Juice', 'Refreshing summer watermelon juice', 70.00, 'Fresh Juice', 'Veg', 0, 1],
      ['Classic Cola', 'Chilled classic cola with ice', 40.00, 'Soda', 'Veg', 0, 1],
      ['Lemon Soda', 'Fresh lemon juice with soda and mint', 50.00, 'Soda', 'Veg', 0, 1],
      ['Vanilla Ice Cream', 'Two scoops of classic vanilla', 90.00, 'Ice Cream', 'Veg', 0, 1],
      ['Chocolate Fudge Sundae', 'Rich chocolate ice cream with fudge syrup', 150.00, 'Ice Cream', 'Veg', 1, 1],
      ['Gulab Jamun', 'Sweet milk dumplings in rose syrup', 60.00, 'Desserts', 'Veg', 0, 1],
      ['Brownie Sizzler', 'Hot chocolate brownie with ice cream', 180.00, 'Desserts', 'Veg', 1, 1]
    ];

    for (let item of items) {
      await promiseDb.query(
        'INSERT INTO menu_items (item_name, description, price, category, food_type, is_special, is_available) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        item
      );
    }
    
    console.log("Successfully added new categories and items!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating database:", err);
    process.exit(1);
  }
}

run();
