// lib/db.ts (✅ 推荐版本)

import mysql from 'mysql2/promise';

// 声明一个全局变量来缓存连接池
declare global {
  var pool: mysql.Pool | undefined;
}

// 检查全局变量中是否已有连接池实例
if (!global.pool) {
  // 如果没有，则创建一个新的连接池
  console.log("Creating a new database connection pool...");
  global.pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true, // 当连接池满时，新的请求会排队等待而不是立即失败
    connectionLimit: 10,      // 连接池中的最大连接数
    queueLimit: 0,            // 排队请求的最大数量（0表示不限制）
  });
}

// 导出这个唯一的连接池实例
export const pool = global.pool;