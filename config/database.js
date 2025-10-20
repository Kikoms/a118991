const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

function getEnv(key, fallback) {
    if (process.env[key]) {
        return process.env[key];
    }

    if (fallback !== undefined) {
        return fallback;
    }

    throw new Error(`Missing required environment variable ${key}`);
}

function createPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: getEnv('DB_HOST', 'localhost'),
            port: Number(getEnv('DB_PORT', 3306)),
            user: getEnv('DB_USER', 'root'),
            password: getEnv('DB_PASSWORD', ''),
            database: getEnv('DB_NAME', 'mail_system'),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            charset: 'utf8mb4_general_ci'
        });
    }

    return pool;
}

function getPool() {
    if (!pool) {
        pool = createPool();
    }

    return pool;
}

async function query(sql, params = []) {
    const connection = await getPool().getConnection();
    try {
        const [rows] = await connection.execute(sql, params);
        return rows;
    } finally {
        connection.release();
    }
}

async function transaction(callback) {
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    getPool,
    query,
    transaction
};
