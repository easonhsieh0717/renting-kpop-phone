# OAuth 重新授權指引

## 問題說明

您的 Google OAuth refresh token 已經過期（365天未使用），需要重新授權。

## 解決步驟

### 1. 重新授權
1. 前往 OAuth 設定頁面：
   ```
   https://renting-kpop-phone.vercel.app/oauth-setup
   ```

2. 點擊「開始授權」按鈕

3. 登入 Google 帳戶並授權應用程式

4. 複製新的 refresh token

### 2. 更新 Vercel 環境變數
在 Vercel 專案設定中更新以下環境變數：

```
GOOGLE_OAUTH_REFRESH_TOKEN = [新的 refresh token]
LAST_TOKEN_REFRESH_TIME = [當前時間，格式：2024-08-03T16:00:00.000Z]
```

### 3. 驗證設定
1. 檢查 OAuth 配置：
   ```
   https://renting-kpop-phone.vercel.app/api/test-oauth-config
   ```

2. 測試手動刷新：
   - 前往 Token 管理頁面
   - 點擊「手動刷新 Token」按鈕

### 4. 確認自動刷新
1. 測試自動刷新功能：
   - 點擊「測試自動刷新」按鈕
   - 應該顯示成功訊息

## 注意事項

- **Refresh Token 有效期：** Google 的 refresh token 在 6 個月未使用後會自動失效
- **定期刷新：** 建議每 5 天自動刷新一次，避免 token 過期
- **環境變數：** 確保所有 OAuth 相關的環境變數都正確設定

## 環境變數檢查清單

確保以下環境變數都已正確設定：

```
GOOGLE_CLIENT_ID = [Google OAuth Client ID]
GOOGLE_CLIENT_SECRET = [Google OAuth Client Secret]
GOOGLE_OAUTH_REFRESH_TOKEN = [新的 refresh token]
CRON_SECRET = [定時任務安全金鑰]
LAST_TOKEN_REFRESH_TIME = [最後刷新時間]
```

## 故障排除

如果重新授權後仍有問題：

1. **檢查環境變數：** 使用測試 API 確認所有變數都已設定
2. **清除快取：** 重新部署應用程式
3. **檢查權限：** 確認 Google OAuth 應用程式有正確的權限設定
4. **查看日誌：** 檢查 Vercel 部署日誌中的錯誤訊息 