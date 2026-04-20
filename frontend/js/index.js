const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin;
const API_BASE = `${SERVER_URL}/api`;
let allMenuItems = [];
let currentFilter = 'All';

async function fetchMenu() {
  await fetchCategories();
  try {
    const response = await fetch(`${API_BASE}/menu`);
    const result = await response.json();

    if (result.success) {
      allMenuItems = result.data;
      renderSpecialItems();
      renderMenuItems();
    } else {
      document.getElementById('menuContainer').innerHTML =
        '<div class="empty-text">Failed to load menu.</div>';
    }
  } catch (error) {
    document.getElementById('menuContainer').innerHTML =
      '<div class="empty-text">Server connection error.</div>';
  }
}

async function fetchCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    const result = await response.json();
    if (result.success) {
      const container = document.getElementById('categoryFilters');
      if (container) {
        container.innerHTML = `<button class="filter-btn ${currentFilter === 'All' ? 'active' : ''}" data-filter="All">All Dishes</button>` + 
          result.data.map(cat => `
            <button class="filter-btn ${currentFilter === cat.name ? 'active' : ''}" data-filter="${cat.name}">${cat.name}</button>
          `).join('');
        
        // Re-attach listeners
        document.querySelectorAll('.filter-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            currentSubFilter = null; // Reset sub-filter when category changes
            renderMenuItems();
          });
        });
      }
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Render special items
function renderSpecialItems() {
  const specialContainer = document.getElementById('specialItems');
  const specialItems = allMenuItems.filter(item => Number(item.is_special) === 1);

  if (specialItems.length === 0) {
    document.getElementById('specialSection').style.display = 'none';
    return;
  }

  document.getElementById('specialSection').style.display = 'block';
  specialContainer.innerHTML = specialItems.map((item, index) => createMenuCard(item, index)).join('');
}

let currentSubFilter = null; // null, 'Veg', or 'Non-Veg'

// Render menu items based on current filter
function renderMenuItems() {
  const menuContainer = document.getElementById('menuContainer');
  const fullMenuTitle = document.getElementById('fullMenuTitle');
  
  menuContainer.innerHTML = ''; 

  if (currentFilter === 'All') {
    renderAllMenu();
    return;
  }

  // For specific categories, we "ask" Veg or Non-Veg first
  // EXCEPT for Grill and Tandoori which are always Non-Veg
  if (!currentSubFilter) {
    if (currentFilter === 'Grill' || currentFilter === 'Tandoori') {
      currentSubFilter = 'Non-Veg';
      // Fall through to render
    } else {
      showSubSelectionScreen();
      return;
    }
  }

  // Render the selected category + sub-filter
  const filteredItems = allMenuItems.filter(item => {
    const matchesCategory = item.category === currentFilter;
    const matchesType = (item.food_type === currentSubFilter || (!item.food_type && currentSubFilter === 'Non-Veg'));
    return matchesCategory && matchesType;
  });

  fullMenuTitle.style.display = 'flex';
  const showChangeBtn = (currentFilter !== 'Grill' && currentFilter !== 'Tandoori');
  fullMenuTitle.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <span style="font-size: 1.4rem; font-family: 'Outfit'; color: white;">${currentSubFilter} ${currentFilter}</span>
      ${showChangeBtn ? `
      <button onclick="resetSubFilter()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); font-size: 0.75rem; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: 0.3s; font-family: 'Inter';">
        ← Change Choice
      </button>
      ` : ''}
    </div>
  `;

  if (filteredItems.length === 0) {
    menuContainer.innerHTML = `
      <div class="empty-text" style="padding: 60px 20px;">
        <div style="font-size: 3rem; margin-bottom: 20px;">🍽️</div>
        No ${currentSubFilter} items found in ${currentFilter}.
        <br/>
        <button onclick="resetSubFilter()" class="primary-btn" style="width: auto; margin-top: 20px; padding: 10px 25px;">Go Back</button>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'menu-grid';
  grid.innerHTML = filteredItems.map((item, index) => createMenuCard(item, index)).join('');
  menuContainer.appendChild(grid);
}

function showSubSelectionScreen() {
  const menuContainer = document.getElementById('menuContainer');
  const fullMenuTitle = document.getElementById('fullMenuTitle');
  
  fullMenuTitle.style.display = 'none';

  menuContainer.innerHTML = `
    <div class="reveal" style="text-align: center; padding: 40px 0;">
      <h2 style="font-family: 'Outfit'; margin-bottom: 10px; font-size: 1.8rem; color: white;">What's your preference?</h2>
      <p style="color: var(--text-muted); margin-bottom: 40px;">Select a type of ${currentFilter} to explore</p>
      
      <div style="display: flex; gap: 25px; justify-content: center; flex-wrap: wrap;">
        <!-- Veg Choice -->
        <div class="choice-card" onclick="selectSubFilter('Veg')" style="width: 260px; padding: 35px; background: var(--card-bg); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 30px; cursor: pointer;">
          <div style="font-size: 4rem; margin-bottom: 20px; filter: drop-shadow(0 10px 15px rgba(16, 185, 129, 0.2));">🥦</div>
          <h3 style="color: #6ee7b7; font-size: 1.6rem; margin-bottom: 8px;">Pure Veg</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Delicious vegetarian ${currentFilter}</p>
        </div>

        <!-- Non-Veg Choice -->
        <div class="choice-card" onclick="selectSubFilter('Non-Veg')" style="width: 260px; padding: 35px; background: var(--card-bg); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 30px; cursor: pointer;">
          <div style="font-size: 4rem; margin-bottom: 20px; filter: drop-shadow(0 10px 15px rgba(239, 68, 68, 0.2));">🍗</div>
          <h3 style="color: #fca5a5; font-size: 1.6rem; margin-bottom: 8px;">Non-Veg</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Savory meat ${currentFilter} dishes</p>
        </div>
      </div>
      
      <div style="margin-top: 50px;">
        <button onclick="currentFilter='All'; renderMenuItems();" style="background: none; border: none; color: var(--primary); cursor: pointer; text-decoration: underline; opacity: 0.7;">View All Categories Instead</button>
      </div>
    </div>
  `;
}

function selectSubFilter(type) {
  currentSubFilter = type;
  renderMenuItems();
}

function resetSubFilter() {
  currentSubFilter = null;
  renderMenuItems();
}

function renderAllMenu() {
  const menuContainer = document.getElementById('menuContainer');
  const fullMenuTitle = document.getElementById('fullMenuTitle');
  fullMenuTitle.style.display = 'none';

  const categorized = groupByCategory(allMenuItems);
  const categoryOrder = ['Biryani', 'Rice', 'Noodles', 'Grill', 'Tandoori', 'Gravy', 'Starters'];
  
  const sortedCategories = Object.keys(categorized).sort((a, b) => {
    let indexA = categoryOrder.indexOf(a);
    let indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  sortedCategories.forEach(category => {
    const categoryItems = categorized[category];
    const section = document.createElement('div');
    section.className = 'category-block';
    section.style.marginBottom = '60px';

    const vegItems = categoryItems.filter(i => i.food_type === 'Veg');
    const nonVegItems = categoryItems.filter(i => i.food_type === 'Non-Veg');

    let innerHtml = `<h2 class="section-title reveal" style="margin-bottom: 25px; font-size: 1.8rem; border-left: 4px solid var(--primary); padding-left: 15px; background: rgba(212, 93, 38, 0.05); padding-top: 10px; padding-bottom: 10px; border-radius: 0 10px 10px 0;">${category}</h2>`;
    
    if (vegItems.length > 0) {
      innerHtml += `
        <h3 class="reveal" style="color: #6ee7b7; margin: 20px 0 15px 0; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; opacity: 0.8;">
          <span style="display:inline-block; width:12px; height:12px; border: 2px solid #10b981; padding: 2px;"><span style="display:block; width:100%; height:100%; background:#10b981; border-radius:50%;"></span></span>
          Vegetarian Selection
        </h3>
        <div class="menu-grid" style="margin-bottom: 30px;">
          ${vegItems.map((item, index) => createMenuCard(item, index)).join('')}
        </div>
      `;
    }

    if (nonVegItems.length > 0) {
      innerHtml += `
        <h3 class="reveal" style="color: #fca5a5; margin: 20px 0 15px 0; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; opacity: 0.8;">
          <span style="display:inline-block; width:12px; height:12px; border: 2px solid #ef4444; padding: 2px;"><span style="display:block; width:100%; height:100%; background:#ef4444; border-radius:50%;"></span></span>
          Non-Vegetarian Selection
        </h3>
        <div class="menu-grid">
          ${nonVegItems.map((item, index) => createMenuCard(item, index)).join('')}
        </div>
      `;
    }

    section.innerHTML = innerHtml;
    menuContainer.appendChild(section);
  });
}

function groupByCategory(items) {
  return items.reduce((groups, item) => {
    const category = item.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {});
}

function createMenuCard(item, index) {
  const isVeg = item.food_type === 'Veg';
  const specialClass = Number(item.is_special) === 1 ? 'special' : '';
  const imageHtml = item.image_path 
    ? `<div class="menu-card-image-wrapper">
         <img src="${SERVER_URL}${item.image_path}" 
              onerror="this.style.display='none'" 
              alt="${item.item_name}" class="menu-card-image" />
       </div>` 
    : '';

  // Multi-pricing buttons logic
  let pricingHtml = '';
  if (item.price_quarter || item.price_half || item.price_full) {
    pricingHtml = `
      <div class="pricing-options">
        ${item.price_quarter ? `<button class="size-btn" onclick="addToCart(${item.id}, 'Quarter', ${item.price_quarter})"><b>Quarter</b><span>₹${item.price_quarter}</span></button>` : ''}
        ${item.price_half ? `<button class="size-btn" onclick="addToCart(${item.id}, 'Half', ${item.price_half})"><b>Half</b><span>₹${item.price_half}</span></button>` : ''}
        ${item.price_full ? `<button class="size-btn" onclick="addToCart(${item.id}, 'Full', ${item.price_full})"><b>Full</b><span>₹${item.price_full}</span></button>` : ''}
      </div>
    `;
  } else {
    pricingHtml = `
      <div class="menu-card-footer">
        <p class="price">₹${Number(item.price).toFixed(2)}</p>
        <button class="primary-btn" style="width: auto; padding: 8px 16px; font-size: 0.9rem;" onclick="addToCart(${item.id})">Add +</button>
      </div>
    `;
  }

  return `
    <div class="reveal" style="animation-delay: ${index * 0.1}s; height: 100%;">
      <div class="menu-card ${specialClass}">
        ${imageHtml}
        <div class="menu-card-content">
          <div class="badge-row" style="position: static; margin-bottom: 10px; flex-wrap: wrap; gap: 5px;">
            <span class="badge ${item.food_type === 'Non-Veg' ? 'nonveg' : 'veg'}">${item.food_type}</span>
            ${Number(item.is_special) === 1 ? '<span class="badge special-badge">Daily Special</span>' : ''}
          </div>
          <h3>${item.item_name}</h3>
          <p>${item.description || 'A delicious dish prepared with fresh ingredients.'}</p>
          ${pricingHtml}
        </div>
      </div>
    </div>
  `;
}

// --- CART LOGIC ---
let cart = [];

function addToCart(id, size = null, priceOverride = null) {
  const item = allMenuItems.find(i => i.id === id);
  if (!item) return;

  const cartPrice = priceOverride !== null ? priceOverride : item.price;
  const cartKey = size ? `${id}_${size}` : `${id}`;
  const existingIndex = cart.findIndex(c => c.cartKey === cartKey);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({
      id: item.id,
      cartKey: cartKey,
      item_name: item.item_name,
      price: cartPrice,
      size: size,
      quantity: 1
    });
  }
  
  updateCartUI();
  
  // Flash feedback
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `Added ${item.item_name}${size ? ' (' + size + ')' : ''} to cart`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function updateCartUI() {
  const toggle = document.getElementById('cartToggle');
  const countSpan = document.getElementById('cartCount');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (totalItems > 0) {
    toggle.style.display = 'flex';
    countSpan.textContent = totalItems;
  } else {
    toggle.style.display = 'none';
  }

  renderCartItems();
}

function renderCartItems() {
  const list = document.getElementById('cartItemsList');
  const totalSpan = document.getElementById('cartTotalText');
  
  if (cart.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Your cart is empty.</p>';
    totalSpan.textContent = '₹0.00';
    return;
  }

  let total = 0;
  list.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="flex: 1; padding-right: 15px;">
          <div style="font-weight: 600; color: var(--text-main); font-size: 1rem; margin-bottom: 2px;">${item.item_name}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">₹${item.price} &times; ${item.quantity}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.1);">
            <button onclick="updateQuantity('${item.cartKey}', -1)" style="width: 28px; height: 28px; border-radius: 50%; border: none; background: #2c3e50; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 800;">&minus;</button>
            <span style="min-width: 30px; text-align: center; font-weight: 700; color: var(--text-main);">${item.quantity}</span>
            <button onclick="updateQuantity('${item.cartKey}', 1)" style="width: 28px; height: 28px; border-radius: 50%; border: none; background: #2c3e50; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 800;">&plus;</button>
          </div>
          <div style="width: 80px; text-align: right; font-weight: 700; color: var(--text-main); font-size: 0.95rem;">₹${itemTotal.toFixed(2)}</div>
        </div>
      </div>
    `;
  }).join('');

  totalSpan.textContent = `₹${total.toFixed(2)}`;
}

function updateQuantity(cartKey, delta) {
  const index = cart.findIndex(i => i.cartKey === cartKey);
  if (index === -1) return;

  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  updateCartUI();
}

function toggleCartModal() {
  const modal = document.getElementById('cartModal');
  const isOpening = modal.style.display === 'none';
  modal.style.display = isOpening ? 'flex' : 'none';
  
  if (isOpening) renderCartItems();
}

document.getElementById('cartToggle').addEventListener('click', toggleCartModal);

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('cartModal');
  if (event.target == modal) toggleCartModal();
}

// Place Order
document.getElementById('placeOrderBtn').addEventListener('click', async () => {
  const customerName = document.getElementById('customerName').value.trim();
  const tableNum = document.getElementById('tableNumber').value.trim();
  const statusEl = document.getElementById('orderStatus');

  if (selectedOrderType === 'Dine-in' && !tableNum) {
    statusEl.textContent = 'Please enter your table number.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const orderData = {
    table_number: tableNum || 'Parcel',
    customer_name: customerName,
    order_type: selectedOrderType || 'Dine-in',
    total_amount: total,
    items: cart.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price
    }))
  };

  try {
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (result.success) {
      statusEl.textContent = 'Order placed successfully! Please wait.';
      statusEl.style.color = 'var(--success)';
      cart = [];
      updateCartUI();
      setTimeout(() => {
        toggleCartModal();
        statusEl.textContent = '';
        document.getElementById('tableNumber').value = '';
        document.getElementById('customerName').value = '';
      }, 3000);
    } else {
      statusEl.textContent = result.message || 'Failed to place order.';
      statusEl.style.color = 'var(--danger)';
    }
  } catch (error) {
    statusEl.textContent = 'Server error. Please try again.';
    statusEl.style.color = 'var(--danger)';
  } finally {
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = false;
    btn.textContent = 'Confirm Order';
  }
});

function setActiveFilterButton(selectedButton) {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  selectedButton.classList.add('active');
}

document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.getAttribute('data-filter');
    currentSubFilter = null; // Reset sub-selection state
    setActiveFilterButton(button);
    renderMenuItems();
  });
});

// INITIALIZE
// (Now handled inside DOMContentLoaded at the bottom)

// --- SPLASH SCREEN & ENTRY LOGIC ---
let selectedOrderType = '';

function selectOrderType(type) {
  selectedOrderType = type;
  document.getElementById('entry-selection').style.display = 'none';
  document.querySelector('.site-wrapper').style.display = 'block';
  
  // Update table number field relevance
  const tableField = document.getElementById('tableNumber').closest('.form-group');
  if (type === 'Parcel') {
    if (tableField) tableField.style.display = 'none';
    document.getElementById('tableNumber').removeAttribute('required');
  } else {
    if (tableField) tableField.style.display = 'block';
    document.getElementById('tableNumber').setAttribute('required', 'true');
  }
}

// Faster Splash Removal
document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash-screen');
  const entry = document.getElementById('entry-selection');
  
  // Initialize data in background
  fetchMenu();

  if (splash) {
    // Only wait 1.5 seconds instead of 3
    setTimeout(() => {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      setTimeout(() => {
        splash.style.display = 'none';
        if (entry) entry.style.display = 'flex';
      }, 800); 
    }, 1500); 
  }
});