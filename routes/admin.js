const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', async (req, res) => {
    const statsRows = await query(
        `SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM users WHERE is_verified = 1) AS verified_users,
            (SELECT COUNT(*) FROM users WHERE is_admin = 1) AS admin_users,
            (SELECT COUNT(*) FROM emails) AS total_emails,
            (SELECT COUNT(*) FROM temp_emails WHERE status = 'active') AS active_temp_emails,
            (SELECT COUNT(*) FROM ip_blocks) AS blocked_ips
         FROM DUAL`
    );
    const stats = statsRows[0] || {};

    const recentAttacks = await query(
        `SELECT ip_address, user_agent, action, detail, created_at
         FROM attack_logs
         ORDER BY created_at DESC
         LIMIT 10`
    );

    return res.json({ stats, recentAttacks });
});

router.get('/users', async (req, res) => {
    const users = await query(
        `SELECT id, username, email, is_verified, is_admin, member_expire_at, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 100`
    );
    return res.json({ users });
});

router.patch(
    '/users/:id',
    [
        body('is_verified').optional().isBoolean(),
        body('is_admin').optional().isBoolean(),
        body('member_expire_at').optional().isISO8601()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { is_verified, is_admin, member_expire_at } = req.body;
        await query(
            `UPDATE users
             SET is_verified = COALESCE(?, is_verified),
                 is_admin = COALESCE(?, is_admin),
                 member_expire_at = COALESCE(?, member_expire_at)
             WHERE id = ?`,
            [
                typeof is_verified === 'boolean' ? (is_verified ? 1 : 0) : null,
                typeof is_admin === 'boolean' ? (is_admin ? 1 : 0) : null,
                member_expire_at || null,
                req.params.id
            ]
        );

        return res.json({ message: '使用者資訊已更新' });
    }
);

router.get('/ip-blocks', async (req, res) => {
    const list = await query(
        `SELECT id, ip_address, reason, blocked_until, created_at, updated_at
         FROM ip_blocks
         ORDER BY created_at DESC`
    );
    return res.json({ list });
});

router.post(
    '/ip-blocks',
    [body('ip_address').isIP().withMessage('請提供有效的 IP'), body('reason').isLength({ min: 3 })],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { ip_address, reason, blocked_until = null } = req.body;
        await query(
            `INSERT INTO ip_blocks (ip_address, reason, blocked_until)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE reason = VALUES(reason), blocked_until = VALUES(blocked_until)`,
            [ip_address, reason, blocked_until]
        );

        return res.status(201).json({ message: 'IP 已封鎖' });
    }
);

router.delete('/ip-blocks/:id', async (req, res) => {
    await query('DELETE FROM ip_blocks WHERE id = ?', [req.params.id]);
    return res.json({ message: 'IP 已解除封鎖' });
});

router.get('/settings/site', async (req, res) => {
    const rows = await query('SELECT * FROM site_settings ORDER BY id ASC LIMIT 1');
    const setting =
        rows[0] || {
            site_name: '2kez Mail',
            favicon_url: null,
            seo_title: null,
            seo_description: null
        };

    return res.json({ setting });
});

router.put(
    '/settings/site',
    [body('site_name').isLength({ min: 1 }).withMessage('請輸入網站名稱')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { site_name, favicon_url = null, seo_title = null, seo_description = null } = req.body;
        await query(
            `INSERT INTO site_settings (id, site_name, favicon_url, seo_title, seo_description)
             VALUES (1, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                site_name = VALUES(site_name),
                favicon_url = VALUES(favicon_url),
                seo_title = VALUES(seo_title),
                seo_description = VALUES(seo_description)`,
            [site_name, favicon_url, seo_title, seo_description]
        );

        return res.json({ message: '網站設定已更新' });
    }
);

module.exports = router;
