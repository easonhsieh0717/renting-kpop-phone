# 付款成功自動化功能說明

## 功能概述

### 🔥 租金付款成功自動化

當客戶信用卡刷卡成功、Google Sheet的付款狀態更新為 `PAID` 時，系統會自動執行以下兩個動作：

1. **自動開立電子發票**
2. **發送付款成功通知email**

### 🔒 預授權完成自動化

當客戶完成預授權、Google Sheet的保證金狀態更新為 `HELD` 時，系統會自動執行：

1. **發送預授權成功通知email**
2. **記錄預授權完成時間戳記**

## 功能特色

### ✅ 自動電子發票開立
- 使用ECPay B2C電子發票API
- 支援手機載具和雲端發票
- 自動更新Google Sheet發票欄位
- 失敗時會記錄錯誤原因

### ✅ 付款成功Email通知
- 美觀的HTML郵件模板
- 包含訂單詳情和取機資訊
- 自動計算可取機時間（租借前一天晚上）
- 提供詳細的注意事項和客服聯絡方式

### ✅ 並行處理
- 發票開立和email通知同時進行
- 失敗不會互相影響
- 詳細的日誌記錄

## 觸發條件

### 🔥 租金付款自動化觸發條件

1. 訂單的付款狀態從 **非PAID** 變更為 **PAID**
2. 透過ECPay回調成功更新付款狀態時

### 🔒 預授權自動化觸發條件

1. ECPay預授權回調成功 (`RtnCode = '1'`)
2. 保證金狀態更新為 **HELD**
3. 透過 `/api/ecpay/preauth/return` 回調端點觸發

## 環境變數設定

### 必要的環境變數

```env
# Email通知設定
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password

# ECPay發票API（已存在）
ECPAY_MERCHANT_ID=3383324
ECPAY_HASH_KEY=your_hash_key
ECPAY_HASH_IV=your_hash_iv

# Google Sheets（已存在）
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
GOOGLE_SHEET_ID=your_google_sheet_id
```

### Gmail設定步驟

1. **開啟兩步驟驗證**
   - 前往 [Google帳戶安全性設定](https://myaccount.google.com/security)
   - 開啟「兩步驟驗證」

2. **產生應用程式密碼**
   - 在安全性頁面找到「應用程式密碼」
   - 選擇「郵件」應用程式
   - 複製產生的16位密碼作為 `EMAIL_PASSWORD`

3. **設定環境變數**
   ```env
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASSWORD=generated_16_char_password
   ```

## Email內容

### 📧 付款成功通知包含：

- **訂單資訊**：訂單編號、手機型號、租借期間、付款金額
- **取機資訊**：可取機時間（租借前一天晚上18:00後）、取機地點、聯絡電話
- **重要注意事項**：準時取機、攜帶證件、保持設備完好等
- **客服聯絡方式**：電話、LINE客服、營業時間

### 🎨 郵件特色：

- 使用品牌色彩（金黃色主題）
- 響應式HTML設計
- 清楚的區塊分類
- 同時提供HTML和純文字版本

## 測試功能

### 1. 測試Email配置

```bash
# GET請求檢查Email配置
curl https://your-domain.vercel.app/api/test-email
```

回應範例：
```json
{
  "success": true,
  "message": "Email configuration is valid",
  "emailConfigured": true
}
```

### 2. 發送測試Email

```bash
# POST請求發送測試郵件
curl -X POST https://your-domain.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "test@example.com"}'
```

## 運作流程

```mermaid
graph TD
    A[ECPay回調] --> B[updateReservationStatus]
    B --> C{狀態變為PAID?}
    C -->|是| D[觸發自動化流程]
    C -->|否| E[僅更新狀態]
    D --> F[並行執行]
    F --> G[發票開立API]
    F --> H[發送Email通知]
    G --> I[更新發票欄位]
    H --> J[記錄Email結果]
    I --> K[完成]
    J --> K
```

## Google Sheet欄位對應

| 欄位 | 索引 | 說明 | 用途 |
|------|------|------|------|
| A | 0 | 訂單編號 | 主要識別 |
| B | 1 | 手機型號 | Email內容 |
| C | 2 | 開始日期 | 計算取機時間 |
| D | 3 | 結束日期 | Email內容 |
| F | 5 | 客戶姓名 | Email收件人 |
| G | 6 | 客戶Email | Email地址 |
| H | 7 | 客戶電話 | 備用聯絡 |
| I | 8 | 付款狀態 | 觸發條件 |
| M | 12 | 最終金額 | 發票金額 |
| O | 14 | 手機載具 | 發票載具 |
| P | 15 | 發票號碼 | 自動填入 |
| Q | 16 | 發票狀態 | 自動填入 |
| R | 17 | 發票開立時間 | 自動填入 |

## 故障排除

### 常見問題

1. **Email發送失敗**
   ```
   Error: Invalid login: 535-5.7.8 Username and Password not accepted
   ```
   - 檢查是否使用應用程式密碼而非一般密碼
   - 確認兩步驟驗證已開啟

2. **發票開立失敗**
   ```
   Error: Invoice creation failed: 訂單不存在
   ```
   - 檢查ECPay環境變數設定
   - 確認在正式環境使用正式憑證

3. **自動化未觸發**
   - 檢查付款狀態是否確實從非PAID變為PAID
   - 查看Vercel Functions日誌

### 查看日誌

在Vercel Dashboard中：
1. 進入你的專案
2. 點選 "Functions" 標籤
3. 查看 `updateReservationStatus` 相關日誌
4. 搜尋關鍵字：`"Triggering automation"`

## 手動觸發

如需手動補開發票或重送email，可使用現有的管理介面：

- **發票管理**：`/admin/invoice-push`
- **單筆發票**：`/admin` （單筆訂單管理）

## 安全考量

1. **環境變數保護**：敏感資訊儲存在Vercel環境變數中
2. **錯誤處理**：失敗不會中斷付款流程
3. **日誌記錄**：所有操作都有詳細記錄
4. **重複執行保護**：避免重複開立發票或發送email

## 更新記錄

- **v1.0.0** (2024-01-XX): 初始版本，支援自動發票開立和email通知
- 整合現有ECPay B2C發票功能
- 新增美觀的HTML email模板
- 實作並行處理機制 