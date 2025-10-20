# 信箱系統 - 安裝與使用指南

## 專案概述
這是一個完整的信箱系統，具備以下功能：
- ✅ 基本郵件收發 (SMTP/IMAP)
- ✅ 使用者認證系統
- ✅ 資料庫自動初始化
- ✅ JWT 自動生成
- ✅ 安全防護（防 SQL 注入、XSS、暴力破解等）
- 🔄 10 分鐘臨時信箱
- 🔄 會員註冊驗證碼
- 🔄 後台管理系統
- 🔄 廣告管理
- 🔄 Google AdSense 整合

## 快速開始

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env` 並修改設定：

```bash
cp .env.example .env
```

重要設定項目：
- `DB_PASSWORD`: 您的 MySQL 密碼
- `DEFAULT_SMTP_HOST`: mail.2kez.xyz
- `DEFAULT_SMTP_PORT`: 465
- `DEFAULT_SMTP_USER`: 您的郵件帳號
- `DEFAULT_SMTP_PASS`: 您的郵件密碼

注意：JWT_SECRET 會在首次啟動時自動生成。

### 3. 初始化資料庫

首次啟動時會自動檢查並建立資料庫和資料表。

或手動執行：
```bash
npm run init-db
```

### 4. 啟動伺服器

開發模式（自動重啟）：
```bash
npm run dev
```

正式環境：
```bash
npm start
```

## 資料庫架構

### 核心資料表
- `users` - 使用者帳號（含驗證、管理員、會員到期日期）
- `emails` - 郵件內容
- `folders` - 郵件資料夾
- `attachments` - 附件
- `email_accounts` - 郵件帳戶設定

### 進階功能資料表
- `temp_emails` - 臨時信箱（10分鐘自動過期）
- `verification_codes` - 驗證碼
- `ip_blocks` - IP 封鎖與白名單
- `attack_logs` - 攻擊記錄
- `site_settings` - 網站設定
- `advertisements` - 廣告管理
- `member_emails` - 會員自訂信箱
- `admin_logs` - 管理員操作記錄
- `adsense_settings` - Google AdSense 設定

## API 端點

### 認證 API (`/api/auth`)
- `POST /register` - 註冊
- `POST /login` - 登入
- `GET /me` - 取得目前使用者資訊

### 郵件 API (`/api/emails`)
需要認證（Bearer Token）：
- `GET /folders` - 取得資料夾列表
- `GET /emails` - 取得郵件列表
- `GET /emails/:id` - 取得郵件詳情
- `POST /send` - 發送郵件
- `POST /fetch` - 接收新郵件（需要 account_id）
- `PATCH /emails/:id` - 標記郵件（已讀/星號）
- `PATCH /emails/:id/move` - 移動郵件
- `DELETE /emails/:id` - 刪除郵件
- `GET /accounts` - 取得郵件帳戶列表
- `POST /accounts` - 新增郵件帳戶

## 安全功能

系統已實作以下安全機制：
1. ✅ SQL 注入防護
2. ✅ XSS 攻擊防護
3. ✅ PHP 注入防護
4. ✅ 暴力破解防護（登入限制）
5. ✅ 請求頻率限制
6. ✅ IP 封鎖與白名單
7. ✅ 自動記錄攻擊日誌

## Cloudflare SSL 設定

### 域名: 2kez.xyz

1. 在 Cloudflare 中設定 DNS 記錄：
   - 類型: A
   - 名稱: @ (或 mail)
   - 內容: 您的伺服器 IP
   - Proxy: 啟用（橘色雲朵）

2. SSL/TLS 設定：
   - 加密模式: Full (strict)
   - 最小 TLS 版本: 1.2

3. 設定反向代理（使用 Nginx）：

```nginx
server {
    listen 80;
    server_name 2kez.xyz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 2kez.xyz;

    # Cloudflare SSL
    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

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
    }
}
```

## Google AdSense 整合

### ads.txt 檔案

在網站根目錄建立 `public/ads.txt`，內容：
```
google.com, pub-5334700198490226, DIRECT, f08c47fec0942fa0
```

存取網址：https://2kez.xyz/ads.txt

## 待完成功能

以下功能架構已建立，需要繼續開發：

### 1. 10 分鐘臨時信箱
- 檔案位置：`services/tempEmail.js`（需建立）
- 功能：自動生成、IP 限制、自動過期

### 2. 會員註冊驗證碼
- 檔案位置：`services/verification.js`（需建立）
- 功能：發送驗證碼、驗證、過期處理

### 3. 後台管理介面
- 檔案位置：`routes/admin.js`（需建立）
- 功能：網站設定、SEO、用戶管理、信箱管理、封鎖管理、廣告管理

### 4. 前端頁面擴充
- 臨時信箱首頁
- 後台管理介面
- 會員信箱專區

## 開發進度

✅ 完成項目：
- [x] 資料庫架構設計
- [x] 基本郵件收發功能
- [x] 使用者認證系統
- [x] 資料庫自動初始化
- [x] JWT 自動生成
- [x] 安全防護中間件
- [x] 前端基本介面

🔄 進行中：
- [ ] 10 分鐘臨時信箱服務
- [ ] 會員驗證系統
- [ ] 後台管理介面
- [ ] 廣告系統

## 聯絡資訊

域名：https://2kez.xyz
郵件伺服器：mail.2kez.xyz

## 授權

MIT License
