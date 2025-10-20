const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { createUser, findUserByUsernameOrEmail, generateToken, getUserById } = require('../services/userService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post(
    '/register',
    [
        body('username').isLength({ min: 3, max: 50 }).withMessage('使用者名稱需介於 3-50 個字'),
        body('email').isEmail().withMessage('請提供有效的 Email'),
        body('password').isLength({ min: 6 }).withMessage('密碼至少 6 碼')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password } = req.body;

        const existing = await findUserByUsernameOrEmail(username);
        if (existing) {
            return res.status(400).json({ message: '使用者名稱已被註冊' });
        }

        const existingEmail = await findUserByUsernameOrEmail(email);
        if (existingEmail) {
            return res.status(400).json({ message: 'Email 已被註冊' });
        }

        try {
            const user = await createUser({ username, email, password });
            const token = generateToken(user);
            return res.status(201).json({
                message: '註冊成功',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    is_verified: user.is_verified,
                    is_admin: user.is_admin
                }
            });
        } catch (error) {
            console.error('註冊失敗:', error);
            return res.status(500).json({ message: '註冊失敗，請稍後再試' });
        }
    }
);

router.post(
    '/login',
    [
        body('username').notEmpty().withMessage('請輸入使用者名稱或 Email'),
        body('password').notEmpty().withMessage('請輸入密碼')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        const user = await findUserByUsernameOrEmail(username);

        if (!user) {
            return res.status(400).json({ message: '帳號或密碼錯誤' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '帳號或密碼錯誤' });
        }

        const token = generateToken(user);
        return res.json({
            message: '登入成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is_verified: user.is_verified,
                is_admin: user.is_admin
            }
        });
    }
);

router.get('/me', authenticate, async (req, res) => {
    const user = await getUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: '找不到使用者' });
    }

    return res.json({ user });
});

module.exports = router;
