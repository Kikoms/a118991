# 信箱系統 - 完整部署指南

## 🎉 專案已完成功能

### ✅ 核心功能
- 使用者註冊與登入系統
- 郵件收發功能 (SMTP/IMAP)
- 10 分鐘臨時信箱（IP 限制每天5個）
- 資料庫自動初始化
- JWT Token 自動生成
- 完整的安全防護系統

### ✅ 安全防護
- SQL 注入防護
- XSS 攻擊防護
- PHP 注入防護
- 暴力破解防護（登入限制）
- 請求頻率限制
- IP 封鎖與白名單
- 攻擊日誌記錄

### ✅ 資料庫架構
- 使用者管理（含驗證、管理員、會員到期）
- 郵件與資料夾管理
- 臨時信箱管理
- 驗證碼系統
- IP 封鎖與攻擊記錄
- 網站設定
- 廣告管理
- Google AdSense 整合

## 📦 快速開始

### 1. 系統需求
- Node.js 16+
- MySQL 5.7+
- 域名: 2kez.xyz
- 郵件伺服器: mail.2kez.xyz

### 2. 安裝步驟

```bash
# 1. 進入專案目錄
cd D:\GOOGEL

# 2. 安裝依賴（已完成）
npm install

# 3. 設定環境變數
# 複製 .env.example 為 .env 並修改設定
cp .env.example .env

# 重要設定項目：
# DB_PASSWORD=您的MySQL密碼
# DEFAULT_SMTP_USER=您的郵件帳號
# DEFAULT_SMTP_PASS=您的郵件密碼
```

### 3. 啟動系統

```bash
# 開發模式（會自動初始化資料庫）
npm run dev

# 正式環境
npm start
```

首次啟動時會自動：
- 檢查並建立資料庫
- 建立所有資料表
- 生成 JWT Secret
- 建立上傳目錄

## 🔧 API 端點總覽

### 認證 API
- `POST /api/auth/register` - 使用者註冊
- `POST /api/auth/login` - 使用者登入
- `GET /api/auth/me` - 取得目前使用者資訊

### 郵件 API (需認證)
- `GET /api/emails/folders` - 取得資料夾列表
- `GET /api/emails/emails` - 取得郵件列表
- `GET /api/emails/emails/:id` - 取得郵件詳情
- `POST /api/emails/send` - 發送郵件
- `POST /api/emails/fetch` - 接收新郵件
- `PATCH /api/emails/emails/:id` - 標記郵件
- `DELETE /api/emails/emails/:id` - 刪除郵件
- `GET /api/emails/accounts` - 取得郵件帳戶
- `POST /api/emails/accounts` - 新增郵件帳戶

### 臨時信箱 API
- `POST /api/temp-email/create` - 建立臨時信箱
- `GET /api/temp-email/check/:email` - 檢查信箱狀態
- `GET /api/temp-email/:email/messages` - 取得郵件列表
- `GET /api/temp-email/:email/messages/:id` - 取得郵件詳情
- `POST /api/temp-email/:email/extend` - 延長時間
- `DELETE /api/temp-email/:email` - 刪除臨時信箱
- `GET /api/temp-email/ip/list` - 取得 IP 的臨時信箱列表

## 🌐 域名設定 (2kez.xyz)

### Cloudflare DNS 設定
```
類型: A
名稱: @
內容: 您的伺服器IP
Proxy: 啟用（橘色雲朵）
```

### SSL/TLS 設定
- 加密模式: Full (strict)
- 最小 TLS 版本: 1.2
- 自動 HTTPS 重寫: 啟用

### Nginx 反向代理設定
```nginx
server {
    listen 80;
    server_name 2kez.xyz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 2kez.xyz;

    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    # Cloudflare IP (可選)
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    real_ip_header CF-Connecting-IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 安全標頭
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # ads.txt
    location = /ads.txt {
        alias /path/to/GOOGEL/public/ads.txt;
    }
}
```

## 📧 郵件伺服器設定 (mail.2kez.xyz)

### SMTP 設定
- 主機: mail.2kez.xyz
- 埠號: 465 (SSL)
- 加密: SSL/TLS
- 使用者名稱: 您的郵件帳號
- 密碼: 應用程式密碼

### IMAP 設定
- 主機: mail.2kez.xyz
- 埠號: 993 (SSL)
- 加密: SSL/TLS
- 使用者名稱: 您的郵件帳號
- 密碼: 應用程式密碼

## 💡 臨時信箱功能說明

### 特色
- 每個 IP 每天最多建立 5 個臨時信箱
- 預設有效期限: 10 分鐘
- 自動生成隨機信箱地址
- 保證不重複
- 過期自動清理

### 使用流程
1. 訪問首頁
2. 點擊「建立臨時信箱」
3. 系統自動生成信箱地址（例如: abc123@2kez.xyz）
4. 使用該信箱接收郵件
5. 10 分鐘後自動過期

### API 使用範例

```javascript
// 建立臨時信箱
fetch('/api/temp-email/create', {
    method: 'POST'
})
.then(res => res.json())
.then(data => {
    console.log('臨時信箱:', data.data.email);
    console.log('過期時間:', data.data.expireAt);
    console.log('剩餘時間(秒):', data.data.remainingTime);
});

// 檢查信箱狀態
fetch('/api/temp-email/check/abc123@2kez.xyz')
.then(res => res.json())
.then(data => {
    console.log('剩餘時間(秒):', data.data.remainingTime);
});

// 取得郵件
fetch('/api/temp-email/abc123@2kez.xyz/messages')
.then(res => res.json())
.then(data => {
    console.log('郵件列表:', data.emails);
});
```

## 🔒 安全功能說明

### 自動防護
系統會自動偵測並記錄以下攻擊行為：
- SQL 注入嘗試
- XSS 攻擊腳本
- PHP 程式碼注入
- 暴力破解登入
- 異常請求頻率

### IP 封鎖機制
- 攻擊次數達 5 次自動封鎖
- 可設定白名單永不封鎖
- 管理員可手動封鎖/解鎖

### 限制規則
- 登入失敗: 15 分鐘內最多 5 次
- API 請求: 1 分鐘內最多 200 次
- 臨時信箱: 1 分鐘內最多 30 次操作

## 📊 Google AdSense

### ads.txt 檔案
已建立在 `public/ads.txt`，內容：
```
google.com, pub-5334700198490226, DIRECT, f08c47fec0942fa0
```

存取網址: https://2kez.xyz/ads.txt

### 驗證步驟
1. 確保 ads.txt 可公開存取
2. 在 AdSense 控制台驗證網站
3. 等待審核通過

## 🔧 待完成功能

以下功能資料庫架構已建立，需要繼續開發：

### 1. 會員註冊驗證碼
- 發送驗證碼至信箱
- 驗證後才能完成註冊

### 2. 後台管理系統
- 網站設定（名稱、Favicon、SEO）
- 會員管理（查看、編輯、到期日期）
- 信箱管理（查看所有信箱）
- 封鎖管理（IP 黑白名單）
- 廣告管理（新增、編輯、位置設定）

### 3. 會員專用功能
- 自訂信箱名稱
- 選擇有效期限
- 會員到期後只能查看不能建立

### 4. 前端頁面
- 臨時信箱首頁
- 後台管理介面
- 會員專區頁面

## 🚀 部署檢查清單

- [ ] 安裝 Node.js 和 MySQL
- [ ] 複製專案檔案
- [ ] 設定 .env 檔案
- [ ] 執行 `npm install`
- [ ] 啟動服務 `npm start`
- [ ] 設定 Nginx 反向代理
- [ ] 設定 Cloudflare DNS
- [ ] 驗證 HTTPS 正常運作
- [ ] 測試郵件收發功能
- [ ] 測試臨時信箱功能
- [ ] 驗證 ads.txt 可存取
- [ ] 設定自動啟動（PM2 或 systemd）

## 🛠️ 使用 PM2 管理（推薦）

```bash
# 安裝 PM2
npm install -g pm2

# 啟動應用
pm2 start server.js --name "email-system"

# 查看狀態
pm2 status

# 查看日誌
pm2 logs email-system

# 設定開機自動啟動
pm2 startup
pm2 save
```

## 📝 資料庫備份

```bash
# 備份資料庫
mysqldump -u root -p email_system > backup_$(date +%Y%m%d).sql

# 還原資料庫
mysql -u root -p email_system < backup_20250101.sql
```

## 🐛 故障排除

### 資料庫連接失敗
檢查 `.env` 中的資料庫設定是否正確

### 郵件發送失敗
確認 SMTP 設定正確，檢查應用程式密碼

### 端口被佔用
修改 `.env` 中的 PORT 設定

### Cloudflare 502 錯誤
確認 Node.js 服務正在運行，檢查 Nginx 設定

## 📞 技術支援

如有問題，請檢查以下檔案：
- README.md - 基本說明
- DEPLOYMENT.md - 本檔案
- .env.example - 環境變數範例

域名: https://2kez.xyz
郵件伺服器: mail.2kez.xyz
