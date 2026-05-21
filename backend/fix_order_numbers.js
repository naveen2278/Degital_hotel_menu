const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hotel_menu_system'
};

async function fixOrderNumbers() {
    try {
        console.log('Connecting to database...');
        const db = await mysql.createConnection(dbConfig);
        
        console.log('Fetching all orders ordered by date and time...');
        const [orders] = await db.query('SELECT id, created_at FROM orders ORDER BY created_at ASC');
        
        let currentDateStr = '';
        let currentCounter = 1;
        let updateCount = 0;

        for (const order of orders) {
            // Get YYYY-MM-DD
            const dateObj = new Date(order.created_at);
            const dateStr = dateObj.toISOString().split('T')[0];

            if (dateStr !== currentDateStr) {
                currentDateStr = dateStr;
                currentCounter = 1;
            }

            await db.query('UPDATE orders SET daily_order_number = ? WHERE id = ?', [currentCounter, order.id]);
            
            currentCounter++;
            updateCount++;
        }

        console.log(`Successfully fixed daily_order_number for ${updateCount} orders!`);
        await db.end();
    } catch (err) {
        console.error('Error fixing order numbers:', err);
    }
}

fixOrderNumbers();
