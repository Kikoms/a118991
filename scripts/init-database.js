const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DEFAULT_DB_NAME = 'mail_system';

function resolveEnvPath() {
    return path.resolve(process.cwd(), '.env');
}

function ensureEnvValue(lines, key, value) {
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (index === -1) {
        lines.push(`${key}=${value}`);
    } else if (!lines[index].split('=')[1]) {
        lines[index] = `${key}=${value}`;
    }
}

async function updateEnvFile() {
    const envPath = resolveEnvPath();
    let contents = '';

    if (fs.existsSync(envPath)) {
        contents = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = contents
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length && !line.startsWith('#'));

    if (!lines.length && !process.env.DB_PASSWORD) {
        console.warn('⚠️  尚未設定資料庫密碼 (DB_PASSWORD)。建議在 .env 中設定。');
    }

    if (!process.env.JWT_SECRET && !lines.some((line) => line.startsWith('JWT_SECRET='))) {
        const secret = crypto.randomBytes(48).toString('hex');
        lines.push(`JWT_SECRET=${secret}`);
        console.log('✓ 已自動建立 JWT_SECRET');
    }

    ensureEnvValue(lines, 'DB_HOST', process.env.DB_HOST || 'localhost');
    ensureEnvValue(lines, 'DB_PORT', process.env.DB_PORT || '3306');
    ensureEnvValue(lines, 'DB_USER', process.env.DB_USER || 'root');
    ensureEnvValue(lines, 'DB_NAME', process.env.DB_NAME || DEFAULT_DB_NAME);

    fs.writeFileSync(envPath, `${lines.join('\n')}\n`);
}

async function initializeDatabase() {
    const {
        DB_HOST = 'localhost',
        DB_PORT = 3306,
        DB_USER = 'root',
        DB_PASSWORD = '',
        DB_NAME = DEFAULT_DB_NAME
    } = process.env;

    const connection = await mysql.createConnection({
        host: DB_HOST,
        port: Number(DB_PORT),
        user: DB_USER,
        password: DB_PASSWORD,
        multipleStatements: true
    });

    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
        await connection.query(`USE \`${DB_NAME}\``);

        const tableStatements = [
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                is_verified TINYINT(1) DEFAULT 0,
                is_admin TINYINT(1) DEFAULT 0,
                member_expire_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS folders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(50) NOT NULL,
                type ENUM('inbox','sent','draft','spam','trash','custom') DEFAULT 'custom',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_folder (user_id, name),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS emails (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                folder_id INT NULL,
                from_email VARCHAR(150) NOT NULL,
                to_email VARCHAR(150) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                body TEXT,
                is_read TINYINT(1) DEFAULT 0,
                is_starred TINYINT(1) DEFAULT 0,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                filepath VARCHAR(255) NOT NULL,
                mimetype VARCHAR(100) NOT NULL,
                size INT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS email_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                label VARCHAR(100) NOT NULL,
                smtp_host VARCHAR(150) NOT NULL,
                smtp_port INT NOT NULL,
                smtp_secure TINYINT(1) DEFAULT 1,
                smtp_user VARCHAR(150) NOT NULL,
                smtp_pass VARCHAR(255) NOT NULL,
                imap_host VARCHAR(150) NOT NULL,
                imap_port INT NOT NULL,
                imap_secure TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS temp_emails (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(150) NOT NULL UNIQUE,
                token VARCHAR(64) NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expire_at DATETIME NOT NULL,
                last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status ENUM('active','expired') DEFAULT 'active'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS temp_email_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                temp_email_id INT NOT NULL,
                from_email VARCHAR(150) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                body TEXT,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (temp_email_id) REFERENCES temp_emails(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS verification_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                code VARCHAR(10) NOT NULL,
                type ENUM('register','reset','two-factor') DEFAULT 'register',
                expire_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_used TINYINT(1) DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS ip_blocks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL UNIQUE,
                reason VARCHAR(255) NOT NULL,
                blocked_until DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS attack_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL,
                user_agent VARCHAR(255) NULL,
                action VARCHAR(100) NOT NULL,
                detail TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS site_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                site_name VARCHAR(100) DEFAULT '2kez Mail',
                favicon_url VARCHAR(255) NULL,
                seo_title VARCHAR(255) NULL,
                seo_description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS advertisements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                image_url VARCHAR(255) NULL,
                link_url VARCHAR(255) NULL,
                position ENUM('header','sidebar','footer','modal') DEFAULT 'sidebar',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS member_emails (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                custom_name VARCHAR(100) NOT NULL,
                domain VARCHAR(100) NOT NULL DEFAULT '2kez.xyz',
                expire_at DATETIME NULL,
                status ENUM('active','expired','suspended') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS adsense_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                publisher_id VARCHAR(50) NOT NULL,
                ads_txt TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        ];

        for (const statement of tableStatements) {
            await connection.query(statement);
        }

        console.log('✓ 資料庫初始化完成');
    } finally {
        await connection.end();
    }
}

if (require.main === module) {
    updateEnvFile()
        .then(() => initializeDatabase())
        .then(() => {
            console.log('資料庫初始化流程完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('資料庫初始化失敗:', error);
            process.exit(1);
        });
}

module.exports = {
    initializeDatabase,
    updateEnvFile
};
