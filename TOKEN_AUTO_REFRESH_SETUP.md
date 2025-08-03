# Token 自動刷新設定指南

## 功能概述

本系統新增了五天自動刷新 OAuth token 的功能，確保 Google Drive 存取不會因為 token 過期而中斷。

## 🚀 **主要功能**

### 1. 自動刷新機制
- **每五天自動執行一次** token 刷新
- **不影響現有手動機制**，所有原有的手動操作保持不變
- **自動記錄刷新時間**到 Google Sheet
- **安全驗證**機制防止未授權訪問

### 2. 記錄系統
- 所有刷新記錄自動寫入 Google Sheet
- 記錄包含：時間戳、狀態、錯誤訊息、新 token、刷新類型
- 可通過管理介面查看歷史記錄

### 3. 管理介面
- **Token 管理頁面**: `/admin/token-management`
- **即時狀態監控**
- **手動刷新功能**
- **自動刷新測試**

## 📋 **設定步驟**

### 步驟 1: 環境變數設定

在 Vercel 環境變數中添加：

```env
# 定時任務安全金鑰（建議設定）
CRON_SECRET=your-secure-random-string

# 最後刷新時間（系統會自動更新）
LAST_TOKEN_REFRESH_TIME=2024-01-01T00:00:00.000Z
```

### 步驟 2: Google Sheet 設定

在你的 Google Sheet 中建立一個新的工作表 `token_refresh_log`，包含以下欄位：

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| 時間戳 | 狀態 | 錯誤訊息 | 新 Refresh Token | 過期時間 | 刷新類型 |

### 步驟 3: 部署設定

系統已包含 `vercel.json` 設定，會自動：
- 每五天執行一次定時任務：`0 0 */5 * *`
- API 函數超時時間設定為 60 秒

## 🔧 **API 端點**

### 1. Token 刷新 API
- **POST** `/api/oauth/refresh-token` - 手動刷新 token
- **GET** `/api/oauth/refresh-token` - 檢查 token 狀態

### 2. 自動刷新 API
- **GET** `/api/cron/refresh-token` - 自動刷新（需要 CRON_SECRET）
- **POST** `/api/cron/refresh-token` - 手動觸發自動刷新

### 3. 記錄 API
- **POST** `/api/oauth/log-refresh` - 記錄刷新到 Google Sheet
- **GET** `/api/oauth/log-refresh` - 讀取刷新記錄

## 📊 **管理介面使用**

### 1. 訪問管理頁面
前往：`https://your-domain.vercel.app/admin/token-management`

### 2. 功能說明
- **Token 狀態**: 顯示當前 token 狀態和最後刷新時間
- **手動刷新**: 立即執行 token 刷新
- **測試自動刷新**: 測試自動刷新機制
- **刷新記錄**: 查看歷史刷新記錄

### 3. 監控指標
- Token 是否已設定
- 距離上次刷新的時間
- 下次自動刷新的時間
- 刷新成功/失敗狀態

## 🔒 **安全機制**

### 1. 授權驗證
- 自動刷新需要 `CRON_SECRET` 驗證
- 防止未授權的 API 調用

### 2. 錯誤處理
- 刷新失敗時自動記錄錯誤
- 不會影響現有系統運行

### 3. 記錄追蹤
- 所有操作都有詳細記錄
- 可追蹤刷新歷史和問題

## ⚠️ **重要注意事項**

### 1. 環境變數更新
- 自動刷新後，需要**手動更新** Vercel 環境變數中的新 token
- 系統會提供新的 refresh token，需要複製到環境變數

### 2. Google Sheet 權限
- 確保 Service Account 有寫入 Google Sheet 的權限
- 檢查 `token_refresh_log` 工作表是否存在

### 3. 監控建議
- 定期檢查管理頁面的刷新狀態
- 關注 Google Sheet 中的刷新記錄
- 設定錯誤通知機制

## 🔍 **故障排除**

### 1. 自動刷新失敗
- 檢查 `CRON_SECRET` 是否正確設定
- 確認 OAuth 配置是否完整
- 查看 Google Sheet 中的錯誤記錄

### 2. 記錄寫入失敗
- 檢查 Google Sheet 權限設定
- 確認 `GOOGLE_SHEET_ID` 是否正確
- 驗證 Service Account 憑證

### 3. Token 過期
- 使用手動刷新功能立即更新
- 前往 `/oauth-setup` 重新授權
- 檢查 Google Cloud Console 中的 OAuth 設定

## 📈 **監控和維護**

### 1. 定期檢查
- 每週檢查一次管理頁面
- 查看 Google Sheet 中的刷新記錄
- 確認環境變數中的 token 是最新的

### 2. 效能優化
- 系統會自動檢查是否需要刷新
- 避免不必要的重複刷新
- 記錄詳細的執行時間和結果

### 3. 備份策略
- 保留手動刷新機制作為備用
- 定期備份 OAuth 配置
- 記錄所有重要的刷新事件

## 🎯 **總結**

這個自動刷新系統：
- ✅ **不影響現有手動機制**
- ✅ **每五天自動執行**
- ✅ **完整記錄所有操作**
- ✅ **提供管理介面監控**
- ✅ **安全可靠的驗證機制**

設定完成後，你的 Google Drive 存取將更加穩定可靠！ 