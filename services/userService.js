const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, transaction } = require('../config/database');

const DEFAULT_FOLDERS = [
    { name: '收件匣', type: 'inbox' },
    { name: '寄件備份', type: 'sent' },
    { name: '草稿', type: 'draft' },
    { name: '垃圾郵件', type: 'spam' },
    { name: '回收桶', type: 'trash' }
];

async function createUser({ username, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);

    return transaction(async (connection) => {
        const [result] = await connection.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        const userId = result.insertId;

        for (const folder of DEFAULT_FOLDERS) {
            await connection.execute(
                'INSERT INTO folders (user_id, name, type) VALUES (?, ?, ?)',
                [userId, folder.name, folder.type]
            );
        }

        return {
            id: userId,
            username,
            email,
            is_verified: 0,
            is_admin: 0
        };
    });
}

async function findUserByUsernameOrEmail(identifier) {
    const rows = await query('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1', [identifier, identifier]);
    return rows[0];
}

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            is_admin: Boolean(user.is_admin)
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

async function getUserById(id) {
    const rows = await query('SELECT id, username, email, is_verified, is_admin, member_expire_at, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
}

module.exports = {
    createUser,
    findUserByUsernameOrEmail,
    generateToken,
    getUserById
};
