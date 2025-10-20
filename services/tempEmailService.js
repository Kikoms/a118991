const crypto = require('crypto');
const { query, transaction } = require('../config/database');

const DAILY_LIMIT = Number(process.env.MAX_TEMP_EMAILS_PER_DAY || 5);
const EMAIL_DOMAIN = process.env.TEMP_EMAIL_DOMAIN || '2kez.xyz';
const TTL_MINUTES = Number(process.env.TEMP_EMAIL_EXPIRE_MINUTES || 10);

function generateToken() {
    return crypto.randomBytes(24).toString('hex');
}

function generateEmailAddress() {
    return `${crypto.randomBytes(8).toString('hex')}@${EMAIL_DOMAIN}`;
}

async function countTodayByIp(ip) {
    const rows = await query(
        `SELECT COUNT(*) as total FROM temp_emails WHERE ip_address = ? AND DATE(created_at) = CURDATE()`,
        [ip]
    );
    return rows[0]?.total || 0;
}

async function createTempEmail(ip) {
    const totalToday = await countTodayByIp(ip);
    if (totalToday >= DAILY_LIMIT) {
        const remaining = 0;
        return { success: false, remaining };
    }

    const email = generateEmailAddress();
    const token = generateToken();
    const expireAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

    const result = await transaction(async (connection) => {
        const [insertResult] = await connection.execute(
            'INSERT INTO temp_emails (email, token, ip_address, expire_at) VALUES (?, ?, ?, ?)',
            [email, token, ip, expireAt]
        );

        return insertResult.insertId;
    });

    return {
        success: true,
        data: {
            id: result,
            email,
            token,
            expireAt,
            remainingTime: TTL_MINUTES * 60
        },
        remaining: DAILY_LIMIT - totalToday - 1
    };
}

async function getTempEmail(email) {
    const rows = await query('SELECT * FROM temp_emails WHERE email = ? LIMIT 1', [email]);
    const record = rows[0];

    if (!record) {
        return null;
    }

    if (new Date(record.expire_at) < new Date()) {
        await query('UPDATE temp_emails SET status = "expired" WHERE id = ?', [record.id]);
        return { ...record, status: 'expired' };
    }

    return record;
}

async function getMessagesByEmail(email) {
    const temp = await getTempEmail(email);
    if (!temp) {
        return null;
    }

    const rows = await query(
        `SELECT id, from_email, subject, body, received_at
         FROM temp_email_messages
         WHERE temp_email_id = ?
         ORDER BY received_at DESC`,
        [temp.id]
    );

    return {
        tempEmail: temp,
        messages: rows
    };
}

async function checkStatus(email) {
    const temp = await getTempEmail(email);
    if (!temp) {
        return null;
    }

    const remaining = Math.max(0, Math.floor((new Date(temp.expire_at) - Date.now()) / 1000));
    return {
        email: temp.email,
        status: temp.status,
        remaining
    };
}

async function listTodayByIp(ip) {
    return query(
        `SELECT email, expire_at, status FROM temp_emails WHERE ip_address = ? AND DATE(created_at) = CURDATE() ORDER BY created_at DESC`,
        [ip]
    );
}

async function cleanupExpired() {
    await query('UPDATE temp_emails SET status = "expired" WHERE status = "active" AND expire_at < NOW()');
    await query('DELETE FROM temp_email_messages WHERE temp_email_id IN (SELECT id FROM temp_emails WHERE status = "expired" AND expire_at < DATE_SUB(NOW(), INTERVAL 1 DAY))');
    await query('DELETE FROM temp_emails WHERE status = "expired" AND expire_at < DATE_SUB(NOW(), INTERVAL 7 DAY)');
}

module.exports = {
    createTempEmail,
    getTempEmail,
    getMessagesByEmail,
    checkStatus,
    listTodayByIp,
    cleanupExpired
};
