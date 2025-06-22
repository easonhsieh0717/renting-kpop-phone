# 開發進度記錄 (CHANGELOG)

## [Unreleased]

### Added
- Implemented reservation creation functionality.
- Created a backend API endpoint (`/api/reservations`) to handle new bookings.
- New reservations are now automatically saved to a 'reservations' sheet in Google Sheets.
- Added a customer information form (Name, Email) to the phone detail page.
- The "Book Now" button now triggers the reservation creation process.

### Changed
- Converted the phone detail page to a client-side component to handle state and user interaction.
- Enhanced the `PriceCalendar` component to output selected dates and total price to its parent.

## [1.0.0] - YYYY-MM-DD

### Added
- Initial setup with Next.js, TypeScript, and Tailwind CSS.
- Created main page (`/`), phone detail page (`/phones/[id]`).
- Developed `PhoneCard` and `PriceCalendar` components.
- Integrated Google Sheets API to fetch phone data dynamically.
- Implemented G-Dragon Peaceminusone Daisy theme (black, white, yellow).
- Set up project on Vercel with Git integration for CI/CD.

### Fixed
- Resolved numerous Vercel deployment issues related to environment variables, path aliases (`tsconfig.json`, `jsconfig.json`), and build caches.
- Corrected data mapping issues to ensure phone specs and images display correctly.
- Stabilized local development environment by replacing `next/image` with standard `<img>` tags.
- Fixed Git repository issues by removing accidentally committed secrets and rebuilding history.

## [v0.1.3] 2025-01-XX - 價格與押金更新

### ✅ 已完成
- 根據參考圖片更新租金為階梯式定價：
  - **S24 Ultra**: 1-2 天 $500/日, 3+ 天 $450/日
  - **S25 Ultra**: 1-2 天 $600/日, 3+ 天 $550/日
- 新增押金資訊 (NT$ 3000)，並在頁面顯示
- 加入「確認租借後不予退款」提示
- 優化價格日曆與手機詳情頁的說明文字

### 📋 待開發功能

#### 🔹 前台介面（優先級：高）
- [x] 首頁手機展示列表
- [x] 手機詳情頁面
- [x] 日期選擇器與價格計算
- [ ] 預約表單與付款流程
- [ ] 預約成功頁面

#### 🔹 後台介面（優先級：中）
- [ ] 管理員登入系統
- [ ] 手機管理功能
- [ ] 價格管理功能
- [ ] 預約管理功能
- [ ] 日曆檢視功能

#### 🔹 技術整合（優先級：高）
- [ ] Google Sheets API 串接
- [ ] 綠界金流整合
- [ ] 電子發票系統
- [ ] 郵件通知系統

### 🎯 下個開發目標
1. 建立預約表單頁面與流程
2. 整合 Google Sheets API 以寫入預約資料
3. 整合綠界金流進行付款

### 📝 開發備註
- 下一步將專注於完成核心預約流程
- Google Sheets API 將用於讀取與寫入資料
- 後台功能可先用 Google Sheets 手動操作

---

## [v0.1.2] 2025-01-XX - 手機型號更新

### ✅ 已完成
- 更新手機資料，只保留 Samsung Galaxy S24 Ultra 和 S25 Ultra
- 提供 256GB 和 512GB 容量選項
- 更新價格設定 (舊版)
- 優化價格日曆顯示邏輯

### 📋 待開發功能

#### 🔹 前台介面（優先級：高）
- [x] 首頁手機展示列表
- [x] 手機詳情頁面
- [x] 日期選擇器與價格計算
- [ ] 預約表單與付款流程
- [ ] 預約成功頁面

#### 🔹 後台介面（優先級：中）
- [ ] 管理員登入系統
- [ ] 手機管理功能
- [ ] 價格管理功能
- [ ] 預約管理功能
- [ ] 日曆檢視功能

#### 🔹 技術整合（優先級：高）
- [ ] Google Sheets API 串接
- [ ] 綠界金流整合
- [ ] 電子發票系統
- [ ] 郵件通知系統

### 🎯 下個開發目標
1. 建立預約表單頁面
2. 整合 Google Sheets API
3. 加入更多手機圖片

### 📝 開發備註
- 採用模組化開發方式，每次專注於單一功能
- 使用 Google Sheets 作為初期資料庫
- 優先開發前台 MVP 功能
- 後台功能可先用 Google Sheets 手動操作

---

## [v0.1.1] 2025-01-XX - 基礎架構建立

### ✅ 已完成
- 建立 Next.js 專案基礎架構
- 設定 TypeScript 與 Tailwind CSS
- 建立手機列表首頁 (`app/page.tsx`)
- 建立手機詳情頁面 (`app/phones/[id]/page.tsx`)
- 建立手機卡片元件 (`components/PhoneCard.tsx`)
- 建立價格日曆選擇器 (`components/PriceCalendar.tsx`)
- 建立類型定義 (`types/index.ts`)
- 建立模擬資料模組 (`lib/sheets/phones.ts`)
- 設定專案配置檔案 (package.json, tsconfig.json, tailwind.config.js)

### 📋 待開發功能

#### 🔹 前台介面（優先級：高）
- [x] 首頁手機展示列表
- [x] 手機詳情頁面
- [x] 日期選擇器與價格計算
- [ ] 預約表單與付款流程
- [ ] 預約成功頁面

#### 🔹 後台介面（優先級：中）
- [ ] 管理員登入系統
- [ ] 手機管理功能
- [ ] 價格管理功能
- [ ] 預約管理功能
- [ ] 日曆檢視功能

#### 🔹 技術整合（優先級：高）
- [ ] Google Sheets API 串接
- [ ] 綠界金流整合
- [ ] 電子發票系統
- [ ] 郵件通知系統

### 🎯 下個開發目標
1. 安裝依賴套件並啟動開發伺服器
2. 建立預約表單頁面
3. 整合 Google Sheets API

### 📝 開發備註
- 採用模組化開發方式，每次專注於單一功能
- 使用 Google Sheets 作為初期資料庫
- 優先開發前台 MVP 功能
- 後台功能可先用 Google Sheets 手動操作

---

## [v0.1.0] 2025-01-XX - 專案初始化

### ✅ 已完成
- 建立專案規格書 (`README.md`)
- 建立開發進度記錄 (`CHANGELOG.md`)
- 定義系統架構與資料結構
- 規劃開發流程與模組化原則

---

## 開發里程碑

### 🚀 Phase 1: 基礎架構 (預計 1-2 週)
- [x] Next.js 專案設定
- [x] Tailwind CSS 樣式系統
- [ ] Google Sheets API 整合
- [x] 基礎元件庫建立

### 🎨 Phase 2: 前台功能 (預計 2-3 週)
- [x] 首頁手機列表
- [x] 手機詳情頁
- [x] 日期選擇器
- [ ] 預約表單

### 💳 Phase 3: 付款系統 (預計 1-2 週)
- [ ] 綠界金流整合
- [ ] 電子發票系統
- [ ] 郵件通知

### 🔧 Phase 4: 後台管理 (預計 2-3 週)
- [ ] 管理員介面
- [ ] 資料管理功能
- [ ] 預約管理

### 🚀 Phase 5: 部署與優化 (預計 1 週)
- [ ] 生產環境部署
- [ ] 效能優化
- [ ] 測試與除錯

---

## 技術債務與注意事項

### 🔧 待優化項目
- [ ] 圖片優化與 CDN 設定
- [ ] SEO 優化
- [ ] 響應式設計完善
- [ ] 錯誤處理機制
- [ ] 載入狀態優化

### 🛡️ 安全性考量
- [ ] API Key 安全存儲
- [ ] 輸入驗證與防護
- [ ] HTTPS 強制啟用
- [ ] 資料備份機制

### 📱 未來擴充功能
- [ ] LINE 通知整合
- [ ] QR Code 掃描功能
- [ ] 多語言支援
- [ ] 會員系統
- [ ] 評價系統 