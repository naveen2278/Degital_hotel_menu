CREATE DATABASE IF NOT EXISTS hotel_menu_system;
USE hotel_menu_system;

CREATE TABLE IF NOT EXISTS admin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
);

INSERT IGNORE INTO categories (name) VALUES 
('Biryani'), ('Rice'), ('Noodles'), ('Grill'), ('Tandoori'), ('Gravy'), ('Starters');

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

INSERT INTO admin (username, password)
VALUES ('admin', 'admin123');

INSERT INTO menu_items (item_name, description, price, category, is_special, is_available) VALUES
('Veg Fried Rice', 'Tasty fried rice with fresh vegetables', 120.00, 'Veg', 0, 1),
('Paneer Butter Masala', 'Rich paneer curry with butter gravy', 180.00, 'Veg', 1, 1),
('Chicken Biryani', 'Hot and spicy chicken biryani', 220.00, 'Non-Veg', 1, 1),
('Chicken 65', 'Crispy spicy chicken starter', 190.00, 'Non-Veg', 0, 1);

-- ORDERING SYSTEM TABLES
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    daily_order_number INT DEFAULT NULL,
    table_number VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100) DEFAULT NULL,
    order_type ENUM('Dine-in', 'Parcel') DEFAULT 'Dine-in',
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Pending', 'Accepted', 'Processing', 'Delivered', 'Completed', 'Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES menu_items(id)
);