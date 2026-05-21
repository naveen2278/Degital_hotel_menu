const fetch = require('node-fetch');

async function testOrders() {
  console.log('--- Testing Order Placement ---');
  
  // First, let's fetch an item ID from the database to make sure we have a valid menu item.
  // In a clean environment, we can insert or just use standard ID. Let's assume ID 1 exists or fetch menu.
  try {
    const menuRes = await fetch('http://localhost:5000/api/menu');
    const menu = await menuRes.json();
    if (!menu || menu.length === 0) {
      console.log('No menu items found. Please seed the DB or add an item.');
      return;
    }
    const item = menu[0];
    console.log(`Found item: ${item.item_name} (ID: ${item.id}, Price: ${item.price})`);

    // 1. Place a Dine-in Order
    const dineInPayload = {
      table_number: '12',
      customer_name: 'John DineIn',
      order_type: 'Dine-in',
      items: [{ id: item.id, quantity: 2, price: item.price }],
      total_amount: item.price * 2
    };

    const dineInRes = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dineInPayload)
    });
    const dineInResult = await dineInRes.json();
    console.log('Dine-in Order Response:', dineInResult);

    // 2. Place a Parcel Order
    const parcelPayload = {
      table_number: 'Parcel',
      customer_name: 'Mary Parcel',
      order_type: 'Parcel',
      items: [{ id: item.id, quantity: 1, price: item.price }],
      total_amount: item.price
    };

    const parcelRes = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parcelPayload)
    });
    const parcelResult = await parcelRes.json();
    console.log('Parcel Order Response:', parcelResult);

  } catch (err) {
    console.error('Network or Server Error:', err.message);
  }
}

testOrders();
