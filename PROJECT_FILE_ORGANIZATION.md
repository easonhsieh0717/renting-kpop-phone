# 追星神器 - 手機出租平台 - 項目文件整理報告

## 📁 項目概述

這是一個使用 Next.js 14、TypeScript、Tailwind CSS 和 Google Sheets API 的手機出租網站。專案主題靈感來自 G-Dragon 的 Peaceminusone 雛菊風格，主要服務演唱會追星、出國旅遊等短期手機租借需求。

**當前版本**: v1.1.0  
**部署平台**: Vercel  
**主要功能**: 手機展示、價格計算、線上預約、綠界金流、電子發票、自動化通知

---

## 📋 核心配置文件

### 🔧 項目配置
- **`package.json`** - 項目依賴和腳本配置
- **`tsconfig.json`** - TypeScript 編譯配置
- **`next.config.js`** - Next.js 框架配置
- **`tailwind.config.js`** - Tailwind CSS 樣式配置
- **`postcss.config.js`** - PostCSS 處理配置
- **`jsconfig.json`** - JavaScript 路徑別名配置
- **`vercel.json`** - Vercel 部署配置

### 🌍 環境配置
- **`env-template.txt`** - 環境變數模板
- **`temp_env.sh`** - 臨時環境變數腳本

---

## 📚 文檔文件 (MD Files)

### 📖 主要文檔
- **`README.md`** - 項目主要說明文檔，包含功能介紹、技術棧、環境設定等
- **`CHANGELOG.md`** - 開發進度記錄，詳細記錄各版本的功能更新和修復

### 🔧 設定指南
- **`OAUTH_SETUP_GUIDE.md`** - Google Drive OAuth 設定指南
- **`INVOICE_PUSH_SETUP.md`** - 電子發票推送功能設定說明
- **`PAYMENT_SUCCESS_AUTOMATION.md`** - 付款成功自動化功能說明

### 📝 其他文檔
- **`_🟢__寧陛_梯".md`** - 項目相關文檔
- **`_🟢__🵤🹪🉍_銵_md`** - 項目相關文檔

---

## 🏗️ 應用程式架構 (app/)

### 🎯 主要頁面
- **`app/page.tsx`** - 首頁，展示手機列表
- **`app/layout.tsx`** - 根布局，包含 SEO 設定和全局樣式
- **`app/loading.tsx`** - 載入頁面
- **`app/error.tsx`** - 錯誤處理頁面

### 📱 手機相關頁面
- **`app/phones/[id]/page.tsx`** - 手機詳情頁面
- **`app/phones/[id]/client-page.tsx`** - 手機詳情客戶端組件

### 🔐 認證頁面
- **`app/login/page.tsx`** - 登入頁面
- **`app/oauth-setup/page.tsx`** - OAuth 設定頁面

### 📄 合約相關
- **`app/contract-sign/page.tsx`** - 合約簽署頁面
- **`app/orders/[orderId]/contract/page.tsx`** - 訂單合約頁面

### 🧪 測試頁面
- **`app/test/page.tsx`** - 測試頁面
- **`app/testMode/page.tsx`** - 測試模式頁面
- **`app/test-column-mapping/page.tsx`** - 欄位映射測試
- **`app/test-invoice/page.tsx`** - 發票測試頁面
- **`app/test-preauth/page.tsx`** - 預授權測試頁面

### 🤖 AI 相關
- **`app/ai-no-coding/page.tsx`** - AI 無代碼頁面

### 👨‍💼 管理後台
- **`app/admin/page.tsx`** - 管理主頁面
- **`app/admin/dashboard/page.tsx`** - 儀表板
- **`app/admin/cash-payment/page.tsx`** - 現金付款管理
- **`app/admin/fix-time/page.tsx`** - 時間修復
- **`app/admin/invoice-push/page.tsx`** - 發票推送管理
- **`app/admin/preauth-management/page.tsx`** - 預授權管理

---

## 🔌 API 端點 (app/api/)

### 💳 金流相關
- **`app/api/ecpay/`** - 綠界金流 API
  - `preauth/return/route.ts` - 預授權回調
  - `return/route.ts` - 一般回調

### 📄 發票相關
- **`app/api/invoice/create/route.ts`** - 發票開立 API

### 📋 訂單相關
- **`app/api/orders/`** - 訂單管理 API
  - `[orderId]/route.ts` - 訂單詳情
  - `[orderId]/capture/route.ts` - 訂單扣款
  - `[orderId]/deposit/route.ts` - 押金處理
  - `[orderId]/refund/route.ts` - 退款處理
  - `[orderId]/sign/route.ts` - 簽署處理
  - `[orderId]/upload/route.ts` - 上傳處理
  - `[orderId]/void-preauth/route.ts` - 預授權取消
  - `deposit-status/route.ts` - 押金狀態
  - `search/route.ts` - 訂單搜尋

### 📱 手機相關
- **`app/api/phones/[phoneId]/route.ts`** - 手機資料 API

### 🔍 搜尋相關
- **`app/api/search/route.ts`** - 搜尋 API

### 📅 預約相關
- **`app/api/reservations/route.ts`** - 預約管理 API

### 🔐 認證相關
- **`app/api/auth/`** - 認證 API
  - `login/route.ts` - 登入
  - `logout/route.ts` - 登出
  - `callback/route.ts` - 回調

### 🔗 OAuth 相關
- **`app/api/oauth/setup/route.ts`** - OAuth 設定

### 🧪 測試相關
- **`app/api/test-*`** - 各種測試 API
  - `test-email/route.ts` - 郵件測試
  - `test-payment/route.ts` - 付款測試
  - `test-orders/route.ts` - 訂單測試
  - `test-sheets-update/route.ts` - 表格更新測試
  - `test-column-mapping/route.ts` - 欄位映射測試
  - `test-direct-update/route.ts` - 直接更新測試
  - `test-manual-void/route.ts` - 手動取消測試
  - `test-preauth-email/route.ts` - 預授權郵件測試
  - `test-update-preauth/route.ts` - 預授權更新測試
  - `test-oauth-drive/` - OAuth Drive 測試

### 🐛 除錯相關
- **`app/api/debug-*`** - 除錯 API
  - `debug-order/route.ts` - 訂單除錯
  - `debug-order-data/route.ts` - 訂單資料除錯
  - `debug-preauth-data/route.ts` - 預授權資料除錯
  - `debug-all-sheets-data/` - 所有表格資料除錯

### 👨‍💼 管理相關
- **`app/api/admin/`** - 管理 API
  - `cash-payment/route.ts` - 現金付款
  - `fix-time-format/route.ts` - 時間格式修復
  - `preauth-orders/route.ts` - 預授權訂單
  - `update-sheet-headers/route.ts` - 表格標題更新

### 🎫 折扣相關
- **`app/api/discounts/validate/route.ts`** - 折扣驗證

### 🤖 機器人相關
- **`app/api/robots/route.ts`** - 機器人協議

### 🗺️ 網站地圖
- **`app/api/sitemap/route.ts`** - 網站地圖生成

### 🖼️ OG 圖片
- **`app/api/og-image/route.ts`** - Open Graph 圖片生成

### ⏰ 定時任務
- **`app/api/cron/invoice-check/`** - 發票檢查定時任務

### 🔔 Webhook
- **`app/api/webhooks/sheet-update/route.ts`** - 表格更新 Webhook

### 📧 郵件相關
- **`app/api/send-preauth-success-email/route.ts`** - 預授權成功郵件

---

## 🧩 組件庫 (components/)

### 📱 手機相關
- **`PhoneCard.tsx`** - 手機卡片組件
- **`PriceCalendar.tsx`** - 價格日曆選擇器

### 🔍 搜尋相關
- **`SearchForm.tsx`** - 搜尋表單組件

### 📊 圖表相關
- **`RentalCalendarChart.tsx`** - 租借日曆圖表
- **`RentalTimeline.tsx`** - 租借時間軸

### 🎯 通用組件
- **`FloatingButtons.tsx`** - 浮動按鈕組件

---

## 📚 核心庫 (lib/)

### 📊 Google Sheets 相關
- **`lib/sheets/phones.ts`** - 手機資料處理
- **`lib/sheets/reservations.ts`** - 預約資料處理
- **`lib/sheets/discounts.ts`** - 折扣資料處理

### 💳 金流相關
- **`lib/ecpay.ts`** - 綠界金流整合

### 📧 郵件相關
- **`lib/email.ts`** - 郵件發送功能

### 🔐 認證相關
- **`lib/auth.ts`** - 認證功能

### 🔍 搜尋相關
- **`lib/search.ts`** - 搜尋功能

### 💾 檔案相關
- **`lib/drive.ts`** - Google Drive 整合

### 🛠️ 工具函數
- **`lib/utils.ts`** - 通用工具函數

---

## 📝 類型定義 (types/)

- **`types/index.ts`** - TypeScript 類型定義

---

## 🎨 靜態資源

### 🖼️ 圖片資源 (public/images/)
- **`DEMO.jpg`** - 示範圖片
- **`googlemap.png`** - Google 地圖圖片
- **`Grand-Ballroom-VIP-Court-7-8-9-scaled-1-jpg.webp`** - 場地圖片
- **`line_At.png`** - LINE 聯絡圖片
- **`S23U.png`** - Samsung S23 Ultra 圖片
- **`S24U.png`** - Samsung S24 Ultra 圖片
- **`S25U.png`** - Samsung S25 Ultra 圖片
- **`video.MP4`** - 影片檔案

### 🔤 字體資源
- **`fonts/JasonHandwriting1.ttf`** - 手寫風格字體
- **`fonts/NotoSansTC-Regular.otf`** - 思源黑體
- **`public/fonts/JasonHandwriting1.ttf`** - 公開字體
- **`public/NotoSansTC-Regular.otf`** - 公開字體

---

## 📄 其他文件

### 🌐 HTML 文件
- **`index.html`** - 主要 HTML 文件
- **`color.html`** - 顏色測試頁面

### 📄 文字文件
- **`imei-list.txt`** - IMEI 列表
- **`_🟢_.txt`** - 項目相關文字文件
- **`122.rtf`** - RTF 格式文件
- **`KAKAO.rtf`** - Kakao 相關文件

### 🔧 部署相關
- **`.gitignore`** - Git 忽略文件
- **`middleware.ts`** - Next.js 中間件
- **`.absolute-force-deploy`** - 強制部署觸發
- **`.final-deploy-trigger`** - 最終部署觸發
- **`.force-deploy`** - 強制部署
- **`.vercel-deploy-trigger`** - Vercel 部署觸發

---

## 🏗️ 項目架構特點

### ✅ 已完成功能
1. **前台介面** - 手機展示、詳情頁面、價格計算
2. **搜尋功能** - 日期範圍和手機型號搜尋
3. **預約系統** - 線上預約和資料記錄
4. **金流整合** - 綠界 ECPay 付款系統
5. **電子發票** - 自動發票開立功能
6. **郵件通知** - 付款成功自動通知
7. **管理後台** - 訂單管理和資料處理
8. **OAuth 整合** - Google Drive 檔案上傳

### 🔄 開發中功能
1. **自動化流程** - 付款成功後的自動化處理
2. **預授權管理** - 押金預授權功能
3. **合約簽署** - 電子合約簽署系統

### 📈 技術特色
- **Next.js 14** - 最新 React 框架
- **TypeScript** - 類型安全開發
- **Tailwind CSS** - 現代化樣式系統
- **Google Sheets API** - 簡化資料庫管理
- **Vercel 部署** - 自動化部署流程
- **SEO 優化** - 完整的 SEO 設定

---

## 🎯 建議改進項目

### 📁 文件整理建議
1. **統一命名規範** - 將特殊字符文件名改為英文
2. **文檔分類** - 建立 docs/ 目錄整理所有文檔
3. **API 文檔** - 建立 API 文檔說明
4. **部署指南** - 完善部署和維護文檔

### 🔧 代碼優化建議
1. **組件重構** - 將大型組件拆分為更小的可重用組件
2. **錯誤處理** - 完善錯誤處理機制
3. **測試覆蓋** - 增加單元測試和整合測試
4. **效能優化** - 圖片優化和載入優化

### 🚀 功能擴展建議
1. **多語言支援** - 支援英文和韓文
2. **會員系統** - 用戶註冊和登入
3. **評價系統** - 用戶評價和回饋
4. **LINE 整合** - LINE 通知和客服
5. **QR Code 功能** - 掃描簽收功能

---

## 📊 項目統計

- **總文件數**: 約 150+ 個文件
- **代碼文件**: 約 80+ 個 TypeScript/JavaScript 文件
- **文檔文件**: 約 10+ 個 Markdown 文件
- **API 端點**: 約 40+ 個 API 路由
- **組件數量**: 6 個主要組件
- **核心庫**: 7 個主要功能模組

---

*最後更新: 2025年1月*
*項目狀態: 生產環境運行中* 