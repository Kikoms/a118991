const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { initializeDatabase, updateEnvFile } = require('./scripts/init-database');
const { securityMiddleware, rateLimitProtection } = require('./middleware/security');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中介軟體
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 全域安全防護
app.use(securityMiddleware);

// 全域請求頻率限制
app.use(rateLimitProtection({
    windowMs: 60 * 1000,
    maxRequests: 200
}));

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/emails', require('./routes/emails'));
app.use('/api/temp-email', require('./routes/tempEmail'));
app.use('/api/admin', require('./routes/admin'));

// 首頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({ error: '找不到頁面' });
});

// 錯誤處理
app.use((err, req, res, next) => {
    console.error('伺服器錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
});

// 啟動伺服器（先初始化資料庫）
async function startServer() {
    try {
        console.log('\n========================================');
        console.log('正在初始化信箱系統...');
        console.log('========================================\n');

        // 檢查並更新 .env（生成 JWT Secret）
        await updateEnvFile();

        // 檢查並初始化資料庫
        await initializeDatabase();

        // 啟動伺服器
        app.listen(PORT, () => {
            console.log(`\n========================================`);
            console.log(`✓ 信箱系統伺服器已啟動`);
            console.log(`✓ 埠號: ${PORT}`);
            console.log(`✓ 環境: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ 存取網址: http://localhost:${PORT}`);
            console.log(`✓ 域名: https://2kez.xyz (需設定反向代理)`);
            console.log(`========================================\n`);
        });
    } catch (error) {
        console.error('✗ 伺服器啟動失敗:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
