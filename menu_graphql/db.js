// db.js - MySQL connection pool (mysql2), shared by all resolvers.
// Credentials come from environment variables so no secrets live in the repo.
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "campuseats_menu",
  decimalNumbers: true,   // return DECIMAL(10,2) as a JS number, not a string
  connectionLimit: 5
});

module.exports = pool;
