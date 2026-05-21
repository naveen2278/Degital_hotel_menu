const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin;
const API_BASE = `${SERVER_URL}/api`;
let allMenuItems = [];
let currentFilter = 'All';
let parcelStatus = 'open';

async function checkShopStatus() {
  try {
    const response = await fetch(`${API_BASE}/settings/shop-status`);
    const result = await response.json();
    if (result.success) {
      const closedScreen = document.getElementById('closed-screen');
      const entrySelection = document.getElementById('entry-selection');
      const siteWrapper = document.querySelector('.site-wrapper');
      
      const hoursDisplay = document.getElementById('store-hours-display');
      if (hoursDisplay) {
        if (result.closedAt) {
          hoursDisplay.textContent = `Closed at ${result.closedAt} to Morning 10:00 AM`;
        } else {
          hoursDisplay.textContent = `Closed to Morning 10:00 AM`;
        }
      }
      
      if (result.status === 'closed') {
        if (closedScreen) closedScreen.style.display = 'flex';
        if (entrySelection) entrySelection.style.display = 'none';
        if (siteWrapper) siteWrapper.style.display = 'none';
        return false; // closed
      } else {
        if (closedScreen) closedScreen.style.display = 'none';
        return true; // open
      }
    }
  } catch (error) {
    console.error('Error checking shop status:', error);
  }
  return true; // default to open on error
}

async function loadParcelStatus() {
  try {
    const response = await fetch(`${API_BASE}/settings/parcel-status`);
    const result = await response.json();
    if (result.success) {
      parcelStatus = result.status;
      updateParcelEntryUI();
      return result.status === 'open';
    }
  } catch (error) {
    console.error('Error loading parcel status:', error);
  }
  return true;
}

function updateParcelEntryUI() {
  const parcelBtn = document.getElementById('parcelBtn');
  if (!parcelBtn) return;

  const badge = parcelBtn.querySelector('.entry-card-badge');
  if (parcelStatus === 'closed') {
    parcelBtn.classList.add('disabled');
    parcelBtn.style.cursor = 'pointer';
    parcelBtn.title = 'Parcel ordering is currently closed. You can still browse the menu.';
    if (badge) badge.textContent = 'Parcel closed';
  } else {
    parcelBtn.classList.remove('disabled');
    parcelBtn.style.cursor = 'pointer';
    parcelBtn.title = '';
    if (badge) badge.textContent = 'Takeaway';
  }
}

async function fetchMenu() {
  const isOpen = await checkShopStatus();
  if (!isOpen) return;

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
          `<button class="filter-btn ${currentFilter === 'Combos' ? 'active' : ''}" data-filter="Combos">Combos</button>` +
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

let currentSubFilter = null; // null, 'Veg', 'Non-Veg', or 'Combo'

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
  // EXCEPT for Combos
  if (!currentSubFilter) {
    if (currentFilter === 'Combos') {
      currentSubFilter = 'Combo';
      // Fall through to render
    } else {
      showSubSelectionScreen();
      return;
    }
  }

  // Render the selected category + sub-filter
  const filteredItems = allMenuItems.filter(item => {
    // If selecting "Combo" within a specific category (e.g. Biryani -> Combo)
    if (currentSubFilter === 'Combo') {
      const isCombo = item.food_type === 'Combo';
      if (!isCombo) return false;
      
      // Global Combos tab shows all combos
      if (currentFilter === 'Combos') return true;

      // Otherwise, match combos to specific categories by name/description keywords dynamically
      const matchesCategory = item.category === currentFilter;
      if (matchesCategory) return true;

      const name = (item.item_name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const target = currentFilter.toLowerCase();
      
      let keywords = [target];
      if (target === 'biryani') {
        keywords.push('briyani');
      } else if (target === 'rice') {
        keywords.push('fried rice', 'rice combo');
      } else if (target === 'noodles') {
        keywords.push('noodle');
      } else if (target === 'grill') {
        keywords.push('grilled', 'bbq', 'barbeque');
      } else if (target === 'tandoori') {
        keywords.push('tandoor', 'tikka');
      } else if (target === 'gravy') {
        keywords.push('curry', 'masala', 'butter chicken');
      } else if (target === 'starters') {
        keywords.push('starter', 'chilli', 'fry', 'lollipop');
      }
      
      return keywords.some(kw => name.includes(kw) || desc.includes(kw));
    }

    const matchesCategory = item.category === currentFilter;
    const matchesType = (item.food_type === currentSubFilter || (!item.food_type && currentSubFilter === 'Non-Veg'));
    return matchesCategory && matchesType;
  });

  fullMenuTitle.style.display = 'flex';
  const showChangeBtn = (currentFilter !== 'Grill' && currentFilter !== 'Tandoori');
  fullMenuTitle.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <span style="font-size: 1.4rem; font-family: 'Outfit'; color: var(--text-main);">${currentSubFilter} ${currentFilter}</span>
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
      <h2 style="font-family: 'Outfit'; margin-bottom: 10px; font-size: 1.8rem; color: var(--text-main);">What's your preference?</h2>
      <p style="color: var(--text-muted); margin-bottom: 40px;">Select a type of ${currentFilter} to explore</p>
      
      <div class="choice-container">
        <div class="choice-row-top">
          <!-- Veg Choice -->
          <div class="choice-card choice-veg" onclick="selectSubFilter('Veg')">
            <div class="choice-icon">🥦</div>
            <h3>Pure Veg</h3>
            <p>Delicious vegetarian ${currentFilter}</p>
          </div>

          <!-- Non-Veg Choice -->
          <div class="choice-card choice-nonveg" onclick="selectSubFilter('Non-Veg')">
            <div class="choice-icon">🍗</div>
            <h3>Non-Veg</h3>
            <p>Savory meat ${currentFilter} dishes</p>
          </div>
        </div>

        <!-- Combo Choice -->
        <div class="choice-card choice-combo" onclick="selectSubFilter('Combo')">
          <div class="choice-icon">🍱</div>
          <h3>Combo</h3>
          <p>Delicious ${currentFilter} combinations</p>
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
  const categoryOrder = ['Combos', 'Biryani', 'Rice', 'Noodles', 'Grill', 'Tandoori', 'Gravy', 'Starters'];
  
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
    const comboItems = categoryItems.filter(i => i.food_type === 'Combo');

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
        <div class="menu-grid" style="margin-bottom: 30px;">
          ${nonVegItems.map((item, index) => createMenuCard(item, index)).join('')}
        </div>
      `;
    }

    if (comboItems.length > 0) {
      innerHtml += `
        <h3 class="reveal" style="color: #fcd34d; margin: 20px 0 15px 0; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; opacity: 0.8;">
          <span style="display:inline-block; width:12px; height:12px; border: 2px solid #f59e0b; padding: 2px;"><span style="display:block; width:100%; height:100%; background:#f59e0b; border-radius:50%;"></span></span>
          Combo Selection
        </h3>
        <div class="menu-grid">
          ${comboItems.map((item, index) => createMenuCard(item, index)).join('')}
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
  const hasImage = !!item.image_path;
  const imageHtml = hasImage 
    ? `
         <div class="menu-card-image-wrap">
           <img src="${SERVER_URL}${item.image_path.replace('/uploads/menu/', '/uploads/')}" 
                onerror="this.parentNode.style.display='none'" 
                alt="${item.item_name}" class="menu-card-image" />
           <div class="menu-card-overlay"></div>
           ${!item.price_quarter && !item.price_half && !item.price_full 
             ? `<button class="primary-btn mobile-add-btn" onclick="addToCart(${item.id})">Add +</button>` 
             : ''}
         </div>
       ` 
    : '';
  const titleStyle = hasImage 
    ? 'text-shadow: 0 2px 10px rgba(0,0,0,0.8); font-size: 1.4rem; color: #ffffff;' 
    : 'font-size: 1.4rem; color: var(--text-main);';
  const descStyle = hasImage 
    ? 'text-shadow: 0 2px 8px rgba(0,0,0,0.8); color: rgba(255,255,255,0.9);' 
    : 'color: var(--text-muted);';
  const priceStyle = hasImage 
    ? 'text-shadow: 0 2px 10px rgba(0,0,0,0.8); font-weight: 800; font-size: 1.5rem; color: #f97316;' 
    : 'font-weight: 800; font-size: 1.5rem; color: var(--primary);';

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
      <div class="menu-card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
        <p class="price" style="${priceStyle}">₹${Number(item.price).toFixed(2)}</p>
        <button class="primary-btn" style="width: auto; padding: 8px 16px; font-size: 0.9rem; box-shadow: 0 4px 15px rgba(212, 93, 38, 0.4);" onclick="addToCart(${item.id})">Add +</button>
      </div>
    `;
  }

  return `
    <div class="reveal" style="animation-delay: ${index * 0.1}s; height: 100%;">
      <div class="menu-card ${specialClass} ${hasImage ? 'has-image' : ''}" style="position: relative; overflow: hidden; min-height: 320px; display: flex; flex-direction: column; justify-content: flex-end;">
        ${imageHtml}
        <div class="menu-card-content" style="position: relative; z-index: 2; padding: 25px;">
          <div class="badge-row" style="position: static; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <span class="badge ${item.food_type === 'Non-Veg' ? 'nonveg' : (item.food_type === 'Combo' ? 'combo' : 'veg')}" style="box-shadow: 0 4px 10px rgba(0,0,0,0.3);">${item.food_type}</span>
            ${Number(item.is_special) === 1 ? '<span class="badge special-badge" style="box-shadow: 0 4px 10px rgba(0,0,0,0.3);">Daily Special</span>' : ''}
          </div>
          <h3 style="${titleStyle}">${item.item_name}</h3>
          <p style="${descStyle} margin-bottom: 20px;">${item.description || 'A delicious dish prepared with fresh ingredients.'}</p>
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
  saveCartToStorage();
  
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
  const totalPill = document.getElementById('cartTotalPill');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (totalItems > 0) {
    toggle.style.display = 'flex';
    countSpan.textContent = totalItems;
    if (totalPill) totalPill.textContent = '₹' + totalAmount.toFixed(2);
    const itemsLabel = document.getElementById('cartItemsLabel');
    if (itemsLabel) itemsLabel.textContent = totalItems + (totalItems === 1 ? ' item' : ' items');

    // Bump animation
    toggle.classList.remove('bump');
    void toggle.offsetWidth; // reflow
    toggle.classList.add('bump');
    setTimeout(() => toggle.classList.remove('bump'), 500);
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
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="flex: 1; padding-right: 12px;">
          <div style="font-weight: 600; color: var(--text-main); font-size: 0.88rem; margin-bottom: 2px;">${item.item_name}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">₹${item.price} &times; ${item.quantity}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; background: rgba(0,0,0,0.3); padding: 3px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.1);">
            <button onclick="updateQuantity('${item.cartKey}', -1)" style="width: 24px; height: 24px; border-radius: 50%; border: none; background: #2c3e50; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;">&minus;</button>
            <span style="min-width: 24px; text-align: center; font-weight: 700; color: var(--text-main); font-size: 0.8rem;">${item.quantity}</span>
            <button onclick="updateQuantity('${item.cartKey}', 1)" style="width: 24px; height: 24px; border-radius: 50%; border: none; background: #2c3e50; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;">&plus;</button>
          </div>
          <div style="width: 70px; text-align: right; font-weight: 700; color: var(--text-main); font-size: 0.85rem;">₹${itemTotal.toFixed(2)}</div>
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
  saveCartToStorage();
}

function saveCartToStorage() {
  sessionStorage.setItem('hotelCart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const savedCart = sessionStorage.getItem('hotelCart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartUI();
  }
}

function toggleCartModal() {
  const modal = document.getElementById('cartModal');
  const isHidden = modal.classList.contains('hidden');
  if (isHidden) {
    modal.classList.remove('hidden');
    renderCartItems();
  } else {
    modal.classList.add('hidden');
  }
}

// Cart toggle handled via onclick in HTML

// Close modal when clicking backdrop
window.onclick = function(event) {
  const modal = document.getElementById('cartModal');
  if (event.target === modal && !modal.classList.contains('hidden')) {
    modal.classList.add('hidden');
  }
}

// Place Order
document.getElementById('placeOrderBtn').addEventListener('click', async () => {
  const customerPhone = document.getElementById('customerPhone').value.trim();
  const tableNum = document.getElementById('tableNumber').value.trim();
  const statusEl = document.getElementById('orderStatus');

  // Verify shop is open before confirming order
  const isOpen = await checkShopStatus();
  if (!isOpen) {
    statusEl.textContent = 'Sorry, the store is closed right now. Cannot place order.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  if (selectedOrderType === 'Parcel' && parcelStatus === 'closed') {
    statusEl.textContent = 'Parcel ordering is currently closed. Please browse the menu or choose Dine-in.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  const cleanPhone = customerPhone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    statusEl.textContent = 'Please enter a valid 10-digit phone number.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  if (selectedOrderType === 'Dine-in' && !tableNum) {
    statusEl.textContent = 'Please enter your table number.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const orderData = {
    table_number: tableNum || 'Parcel',
    customer_name: customerPhone,
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
      saveCartToStorage();
      updateCartUI();
      setTimeout(() => {
        toggleCartModal();
        statusEl.textContent = '';
        document.getElementById('tableNumber').value = '';
        document.getElementById('customerPhone').value = '';
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
  sessionStorage.setItem('selectedOrderType', type);
  document.getElementById('entry-selection').style.display = 'none';
  document.querySelector('.site-wrapper').style.display = 'block';

  // Update the hero live badge
  const heroLabel = document.getElementById('heroOrderLabel');
  const noticeEl = document.getElementById('noticeBannerText');
  if (heroLabel) {
    if (type === 'Parcel' && parcelStatus === 'closed') {
      heroLabel.textContent = 'Parcel service is currently closed';
    } else {
      heroLabel.textContent = type === 'Parcel'
        ? '📦 Parcel Order — Take Away'
        : '🍽️ Dine In — Table Service';
    }
  }

  // Update table number field relevance
  const tableField = document.getElementById('tableNumber').closest('.form-group');
  if (type === 'Parcel') {
    if (tableField) tableField.style.display = 'none';
    document.getElementById('tableNumber').removeAttribute('required');
    if (noticeEl) {
      if (parcelStatus === 'closed') {
        noticeEl.innerHTML = `<strong style="color: var(--danger);">Parcel ordering is temporarily closed.</strong> Browse the menu or choose Dine-in instead.`;
      } else {
        noticeEl.innerHTML = `If you want to add items, have any issues, or need help with your parcel order, please <strong style="color: var(--text-main);">contact the counter staff for assistance</strong>.`;
      }
    }
  } else {
    if (tableField) tableField.style.display = 'block';
    document.getElementById('tableNumber').setAttribute('required', 'true');
    if (noticeEl) {
      noticeEl.innerHTML = `If you want to add items, have any issues, or need help, please <strong style="color: var(--text-main);">call the waiter for assistance</strong>.`;
    }
  }
}

function goBackToEntry() {
  selectedOrderType = '';
  sessionStorage.removeItem('selectedOrderType');
  document.querySelector('.site-wrapper').style.display = 'none';
  const entry = document.getElementById('entry-selection');
  if (entry) {
    entry.style.display = 'flex';
  }
  window.scrollTo({top: 0, behavior: 'instant'});
}

// Faster Splash Removal
document.addEventListener('DOMContentLoaded', async () => {
  const splash = document.getElementById('splash-screen');
  const entry = document.getElementById('entry-selection');
  
  // Initialize data in background
  await loadParcelStatus();
  fetchMenu();
  loadCartFromStorage();

  if (splash) {
    const savedOrderType = sessionStorage.getItem('selectedOrderType');

    // Only wait 1.5 seconds instead of 3
    setTimeout(async () => {
      const isOpen = await checkShopStatus();
      
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      setTimeout(() => {
        splash.style.display = 'none';
        
        if (isOpen) {
          if (savedOrderType) {
            selectOrderType(savedOrderType);
          } else if (entry) {
            entry.style.display = 'flex';
          }
        }
      }, 800); 
    }, 1500); 
  }
});