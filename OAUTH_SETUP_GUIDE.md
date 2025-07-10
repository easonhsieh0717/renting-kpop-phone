# Google Drive OAuth 設定指南

由於您使用的是個人 Google 帳戶，我們需要使用 OAuth 授權來存取您的 Google Drive。

## 📋 **前置準備：建立 OAuth 客戶端 ID**

### 步驟 1: 前往 Google Cloud Console
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案（如果還沒有專案，請建立一個）

### 步驟 2: 啟用 Drive API
1. 在左側選單中，點選「**APIs & Services**」→「**Library**」
2. 搜尋「**Google Drive API**」
3. 點選進入並按「**Enable**」

### 步驟 3: 建立 OAuth 客戶端 ID
1. 在左側選單中，點選「**APIs & Services**」→「**Credentials**」
2. 點選「**+ CREATE CREDENTIALS**」→「**OAuth client ID**」
3. 如果是第一次建立，需要先設定 OAuth consent screen：
   - 選擇「**External**」
   - 填寫必要資訊：
     - App name: 您的應用程式名稱
     - User support email: 您的 email
     - Developer contact information: 您的 email
   - 儲存並繼續
4. 回到建立 OAuth client ID：
   - Application type: 選擇「**Desktop application**」
   - Name: 輸入名稱（例如：「手機租借系統」）
   - 點選「**Create**」

### 步驟 4: 複製憑證資訊
1. 建立成功後，會顯示 **Client ID** 和 **Client Secret**
2. 複製這兩個值，等等會用到

---

## 🔧 **設定 OAuth 授權**

### 步驟 1: 設定環境變數
**好消息！** 您已經有了 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`，不需要再添加新的變數。

只需要確認您的現有變數是用於 OAuth（而不是其他用途）。如果需要，請將 OAuth 客戶端 ID 和密鑰更新到：

```env
# OAuth 配置 (使用現有變數)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 步驟 2: 重新啟動應用程式
```bash
npm run dev
```

### 步驟 3: 前往 OAuth 設定頁面
1. 在瀏覽器中前往：`http://localhost:3000/oauth-setup`
2. 按照頁面指示完成授權流程
3. 複製得到的 **GOOGLE_OAUTH_REFRESH_TOKEN**

### 步驟 4: 完成設定
將 Refresh Token 添加到 `.env.local`：

```env
GOOGLE_OAUTH_REFRESH_TOKEN=your_refresh_token
```

---

## 📂 **Drive 資料夾設定**

設定您要使用的 Google Drive 資料夾：

```env
# 使用任何您 Google Drive 中的資料夾 ID
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
```

**如何取得資料夾 ID：**
1. 前往 Google Drive
2. 進入您要使用的資料夾
3. 從網址列複製 ID：
   ```
   https://drive.google.com/drive/folders/【這就是資料夾ID】
   ```

---

## ✅ **完成設定**

完成設定後，您的 `.env.local` 文件應該包含：

```env
# OAuth 配置 (使用現有變數)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REFRESH_TOKEN=your_refresh_token

# Drive 資料夾 (已存在)
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
```

重新部署應用程式後，系統將使用您的個人 Google 帳戶上傳檔案到指定的 Drive 資料夾。

---

## 🔍 **驗證設定**

上傳檔案時，您應該會在日誌中看到：
```
使用 OAuth 授權
使用父資料夾: Standard Drive - your_folder_id
```

如果看到「使用 OAuth 授權」，表示設定成功！

---

## ❓ **常見問題**

**Q: 為什麼需要 OAuth？**
A: 個人 Google 帳戶不支援 Service Account 的儲存配額，必須使用 OAuth 授權。

**Q: Refresh Token 會過期嗎？**
A: 如果定期使用，Refresh Token 通常不會過期。如果過期，重新執行授權流程即可。

**Q: 可以使用既有的 Service Account 嗎？**
A: 不行，Service Account 對個人 Google Drive 沒有儲存配額。必須升級到 Google Workspace 或使用 OAuth。 