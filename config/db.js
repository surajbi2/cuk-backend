import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Suraj@2001',
    database: process.env.DB_NAME || 'iqac',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('Database configuration:', {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'iqac',
});

export default pool.promise();