# 綠界（ECPay）和電子發票相關檔案整理

## 📁 檔案結構

### 🔧 核心功能檔案

#### **綠界金流核心**
- `lib/ecpay.ts` - 綠界金流整合核心檔案
  - 包含所有 ECPay API 參數生成
  - 支援一般付款、預授權、請款、退刷功能
  - 電子發票參數生成

#### **綠界回調處理**
- `app/api/ecpay/return/route.ts` - 一般交易回調處理
- `app/api/ecpay/preauth/return/route.ts` - 預授權交易回調處理

#### **電子發票功能**
- `app/api/invoice/create/route.ts` - 電子發票開立 API
- `app/admin/invoice-push/page.tsx` - 發票推送管理介面

### 🧪 測試和開發檔案

#### **測試頁面**
- `app/testMode/page.tsx` - ECPay 全方位金流測試
- `app/test-preauth/page.tsx` - 預授權測試頁面
- `app/test-invoice/page.tsx` - 電子發票測試頁面

### 📚 文檔檔案

#### **設定和說明文件**
- `INVOICE_PUSH_SETUP.md` - 電子發票推送功能詳細說明
- `PAYMENT_SUCCESS_AUTOMATION.md` - 付款成功自動化流程
- `temp_env.sh` - 本地測試環境變數
- `env-template.txt` - 環境變數範本

## 🚀 主要功能分類

### **綠界金流功能**
1. **一般付款** - 信用卡、ATM 虛擬帳號
2. **預授權交易** - 先授權後請款
3. **請款功能** - 預授權後請款
4. **退刷功能** - 交易退款

### **電子發票功能**
1. **自動開立** - 付款成功後自動開立發票
2. **批次補開** - 管理介面批次處理
3. **發票狀態追蹤** - 開立狀態管理

### **測試功能**
1. **金流測試** - 完整 ECPay 流程測試
2. **發票測試** - 電子發票開立測試
3. **預授權測試** - 預授權流程測試

## 🔧 環境設定

### **必要的環境變數**
```bash
# 綠界金流設定
ECPAY_MERCHANT_ID=你的商店代號
ECPAY_HASH_KEY=你的HashKey
ECPAY_HASH_IV=你的HashIV
ECPAY_API_URL=https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5

# 電子發票設定
ECPAY_INVOICE_HASH_KEY=你的發票HashKey
ECPAY_INVOICE_HASH_IV=你的發票HashIV
```

## 📋 使用說明

1. **設定環境變數** - 參考 `env-template.txt`
2. **測試金流功能** - 使用 `app/testMode/page.tsx`
3. **測試發票功能** - 使用 `app/test-invoice/page.tsx`
4. **管理發票** - 使用 `app/admin/invoice-push/page.tsx`

## 🔗 相關連結

- 綠界官方文件：https://www.ecpay.com.tw/
- 電子發票 API：https://einvoice.ecpay.com.tw/
- 測試環境：https://payment-stage.ecpay.com.tw/ 