const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2');

let dbHost = process.env.DB_HOST ?? '127.0.0.1';
let dbPort = parseInt(process.env.DB_PORT) || 3306;

// Automatically split DB_HOST if it contains a port string (like 127.0.0.1:3306)
if (dbHost.includes(':')) {
  const parts = dbHost.split(':');
  dbHost = parts[0];
  dbPort = parseInt(parts[1]) || dbPort;
}

const db = mysql.createPool({
  host: dbHost,
  user: process.env.DB_USER ?? 'u943133069_nighteat',
  password: process.env.DB_PASSWORD ?? 'Nighteat@2278',
  database: process.env.DB_NAME ?? 'u943133069_hotelmenu',
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// Test connection on startup
db.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL Connection Pool Error:', err);
  } else {
    console.log('MySQL Connected Successfully (Using Connection Pool)');
    connection.release();
  }
});

module.exports = db;