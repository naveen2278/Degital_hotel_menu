# Hostinger Deployment Guide for NightEat Hotel Menu System

This guide outlines the step-by-step process to deploy your Hotel Menu System to Hostinger under your domain `nighteat.in`.

---

## Step 1: Create the MySQL Database on Hostinger
1. Log in to your **Hostinger hPanel**.
2. Navigate to **MySQL Databases** (or search for Databases in the sidebar).
3. Create a new database with these details:
   - **Database Name:** `u943133069_hotelmenu`
   - **MySQL Username:** `u943133069_nighteat`
   - **Password:** `Nighteat@2278`
4. Click **Create**.

---

## Step 2: Import the Database Schema
1. Open **phpMyAdmin** for your newly created database in Hostinger.
2. Select the database `u943133069_hotelmenu` on the left pane.
3. Click the **SQL** tab at the top.
4. Copy and paste the following SQL schema (also found in `other/databasecode.txt`):
   ```sql
   -- 1. Admin table for dashboard access
   CREATE TABLE IF NOT EXISTS admin (
       id INT PRIMARY KEY AUTO_INCREMENT,
       username VARCHAR(100) NOT NULL UNIQUE,
       password VARCHAR(255) NOT NULL
   );

   -- Insert Default Admin User
   INSERT IGNORE INTO admin (username, password) VALUES ('admin', 'admin123');

   -- 2. Categories table
   CREATE TABLE IF NOT EXISTS categories (
       id INT PRIMARY KEY AUTO_INCREMENT,
       name VARCHAR(100) NOT NULL UNIQUE
   );

   -- Insert Default Categories
   INSERT IGNORE INTO categories (name) VALUES 
   ('Biryani'), ('Rice'), ('Noodles'), ('Grill'), ('Tandoori'), ('Gravy'), ('Starters');

   -- 3. Menu items table
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
   );

   -- 4. Settings table for shop status
   CREATE TABLE IF NOT EXISTS settings (
       key_name VARCHAR(100) PRIMARY KEY,
       key_value VARCHAR(255) NOT NULL
   );

   INSERT IGNORE INTO settings (key_name, key_value) VALUES 
   ('shop_status', 'open'),
   ('parcel_status', 'open'),
   ('store_hours', '6:00 PM - 3:00 AM');

   -- 5. Orders table
   CREATE TABLE IF NOT EXISTS orders (
       id INT PRIMARY KEY AUTO_INCREMENT,
       daily_order_number INT DEFAULT NULL,
       table_number VARCHAR(20) NOT NULL,
       total_amount DECIMAL(10,2) NOT NULL,
       status ENUM('Pending', 'Accepted', 'Processing', 'Delivered', 'Completed', 'Cancelled') DEFAULT 'Pending',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       customer_name VARCHAR(100) DEFAULT NULL,
       order_type ENUM('Dine-in', 'Parcel') DEFAULT 'Dine-in'
   );

   -- 6. Order items link table
   CREATE TABLE IF NOT EXISTS order_items (
       id INT PRIMARY KEY AUTO_INCREMENT,
       order_id INT NOT NULL,
       item_id INT NOT NULL,
       quantity INT NOT NULL,
       price DECIMAL(10,2) NOT NULL,
       FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
       FOREIGN KEY (item_id) REFERENCES menu_items(id)
   );
   ```
5. Click **Go** to execute the query.

---

## Step 3: Setup Node.js on Hostinger hPanel
1. In Hostinger hPanel, search for **Node.js** in the search bar or go to **Advanced** > **Node.js**.
2. Click **Create Application**.
3. Fill in the following application settings:
   - **Domain:** Select `nighteat.in` (or the subdomain where you want this hosted, e.g., `shop.nighteat.in` or directly `nighteat.in`).
   - **Node.js Version:** Select **20.x** (or the latest LTS version).
   - **Application Path:** Set this to the folder where you will upload the project (e.g. `public_html` or a dedicated subdirectory, Hostinger will create this).
   - **App Startup File:** Set this to `backend/server.js` or `server.js` if you choose to move it. *Note: Using our root `package.json` setup, the application entry point is `backend/server.js`.*
4. Click **Create**.

---

## Step 4: Upload Your Files
Use the **Hostinger File Manager** or **FTP** to upload your files to the application directory you created in Step 3. Upload the following files and folders:
- `backend/` (All backend code including `server.js`, `db.js`, routes, middleware, etc.)
- `public_html/` (All frontend HTML, CSS, images, and JS files)
- `package.json` (At the root)

*Note: You do NOT need to upload the `node_modules` folder. Hostinger will install these automatically!*

---

## Step 5: Configure the Environment Variables (.env)
1. In the **Hostinger File Manager**, open the `backend` folder.
2. Create a new file exactly named `.env`.
3. Copy and paste the following configuration inside it:
   ```env
   PORT=5000
   DB_HOST=127.0.0.1
   DB_USER=u943133069_nighteat
   DB_PASSWORD=Nighteat@2278
   DB_NAME=u943133069_hotelmenu
   ```
4. Save the file.

---

## Step 6: Install Dependencies and Start the App
1. Go back to the **Node.js Application Dashboard** in Hostinger hPanel.
2. Select your application and click **Stop** (if it's running).
3. Click the **NPM Install** button to automatically install all required packages (`express`, `mysql2`, `cors`, `dotenv`, etc.) from `package.json`.
4. Click **Start** to run the Node.js backend.
5. In Hostinger hPanel, look at the logs to confirm you see:
   `MySQL Connected Successfully (Using Connection Pool)`
   `Hotel Menu System Backend running on http://localhost:5000`

Your digital menu is now live on `nighteat.in`!

---

## How to Run & Develop Locally (On Your PC)
To run the system locally on your computer:
1. Make sure you have **MySQL** running locally (e.g. via XAMPP/WAMP or standard MySQL service).
2. Create a database named `hotel_menu_system` locally.
3. Configure your local `.env` inside `backend/.env` with your local database details:
   ```env
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=hotel_menu_system
   PORT=5000
   ```
4. Open your terminal in the project folder and run:
   ```bash
   npm run setup    # First-time setup (optional, seeds initial data if needed)
   npm start        # Starts the local backend
   ```
5. You can now open your browser and navigate to:
   - User Menu: `http://localhost:5000/index.html`
   - Admin Panel: `http://localhost:5000/admin.html`
