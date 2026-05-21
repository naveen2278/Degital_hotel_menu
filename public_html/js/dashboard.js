const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin;
const API_BASE = `${SERVER_URL}/api`;
let allMenuItems = [];
let allCategories = [];
let currentComboItems = [];
let editComboItems = [];
let allLoadedOrders = [];
let currentStatusFilter = 'all';
let parcelStatus = 'open';

document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in (verify via localStorage, sessionStorage, or cookies to prevent refresh logouts)
    const isLocal = localStorage.getItem('isAdminLoggedIn') === 'true';
    const isSession = sessionStorage.getItem('isAdminLoggedIn') === 'true';
    const isCookie = document.cookie.split(';').some(item => item.trim().startsWith('isAdminLoggedIn=true'));
    
    if (!(isLocal || isSession || isCookie) && window.location.pathname.includes('dashboard')) {
        window.location.href = 'admin.html';
        return;
    }

    loadCategories();
    loadMenuItems();
    loadOrders();
    loadShopStatus();
    loadParcelStatus();
    
    // Auto-refresh orders every 15 seconds
    setInterval(loadOrders, 15000);

    // Logout logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isAdminLoggedIn');
            sessionStorage.removeItem('isAdminLoggedIn');
            document.cookie = "isAdminLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            window.location.href = 'admin.html';
        });
    }

    const dateInput = document.getElementById('orderDateFilter');
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
  const comboCategorySelect = document.getElementById('comboCategorySelect');
  const editComboCategorySelect = document.getElementById('editComboCategorySelect');
  const comboAssignCategory = document.getElementById('comboAssignCategory');

  const optionsHTML = allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

  if (addSelect) {
    addSelect.innerHTML = '<option value="" selected>Select Category</option>' + optionsHTML;
  }
  if (editSelect) {
    editSelect.innerHTML = '<option value="" selected>Select Category</option>' + optionsHTML + '<option value="Combos" style="display:none;">Combos</option>';
  }
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="All" selected>All Categories</option>' + optionsHTML;
  }
  if (comboCategorySelect) {
    comboCategorySelect.innerHTML = '<option value="All" selected>All Categories</option>' + optionsHTML;
  }
  if (comboAssignCategory) {
    comboAssignCategory.innerHTML = '<option value="" selected>Select Category</option>' + optionsHTML + '<option value="Combos">Combos (Global)</option>';
  }
  if (editComboCategorySelect) {
    editComboCategorySelect.innerHTML = '<option value="All" selected>All Categories</option>' + optionsHTML;
  }
  const modalCategorySelect = document.getElementById('modalCategorySelect');
  if (modalCategorySelect) {
    modalCategorySelect.innerHTML = '<option value="All" selected>All Categories</option>' + optionsHTML;
  }
  const quickAddCategorySelect = document.getElementById('quickAddCategorySelect');
  if (quickAddCategorySelect) {
    quickAddCategorySelect.innerHTML = '<option value="All" selected>All Categories</option>' + optionsHTML;
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

// Category Management (Delete)
function openManageCategoriesModal() {
  document.getElementById('categoryModal').style.display = 'flex';
  renderCategoryManagementList();
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
}

function renderCategoryManagementList() {
  const list = document.getElementById('categoryManagementList');
  if (!list) return;

  if (allCategories.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No categories found.</p>';
    return;
  }

  list.innerHTML = allCategories.map(cat => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05);">
      <span style="color: var(--text-main); font-weight: 500;">${cat.name}</span>
      <button onclick="deleteCategory(${cat.id}, '${cat.name}')" style="background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); padding: 5px 10px; border-radius: 8px; cursor: pointer; font-size: 0.75rem;">Remove</button>
    </div>
  `).join('');
}

async function deleteCategory(id, name) {
  if (!confirm(`Are you sure you want to remove the category "${name}"?`)) return;

  try {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (result.success) {
      await loadCategories(); // Refresh all dropdowns
      renderCategoryManagementList(); // Refresh this list
    } else {
      alert(result.message || 'Failed to remove category');
    }
  } catch (error) {
    alert('Server error while removing category');
  }
}

// Section Switching
function switchSection(section) {
  const sections = {
    menu: document.getElementById('menuSection'),
    combo: document.getElementById('comboSection'),
    orders: document.getElementById('ordersSection')
  };
  const buttons = {
    menu: document.getElementById('showMenuBtn'),
    combo: document.getElementById('showComboBtn'),
    orders: document.getElementById('showOrdersBtn')
  };

  Object.keys(sections).forEach(key => {
    if (sections[key]) {
      if (key === section) {
        sections[key].style.display = (key === 'orders' ? 'block' : 'grid');
        sections[key].classList.add('section-fade');
        buttons[key].classList.add('active');
        
        // Refresh data for the section
        if (key === 'orders') {
          const dateInput = document.getElementById('orderDateFilter');
          if (dateInput && !dateInput.value) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
          }
          loadOrders();
        } else {
          loadMenuItems();
        }
      } else {
        sections[key].style.display = 'none';
        sections[key].classList.remove('section-fade');
        buttons[key].classList.remove('active');
      }
    }
  });
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('orderDateFilter');
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
    sessionStorage.removeItem('isAdminLoggedIn');
    document.cookie = "isAdminLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
      const regularItems = allMenuItems.filter(i => i.food_type !== 'Combo');
      const comboItems = allMenuItems.filter(i => i.food_type === 'Combo');
      
      displayMenuItems(regularItems, 'adminMenuList');
      displayMenuItems(comboItems, 'adminComboList');
      
      populateComboItemSelect(regularItems);
      
      // Filter menu if currently active
      filterAdminMenu();
    } else {
      document.getElementById('adminMenuList').innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">Failed to load menu items</p>`;
    }
  } catch (error) {
    document.getElementById('adminMenuList').innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">Error connecting to server</p>`;
  }
}

function populateComboItemSelect(items) {
  const select = document.getElementById('comboItemSelect');
  if (!select) return;
  const category = document.getElementById('comboCategorySelect') ? document.getElementById('comboCategorySelect').value : 'All';
  let itemsToShow = items;
  if (category !== 'All') {
    itemsToShow = items.filter(i => i.category === category);
  }
  select.innerHTML = '<option value="" disabled selected>Select an item</option>' + 
    itemsToShow.map(i => `<option value="${i.item_name}">${i.item_name}</option>`).join('');
}

function filterComboItems(categorySelectId, itemSelectId) {
  if (itemSelectId === 'comboItemSelect') {
    const regularItems = allMenuItems.filter(i => i.food_type !== 'Combo');
    populateComboItemSelect(regularItems);
    const sizeSelect = document.getElementById('comboItemSize');
    if (sizeSelect) sizeSelect.style.display = 'none';
  } else if (itemSelectId === 'editComboItemSelect') {
    populateEditComboItemSelect();
    const sizeSelect = document.getElementById('editComboItemSize');
    if (sizeSelect) sizeSelect.style.display = 'none';
  }
}

function checkComboItemSize(selectId, sizeSelectId) {
  const select = document.getElementById(selectId);
  const sizeSelect = document.getElementById(sizeSelectId);
  if (!select || !sizeSelect) return;
  
  const itemName = select.value;
  const item = allMenuItems.find(i => i.item_name === itemName);
  if (item && (item.category === 'Grill' || item.category === 'Tandoori')) {
    sizeSelect.style.display = 'block';
  } else {
    sizeSelect.style.display = 'none';
  }
}

function addItemToCombo() {
  const select = document.getElementById('comboItemSelect');
  const sizeSelect = document.getElementById('comboItemSize');
  const qtyInput = document.getElementById('comboItemQty');
  
  if (!select || !select.value) {
    alert("Please select an item first.");
    return;
  }
  
  let itemName = select.value;
  const item = allMenuItems.find(i => i.item_name === itemName);
  if (item && (item.category === 'Grill' || item.category === 'Tandoori')) {
    const size = sizeSelect.value;
    itemName = `${itemName} (${size})`;
  }

  const qty = parseInt(qtyInput.value) || 1;
  
  const existing = currentComboItems.find(i => i.name === itemName);
  if (existing) {
    existing.qty += qty;
  } else {
    currentComboItems.push({ name: itemName, qty: qty });
  }
  
  qtyInput.value = 1;
  select.value = "";
  if (sizeSelect) {
    sizeSelect.style.display = "none";
    sizeSelect.value = "Quarter";
  }
  
  renderComboItemsList();
}

function removeComboItem(index) {
  currentComboItems.splice(index, 1);
  renderComboItemsList();
}

function renderComboItemsList() {
  const container = document.getElementById('comboItemsList');
  const textarea = document.getElementById('comboDescription');
  if (!container || !textarea) return;
  
  if (currentComboItems.length === 0) {
    container.innerHTML = '<p style="text-align:center; color: var(--text-muted); font-size: 0.85rem; margin: 10px 0;">No items added yet</p>';
    textarea.value = '';
    return;
  }
  
  container.innerHTML = currentComboItems.map((item, index) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(255,255,255,0.05); margin-bottom: 5px; border-radius: 6px;">
      <span style="font-size: 0.9rem; color: var(--text-main);">${item.qty}x ${item.name}</span>
      <button type="button" onclick="removeComboItem(${index})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem;">&times;</button>
    </div>
  `).join('');
  
  textarea.value = currentComboItems.map(i => `${i.qty}x ${i.name}`).join(' + ');
}

function filterAdminMenu() {
  const selectedCategory = document.getElementById('adminCategoryFilter').value;
  let itemsToShow = allMenuItems.filter(i => i.food_type !== 'Combo');
  
  if (selectedCategory !== 'All' && selectedCategory !== 'all') {
    itemsToShow = itemsToShow.filter(item => item.category === selectedCategory);
  }
  
  displayMenuItems(itemsToShow, 'adminMenuList');
}

function displayMenuItems(items, containerId = 'adminMenuList') {
  const container = document.getElementById(containerId);
  if (!container) return;
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

  container.innerHTML = sortedCategories.map((category, catIndex) => `
    <div class="category-admin-section reveal stagger-${(catIndex % 5) + 1}" style="margin-bottom: 50px; background: rgba(0,0,0,0.25); padding: 25px; border-radius: 28px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px); box-shadow: 0 15px 35px rgba(0,0,0,0.2);">
      <h2 style="font-size: 1.5rem; color: var(--primary); margin-bottom: 25px; display: flex; align-items: center; gap: 12px; font-family: 'Outfit';">
        <span style="display:inline-block; width:6px; height:24px; background:var(--primary); border-radius:4px; box-shadow: 0 0 20px rgba(212, 93, 38, 0.5);"></span>
        ${category || 'General'}
        <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 400; margin-left: auto; background: rgba(255,255,255,0.03); padding: 4px 12px; border-radius: 20px;">${categorized[category].length} items</span>
      </h2>
      <div style="display: grid; gap: 20px;">
        ${categorized[category].map((item, index) => `
          <div class="admin-item-card" style="background: rgba(30, 41, 59, 0.3); border-color: rgba(255, 255, 255, 0.03); align-items: center; transition: all 0.3s ease; border-radius: 18px;">
            ${item.image_path ? `
            <div style="position: relative; overflow: hidden; border-radius: 12px; width: 100px; height: 100px;">
              <img src="${SERVER_URL + item.image_path.replace('/uploads/menu/', '/uploads/')}" 
                   onerror="this.parentElement.style.display='none'" 
                   alt="${item.item_name}" style="width: 100%; height: 100%; object-fit: cover; transition: 0.5s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" />
            </div>
            ` : '<div class="admin-item-thumb" style="background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--text-muted); border-radius: 12px;">🍽️</div>'}
            <div class="admin-item-info">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
                <h3 style="margin:0; font-size: 1.2rem; color: var(--text-main);">${item.item_name}</h3>
                <span class="badge ${item.food_type === 'Non-Veg' ? 'nonveg' : (item.food_type === 'Combo' ? 'combo' : 'veg')}" style="font-size: 0.65rem; padding: 4px 12px;">${item.food_type || 'Dish'}</span>
                ${Number(item.is_special) === 1 ? '<span class="badge special-badge" style="font-size: 0.65rem; padding: 4px 12px; background: linear-gradient(135deg, #f43f5e, #fb7185); box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);">SPECIAL</span>' : ''}
              </div>
              <p style="margin: 0 0 12px 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; max-width: 90%; opacity: 0.8;">${item.description || 'No description provided'}</p>
              <div style="display: flex; gap: 15px; align-items: center;">
                <div style="font-weight: 800; color: var(--primary); font-size: 1.3rem; letter-spacing: -0.5px;">₹${item.price}</div>
                <div style="display: flex; gap: 8px;">
                  ${item.price_quarter ? `<div style="font-size: 0.7rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03);">Q: ₹${item.price_quarter}</div>` : ''}
                  ${item.price_half ? `<div style="font-size: 0.7rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03);">H: ₹${item.price_half}</div>` : ''}
                  ${item.price_full ? `<div style="font-size: 0.7rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03);">F: ₹${item.price_full}</div>` : ''}
                </div>
              </div>
            </div>
            <div class="admin-item-actions" style="gap: 12px;">
              <button class="small-btn edit-btn" style="padding: 8px 20px; border-radius: 10px;" onclick="editItem(${item.id})">Edit</button>
              <button class="small-btn delete-btn" style="padding: 8px 20px; border-radius: 10px;" onclick="deleteItem(${item.id})">Delete</button>
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

// --- AI DESCRIPTION GENERATOR ---
async function generateDescriptionWithAI(nameInputId, categoryInputId, descInputId, btnId) {
  const name = document.getElementById(nameInputId).value.trim();
  const category = document.getElementById(categoryInputId).value;
  
  if (!name) {
    alert('Please enter an Item Name first to generate a description.');
    return;
  }

  const btn = document.getElementById(btnId);
  const originalText = btn.innerHTML;
  btn.innerHTML = '✨ Generating...';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  try {
    const response = await fetch(`${API_BASE}/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
      body: JSON.stringify({ itemName: name, category: category || 'Other' })
    });
    
    const result = await response.json();
    if (result.success) {
      document.getElementById(descInputId).value = result.description;
    } else {
      alert(result.message || 'Failed to generate description.');
    }
  } catch (error) {
    alert('Network error while connecting to AI service.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

// Add new combo form
if (document.getElementById('addComboForm')) {
  document.getElementById('addComboForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('item_name', document.getElementById('comboName').value.trim());
    formData.append('description', document.getElementById('comboDescription').value.trim());
    formData.append('price', parseFloat(document.getElementById('comboPrice').value));
    formData.append('price_quarter', '');
    formData.append('price_half', '');
    formData.append('price_full', '');
    formData.append('category', document.getElementById('comboAssignCategory').value || 'Combos');
    formData.append('food_type', 'Combo');
    formData.append('is_special', document.getElementById('comboIsSpecial').checked);
    formData.append('is_available', document.getElementById('comboIsAvailable').checked);
    
    const imageFile = document.getElementById('comboImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await fetch(`${API_BASE}/menu`, {
        method: 'POST',
        headers: { 'x-admin-auth': 'true' },
        body: formData
      });

      const result = await response.json();
      const statusMsg = document.getElementById('comboStatusMessage');

      if (result.success) {
        statusMsg.textContent = 'Combo added successfully!';
        statusMsg.style.color = 'var(--success)';
        document.getElementById('addComboForm').reset();
        currentComboItems = [];
        renderComboItemsList();
        loadMenuItems();
      } else {
        statusMsg.textContent = result.message || 'Failed to add combo';
        statusMsg.style.color = 'var(--danger)';
      }
    } catch (error) {
      document.getElementById('comboStatusMessage').textContent = 'Server connection error';
      document.getElementById('comboStatusMessage').style.color = 'var(--danger)';
    }
  });
}

// --- ORDER MANAGEMENT ---

async function loadOrders() {
  const container = document.getElementById('adminOrdersList');
  const orderDate = document.getElementById('orderDateFilter') ? document.getElementById('orderDateFilter').value : '';
  
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
      allLoadedOrders = result.data;
      updateStatusCounts();
      filterOrders(); // display orders based on current search input
    } else {
      container.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">${result.message || 'Failed to load orders'}</p>`;
      updateStatusCounts();
    }
  } catch (error) {
    container.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">Error connecting to server</p>`;
    updateStatusCounts();
  }
}

function updateStatusCounts() {
  const total = allLoadedOrders.length;
  const pending = allLoadedOrders.filter(o => o.status === 'Pending').length;
  const accepted = allLoadedOrders.filter(o => o.status === 'Accepted').length;
  const delivered = allLoadedOrders.filter(o => o.status === 'Delivered').length;
  const completed = allLoadedOrders.filter(o => o.status === 'Completed').length;
  const cancelled = allLoadedOrders.filter(o => o.status === 'Cancelled').length;

  if (document.getElementById('count-all')) document.getElementById('count-all').textContent = total;
  if (document.getElementById('orderCountNumber')) document.getElementById('orderCountNumber').textContent = total;
  if (document.getElementById('count-pending')) document.getElementById('count-pending').textContent = pending;
  if (document.getElementById('count-accepted')) document.getElementById('count-accepted').textContent = accepted;
  if (document.getElementById('count-delivered')) document.getElementById('count-delivered').textContent = delivered;
  if (document.getElementById('count-completed')) document.getElementById('count-completed').textContent = completed;
  if (document.getElementById('count-cancelled')) document.getElementById('count-cancelled').textContent = cancelled;
}

function setStatusFilter(status) {
  currentStatusFilter = status;
  
  // Update active class on status buttons
  const buttons = document.querySelectorAll('.status-filter-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-status') === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  filterOrders();
}

function clearDateFilter() {
  if (document.getElementById('orderDateFilter')) document.getElementById('orderDateFilter').value = '';
  loadOrders();
}

function filterOrders() {
  const searchInput = document.getElementById('orderSearch');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  let filtered = allLoadedOrders;
  
  // If there is an active search query, search globally across all order statuses
  if (searchTerm) {
    filtered = filtered.filter(order => {
      const orderId = String(order.id);
      const dailyOrderNum = String(order.daily_order_number || '');
      const tableNum = String(order.table_number || '').toLowerCase();
      const customerName = String(order.customer_name || '').toLowerCase();
      
      // If searchTerm is a simple short number (like "1", "2"), match daily order, table, or order ID exactly
      const isSimpleNumber = /^\d+$/.test(searchTerm) && searchTerm.length <= 3;
      if (isSimpleNumber) {
        // Strip non-digits from table number to compare exactly, e.g. "Table 04" -> "4"
        const cleanTableNum = tableNum.replace(/\D/g, '');
        return dailyOrderNum === searchTerm || 
               cleanTableNum === searchTerm || 
               tableNum === searchTerm ||
               orderId === searchTerm;
      }
      
      // Otherwise, perform standard substring matching
      return orderId.includes(searchTerm) || 
             dailyOrderNum.includes(searchTerm) || 
             tableNum.includes(searchTerm) || 
             customerName.includes(searchTerm);
    });
  } else {
    // Otherwise, filter based on the active status tab
    if (currentStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === currentStatusFilter);
    }
  }
  
  displayOrders(filtered);
}

function displayOrders(orders) {
  const container = document.getElementById('adminOrdersList');
  
  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No orders found.</p>';
    return;
  }

  container.innerHTML = orders.map((order, index) => {
    try {
      const date = order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A';
      
      let items = [];
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      } catch (err) {
        console.error("Failed to parse items for order:", order, err);
      }
      
      if (!Array.isArray(items)) {
        items = [];
      }

      const tableNum = order.table_number !== null && order.table_number !== undefined
        ? (String(order.table_number).replace(/\D/g, '') || order.table_number)
        : 'N/A';

      const status = order.status || 'Pending';
      const statusClass = status.toLowerCase();

      return `
        <div class="admin-item-card reveal order-card-refined" style="animation-delay: ${index * 0.05}s;">
          <!-- Card Header -->
          <div class="order-card-header">
            <div style="display: flex; align-items: center; gap: 18px;">
              <div class="table-badge ${order.order_type === 'Parcel' ? 'parcel-badge' : ''}">${order.order_type === 'Parcel' ? 'P' : tableNum}</div>
              <div class="order-meta">
                <div class="order-header-title">${order.order_type === 'Parcel' ? 'PARCEL' : 'TABLE ' + tableNum} ${order.customer_name ? '• ' + order.customer_name : ''}</div>
                <div class="order-id-label">Order #${order.daily_order_number || order.id} • ${date}</div>
              </div>
            </div>
            
            <div class="order-header-actions" style="display: flex; align-items: center; gap: 15px; margin-left: auto;">
              <div class="status-dropdown-container">
                <div class="status-badge ${statusClass}" onclick="toggleStatusDropdown(${order.id}, event)">
                  <span class="status-dot dot-${statusClass}"></span>
                  ${status}
                </div>
                <div id="status-menu-${order.id}" class="status-dropdown-menu">
                  <div class="status-option" onclick="selectOrderStatus(${order.id}, 'Pending')">
                    <span class="status-dot dot-pending"></span> Pending
                  </div>
                  <div class="status-option" onclick="selectOrderStatus(${order.id}, 'Accepted')">
                    <span class="status-dot dot-accepted"></span> Accepted
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
              ${(status === 'Completed' || status === 'Delivered') ? `
              <button class="add-item-badge desktop-only-bill" onclick="printBill(${JSON.stringify(order).replace(/"/g, '&quot;')})" style="background: rgba(59, 130, 246, 0.1) !important; color: #93c5fd !important; border-color: rgba(59, 130, 246, 0.2) !important;">
                <span>🖨️</span> Bill
              </button>
              ` : ''}
              ${status === 'Cancelled' ? `
              <button class="add-item-badge" onclick="deleteOrder(${order.id})" style="background: rgba(239, 68, 68, 0.1) !important; color: #f87171 !important; border-color: rgba(239, 68, 68, 0.2) !important;" title="Delete Order">
                <span>🗑️</span> Delete
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
               ${items.map(item => {
                 const menuItem = allMenuItems.find(m => m.item_name === item.item_name);
                 const foodType = menuItem ? menuItem.food_type : item.food_type;
                 const description = menuItem ? menuItem.description : item.description;
                 const itemQty = item.quantity || 1;
                 const itemPrice = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
                 return `
                <div class="order-item-row" style="flex-direction: column; align-items: flex-start; gap: 5px;">
                  <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <span class="order-item-qty">${itemQty}x</span>
                      <span style="font-weight: 500; color: var(--text-main);">${item.item_name || 'Unknown Item'}</span>
                      ${foodType === 'Combo' ? `<span class="badge combo" style="font-size: 0.6rem; padding: 2px 6px;">COMBO PACK</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                      <span style="font-weight: 600; color: var(--text-muted);">₹${(itemPrice * itemQty).toFixed(2)}</span>
                      <button class="remove-item-btn" onclick="removeItemFromOrder(${order.id}, ${item.order_item_id})" title="Remove Item">×</button>
                    </div>
                  </div>
                  ${foodType === 'Combo' && description ? `
                  <div style="padding-left: 36px; font-size: 0.8rem; color: var(--text-muted); opacity: 0.8; line-height: 1.4;">
                    Included: ${description}
                  </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
            </div>
            
            <!-- Grand Total Bar -->
            <div class="order-total-refined">
              <span class="order-total-label">TOTAL AMOUNT DUE</span>
              <span class="order-total-value">₹${Number(order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error("Critical error rendering individual order:", order, err);
      return '';
    }
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
      
      // If accepted, automatically print KOT (TEMPORARILY DISABLED AS REQUESTED - UNCOMMENT TO RE-ENABLE IN THE FUTURE)
      /*
      if (newStatus === 'Accepted') {
        const url = `${API_BASE}/orders/admin/all`;
        const resp = await fetch(url, { headers: { 'x-admin-auth': 'true' } });
        const resJson = await resp.json();
        const updatedOrder = resJson.data.find(o => o.id == orderId);
        if (updatedOrder) printKOT(updatedOrder);
      }
      */

      // If completed or delivered, automatically offer to print GST bill (only on desktop/laptop)
      if ((newStatus === 'Completed' || newStatus === 'Delivered') && window.innerWidth > 768) {
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

// --- BILL PRINT LOGIC ---
function printBill(order) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const subtotal = Number(order.total_amount);
  const grandTotal = subtotal;
  const tableNum = String(order.table_number).replace(/\D/g, '') || order.table_number;
  
  // UPI Payment Details
  const upiId = 'sumancmb7-3@oksbi';
  const merchantName = 'NightEat';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${grandTotal.toFixed(2)}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

  const printWindow = window.open('', '_blank', 'width=400,height=700');
  
  const billHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NightEat Bill #${order.daily_order_number || order.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
        @page { margin: 0; size: auto; }
        * { box-sizing: border-box; }
        body { 
          font-family: 'Courier Prime', monospace; 
          margin: 0; 
          padding: 10px; 
          color: #000; 
          width: 100%; 
          max-width: 100%; 
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
        
        .payment-section { 
          margin-top: 25px; 
          text-align: center; 
          border-top: 1px dashed #000; 
          padding-top: 20px;
        }
        .qr-code { width: 130px; height: 130px; margin: 0 auto 10px; }
        .upi-id { font-size: 10px; color: #555; }
        .scan-text { font-weight: bold; margin-bottom: 5px; font-size: 12px; }
        
        .footer { text-align: center; margin-top: 30px; margin-bottom: 20px; font-size: 11px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="header">
        <img src="${SERVER_URL}/pagene.png" alt="Logo" style="width: 80px; height: auto; margin-bottom: 10px;" />
        <h1 class="rest-name">NIGHTEAT</h1>
        <div class="info">Premium Multi-Cuisine Restaurant</div>
        <div class="info">Address: Guruvayur Nagar, Malumichampatti, Tamil Nadu 641050</div>
        <div class="info">Phone: 082205 00670</div>
      </div>

      <div class="bill-details">
        <div>ORD #${order.daily_order_number || order.id}</div>
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
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="payment-section">
        <div class="scan-text">SCAN TO PAY</div>
        <img class="qr-code" src="${qrCodeUrl}" alt="Payment QR Code" />
        <div class="upi-id">UPI ID: ${upiId}</div>
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

// --- KOT PRINT LOGIC ---
function printKOT(order) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const tableNum = String(order.table_number).replace(/\D/g, '') || order.table_number;
  
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  
  const kotHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>KOT #${order.daily_order_number || order.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
        @page { margin: 0; size: auto; }
        * { box-sizing: border-box; }
        body { 
          font-family: 'Courier Prime', monospace; 
          margin: 0; 
          padding: 8px; 
          color: #000; 
          width: 100%; 
          max-width: 100%; 
          font-size: 16px;
        }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .kot-title { font-size: 24px; font-weight: bold; margin: 0; }
        .info { font-size: 14px; margin: 5px 0; }
        .bill-details { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { text-align: left; border-bottom: 2px solid #000; padding: 5px 0; font-size: 14px; }
        td { padding: 8px 0; font-size: 16px; font-weight: bold; border-bottom: 1px dashed #ccc; }
        .qty-col { text-align: center; font-size: 18px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="header">
        <h1 class="kot-title">KOT</h1>
        <div class="info">ORD #${order.daily_order_number || order.id}</div>
        <div class="info">${new Date().toLocaleString()}</div>
      </div>

      <div class="bill-details">
        <div>Type: ${order.order_type}</div>
        ${order.order_type !== 'Parcel' ? `<div>Table: ${tableNum}</div>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.item_name} ${item.size ? `(${item.size})` : ''}</td>
              <td class="qty-col">${item.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(kotHtml);
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

// --- EDIT COMBO ITEMS LOGIC ---
function populateEditComboItemSelect() {
  const select = document.getElementById('editComboItemSelect');
  if (!select) return;
  const category = document.getElementById('editComboCategorySelect') ? document.getElementById('editComboCategorySelect').value : 'All';
  const regularItems = allMenuItems.filter(i => i.food_type !== 'Combo');
  let itemsToShow = regularItems;
  if (category !== 'All') {
    itemsToShow = regularItems.filter(i => i.category === category);
  }
  select.innerHTML = '<option value="" disabled selected>Select an item to add...</option>' + 
    itemsToShow.map(item => `<option value="${item.item_name}">${item.item_name}</option>`).join('');
}

function addEditItemToCombo() {
  const select = document.getElementById('editComboItemSelect');
  const sizeSelect = document.getElementById('editComboItemSize');
  const qtyInput = document.getElementById('editComboItemQty');
  let itemName = select.value;
  const qty = parseInt(qtyInput.value);

  if (!itemName || isNaN(qty) || qty < 1) return;

  const item = allMenuItems.find(i => i.item_name === itemName);
  if (item && (item.category === 'Grill' || item.category === 'Tandoori')) {
    const size = sizeSelect.value;
    itemName = `${itemName} (${size})`;
  }

  const existing = editComboItems.find(i => i.name === itemName);
  if (existing) {
    existing.qty += qty;
  } else {
    editComboItems.push({ name: itemName, qty: qty });
  }

  select.value = '';
  if (sizeSelect) {
    sizeSelect.style.display = 'none';
    sizeSelect.value = 'Quarter';
  }
  qtyInput.value = 1;
  renderEditComboItemsList();
}

function removeEditComboItem(index) {
  editComboItems.splice(index, 1);
  renderEditComboItemsList();
}

function renderEditComboItemsList() {
  const list = document.getElementById('editComboItemsList');
  const textarea = document.getElementById('editComboDescription');
  
  if (editComboItems.length === 0) {
    list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0; text-align: center; padding: 10px;">No items added to this combo yet.</p>';
    textarea.value = '';
    return;
  }

  list.innerHTML = editComboItems.map((item, index) => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
      <div style="display: flex; gap: 10px; align-items: center;">
        <span style="font-weight: 700; color: var(--primary); background: rgba(212, 93, 38, 0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.85rem;">${item.qty}x</span>
        <span style="color: var(--text-main); font-size: 0.95rem;">${item.name}</span>
      </div>
      <button type="button" onclick="removeEditComboItem(${index})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem;">&times;</button>
    </div>
  `).join('');

  textarea.value = editComboItems.map(i => `${i.qty}x ${i.name}`).join(' + ');
}

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
        
        const isCombo = item.food_type === 'Combo';
        if (isCombo) {
          document.getElementById('editDescriptionGroup').style.display = 'none';
          document.getElementById('editComboBuilderGroup').style.display = 'block';
          
          editComboItems = [];
          if (item.description) {
            const parts = item.description.split(' + ');
            parts.forEach(part => {
              const match = part.match(/^(\d+)x\s+(.*)$/);
              if (match) {
                editComboItems.push({ qty: parseInt(match[1]), name: match[2].trim() });
              }
            });
          }
          
          populateEditComboItemSelect();
          renderEditComboItemsList();
        } else {
          document.getElementById('editDescriptionGroup').style.display = 'block';
          document.getElementById('editComboBuilderGroup').style.display = 'none';
        }
        
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
    
    let finalDescription = document.getElementById('editDescription').value.trim();
    if (document.getElementById('editComboBuilderGroup').style.display === 'block') {
      finalDescription = document.getElementById('editComboDescription').value.trim();
    }
    formData.append('description', finalDescription);
    
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

function filterModalItems() {
  const select = document.getElementById('modalItemSelect');
  const categorySelect = document.getElementById('modalCategorySelect');
  const category = categorySelect ? categorySelect.value : 'All';
  
  let itemsToShow = allMenuItems;
  if (category !== 'All') {
    itemsToShow = itemsToShow.filter(i => i.category === category);
  }
  
  const optionsHTML = itemsToShow.map(item => {
    // Basic price option
    let options = `<option value="${item.id}" data-price="${item.price}" data-name="${item.item_name}">${item.item_name} (Single) - ₹${item.price}</option>`;
    
    // Add size options if available
    if (item.price_quarter) options += `<option value="${item.id}" data-size="Quarter" data-price="${item.price_quarter}" data-name="${item.item_name}">${item.item_name} (Quarter) - ₹${item.price_quarter}</option>`;
    if (item.price_half) options += `<option value="${item.id}" data-size="Half" data-price="${item.price_half}" data-name="${item.item_name}">${item.item_name} (Half) - ₹${item.price_half}</option>`;
    if (item.price_full) options += `<option value="${item.id}" data-size="Full" data-price="${item.price_full}" data-name="${item.item_name}">${item.item_name} (Full) - ₹${item.price_full}</option>`;
    
    return options;
  }).join('');

  select.innerHTML = '<option value="" disabled selected>Select an item...</option>' + optionsHTML;
}

function openTakeOrderModal() {
  newOrderItems = [];
  document.getElementById('newOrderCustomer').value = '';
  document.getElementById('newOrderCustomer').closest('.tom-input-wrapper').style.borderColor = '';
  
  const tableInput = document.getElementById('newOrderTableNumber');
  if (tableInput) {
    tableInput.value = '';
    tableInput.closest('.tom-input-wrapper').style.borderColor = '';
  }
  
  setNewOrderType('Parcel');
  updateNewOrderUI();
  filterModalItems();
  
  document.getElementById('takeOrderModal').style.display = 'flex';
}

function closeTakeOrderModal() {
  document.getElementById('takeOrderModal').style.display = 'none';
}

function setNewOrderType(type) {
  document.getElementById('newOrderType').value = type;
  
  const dineInBtn = document.getElementById('typeBtnDineIn');
  const parcelBtn = document.getElementById('typeBtnParcel');
  const tableGroup = document.getElementById('newOrderTableGroup');
  
  if (type === 'Dine-in') {
    dineInBtn.classList.add('active');
    parcelBtn.classList.remove('active');
    tableGroup.style.display = 'flex';
  } else {
    dineInBtn.classList.remove('active');
    parcelBtn.classList.add('active');
    tableGroup.style.display = 'none';
  }
}

function addItemToNewOrder() {
  const select = document.getElementById('modalItemSelect');
  const qty = parseInt(document.getElementById('modalItemQty').value);
  const selectedOption = select.options[select.selectedIndex];
  
  if (!selectedOption || !selectedOption.value) return;
  
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
    list.innerHTML = `
      <div class="tom-empty-state">
        <span class="tom-empty-icon">🛒</span>
        <p>No items added yet</p>
      </div>`;
    totalDisplay.textContent = '₹0.00';
    return;
  }
  
  let total = 0;
  list.innerHTML = newOrderItems.map((item, index) => {
    total += item.price * item.quantity;
    return `
      <div class="tom-item-row">
        <div class="tom-item-left">
          <span class="tom-item-qty">${item.quantity}x</span>
          <div>
            <span class="tom-item-name">${item.name}</span>
            ${item.size ? `<span class="tom-item-size">${item.size}</span>` : ''}
          </div>
        </div>
        <div class="tom-item-right">
          <span class="tom-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
          <button type="button" class="tom-remove-btn" onclick="removeNewOrderItem(${index})" title="Remove">×</button>
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

  const customerInput = document.getElementById('newOrderCustomer');
  const phone = customerInput.value.trim();
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    customerInput.closest('.tom-input-wrapper').style.borderColor = 'rgba(239,68,68,0.6)';
    customerInput.focus();
    alert('Please enter a valid 10-digit phone number.');
    return;
  }
  // Reset border on valid input
  customerInput.closest('.tom-input-wrapper').style.borderColor = '';
  
  const type = document.getElementById('newOrderType').value;
  let table = 'Parcel';
  if (type === 'Dine-in') {
    const tableInput = document.getElementById('newOrderTableNumber');
    table = tableInput.value.trim();
    if (!table) {
      tableInput.closest('.tom-input-wrapper').style.borderColor = 'rgba(239,68,68,0.6)';
      tableInput.focus();
      alert('Please enter a table number for Dine-in orders.');
      return;
    }
    tableInput.closest('.tom-input-wrapper').style.borderColor = '';
  }
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
function filterQuickAddItems() {
  const select = document.getElementById('quickAddItemSelect');
  const categorySelect = document.getElementById('quickAddCategorySelect');
  const category = categorySelect ? categorySelect.value : 'All';
  
  let itemsToShow = allMenuItems;
  if (category !== 'All') {
    itemsToShow = itemsToShow.filter(i => i.category === category);
  }
  
  select.innerHTML = '<option value="" disabled selected>Select an item...</option>' + itemsToShow.map(item => `
    <option value="${item.id}">${item.item_name} - ₹${item.price}</option>
  `).join('');
}

function openQuickAdd(orderId) {
  document.getElementById('quickAddOrderId').value = orderId;
  
  // Reset category to 'All' and filter items
  const categorySelect = document.getElementById('quickAddCategorySelect');
  if (categorySelect) categorySelect.value = 'All';
  filterQuickAddItems();
  
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

// --- SHOP STATUS MANAGEMENT ---
async function loadShopStatus() {
  try {
    const response = await fetch(`${API_BASE}/settings/shop-status`);
    const result = await response.json();
    if (result.success) {
      const select = document.getElementById('shopStatusSelect');
      if (select) {
        select.value = result.status;
        styleShopStatusSelect(result.status);
      }
    }
  } catch (error) {
    console.error('Error loading shop status:', error);
  }
}

async function loadParcelStatus() {
  try {
    const response = await fetch(`${API_BASE}/settings/parcel-status`);
    const result = await response.json();
    if (result.success) {
      parcelStatus = result.status;
      const select = document.getElementById('parcelStatusSelect');
      if (select) {
        select.value = result.status;
        styleParcelStatusSelect(result.status);
      }
      updateParcelEntryUI();
      return result.status === 'open';
    }
  } catch (error) {
    console.error('Error loading parcel status:', error);
  }
  return true;
}

async function updateParcelStatus(status) {
  try {
    const response = await fetch(`${API_BASE}/settings/parcel-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (result.success) {
      parcelStatus = status;
      styleParcelStatusSelect(status);
      updateParcelEntryUI();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.style.cssText = `
        position: fixed; bottom: 36px; right: 36px; z-index: 9999;
        background: rgba(8, 10, 24, 0.95);
        border: 1px solid ${status === 'open' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
        color: ${status === 'open' ? '#10b981' : '#ef4444'};
        padding: 12px 24px; border-radius: 12px; font-family: 'Inter'; font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px);
        animation: toastSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
      `;
      toast.textContent = `Parcel service is now ${status.toUpperCase()}!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } else {
      alert(result.message || 'Failed to update parcel status');
    }
  } catch (error) {
    console.error('Error updating parcel status:', error);
    alert('Failed to update parcel status. Server error.');
  }
}

function updateParcelEntryUI() {
  const parcelBtn = document.getElementById('parcelBtn');

  if (parcelBtn) {
    if (parcelStatus === 'closed') {
      parcelBtn.classList.add('disabled');
      parcelBtn.setAttribute('disabled', 'true');
      parcelBtn.style.cursor = 'not-allowed';
      const badge = parcelBtn.querySelector('.entry-card-badge');
      if (badge) badge.textContent = 'Closed';
    } else {
      parcelBtn.classList.remove('disabled');
      parcelBtn.removeAttribute('disabled');
      parcelBtn.style.cursor = 'pointer';
      const badge = parcelBtn.querySelector('.entry-card-badge');
      if (badge) badge.textContent = 'Takeaway';
    }
  }
}

function styleParcelStatusSelect(status) {
  const select = document.getElementById('parcelStatusSelect');
  if (!select) return;
  if (status === 'open') {
    select.style.background = 'rgba(16, 185, 129, 0.1)';
    select.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    select.style.color = '#10b981';
  } else {
    select.style.background = 'rgba(239, 68, 68, 0.1)';
    select.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    select.style.color = '#ef4444';
  }
}

async function updateShopStatus(status) {
  let closedAt = null;
  if (status === 'closed') {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    closedAt = `${hours}:${minutesStr} ${ampm}`;
  }

  try {
    const response = await fetch(`${API_BASE}/settings/shop-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ status, closedAt })
    });
    const result = await response.json();
    if (result.success) {
      styleShopStatusSelect(status);
      
      // Premium toast feedback matching the digital menu page
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.style.cssText = `
        position: fixed; bottom: 36px; right: 36px; z-index: 9999;
        background: rgba(8, 10, 24, 0.95);
        border: 1px solid ${status === 'open' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
        color: ${status === 'open' ? '#10b981' : '#ef4444'};
        padding: 12px 24px; border-radius: 12px; font-family: 'Inter'; font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px);
        animation: toastSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
      `;
      toast.textContent = `Shop is now ${status.toUpperCase()}!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } else {
      alert(result.message || 'Failed to update shop status');
    }
  } catch (error) {
    console.error('Error updating shop status:', error);
    alert('Failed to update shop status. Server error.');
  }
}

function styleShopStatusSelect(status) {
  const select = document.getElementById('shopStatusSelect');
  if (!select) return;
  if (status === 'open') {
    select.style.background = 'rgba(16, 185, 129, 0.1)';
    select.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    select.style.color = '#10b981';
  } else {
    select.style.background = 'rgba(239, 68, 68, 0.1)';
    select.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    select.style.color = '#ef4444';
  }
}