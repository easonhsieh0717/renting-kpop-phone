# 📁 項目文件整理清單

## 🚨 需要立即整理的文件

### 📝 特殊字符文件名（建議重命名）
- `_🟢__寧陛_梯".md` → `project-notes-1.md`
- `_🟢__🵤🹪🉍_銵_md` → `project-notes-2.md`
- `_🟢_.txt` → `project-notes.txt`

### 📄 重複或過時文件
- `index.html` 和 `color.html` - 檢查是否還需要
- `122.rtf` 和 `KAKAO.rtf` - 確認內容和用途
- 多個部署觸發文件 - 可以合併或清理

## 📚 文檔文件整理

### ✅ 主要文檔（已完成）
- `README.md` - 項目主要說明
- `CHANGELOG.md` - 開發進度記錄
- `OAUTH_SETUP_GUIDE.md` - OAuth 設定指南
- `INVOICE_PUSH_SETUP.md` - 發票功能說明
- `PAYMENT_SUCCESS_AUTOMATION.md` - 付款自動化說明

### 🔧 建議新增文檔
- `API_DOCUMENTATION.md` - API 端點說明
- `DEPLOYMENT_GUIDE.md` - 部署和維護指南
- `DEVELOPMENT_GUIDE.md` - 開發指南
- `TROUBLESHOOTING.md` - 故障排除指南

## 🏗️ 代碼文件結構

### ✅ 核心架構（已完成）
```
app/
├── page.tsx                 # 首頁
├── layout.tsx              # 根布局
├── phones/[id]/            # 手機詳情
├── admin/                  # 管理後台
├── api/                    # API 端點
└── test/                   # 測試頁面

components/
├── PhoneCard.tsx           # 手機卡片
├── PriceCalendar.tsx       # 價格日曆
├── SearchForm.tsx          # 搜尋表單
├── RentalCalendarChart.tsx # 租借圖表
├── RentalTimeline.tsx      # 時間軸
└── FloatingButtons.tsx     # 浮動按鈕

lib/
├── sheets/                 # Google Sheets 整合
├── ecpay.ts               # 金流整合
├── email.ts               # 郵件功能
├── auth.ts                # 認證功能
├── search.ts              # 搜尋功能
├── drive.ts               # Drive 整合
└── utils.ts               # 工具函數
```

## 🎨 靜態資源整理

### ✅ 圖片資源
- `public/images/` - 所有產品圖片
- `public/fonts/` - 字體文件

### 🔧 建議優化
- 圖片壓縮和格式優化
- 建立圖片命名規範
- 考慮使用 CDN

## 📊 項目統計摘要

| 類別 | 數量 | 狀態 |
|------|------|------|
| 主要頁面 | 15+ | ✅ 完成 |
| API 端點 | 40+ | ✅ 完成 |
| 組件 | 6 | ✅ 完成 |
| 核心庫 | 7 | ✅ 完成 |
| 文檔 | 8 | 🔧 需要整理 |
| 測試文件 | 10+ | ✅ 完成 |

## 🎯 整理優先級

### 🔥 高優先級
1. **重命名特殊字符文件**
2. **清理重複文件**
3. **建立 API 文檔**

### 🔶 中優先級
1. **優化圖片資源**
2. **完善部署指南**
3. **建立開發指南**

### 🔵 低優先級
1. **代碼重構**
2. **效能優化**
3. **測試覆蓋**

## 📋 整理檢查清單

### 文件命名
- [ ] 重命名特殊字符文件
- [ ] 統一命名規範
- [ ] 移除重複文件

### 文檔完善
- [ ] 建立 API 文檔
- [ ] 完善部署指南
- [ ] 建立故障排除指南

### 代碼優化
- [ ] 檢查未使用的文件
- [ ] 優化組件結構
- [ ] 完善錯誤處理

### 資源優化
- [ ] 圖片壓縮
- [ ] 字體優化
- [ ] 建立資源規範

---

## 🚀 下一步行動

1. **立即執行**: 重命名特殊字符文件
2. **本週完成**: 清理重複文件和建立 API 文檔
3. **下週完成**: 完善部署和開發指南
4. **長期目標**: 代碼重構和效能優化

---

*整理狀態: 進行中*  
*最後更新: 2025年1月* 