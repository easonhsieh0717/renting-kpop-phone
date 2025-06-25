# 追星神器 - 手機出租平台

這是一個使用 Next.js, Tailwind CSS, 和 Google Sheets 作為資料庫的手機出租網站。專案主題靈感來自 G-Dragon 的 Peaceminusone 雛菊風格。

## Getting Started

## 功能

- **產品展示**: 從 Google Sheet 動態讀取並展示可供租借的手機列表。
- **價格計算**: 互動式日曆，可根據租借天數計算階梯式租金。
- **線上預約**: 顧客可以填寫資料並建立預約，訂單將自動記錄到 Google Sheet。
- **線上付款**: 整合綠界 ECPay 金流，實現線上刷卡付款。
- **類 iRent 搜尋功能**: 使用者可在首頁透過日期範圍和手機型號，搜尋可租借的手機。

## 技術棧

- **前端**: [Next.js](https://nextjs.org/) (React 框架)
- **樣式**: [Tailwind CSS](https://tailwindcss.com/)
- **後端 & 資料庫**: [Google Sheets API](https://developers.google.com/sheets/api)
- **部署**: [Vercel](https://vercel.com/)

### 核心邏輯檔案
- `lib/sheets/`: 負責與 Google Sheets 互動的模組，包含讀取手機 (`phones.ts`) 與預約 (`reservations.ts`) 資料的邏輯。
- `lib/ecpay.ts`: 負責產生綠界金流所需的加密參數。
- `lib/search.ts`: 提供伺服器端的搜尋功能，能根據日期和型號過濾可用的手機。
- `lib/utils.ts`: 提供通用的輔助函式，如安全的型別轉換。

## 環境變數設定

為了讓專案能正常運作，您需要在 Vercel (或您的本地 `.env.local` 檔案) 中設定以下環境變數。

### Google Sheets API

1.  `GOOGLE_SHEET_ID`: 您的 Google Sheet 檔案的 ID。
2.  `GOOGLE_SHEETS_CLIENT_EMAIL`: 您在 Google Cloud Console 建立的服務帳戶的 Email。
3.  `GOOGLE_SHEETS_PRIVATE_KEY`: 您的服務帳戶金鑰。從 JSON 檔案複製時，請確保包含 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----` 的完整內容，並手動處理換行符（在 Vercel UI 中，它們會被正確處理）。

### 綠界金流 (ECPay) - (進行中)

1.  `ECPAY_MERCHANT_ID`: 您在綠界的商店代號 (測試環境)。
2.  `ECPAY_HASH_KEY`: 綠界提供的 HashKey (測試環境)。
3.  `ECPAY_HASH_IV`: 綠界提供的 HashIV (測試環境)。
4.  `ECPAY_API_URL`: 綠界的 API 端點 (測試環境為 `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5`)。
5.  `APP_URL`: 您網站的完整網址 (例如 `https://your-site.vercel.app`)，用於接收付款回調。

## 本地開發

1.  複製專案
2.  安裝依賴: `npm install`
3.  建立 `.env.local` 檔案，並填入上述環境變數。
4.  啟動開發伺服器: `npm run dev`
5.  在瀏覽器中打開 `http://localhost:3000`

## 一、專案簡介
本網站旨在提供一個簡易、直觀的手機出租平台，使用者可瀏覽可租借手機、查看每日價格、預約租期並線上付款。付款完畢後，現場取機需支付押金並進行設備檢查。網站整合綠界金流與電子發票服務。

---

## 二、使用角色
- **訪客用戶**：可查看手機與價格資訊。
- **預約用戶**：可選擇手機與日期進行線上預約與付款。
- **管理員（店主）**：管理手機資料、預約紀錄、租借日程與金流狀態。

---

## 三、功能說明

### 1. 首頁（`/`）
- 展示所有可租借的手機清單（圖片＋名稱）
- 點擊某支手機後進入詳細頁

### 2. 手機詳細頁（`/phones/[id]`）
- 手機圖片
- 型號、規格（簡略說明）
- 價格表（每日計價，支援不同日期不同價格）
- 可點選日期進行預約
- 標記不可預約日（如：已被預訂、維修、緩衝日）

### 3. 日期選擇器邏輯
- 可選擇多日（起租日＋歸還日）
- **系統自動在歸還日後補上1日「緩衝日」**，避免重疊
- 已租出或緩衝中的日期不可選

### 4. 預約流程
1. 使用者選擇租期與手機
2. 系統計算租金（每日價格 * 天數）
3. 使用綠界金流付款
4. 付款成功後寄出電子發票（整合綠界會員 API）
5. 系統發出「預約成功通知信」包含以下資訊：
   - 手機型號
   - 租借期間
   - 取機地點、時間
   - 押金與現場檢查提醒

### 5. 現場取機規則（頁尾固定說明）
- 現場需支付押金（可為現金或轉帳）
- 檢查手機功能無誤後交機
- 歸還日需如期交還，否則每日加收租金

### 6. 後台功能（限管理員）
- 手機管理：新增 / 編輯 / 停用機種
- 價格管理：設定每支手機的每日價格
- 預約管理：瀏覽所有租借紀錄與狀態
- 日曆管理：檢視各手機的租借排程
- 綠界訂單狀態同步（成功 / 失敗 / 退款）
- 出貨與歸還確認紀錄（可選擇開發）

---

## 四、資料結構建議（簡化版）

### 手機（Phones）
| 欄位名稱 | 型別 | 說明 |
|----------|------|------|
| id       | string | 唯一識別碼 |
| name     | string | 型號名稱 |
| imageUrl | string | 圖片 URL |
| specs    | string | 規格簡述 |
| active   | boolean | 是否啟用中 |

### 價格（PhonePrices）
| 欄位名稱 | 型別 | 說明 |
|----------|------|------|
| phoneId  | string | 對應手機 ID |
| date     | date   | 日期 |
| price    | number | 單日租金價格 |

### 預約（Reservations）
| 欄位名稱 | 型別 | 說明 |
|----------|------|------|
| id       | string | 預約編號 |
| userInfo | object | 包含姓名、電話、Email |
| phoneId  | string | 手機 ID |
| startDate | date  | 起租日 |
| endDate   | date  | 歸還日 |
| bufferDate | date | 緩衝日（系統自動填） |
| totalPrice | number | 總金額 |
| paymentStatus | enum(paid, pending, failed) | 付款狀態 |
| createdAt | datetime | 建立時間 |

---

## 五、技術需求建議
- **前端框架**：React + Next.js / Vite
- **UI 元件**：Tailwind CSS + 日曆元件（如 react-day-picker）
- **後端**：Firebase / Supabase / Node.js（依據開發平台）
- **金流串接**：綠界 ECPay（信用卡、ATM 虛擬帳號等）
- **發票系統**：整合綠界電子發票 API
- **部署**：Vercel / Netlify（前端）＋可選後端 API 主機

---

## 六、補充備註
- 緩衝日不對外顯示但不可被預約
- 手機型號未來可加入篩選（品牌、型號、容量）
- 支援 LINE 通知（可日後擴充）
- 系統可另加入 QR Code 掃描簽收功能（進階）
- 建議設立「常見問題 FAQ」與「租借條款」

---

## 七、參考頁面原型
- [ ] 首頁手機展示
- [ ] 手機詳情與日期預約頁
- [ ] 成功付款與通知信樣板
- [ ] 管理後台（可選擇先不開發）

---

## 八、開發流程指引（給 Cursor AI 或開發者參考）

### 🧩 模組化開發原則
- 每次修改應限於一項功能（單一檔案或單一頁面）
- 若涉及多個檔案，請分批實作並註明相依順序

### 📝 每次修改須包含以下紀錄格式（建議附在 `README.md` 或 `CHANGELOG.md`）

#### ✅ 修改紀錄格式
```markdown
### [v0.1.1] 2025-06-21 新增手機詳情頁功能

- 新增檔案：`/pages/phones/[id].tsx`：建立手機詳情頁
- 新增元件：`components/PriceCalendar.tsx`：價格日曆選擇器
- 修改檔案：`routes/phones.ts`：新增動態路由邏輯
- 備註：加入日期緩衝邏輯（歸還日+1天為 disabled）

下個模組：付款流程（綠界串接）
```

---

## 九、架構補充說明

### 1. 系統分為兩大子介面
#### 🔹 前台介面（給租客使用）
- 網站首頁（手機展示）
- 手機詳情頁（可選租期）
- 日期選擇與即時計價
- 預約與付款流程（整合綠界）
- 完成頁：顯示預約資訊與通知

#### 🔹 後台介面（給店主管理）
- 登入後才能進入（建議使用簡單密碼驗證或 Google 登入）
- 手機管理（新增/修改/停用）
- 價格管理（按日期設價）
- 預約總覽（訂單查詢、租期檢視、付款狀態）
- 出機 / 歸還確認（可勾選狀態）

> ✅ 可先開發前台 MVP，後台以 Google Sheet 操作為過渡。

---

### 2. 資料庫使用 Google Sheet（簡化部署）

#### 🧾 資料表設計建議：

**A. phones（手機列表）**
| id | name | imageUrl | specs | active |
|----|------|----------|-------|--------|
| uuid | iPhone 15 Pro | https://... | 256GB 藍色 | TRUE |

**B. prices（每日價格）**
| phoneId | date | price |
|---------|------|-------|
| uuid | 2025-06-21 | 300 |

**C. reservations（預約紀錄）**
| id | name | phoneId | startDate | endDate | totalPrice | payStatus |
|----|------|---------|-----------|---------|------------|-----------|
| uuid | 王小明 | uuid | 2025-06-25 | 2025-06-28 | 900 | paid |

#### 🧠 技術整合提醒：
- 前端（Next.js / Vite）可使用 Google Sheets API `v4` 讀寫資料（使用 OAuth 或 service account）
- 為確保安全，建議由後端 proxy 處理（避免暴露 API Key）

#### 🔐 建議的 Sheet 權限控管方式：
- 製作三份 Google Sheet 對應三種資料（手機、價格、預約）
- 前台僅讀取 phones/prices，預約寫入 reservation
- 後台使用「連結開啟的 Google 表單」編輯資料，或透過 dashboard UI 串接 API 編輯

---

### 3. 與 Cursor AI 的協作補充建議

- 請以模組為單位，例如：
  - `pages/index.tsx` ➝ 手機列表渲染
  - `lib/sheets/phones.ts` ➝ Google Sheet 資料讀取函式（封裝）
  - `components/PhoneCard.tsx` ➝ 每一支手機顯示卡片
- 每次請 Cursor AI 回應前，先讓它列出 **將修改 / 新增的檔案與功能**
- 修改完後，Cursor 請更新 `CHANGELOG.md` 中紀錄版本與檔案

---

> ✅ 若後續有擴充需求，也可以將 Google Sheet 替換為 Firebase、Supabase 等無需架設的資料庫。

# 最新更新 (v1.0.1)

✅ **電子發票功能已完成** (2025-06-25)
- ECPay B2C電子發票API整合完成
- 支援載具功能 (手機條碼、雲端發票)
- 修正發票金額欄位映射問題
- 本地環境使用測試憑證，生產環境使用正式憑證
- 批次發票補開功能完成

# 觸發Vercel重新部署 - Wed Jun 25 21:41:29 CST 2025
# Force Deploy - Wed Jun 25 21:45:20 CST 2025
