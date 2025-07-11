const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = pool;

// const mysql = require("mysql2/promise");

// const db = mysql.createPool({
//   host: "localhost", // Jika pakai XAMPP, tetap 'localhost'
//   user: "root", // Default user XAMPP
//   password: "", // Default tanpa password
//   database: "lms", // Ganti dengan nama database kamu
// });

// module.exports = db;
