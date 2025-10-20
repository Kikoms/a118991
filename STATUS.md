# 🚀 信箱系統 - 目前狀態與使用指南

## ✅ 系統已成功啟動！

**前端網址**: http://localhost:3000
**後端 API**: http://localhost:3000/api
**狀態**: 🟢 運行中

---

## 📊 當前完成進度

### ✅ 已完成功能 (100%)

#### 1. 核心系統
- ✅ Node.js + Express 後端
- ✅ MySQL 資料庫（自動初始化）
- ✅ JWT 認證系統（自動生成密鑰）
- ✅ 完整的 RESTful API
- ✅ 前端使用者介面

#### 2. 郵件功能
- ✅ SMTP 郵件發送
- ✅ IMAP 郵件接收
- ✅ 郵件列表與詳情查看
- ✅ 附件上傳與下載
- ✅ 郵件資料夾管理
- ✅ 郵件帳戶管理

#### 3. 10分鐘臨時信箱 ⭐
- ✅ 自動生成隨機信箱 (格式: random@2kez.xyz)
- ✅ IP 限制：每天最多 5 個
- ✅ 10 分鐘自動過期
- ✅ 保證不重複
- ✅ 自動清理機制
- ✅ 完整 API 端點

#### 4. 安全防護系統
- ✅ SQL 注入防護
- ✅ XSS 攻擊防護
- ✅ PHP 注入防護
- ✅ 暴力破解防護
- ✅ 請求頻率限制
- ✅ IP 封鎖與白名單
- ✅ 攻擊日誌記錄

#### 5. 資料庫架構
- ✅ 使用者管理（含驗證、管理員權限、會員到期）
- ✅ 郵件與附件管理
- ✅ 臨時信箱管理
- ✅ 驗證碼系統架構
- ✅ IP 封鎖與攻擊日誌
- ✅ 網站設定管理
- ✅ 廣告管理架構
- ✅ 會員自訂信箱架構

#### 6. 整合功能
- ✅ Google AdSense (ads.txt 已建立)
- ✅ Cloudflare SSL 準備就緒

---

## 🎯 使用方式

### 1. 基本操作

#### 註冊新帳號
1. 開啟 http://localhost:3000
2. 點擊「註冊」連結
3. 填寫使用者名稱、信箱、密碼
4. 系統會自動建立 5 個預設資料夾

#### 登入系統
1. 輸入使用者名稱或信箱
2. 輸入密碼
3. 登入後即可使用完整功能

#### 新增郵件帳戶
1. 登入後點擊「+ 新增帳戶」
2. 填寫 SMTP 和 IMAP 設定：
   - SMTP 主機: mail.2kez.xyz
   - SMTP 埠號: 465
   - IMAP 主機: mail.2kez.xyz
   - IMAP 埠號: 993
3. 填寫您的郵件帳號和密碼

#### 收發郵件
- **發送**: 點擊「撰寫郵件」
- **接收**: 選擇帳戶後點擊「接收郵件」

### 2. 臨時信箱功能 ⭐

#### 透過 API 使用

**建立臨時信箱**
```bash
curl -X POST http://localhost:3000/api/temp-email/create
```

回應範例：
```json
{
  "success": true,
  "message": "臨時信箱建立成功",
  "data": {
    "id": 1,
    "email": "a1b2c3d4e5f6g7h8@2kez.xyz",
    "expireAt": "2025-10-14T10:15:00.000Z",
    "remainingTime": 600
  },
  "remaining": 4
}
```

**查看臨時信箱郵件**
```bash
curl http://localhost:3000/api/temp-email/a1b2c3d4e5f6g7h8@2kez.xyz/messages
```

**檢查信箱狀態**
```bash
curl http://localhost:3000/api/temp-email/check/a1b2c3d4e5f6g7h8@2kez.xyz
```

**查看今天已建立的臨時信箱**
```bash
curl http://localhost:3000/api/temp-email/ip/list
```

---

## 📡 API 端點總覽

### 認證 API (`/api/auth`)
| 方法 | 端點 | 說明 | 需認證 |
|------|------|------|--------|
| POST | `/register` | 註冊 | ❌ |
| POST | `/login` | 登入 | ❌ |
| GET | `/me` | 取得使用者資訊 | ✅ |

### 郵件 API (`/api/emails`)
| 方法 | 端點 | 說明 | 需認證 |
|------|------|------|--------|
| GET | `/folders` | 取得資料夾列表 | ✅ |
| GET | `/emails` | 取得郵件列表 | ✅ |
| GET | `/emails/:id` | 取得郵件詳情 | ✅ |
| POST | `/send` | 發送郵件 | ✅ |
| POST | `/fetch` | 接收新郵件 | ✅ |
| PATCH | `/emails/:id` | 標記郵件 | ✅ |
| DELETE | `/emails/:id` | 刪除郵件 | ✅ |
| GET | `/accounts` | 取得郵件帳戶 | ✅ |
| POST | `/accounts` | 新增郵件帳戶 | ✅ |

### 臨時信箱 API (`/api/temp-email`)
| 方法 | 端點 | 說明 | 需認證 |
|------|------|------|--------|
| POST | `/create` | 建立臨時信箱 | ❌ |
| GET | `/check/:email` | 檢查信箱狀態 | ❌ |
| GET | `/:email/messages` | 取得郵件列表 | ❌ |
| GET | `/:email/messages/:id` | 取得郵件詳情 | ❌ |
| POST | `/:email/extend` | 延長時間 | ❌ |
| DELETE | `/:email` | 刪除臨時信箱 | ❌ |
| GET | `/ip/list` | 取得IP的臨時信箱 | ❌ |

---

## ⚙️ 環境變數說明

當前設定檔: `.env`

```env
# 伺服器
PORT=3000                    # 伺服器埠號

# 資料庫
DB_HOST=localhost            # MySQL 主機
DB_USER=root                 # MySQL 使用者
DB_PASSWORD=                 # MySQL 密碼（請填寫）
DB_NAME=email_system         # 資料庫名稱

# JWT（已自動生成）
JWT_SECRET=xxxxxxxx          # JWT 密鑰
JWT_EXPIRES_IN=7d            # Token 有效期

# 郵件伺服器
DEFAULT_SMTP_HOST=mail.2kez.xyz
DEFAULT_SMTP_PORT=465
DEFAULT_SMTP_USER=           # 請填寫您的郵件帳號
DEFAULT_SMTP_PASS=           # 請填寫您的郵件密碼

# 臨時信箱
TEMP_EMAIL_DOMAIN=2kez.xyz
MAX_TEMP_EMAILS_PER_DAY=5
TEMP_EMAIL_EXPIRE_MINUTES=10
```

---

## 🔒 安全功能

### 自動防護機制
系統會自動偵測並記錄以下攻擊：
- SQL 注入嘗試
- XSS 攻擊腳本
- PHP 程式碼注入
- 暴力破解登入
- 異常請求頻率

### 限制規則
- **登入失敗**: 15分鐘內最多5次
- **API 請求**: 1分鐘內最多200次
- **臨時信箱**: 1分鐘內最多30次操作
- **臨時信箱建立**: 每個IP每天最多5個

### IP 封鎖
- 攻擊次數達5次自動封鎖
- 可設定白名單永不封鎖
- 所有攻擊行為都會記錄

---

## 🌐 域名部署 (2kez.xyz)

### 需要完成的步驟

1. **Cloudflare DNS 設定**
   ```
   類型: A
   名稱: @
   內容: 您的伺服器IP
   Proxy: 啟用
   ```

2. **Nginx 反向代理**
   請參考 `DEPLOYMENT.md` 中的完整 Nginx 設定

3. **SSL 憑證**
   - 使用 Cloudflare 的 SSL
   - 或使用 Let's Encrypt

4. **ads.txt 驗證**
   - 已建立: `public/ads.txt`
   - 存取: https://2kez.xyz/ads.txt

---

## 📋 待開發功能清單

雖然資料庫架構已建立，但以下功能還需要開發：

### 1. 會員註冊驗證碼 🔄
- [ ] 發送驗證碼至信箱
- [ ] 驗證碼驗證邏輯
- [ ] 過期處理

### 2. 後台管理系統 🔄
- [ ] 管理員登入頁面
- [ ] 網站設定介面（名稱、Favicon、SEO）
- [ ] 會員管理介面
- [ ] 信箱管理介面
- [ ] IP 封鎖管理介面
- [ ] 廣告管理介面

### 3. 會員專用功能 🔄
- [ ] 自訂信箱名稱
- [ ] 選擇有效期限
- [ ] 會員到期限制

### 4. 前端頁面優化 🔄
- [ ] 臨時信箱專用首頁
- [ ] 後台管理介面
- [ ] 會員專區頁面
- [ ] 廣告顯示邏輯

---

## 📝 快速測試

### 測試臨時信箱功能

```bash
# 1. 建立臨時信箱
curl -X POST http://localhost:3000/api/temp-email/create

# 2. 複製返回的 email 地址

# 3. 查看郵件（替換成您的臨時信箱地址）
curl http://localhost:3000/api/temp-email/YOUR_EMAIL@2kez.xyz/messages

# 4. 查看今天建立的臨時信箱
curl http://localhost:3000/api/temp-email/ip/list
```

### 測試 API

```bash
# 註冊
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"123456"}'

# 登入
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

---

## 🎉 總結

### 已完成 ✅
- 完整的信箱系統（收發郵件）
- 10分鐘臨時信箱功能（完整實作）
- 全面的安全防護
- 自動資料庫初始化
- Google AdSense 整合準備

### 系統狀態 🟢
- 前端: http://localhost:3000 **運行中**
- 後端 API: http://localhost:3000/api **運行中**
- 資料庫: **已連接**
- 臨時信箱: **已就緒**

### 下一步建議 💡
1. 填寫 `.env` 中的郵件伺服器密碼
2. 測試臨時信箱功能
3. 部署到 2kez.xyz 域名
4. 開發後台管理介面（如需要）

---

**需要幫助？**
- 查看 `README.md` - 基本說明
- 查看 `DEPLOYMENT.md` - 部署指南
- 查看本檔案 - 使用指南
