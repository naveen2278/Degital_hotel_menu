const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin;
const API_BASE = `${SERVER_URL}/api`;
let allMenuItems = [];
let allCategories = [];

document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    if (localStorage.getItem('isAdminLoggedIn') !== 'true' && window.location.pathname.includes('dashboard')) {
        window.location.href = 'admin.html';
        return;
    }

    loadCategories();
    loadMenuItems();
    loadOrders();
    
    // Auto-refresh orders every 30 seconds
    setInterval(loadOrders, 30000);

    // Logout logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isAdminLoggedIn');
            window.location.href = 'admin.html';
        });
    }

    const dateInput = document.getElementById('orderDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // Handle tiered pricing visibility
    const categorySelect = document.getElementById('category');
    const tieredContainer = document.getElementById('tieredPriceContainer');
    if (categorySelect && tieredContainer) {
      categorySelect.addEventListener('change', () => {
        const isMultiPrice = ['Grill', 'Tandoori'].includes(categorySelect.value);
        tieredContainer.style.display = isMultiPrice ? 'grid' : 'none';
      });
    }

    const editCategorySelect = document.getElementById('editCategory');
    const editTieredContainer = document.getElementById('editTieredPriceContainer');
    if (editCategorySelect && editTieredContainer) {
      editCategorySelect.addEventListener('change', () => {
        const isMultiPrice = ['Grill', 'Tandoori'].includes(editCategorySelect.value);
        editTieredContainer.style.display = isMultiPrice ? 'grid' : 'none';
      });
    }
});

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    const result = await response.json();
    if (result.success) {
      allCategories = result.data;
      populateCategoryDropdowns();
    } else {
      alert('Error loading categories from database. Please restart server.');
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    alert('Could not connect to category API.');
  }
}

function populateCategoryDropdowns() {
  const addSelect = document.getElementById('category');
  const editSelect = document.getElementById('editCategory');
  const filterSelect = document.getElementById('adminCategoryFilter');

  if (addSelect) {
    addSelect.innerHTML = '<option value="" disabled selected>Select Category</option>' + 
      allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
  if (editSelect) {
    editSelect.innerHTML = '<option value="" disabled>Select Category</option>' + 
      allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="All" selected>All Categories</option>' + 
      allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
}

function toggleAddCategory() {
  const container = document.getElementById('newCategoryContainer');
  container.style.display = container.style.display === 'none' ? 'flex' : 'none';
}

async function saveNewCategory() {
  const input = document.getElementById('newCategoryName');
  const name = input.value.trim();
  if (!name) return;

  try {
    const response = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const result = await response.json();
    if (result.success) {
      input.value = '';
      toggleAddCategory();
      await loadCategories(); // Refresh lists
    } else {
      alert(result.message || 'Error adding category');
    }
  } catch (error) {
    alert('Failed to connect to server');
  }
}

// Section Switching
function switchSection(section) {
  const menuSec = document.getElementById('menuSection');
  const ordersSec = document.getElementById('ordersSection');
  const menuBtn = document.getElementById('showMenuBtn');
  const ordersBtn = document.getElementById('showOrdersBtn');

  if (section === 'menu') {
    menuSec.style.display = 'grid';
    ordersSec.style.display = 'none';
    menuBtn.classList.add('active');
    ordersBtn.classList.remove('active');
    loadMenuItems();
  } else {
    menuSec.style.display = 'none';
    ordersSec.style.display = 'block';
    menuBtn.classList.remove('active');
    ordersBtn.classList.add('active');
    
    // Default to today's date if not already set, to ensure we only see specific date orders
    const dateInput = document.getElementById('orderDate');
    if (dateInput && !dateInput.value) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }
    
    loadOrders();
  }
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('orderDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // Handle tiered pricing visibility
    const categorySelect = document.getElementById('category');
    const tieredContainer = document.getElementById('tieredPriceContainer');
    if (categorySelect && tieredContainer) {
      categorySelect.addEventListener('change', () => {
        const isMultiPrice = ['Grill', 'Tandoori'].includes(categorySelect.value);
        tieredContainer.style.display = isMultiPrice ? 'grid' : 'none';
      });
    }

    const editCategorySelect = document.getElementById('editCategory');
    const editTieredContainer = document.getElementById('editTieredPriceContainer');
    if (editCategorySelect && editTieredContainer) {
      editCategorySelect.addEventListener('change', () => {
        const isMultiPrice = ['Grill', 'Tandoori'].includes(editCategorySelect.value);
        editTieredContainer.style.display = isMultiPrice ? 'grid' : 'none';
      });
    }
});

// Logout button
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('isAdminLoggedIn');
    window.location.href = 'admin.html';
  });
}

// --- MENU MANAGEMENT ---

// Load menu items on page load
loadMenuItems();

async function loadMenuItems() {
  try {
    const response = await fetch(`${API_BASE}/menu/admin/all`, {
      method: 'GET',
      headers: {
        'x-admin-auth': 'true'
      }
    });

    const result = await response.json();

    if (result.success) {
      allMenuItems = result.data;
      displayMenuItems(result.data);
    } else {
      document.getElementById('adminMenuList').innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">Failed to load menu items</p>`;
    }
  } catch (error) {
    document.getElementById('adminMenuList').innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">Error connecting to server</p>`;
  }
}

function filterAdminMenu() {
  const selectedCategory = document.getElementById('adminCategoryFilter').value;
  if (selectedCategory === 'all') {
    displayMenuItems(allMenuItems);
  } else {
    const filtered = allMenuItems.filter(item => item.category === selectedCategory);
    displayMenuItems(filtered);
  }
}

function displayMenuItems(items) {
  const container = document.getElementById('adminMenuList');
  if (!items || items.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No items found in this section.</p>';
    return;
  }

  // Refined grouping by category for admin view
  const categorized = {};
  items.forEach(item => {
    if (!categorized[item.category]) categorized[item.category] = [];
    categorized[item.category].push(item);
  });

  const categoryOrder = ['Biryani', 'Rice', 'Noodles', 'Grill', 'Tandoori', 'Gravy', 'Starters', 'Main Course'];
  const sortedCategories = Object.keys(categorized).sort((a, b) => {
    let indexA = categoryOrder.indexOf(a);
    let indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  container.innerHTML = sortedCategories.map(category => `
    <div class="category-admin-section reveal" style="margin-bottom: 50px; background: rgba(0,0,0,0.15); padding: 25px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.03);">
      <h2 style="font-size: 1.4rem; color: var(--primary); margin-bottom: 25px; display: flex; align-items: center; gap: 12px; font-family: 'Outfit';">
        <span style="display:inline-block; width:6px; height:24px; background:var(--primary); border-radius:4px; box-shadow: 0 0 15px rgba(212, 93, 38, 0.4);"></span>
        ${category || 'General'}
        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400; margin-left: auto;">${categorized[category].length} items</span>
      </h2>
      <div style="display: grid; gap: 20px;">
        ${categorized[category].map((item, index) => `
          <div class="admin-item-card" style="background: rgba(30, 41, 59, 0.4); border-color: rgba(255, 255, 255, 0.05); align-items: center;">
            ${item.image_path ? `
            <img src="${SERVER_URL + item.image_path}" 
                 onerror="this.style.display='none'" 
                 alt="${item.item_name}" class="admin-item-thumb" />
            ` : '<div class="admin-item-thumb" style="background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--text-muted);">🍽️</div>'}
            <div class="admin-item-info">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
                <h3 style="margin:0; font-size: 1.15rem;">${item.item_name}</h3>
                <span class="badge ${item.food_type === 'Non-Veg' ? 'nonveg' : 'veg'}" style="font-size: 0.65rem; padding: 3px 10px;">${item.food_type || 'Dish'}</span>
                <span style="font-size: 0.65rem; padding: 3px 10px; border-radius: 6px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; background: rgba(59, 130, 246, 0.15); color: #93c5fd;">${item.category || 'Menu'}</span>
                ${Number(item.is_special) === 1 ? '<span class="badge special-badge" style="font-size: 0.65rem; padding: 3px 10px;">SPECIAL</span>' : ''}
              </div>
              <p style="margin: 0 0 12px 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; max-width: 90%;">${item.description || 'No description provided'}</p>
              <div style="display: flex; gap: 15px; align-items: baseline;">
                <div style="font-weight: 800; color: var(--primary); font-size: 1.2rem;">₹${item.price}</div>
                ${item.price_quarter ? `<div style="font-size: 0.75rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px;">Q: ₹${item.price_quarter}</div>` : ''}
                ${item.price_half ? `<div style="font-size: 0.75rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px;">H: ₹${item.price_half}</div>` : ''}
                ${item.price_full ? `<div style="font-size: 0.75rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px;">F: ₹${item.price_full}</div>` : ''}
              </div>
            </div>
            <div class="admin-item-actions">
              <button class="small-btn edit-btn" onclick="editItem(${item.id})" style="padding: 10px 20px;">Edit</button>
              <button class="small-btn delete-btn" onclick="deleteItem(${item.id})" style="padding: 10px 20px;">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// Add new item form
if (document.getElementById('addItemForm')) {
  document.getElementById('addItemForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('item_name', document.getElementById('itemName').value.trim());
    formData.append('description', document.getElementById('description').value.trim());
    formData.append('price', parseFloat(document.getElementById('price').value));
    formData.append('price_quarter', document.getElementById('price_quarter').value ? parseFloat(document.getElementById('price_quarter').value) : '');
    formData.append('price_half', document.getElementById('price_half').value ? parseFloat(document.getElementById('price_half').value) : '');
    formData.append('price_full', document.getElementById('price_full').value ? parseFloat(document.getElementById('price_full').value) : '');
    formData.append('category', document.getElementById('category').value);
    formData.append('food_type', document.getElementById('foodType').value);
    formData.append('is_special', document.getElementById('isSpecial').checked);
    formData.append('is_available', document.getElementById('isAvailable').checked);
    
    const imageFile = document.getElementById('itemImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await fetch(`${API_BASE}/menu`, {
        method: 'POST',
        headers: { 'x-admin-auth': 'true' },
        body: formData
      });

      const result = await response.json();
      const statusMsg = document.getElementById('statusMessage');

      if (result.success) {
        statusMsg.textContent = 'Item added successfully!';
        statusMsg.style.color = 'var(--success)';
        document.getElementById('addItemForm').reset();
        loadMenuItems();
      } else {
        statusMsg.textContent = result.message || 'Failed to add item';
        statusMsg.style.color = 'var(--danger)';
      }
    } catch (error) {
      document.getElementById('statusMessage').textContent = 'Server connection error';
      document.getElementById('statusMessage').style.color = 'var(--danger)';
    }
  });
}

// --- ORDER MANAGEMENT ---

async function loadOrders() {
  const container = document.getElementById('adminOrdersList');
  const orderDate = document.getElementById('orderDate') ? document.getElementById('orderDate').value : '';
  
  let url = `${API_BASE}/orders/admin/all`;
  if (orderDate) {
    // Treat a single date as a range of one day
    url += `?startDate=${orderDate}&endDate=${orderDate}`;
  }

  try {
    const response = await fetch(url, {
      headers: { 'x-admin-auth': 'true' }
    });
    const result = await response.json();

    if (result.success) {
      displayOrders(result.data);
    } else {
      container.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">${result.message || 'Failed to load orders'}</p>`;
    }
  } catch (error) {
    container.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">Error connecting to server</p>`;
  }
}

function clearDateFilter() {
  if (document.getElementById('orderDate')) document.getElementById('orderDate').value = '';
  loadOrders();
}

function displayOrders(orders) {
  const container = document.getElementById('adminOrdersList');
  
  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No orders found.</p>';
    return;
  }

  container.innerHTML = orders.map((order, index) => {
    const date = new Date(order.created_at).toLocaleString();
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const tableNum = String(order.table_number).replace(/\D/g, '') || order.table_number;

    return `
      <div class="admin-item-card reveal order-card-refined" style="animation-delay: ${index * 0.05}s;">
        <!-- Card Header -->
        <div class="order-card-header">
          <div style="display: flex; align-items: center; gap: 18px;">
            <div class="table-badge ${order.order_type === 'Parcel' ? 'parcel-badge' : ''}">${order.order_type === 'Parcel' ? 'P' : tableNum}</div>
            <div class="order-meta">
              <div class="order-header-title">${order.order_type === 'Parcel' ? 'PARCEL' : 'TABLE ' + tableNum} ${order.customer_name ? '• ' + order.customer_name : ''}</div>
              <div class="order-id-label">Order #${order.id} • ${date}</div>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 15px;">
            <div class="status-dropdown-container">
              <div class="status-badge ${order.status.toLowerCase()}" onclick="toggleStatusDropdown(${order.id}, event)">
                <span class="status-dot dot-${order.status.toLowerCase()}"></span>
                ${order.status}
              </div>
              <div id="status-menu-${order.id}" class="status-dropdown-menu">
                <div class="status-option" onclick="selectOrderStatus(${order.id}, 'Pending')">
                  <span class="status-dot dot-pending"></span> Pending
                </div>
                <div class="status-option" onclick="selectOrderStatus(${order.id}, 'Processing')">
                  <span class="status-dot dot-processing"></span> Processing
                </div>
                ${order.order_type === 'Parcel' ? `
                <div class="status-option" onclick="selectOrderStatus(${order.id}, 'Delivered')">
                  <span class="status-dot dot-delivered"></span> Delivered
                </div>
                ` : ''}
                ${order.order_type === 'Dine-in' ? `
                <div class="status-option" onclick="selectOrderStatus(${order.id}, 'Completed')">
                  <span class="status-dot dot-completed"></span> Completed
                </div>
                ` : ''}
                <div class="status-option" onclick="selectOrderStatus(${order.id}, 'Cancelled')">
                  <span class="status-dot dot-cancelled"></span> Cancelled
                </div>
              </div>
            </div>
            ${(order.status === 'Completed' || order.status === 'Delivered') ? `
            <button class="add-item-badge" onclick="printBill(${JSON.stringify(order).replace(/"/g, '&quot;')})" style="background: rgba(59, 130, 246, 0.1) !important; color: #93c5fd !important; border-color: rgba(59, 130, 246, 0.2) !important;">
              <span>🖨️</span> Bill
            </button>
            ` : ''}
            <button class="add-item-badge" onclick="openQuickAdd(${order.id})" title="Add Item">
              <span>➕</span> Item
            </button>
          </div>
        </div>
        
        <!-- Card Items List -->
        <div class="order-items-container">
          <div style="padding: 10px 0;">
            ${items.map(item => `
              <div class="order-item-row">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="order-item-qty">${item.quantity}x</span>
                  <span style="font-weight: 500; color: var(--text-main);">${item.item_name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                  <span style="font-weight: 600; color: var(--text-muted);">₹${(item.price * item.quantity).toFixed(2)}</span>
                  <button class="remove-item-btn" onclick="removeItemFromOrder(${order.id}, ${item.order_item_id})" title="Remove Item">×</button>
                </div>
              </div>
            `).join('')}
          </div>
          
          <!-- Grand Total Bar -->
          <div class="order-total-refined">
            <span class="order-total-label">TOTAL AMOUNT DUE</span>
            <span class="order-total-value">₹${Number(order.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const response = await fetch(`${API_BASE}/orders/admin/${orderId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if ((await response.json()).success) {
      loadOrders(); // Refresh list to update UI
      
      // If completed or delivered, automatically offer to print GST bill
      if (newStatus === 'Completed' || newStatus === 'Delivered') {
        const url = `${API_BASE}/orders/admin/all`;
        const resp = await fetch(url, { headers: { 'x-admin-auth': 'true' } });
        const resJson = await resp.json();
        const updatedOrder = resJson.data.find(o => o.id == orderId);
        if (updatedOrder) printBill(updatedOrder);
      }
    }
  } catch (error) {
    alert('Error updating status');
  }
}

// --- GST BILL PRINT LOGIC ---
function printBill(order) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const subtotal = Number(order.total_amount);
  const gstRate = 2.5; // 2.5% CGST + 2.5% SGST = 5% Total
  const cgst = (subtotal * gstRate) / 100;
  const sgst = (subtotal * gstRate) / 100;
  const grandTotal = subtotal + cgst + sgst;
  const tableNum = String(order.table_number).replace(/\D/g, '') || order.table_number;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  const billHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NightEat Bill #${order.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
        body { 
          font-family: 'Courier Prime', monospace; 
          padding: 20px; 
          color: #000; 
          max-width: 300px; 
          margin: 0 auto;
          font-size: 14px;
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
        .rest-name { font-size: 20px; font-weight: bold; margin: 0; }
        .info { font-size: 12px; margin: 5px 0; }
        .bill-details { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { text-align: left; border-bottom: 1px dashed #000; padding: 5px 0; font-size: 12px; }
        td { padding: 5px 0; font-size: 13px; }
        .total-section { border-top: 1px dashed #000; padding-top: 10px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .grand-total { font-size: 18px; font-weight: bold; margin-top: 10px; border-top: 2px solid #000; padding-top: 5px; }
        .footer { text-align: center; margin-top: 30px; font-size: 11px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="header">
        <img src="${SERVER_URL}/pagene.png" alt="Logo" style="width: 80px; height: auto; margin-bottom: 10px;" />
        <h1 class="rest-name">NIGHTEAT</h1>
        <div class="info">Premium Multi-Cuisine Restaurant</div>
        <div class="info">GSTIN: 33AAAAA0000A1Z5</div>
        <div class="info">123, Moonlight Street, Food City</div>
      </div>

      <div class="bill-details">
        <div>ORD #${order.id}</div>
        <div>${new Date(order.created_at).toLocaleDateString()}</div>
      </div>
      <div class="bill-details">
        <div>Type: ${order.order_type}</div>
        <div>${order.order_type === 'Parcel' ? '' : 'Table: ' + tableNum}</div>
      </div>
      ${order.customer_name ? `<div class="info">Customer: ${order.customer_name}</div>` : ''}

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th style="text-align: right;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.item_name}</td>
              <td>${item.quantity}</td>
              <td style="text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>CGST (2.5%):</span>
          <span>₹${cgst.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>SGST (2.5%):</span>
          <span>₹${sgst.toFixed(2)}</span>
        </div>
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for dining with us!</p>
        <p>Follow us on Instagram @NightEat</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(billHtml);
  printWindow.document.close();
}

// Custom Dropdown Logic
function toggleStatusDropdown(orderId, event) {
  event.stopPropagation();
  // Close all other dropdowns
  document.querySelectorAll('.status-dropdown-menu').forEach(menu => {
    if (menu.id !== `status-menu-${orderId}`) menu.classList.remove('show');
  });
  
  const menu = document.getElementById(`status-menu-${orderId}`);
  menu.classList.toggle('show');
}

function selectOrderStatus(orderId, status) {
  updateOrderStatus(orderId, status);
  document.getElementById(`status-menu-${orderId}`).classList.remove('show');
}

async function deleteOrder(id) {
  if (typeof id === 'undefined') return;
  if (!confirm('Are you sure you want to permanently delete this order?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/orders/admin/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-auth': 'true' }
    });
    const result = await response.json();
    if (result.success) {
      loadOrders();
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    alert('Server error while deleting order');
  }
}

// Close dropdowns when clicking outside
window.addEventListener('click', () => {
  document.querySelectorAll('.status-dropdown-menu').forEach(menu => {
    menu.classList.remove('show');
  });
});

// --- EDIT MODAL LOGIC ---

let currentEditingItem = null;

async function editItem(id) {
  try {
    const response = await fetch(`${API_BASE}/menu/admin/all`, {
      method: 'GET',
      headers: { 'x-admin-auth': 'true' }
    });
    const result = await response.json();

    if (result.success) {
      const item = result.data.find(i => i.id === id);
      if (item) {
        currentEditingItem = item;
        document.getElementById('editItemId').value = item.id;
        document.getElementById('editItemName').value = item.item_name;
        document.getElementById('editDescription').value = item.description || '';
        document.getElementById('editPrice').value = item.price;
        document.getElementById('editPriceQuarter').value = item.price_quarter || '';
        document.getElementById('editPriceHalf').value = item.price_half || '';
        document.getElementById('editPriceFull').value = item.price_full || '';
        document.getElementById('editCategory').value = item.category;
        
        // Update tiered pricing visibility for edit modal
        const isMultiPrice = ['Grill', 'Tandoori'].includes(item.category);
        document.getElementById('editTieredPriceContainer').style.display = isMultiPrice ? 'grid' : 'none';

        document.getElementById('editFoodType').value = item.food_type;
        document.getElementById('editIsSpecial').checked = Boolean(Number(item.is_special));
        document.getElementById('editIsAvailable').checked = Boolean(Number(item.is_available));
        document.getElementById('removeImage').checked = false;
        
        const previewDiv = document.getElementById('currentImagePreview');
        const imgPath = item.image_path ? (item.image_path.startsWith('http') ? item.image_path : SERVER_URL + item.image_path) : null;
        previewDiv.innerHTML = imgPath 
          ? `<img src="${imgPath}" 
                  onerror="this.src='https://via.placeholder.com/300?text=No+Image+Found'" 
                  style="max-width: 100%; max-height: 120px; object-fit: contain;" />` 
          : '<div style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">No image available</div>';
        
        const modal = document.getElementById('editModal');
        modal.style.display = 'flex';
      }
    }
  } catch (error) {
    alert('Error loading item details');
  }
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEditingItem = null;
}

if (document.getElementById('editItemForm')) {
  document.getElementById('editItemForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const itemId = document.getElementById('editItemId').value;
    const formData = new FormData();
    formData.append('item_name', document.getElementById('editItemName').value.trim());
    formData.append('description', document.getElementById('editDescription').value.trim());
    formData.append('price', parseFloat(document.getElementById('editPrice').value));
    formData.append('price_quarter', document.getElementById('editPriceQuarter').value ? parseFloat(document.getElementById('editPriceQuarter').value) : '');
    formData.append('price_half', document.getElementById('editPriceHalf').value ? parseFloat(document.getElementById('editPriceHalf').value) : '');
    formData.append('price_full', document.getElementById('editPriceFull').value ? parseFloat(document.getElementById('editPriceFull').value) : '');
    formData.append('category', document.getElementById('editCategory').value);
    formData.append('food_type', document.getElementById('editFoodType').value);
    formData.append('is_special', document.getElementById('editIsSpecial').checked);
    formData.append('is_available', document.getElementById('editIsAvailable').checked);
    
    if (document.getElementById('removeImage').checked) formData.append('remove_image', 'true');
    const imageFile = document.getElementById('editItemImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await fetch(`${API_BASE}/menu/${itemId}`, {
        method: 'PUT',
        headers: { 'x-admin-auth': 'true' },
        body: formData
      });
      if ((await response.json()).success) {
        closeEditModal();
        loadMenuItems();
      }
    } catch (error) {
      alert('Error updating item');
    }
  });
}

async function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  try {
    const response = await fetch(`${API_BASE}/menu/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-auth': 'true' }
    });
    if ((await response.json()).success) loadMenuItems();
  } catch (error) {
    alert('Error deleting item');
  }
}

window.onclick = function (event) {
  const editModal = document.getElementById('editModal');
  const quickModal = document.getElementById('quickAddModal');
  const takeOrderModal = document.getElementById('takeOrderModal');
  if (editModal && event.target === editModal) closeEditModal();
  if (quickModal && event.target === quickModal) closeQuickAdd();
  if (takeOrderModal && event.target === takeOrderModal) closeTakeOrderModal();
}

// --- TAKE NEW ORDER LOGIC ---
let newOrderItems = [];

function openTakeOrderModal() {
  newOrderItems = [];
  updateNewOrderUI();
  
  const select = document.getElementById('modalItemSelect');
  select.innerHTML = allMenuItems.map(item => {
    // Basic price option
    let options = `<option value="${item.id}" data-price="${item.price}" data-name="${item.item_name}">${item.item_name} (Single) - ₹${item.price}</option>`;
    
    // Add size options if available
    if (item.price_quarter) options += `<option value="${item.id}" data-size="Quarter" data-price="${item.price_quarter}" data-name="${item.item_name}">${item.item_name} (Quarter) - ₹${item.price_quarter}</option>`;
    if (item.price_half) options += `<option value="${item.id}" data-size="Half" data-price="${item.price_half}" data-name="${item.item_name}">${item.item_name} (Half) - ₹${item.price_half}</option>`;
    if (item.price_full) options += `<option value="${item.id}" data-size="Full" data-price="${item.price_full}" data-name="${item.item_name}">${item.item_name} (Full) - ₹${item.price_full}</option>`;
    
    return options;
  }).join('');
  
  document.getElementById('takeOrderModal').style.display = 'flex';
}

function closeTakeOrderModal() {
  document.getElementById('takeOrderModal').style.display = 'none';
}

function toggleTableInput() {
  const type = document.getElementById('newOrderType').value;
  const group = document.getElementById('tableInputGroup');
  group.style.display = type === 'Dine-in' ? 'block' : 'none';
}

function addItemToNewOrder() {
  const select = document.getElementById('modalItemSelect');
  const qty = parseInt(document.getElementById('modalItemQty').value);
  const selectedOption = select.options[select.selectedIndex];
  
  if (!selectedOption) return;
  
  const id = parseInt(selectedOption.value);
  const name = selectedOption.dataset.name;
  const price = parseFloat(selectedOption.dataset.price);
  const size = selectedOption.dataset.size || null;
  
  // Use unique key for different sizes of the same item
  const itemKey = size ? `${id}_${size}` : `${id}`;
  const existing = newOrderItems.find(i => i.itemKey === itemKey);
  
  if (existing) {
    existing.quantity += qty;
  } else {
    newOrderItems.push({ id, itemKey, name, price, quantity: qty, size });
  }
  
  updateNewOrderUI();
}

function updateNewOrderUI() {
  const list = document.getElementById('newOrderItemsList');
  const totalDisplay = document.getElementById('newOrderTotal');
  
  if (newOrderItems.length === 0) {
    list.innerHTML = '<p style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">No items added yet</p>';
    totalDisplay.textContent = '₹0.00';
    return;
  }
  
  let total = 0;
  list.innerHTML = newOrderItems.map((item, index) => {
    total += item.price * item.quantity;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <span>${item.quantity}x ${item.name} ${item.size ? `<small style="color:var(--primary); opacity:0.8;">(${item.size})</small>` : ''}</span>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="color: var(--text-muted);">₹${(item.price * item.quantity).toFixed(2)}</span>
          <button onclick="removeNewOrderItem(${index})" style="background:none; border:none; color:var(--danger); cursor:pointer;">×</button>
        </div>
      </div>
    `;
  }).join('');
  
  totalDisplay.textContent = `₹${total.toFixed(2)}`;
}

function removeNewOrderItem(index) {
  newOrderItems.splice(index, 1);
  updateNewOrderUI();
}

async function submitNewOrder() {
  if (newOrderItems.length === 0) {
    alert('Please add at least one item');
    return;
  }
  
  const type = document.getElementById('newOrderType').value;
  const table = type === 'Parcel' ? 'Parcel' : (document.getElementById('newOrderTable').value || 'TBD');
  const customer = document.getElementById('newOrderCustomer').value.trim();
  
  const total = newOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const orderData = {
    table_number: table,
    customer_name: customer,
    order_type: type,
    items: newOrderItems.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price
    })),
    total_amount: total
  };

  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    if (result.success) {
      closeTakeOrderModal();
      switchSection('orders'); // Jump to orders page to see the new order
      loadOrders();
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    alert('Server error');
  }
}

// --- QUICK ADD (ADD-ON) LOGIC ---
function openQuickAdd(orderId) {
  document.getElementById('quickAddOrderId').value = orderId;
  const select = document.getElementById('quickAddItemSelect');
  
  // Populate dropdown with menu items
  select.innerHTML = allMenuItems.map(item => `
    <option value="${item.id}">${item.item_name} - ₹${item.price}</option>
  `).join('');
  
  document.getElementById('quickAddModal').style.display = 'flex';
}

function closeQuickAdd() {
  document.getElementById('quickAddModal').style.display = 'none';
}

if (document.getElementById('quickAddForm')) {
  document.getElementById('quickAddForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const orderId = document.getElementById('quickAddOrderId').value;
    const itemId = document.getElementById('quickAddItemSelect').value;
    const qty = document.getElementById('quickAddQuantity').value;

    try {
      const response = await fetch(`${API_BASE}/orders/admin/${orderId}/add-item`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-auth': 'true'
        },
        body: JSON.stringify({ item_id: itemId, quantity: parseInt(qty) })
      });

      if ((await response.json()).success) {
        closeQuickAdd();
        loadOrders(); // Refresh list to show new total and items
      }
    } catch (error) {
      alert('Error adding item to order');
    }
  });
}

async function removeItemFromOrder(orderId, orderItemId) {
  // We use orderItemId which is safe and unique
  if (!confirm('Are you sure you want to remove this item from the order?')) return;
  
  const url = `${API_BASE}/orders/admin/remove-item/${orderItemId}`;
  console.log('Sending DELETE request to:', url);

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'x-admin-auth': 'true' }
    });
    
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server responded with status ${response.status}. Details: ${text.substring(0, 100)}`);
    }

    const result = await response.json();
    if (result.success) {
      loadOrders(); // Refresh table
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    alert('DEBUG ERROR INFO:\n' + error.message + '\n\nPlease ensure the backend server is restarted.');
  }
}