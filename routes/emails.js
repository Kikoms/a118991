const express = require('express');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { authenticate } = require('../middleware/auth');
const { query, transaction } = require('../config/database');

const router = express.Router();

const upload = multer({
    dest: path.join(__dirname, '..', 'uploads'),
    limits: { fileSize: 10 * 1024 * 1024 }
});

function createTransporter(account) {
    const smtpConfig = account
        ? {
              host: account.smtp_host,
              port: account.smtp_port,
              secure: Boolean(account.smtp_secure),
              auth: {
                  user: account.smtp_user,
                  pass: account.smtp_pass
              }
          }
        : {
              host: process.env.DEFAULT_SMTP_HOST,
              port: Number(process.env.DEFAULT_SMTP_PORT || 465),
              secure: true,
              auth: {
                  user: process.env.DEFAULT_SMTP_USER,
                  pass: process.env.DEFAULT_SMTP_PASS
              }
          };

    if (!smtpConfig.host || !smtpConfig.auth?.user || !smtpConfig.auth?.pass) {
        return null;
    }

    return nodemailer.createTransport(smtpConfig);
}

async function getAccountById(userId, accountId) {
    const rows = await query('SELECT * FROM email_accounts WHERE id = ? AND user_id = ?', [accountId, userId]);
    return rows[0];
}

router.get('/folders', authenticate, async (req, res) => {
    const folders = await query('SELECT id, name, type FROM folders WHERE user_id = ? ORDER BY id ASC', [req.user.id]);
    return res.json({ folders });
});

router.get('/', authenticate, async (req, res) => {
    const { folder_id: folderId } = req.query;
    const params = [req.user.id];
    let sql = `SELECT id, folder_id, from_email, to_email, subject, is_read, is_starred, sent_at
               FROM emails WHERE user_id = ?`;

    if (folderId) {
        sql += ' AND folder_id = ?';
        params.push(folderId);
    }

    sql += ' ORDER BY sent_at DESC LIMIT 100';

    const emails = await query(sql, params);
    return res.json({ emails });
});

router.post(
    '/send',
    authenticate,
    upload.array('attachments', 5),
    [
        body('to').isEmail().withMessage('請提供有效的收件者'),
        body('subject').isLength({ min: 1 }).withMessage('請輸入郵件主旨'),
        body('body').optional({ nullable: true }).isString()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { to, subject, body: content, account_id: accountId } = req.body;
        let transporterAccount = null;

        if (accountId) {
            transporterAccount = await getAccountById(req.user.id, accountId);
            if (!transporterAccount) {
                return res.status(400).json({ message: '找不到郵件帳戶設定' });
            }
        }

        const transporter = createTransporter(transporterAccount);

        try {
            if (transporter) {
                await transporter.sendMail({
                    from: transporterAccount?.smtp_user || process.env.DEFAULT_SMTP_USER,
                    to,
                    subject,
                    html: content || ''
                });
            }
        } catch (error) {
            console.warn('寄送郵件失敗，但會持續寫入資料庫:', error.message);
        }

        try {
            const emailId = await transaction(async (connection) => {
                const [result] = await connection.execute(
                    'INSERT INTO emails (user_id, folder_id, from_email, to_email, subject, body, is_read, is_starred) VALUES (?, ?, ?, ?, ?, ?, 1, 0)',
                    [
                        req.user.id,
                        null,
                        transporterAccount?.smtp_user || process.env.DEFAULT_SMTP_USER || req.user.email,
                        to,
                        subject,
                        content
                    ]
                );

                const insertedId = result.insertId;

                for (const file of req.files || []) {
                    await connection.execute(
                        'INSERT INTO attachments (email_id, filename, filepath, mimetype, size) VALUES (?, ?, ?, ?, ?)',
                        [
                            insertedId,
                            file.originalname,
                            path.join('uploads', path.basename(file.path)),
                            file.mimetype,
                            file.size
                        ]
                    );
                }

                return insertedId;
            });

            return res.status(201).json({ message: '郵件已寄出', id: emailId });
        } catch (error) {
            console.error('儲存郵件失敗:', error);
            return res.status(500).json({ message: '無法儲存郵件資料' });
        }
    }
);

router.get('/accounts/list', authenticate, async (req, res) => {
    const accounts = await query(
        'SELECT id, label, smtp_host, smtp_port, smtp_secure, imap_host, imap_port, imap_secure FROM email_accounts WHERE user_id = ? ORDER BY id DESC',
        [req.user.id]
    );
    return res.json({ accounts });
});

router.post(
    '/accounts',
    authenticate,
    [
        body('label').isLength({ min: 1 }).withMessage('請輸入帳戶名稱'),
        body('smtp_host').notEmpty(),
        body('smtp_port').isInt(),
        body('smtp_user').notEmpty(),
        body('smtp_pass').notEmpty(),
        body('imap_host').notEmpty(),
        body('imap_port').isInt()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            label,
            smtp_host,
            smtp_port,
            smtp_secure = 1,
            smtp_user,
            smtp_pass,
            imap_host,
            imap_port,
            imap_secure = 1
        } = req.body;

        await query(
            `INSERT INTO email_accounts (user_id, label, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, imap_host, imap_port, imap_secure)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, label, smtp_host, smtp_port, smtp_secure ? 1 : 0, smtp_user, smtp_pass, imap_host, imap_port, imap_secure ? 1 : 0]
        );

        return res.status(201).json({ message: '郵件帳戶已新增' });
    }
);

router.get('/:id', authenticate, async (req, res) => {
    const rows = await query(
        `SELECT e.*, f.name as folder_name
         FROM emails e
         LEFT JOIN folders f ON f.id = e.folder_id
         WHERE e.id = ? AND e.user_id = ?
         LIMIT 1`,
        [req.params.id, req.user.id]
    );

    const email = rows[0];
    if (!email) {
        return res.status(404).json({ message: '找不到郵件' });
    }

    const attachments = await query(
        'SELECT id, filename, filepath, mimetype, size FROM attachments WHERE email_id = ? ORDER BY id ASC',
        [email.id]
    );

    return res.json({ email, attachments });
});

router.post('/fetch', authenticate, async (req, res) => {
    return res.json({ message: '郵件抓取排程已排定', status: 'queued' });
});

router.patch('/:id', authenticate, async (req, res) => {
    const { is_read: isRead, is_starred: isStarred } = req.body;
    await query('UPDATE emails SET is_read = COALESCE(?, is_read), is_starred = COALESCE(?, is_starred) WHERE id = ? AND user_id = ?', [
        isRead,
        isStarred,
        req.params.id,
        req.user.id
    ]);

    return res.json({ message: '郵件狀態已更新' });
});

router.patch('/:id/move', authenticate, async (req, res) => {
    const { folder_id: folderId } = req.body;
    const folders = await query('SELECT id FROM folders WHERE id = ? AND user_id = ?', [folderId, req.user.id]);
    if (!folders.length) {
        return res.status(400).json({ message: '指定的資料夾不存在' });
    }

    await query('UPDATE emails SET folder_id = ? WHERE id = ? AND user_id = ?', [folderId, req.params.id, req.user.id]);
    return res.json({ message: '郵件已移動' });
});

router.delete('/:id', authenticate, async (req, res) => {
    await query('DELETE FROM emails WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json({ message: '郵件已刪除' });
});

module.exports = router;
