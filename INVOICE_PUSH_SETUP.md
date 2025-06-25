# 電子發票推送功能設定說明

## 功能概述

本系統提供自動偵測Google Sheet更新並觸發ECPay B2C電子發票補開的推送功能。

## 主要功能

### 1. 手動偵測機制
- 手動掃描Google Sheet中的訂單資料
- 偵測條件：已付款(PAID) + 發票狀態為空或包含"失敗"
- 僅支援手動觸發操作

### 2. 批次補開發票
- 一次處理多筆需要補開的發票
- 自動間隔1秒避免API限制
- 發票開立成功後自動更新Google Sheet

### 3. 管理介面
- **主要管理頁面**: `/admin` - 單筆訂單發票開立
- **批次管理頁面**: `/admin/invoice-push` - 批次發票補開管理

## API端點

### 1. Webhook API
- **GET** `/api/webhooks/sheet-update` - 查看需要補開發票的訂單列表
- **POST** `/api/webhooks/sheet-update` - 批次觸發發票補開



### 2. 發票開立API
- **POST** `/api/invoice/create` - 單筆發票開立

## 環境變數設定

### 必要環境變數
```env
# ECPay 正式環境憑證
ECPAY_MERCHANT_ID=3383324
ECPAY_HASH_KEY=你的正式HashKey
ECPAY_HASH_IV=你的正式HashIV

# Google Sheets 憑證
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
GOOGLE_SHEET_ID=你的Google表單ID

# 應用程式URL（Vercel會自動設定VERCEL_URL）
APP_URL=https://your-domain.vercel.app
```

### 可選環境變數
```env
# Cron任務安全金鑰（建議設定）
CRON_SECRET=your-secure-random-string
```

## 部署設定

### Vercel Cron Jobs
項目已包含 `vercel.json` 配置文件，會自動設定：
- 每6小時執行一次定時檢查：`0 */6 * * *`
- API函數超時時間設定為5分鐘（批次處理）

## 具體手動操作步驟

### 方法一：使用管理介面（推薦）

#### 第1步：開啟管理頁面
1. 開啟瀏覽器
2. 進入發票推送管理頁面：
   ```
   https://your-domain.vercel.app/admin/invoice-push
   ```

#### 第2步：查看需要補開發票的訂單
1. 點擊頁面上的「查看需要補開發票的訂單」按鈕
2. 系統會自動掃描Google Sheet
3. 顯示符合條件的訂單列表（已付款但未開發票）

#### 第3步：選擇處理方式
**選項A - 批次處理（推薦）**
1. 如果有多筆訂單，點擊「批次處理全部」
2. 系統會自動依序處理每筆訂單
3. 每筆發票之間會自動間隔1秒，避免API限制

**選項B - 單筆處理**
1. 針對特定訂單，點擊該訂單旁的「開立發票」按鈕
2. 系統會立即處理該筆訂單

#### 第4步：查看處理結果
1. 頁面會即時顯示每筆發票的處理狀態
2. 成功的發票會顯示：發票號碼、開立時間等資訊
3. 失敗的發票會顯示錯誤原因
4. 成功的發票資訊會自動更新到Google Sheet的P、Q、R欄位

### 方法二：從主要管理頁面進入

#### 第1步：進入主要管理頁面
```
https://your-domain.vercel.app/admin
```

#### 第2步：點擊批次發票管理
1. 在頁面右上角找到「批次發票管理」按鈕
2. 點擊後會直接跳轉到發票推送管理頁面

#### 第3步：按照方法一的步驟2-4操作

### 方法三：使用API直接呼叫（進階用戶）

#### 查看需要補開的訂單
```bash
curl -X GET https://your-domain.vercel.app/api/webhooks/sheet-update
```

#### 批次觸發發票補開
```bash
curl -X POST https://your-domain.vercel.app/api/webhooks/sheet-update
```

### 重要提醒

1. **環境限制**：正式ECPay憑證只能在Vercel生產環境使用，本地localhost無法測試
2. **處理間隔**：批次處理時系統會自動間隔1秒，避免ECPay API限制
3. **錯誤處理**：如果某筆發票開立失敗，不會影響其他發票的處理
4. **重複執行**：已成功開立發票的訂單不會重複處理
5. **網路穩定**：確保網路連線穩定，避免處理過程中斷

## Google Sheet 欄位對應

### 重要欄位說明
- **A欄**: 訂單編號
- **I欄**: 付款狀態 (PAID)
- **N欄**: 文件簽署狀態 (已簽署)
- **O欄**: 手機載具號碼
- **P欄**: 發票號碼 (系統自動填入)
- **Q欄**: 發票狀態 (系統自動填入)
- **R欄**: 發票開立時間 (系統自動填入)

### 觸發條件
訂單必須同時滿足以下條件才會被處理：
1. 付款狀態 = "PAID"
2. 發票狀態為空白或包含"失敗"字樣

**注意**：發票開立與文件簽署無關，只要訂單已付款即可開立發票

## 監控和故障排除

### 查看執行記錄
- Vercel Dashboard → Functions → Logs
- 搜尋 `[CRON]` 關鍵字查看定時任務記錄

### 常見問題
1. **正式憑證解密失敗**: 確保在Vercel生產環境執行，正式憑證無法在localhost測試
2. **Google Sheet權限錯誤**: 檢查服務帳戶是否有Sheet編輯權限
3. **API超時**: 如果訂單過多，可能需要分批處理

### 測試建議
1. 先使用測試憑證(商店代號3085340)驗證功能
2. 在Vercel生產環境測試正式憑證
3. 建立少量測試訂單驗證完整流程

## 安全考量

1. **環境變數保護**: 敏感資訊儲存在Vercel環境變數中
2. **API認證**: 可設定CRON_SECRET保護定時任務端點
3. **錯誤處理**: 失敗的發票會記錄錯誤原因，不會重複處理
4. **日誌記錄**: 所有操作都有詳細的日誌記錄

## 升級和維護

### 定期檢查項目
1. ECPay憑證有效期
2. Google Sheets API配額使用量
3. Vercel函數執行記錄
4. 失敗發票的錯誤原因分析

### 功能擴展建議
1. 可以新增 Slack/Discord 通知
2. 可以新增發票開立失敗的重試機制
3. 可以新增發票金額異常檢測 