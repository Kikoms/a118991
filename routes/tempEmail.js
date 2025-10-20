const express = require('express');
const {
    createTempEmail,
    getMessagesByEmail,
    checkStatus,
    listTodayByIp
} = require('../services/tempEmailService');

const router = express.Router();

router.post('/create', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const result = await createTempEmail(ip);

    if (!result.success) {
        return res.status(429).json({
            success: false,
            message: '已達到今日建立上限',
            remaining: result.remaining
        });
    }

    return res.status(201).json({
        success: true,
        message: '臨時信箱建立成功',
        data: result.data,
        remaining: result.remaining
    });
});

router.get('/:email/messages', async (req, res) => {
    const { email } = req.params;
    const result = await getMessagesByEmail(email);
    if (!result) {
        return res.status(404).json({ message: '找不到臨時信箱或已過期' });
    }

    return res.json(result);
});

router.get('/check/:email', async (req, res) => {
    const { email } = req.params;
    const result = await checkStatus(email);
    if (!result) {
        return res.status(404).json({ message: '找不到臨時信箱' });
    }

    return res.json(result);
});

router.get('/ip/list', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const list = await listTodayByIp(ip);
    return res.json({ ip, list });
});

module.exports = router;
