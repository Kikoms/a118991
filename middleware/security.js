const { query } = require('../config/database');

const suspiciousPatterns = [/\b(select|insert|update|delete|drop|union|sleep|benchmark)\b/i, /<script/i, /onerror=/i, /onload=/i];

async function logAttack(ip, userAgent, action, detail) {
    try {
        await query(
            'INSERT INTO attack_logs (ip_address, user_agent, action, detail) VALUES (?, ?, ?, ?)',
            [ip, userAgent, action, detail]
        );
    } catch (error) {
        console.error('寫入攻擊日誌失敗:', error.message);
    }
}

function sanitizeString(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

async function securityMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const payloadStrings = [req.originalUrl, JSON.stringify(req.body || {}), JSON.stringify(req.query || {})];
    const combined = payloadStrings.join(' ');

    const matchedPattern = suspiciousPatterns.find((pattern) => pattern.test(combined));
    if (matchedPattern) {
        await logAttack(ip, userAgent, 'pattern-detected', `pattern: ${matchedPattern}`);
        return res.status(400).json({ message: '偵測到異常請求，已拒絕存取' });
    }

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);

    return next();
}

function rateLimitProtection({ windowMs, maxRequests }) {
    const hits = new Map();

    setInterval(() => {
        const now = Date.now();
        for (const [key, attempts] of hits.entries()) {
            const recentAttempts = attempts.filter((timestamp) => now - timestamp < windowMs);
            if (recentAttempts.length) {
                hits.set(key, recentAttempts);
            } else {
                hits.delete(key);
            }
        }
    }, Math.min(windowMs, 60 * 1000)).unref();

    return async function rateLimit(req, res, next) {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const timestamps = hits.get(ip) || [];
        const recentAttempts = timestamps.filter((timestamp) => now - timestamp < windowMs);

        if (recentAttempts.length >= maxRequests) {
            await logAttack(ip, req.headers['user-agent'] || 'unknown', 'rate-limit', 'Too many requests');
            return res.status(429).json({ message: '請求過於頻繁，請稍後再試' });
        }

        recentAttempts.push(now);
        hits.set(ip, recentAttempts);
        return next();
    };
}

module.exports = {
    securityMiddleware,
    rateLimitProtection
};
