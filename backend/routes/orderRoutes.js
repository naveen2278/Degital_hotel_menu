const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

/* GUEST: PLACE NEW ORDER */
router.post('/', async (req, res) => {
  const { table_number, items, total_amount, customer_name, order_type } = req.body;

  if (!table_number || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid order data' });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // 1. Insert into orders table
    const [orderResult] = await connection.query(
      'INSERT INTO orders (table_number, total_amount, customer_name, order_type) VALUES (?, ?, ?, ?)',
      [table_number, total_amount, customer_name || null, order_type || 'Dine-in']
    );

    const orderId = orderResult.insertId;

    // 2. Insert each item into order_items table
    // mysql2 supports bulk insert with array of arrays
    const orderItemsData = items.map(item => [
      orderId,
      item.id,
      item.quantity,
      item.price
    ]);

    await connection.query(
      'INSERT INTO order_items (order_id, item_id, quantity, price) VALUES ?',
      [orderItemsData]
    );

    await connection.commit();
    res.json({ success: true, message: 'Order placed successfully', order_id: orderId });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, message: 'Order processing error', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

/* ADMIN: GET ALL ORDERS */
router.get('/admin/all', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  let whereClause = '';
  let params = [];

  if (startDate && endDate) {
    whereClause = ' WHERE DATE(o.created_at) BETWEEN ? AND ?';
    params = [startDate, endDate];
  } else if (startDate) {
    whereClause = ' WHERE DATE(o.created_at) >= ?';
    params = [startDate];
  } else if (endDate) {
    whereClause = ' WHERE DATE(o.created_at) <= ?';
    params = [endDate];
  }

  const sql = `
    SELECT 
      o.id, 
      o.table_number, 
      o.customer_name,
      o.order_type,
      o.total_amount, 
      o.status, 
      o.created_at,
      GROUP_CONCAT(CONCAT(IFNULL(m.item_name, 'Deleted Item'), '::', oi.quantity, '::', oi.price, '::', oi.id) SEPARATOR '||') as items_string
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items m ON oi.item_id = m.id
    ${whereClause}
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  try {
    const [results] = await db.promise().query(sql, params);
    
    // Transform the string back into a useful object format for the frontend
    const formattedResults = results.map(order => {
      let items = [];
      if (order.items_string) {
        items = order.items_string.split('||').map(itemStr => {
          const [item_name, quantity, price, order_item_id] = itemStr.split('::');
          return { 
            item_name, 
            quantity: parseInt(quantity), 
            price: parseFloat(price),
            order_item_id: parseInt(order_item_id)
          };
        });
      }
      
      return {
        ...order,
        items: items
      };
    });

    res.json({ success: true, data: formattedResults });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
  }
});

/* ADMIN: UPDATE ORDER STATUS */
router.patch('/admin/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    await db.promise().query(sql, [status, id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

/* ADMIN: ADD ITEM TO EXISTING ORDER (ADD-ON) */
router.post('/admin/:id/add-item', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { item_id, quantity } = req.body;

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // 1. Get item price
    const [itemRows] = await connection.query('SELECT price FROM menu_items WHERE id = ?', [item_id]);
    if (itemRows.length === 0) throw new Error('Item not found');
    const price = itemRows[0].price;

    // 2. Check if item already exists in this order
    const [existing] = await connection.query(
      'SELECT id, quantity FROM order_items WHERE order_id = ? AND item_id = ?',
      [id, item_id]
    );

    if (existing.length > 0) {
      // Update existing item quantity
      await connection.query(
        'UPDATE order_items SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      // Insert new row
      await connection.query(
        'INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)',
        [id, item_id, quantity, price]
      );
    }

    // 3. Update total amount in orders table
    const additionalAmount = price * quantity;
    await connection.query(
      'UPDATE orders SET total_amount = total_amount + ? WHERE id = ?',
      [additionalAmount, id]
    );

    await connection.commit();
    res.json({ success: true, message: 'Item added/updated in order' });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, message: 'Failed to add item', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

/* ADMIN: REMOVE ITEM FROM ORDER */
router.delete('/admin/remove-item/:orderItemId', authMiddleware, async (req, res) => {
  const { orderItemId } = req.params;
  console.log(`Attempting to remove order item with ID: ${orderItemId}`);
  
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // 1. Get item detail (including order_id) to update the correct order total
    const [itemRows] = await connection.query(
      'SELECT order_id, price, quantity FROM order_items WHERE id = ?',
      [orderItemId]
    );
    
    if (itemRows.length === 0) {
      console.log(`Item ID ${orderItemId} not found`);
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    const { order_id, price, quantity } = itemRows[0];
    const amountToSubtract = price * quantity;

    // 2. Delete the item row
    await connection.query('DELETE FROM order_items WHERE id = ?', [orderItemId]);

    // 3. Update total amount of the associated order
    await connection.query(
      'UPDATE orders SET total_amount = GREATEST(0, total_amount - ?) WHERE id = ?',
      [amountToSubtract, order_id]
    );

    await connection.commit();
    console.log(`Successfully removed item ${orderItemId} and updated order ${order_id}`);
    res.json({ success: true, message: 'Item removed from order' });
  } catch (error) {
    console.error('Removal Error:', error);
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, message: 'Server error during removal', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

/* ADMIN: DELETE ENTIRE ORDER */
router.delete('/admin/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
});

module.exports = router;
