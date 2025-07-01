import nodemailer from 'nodemailer';
import { formatDateTimeInTaipei } from './utils';

// SMTP配置 - 可以使用Gmail、Outlook等
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // 或其他email服務
    auth: {
      user: process.env.EMAIL_USER, // 您的email
      pass: process.env.EMAIL_PASSWORD, // 您的email密碼或應用程式密碼
    },
  });
};

// 計算可取機時間（租借開始日前一天晚上）
function getPickupTime(startDate: string): string {
  const start = new Date(startDate);
  const pickupDate = new Date(start);
  pickupDate.setDate(start.getDate() - 1); // 前一天
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Taipei'
  };
  
  return `${pickupDate.toLocaleDateString('zh-TW', formatOptions)} 晚上 18:00 後`;
}

// 付款成功email模板
function createPaymentSuccessEmail(orderData: {
  orderId: string;
  customerName: string;
  phoneModel: string;
  startDate: string;
  endDate: string;
  finalAmount: number;
  pickupLocation?: string;
}) {
  const pickupTime = getPickupTime(orderData.startDate);
  
  const subject = `🎉 付款成功確認 - 訂單 ${orderData.orderId}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FFD700; color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 20px; border: 1px solid #ddd; }
        .footer { background: #f9f9f9; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
        .order-info { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .highlight { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
        .warning { background: #f8d7da; padding: 10px; border-left: 4px solid #dc3545; margin: 15px 0; }
        .contact-info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 付款成功確認</h1>
          <p>感謝您的租借，我們已收到您的付款！</p>
        </div>
        
        <div class="content">
          <p>親愛的 ${orderData.customerName} 您好，</p>
          
          <p>恭喜您！我們已成功收到您的付款，以下是您的訂單詳情：</p>
          
          <div class="order-info">
            <h3>📱 訂單資訊</h3>
            <p><strong>訂單編號：</strong>${orderData.orderId}</p>
            <p><strong>手機型號：</strong>${orderData.phoneModel}</p>
            <p><strong>租借期間：</strong>${orderData.startDate} 至 ${orderData.endDate}</p>
            <p><strong>付款金額：</strong>NT$ ${orderData.finalAmount.toLocaleString()}</p>
          </div>
          
          <div class="highlight">
            <h3>🚗 重要取機資訊</h3>
            <p><strong>可取機時間：</strong>${pickupTime}</p>
            <p><strong>取機地點：</strong>${orderData.pickupLocation || '台北市板橋區文化路二段385之3號'}</p>
            <p><strong>聯絡電話：</strong>02-8252-7208</p>
          </div>
          
          <div class="warning">
            <h3>⚠️ 重要注意事項</h3>
            <ul>
              <li>請於約定時間準時取機，逾時可能影響後續租借安排</li>
              <li>取機時請攜帶身分證件正本</li>
              <li>請保持手機完好無損，如有損壞將依損壞程度收取維修費用</li>
              <li>歸還時請確保手機功能正常，如有問題請立即聯繫我們</li>
              <li>請勿私自拆解或改裝設備</li>
            </ul>
          </div>
          
          <div class="contact-info">
            <h3>📞 客服聯絡方式</h3>
            <p><strong>客服電話：</strong>02-8252-7208</p>
            <p><strong>客服時間：</strong>週一至週日 09:00-21:00</p>
            <p><strong>LINE客服：</strong>@rent-phone（請加入官方帳號）</p>
            <p><strong>緊急聯絡：</strong>如遇設備問題，請立即聯繫客服</p>
          </div>
          
          <p>如果您有任何問題或需要協助，請隨時聯繫我們的客服團隊。</p>
          <p>再次感謝您選擇我們的服務！</p>
        </div>
        
        <div class="footer">
          <p>此為系統自動發送的郵件，請勿直接回覆</p>
          <p>© 2024 追星神器手機租借 版權所有</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    付款成功確認 - 訂單 ${orderData.orderId}
    
    親愛的 ${orderData.customerName} 您好，
    
    恭喜您！我們已成功收到您的付款。
    
    訂單資訊：
    - 訂單編號：${orderData.orderId}
    - 手機型號：${orderData.phoneModel}
    - 租借期間：${orderData.startDate} 至 ${orderData.endDate}
    - 付款金額：NT$ ${orderData.finalAmount.toLocaleString()}
    
    取機資訊：
    - 可取機時間：${pickupTime}
    - 取機地點：${orderData.pickupLocation || '台北市板橋區文化路二段385之3號'}
    - 聯絡電話：02-8252-7208
    
    重要注意事項：
    1. 請於約定時間準時取機
    2. 取機時請攜帶身分證件正本
    3. 請保持手機完好無損
    4. 如有問題請立即聯繫客服：02-8252-7208
    
    感謝您選擇我們的服務！
  `;
  
  return { subject, html, text };
}

// 發送付款成功通知email
export async function sendPaymentSuccessEmail(orderData: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  phoneModel: string;
  startDate: string;
  endDate: string;
  finalAmount: number;
  pickupLocation?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 檢查必要的環境變數
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email credentials not configured');
    }
    
    if (!orderData.customerEmail) {
      throw new Error('Customer email not provided');
    }
    
    const transporter = createTransporter();
    const emailContent = createPaymentSuccessEmail(orderData);
    
    const mailOptions = {
      from: `"追星神器手機租借" <${process.env.EMAIL_USER}>`,
      to: orderData.customerEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };
    
    console.log(`Sending payment success email to ${orderData.customerEmail} for order ${orderData.orderId}`);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`Payment success email sent successfully. MessageId: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    console.error('Failed to send payment success email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 預授權成功email模板
function createPreAuthSuccessEmail(data: {
  customerName: string;
  orderId: string;
  phoneModel: string;
  imei: string;
  startDate: string;
  endDate: string;
  preauthAmount: number;
  preauthTransactionNo: string;
  ecpayTradeNo: string;
}): { subject: string; html: string } {
  const pickupTime = getPickupTime(data.startDate);
  const subject = `✅ 預授權完成通知 - ${data.phoneModel} 租借訂單 #${data.orderId}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
        .content { padding: 30px; }
        .success-badge { background: #10B981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
        .info-card { background: #F8FAFC; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .info-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
        .info-label { font-weight: bold; color: #374151; }
        .info-value { color: #6B7280; }
        .important-notice { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .important-notice h3 { color: #92400E; margin-top: 0; }
        .contact-info { background: #EFF6FF; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center; }
        .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
        .amount { font-size: 18px; font-weight: bold; color: #059669; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 預授權完成通知</h1>
        </div>
        
        <div class="content">
          <div class="success-badge">✅ 預授權成功</div>
          
          <p>親愛的 <strong>${data.customerName}</strong> 您好，</p>
          <p>您的手機租借訂單預授權已成功完成！以下是詳細資訊：</p>
          
          <div class="info-card">
            <h3 style="color: #374151; margin-top: 0;">📱 租借資訊</h3>
            <div class="info-row">
              <span class="info-label">訂單編號：</span>
              <span class="info-value">${data.orderId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">手機型號：</span>
              <span class="info-value">${data.phoneModel}</span>
            </div>
            <div class="info-row">
              <span class="info-label">IMEI：</span>
              <span class="info-value">${data.imei}</span>
            </div>
                         <div class="info-row">
               <span class="info-label">租借期間：</span>
               <span class="info-value">${data.startDate} 至 ${data.endDate}</span>
             </div>
          </div>
          
          <div class="info-card">
            <h3 style="color: #374151; margin-top: 0;">💳 預授權資訊</h3>
            <div class="info-row">
              <span class="info-label">預授權金額：</span>
              <span class="info-value amount">NT$ ${data.preauthAmount.toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">預授權交易號：</span>
              <span class="info-value">${data.preauthTransactionNo}</span>
            </div>
            <div class="info-row">
              <span class="info-label">綠界交易號：</span>
              <span class="info-value">${data.ecpayTradeNo}</span>
            </div>
          </div>
          
          <div class="important-notice">
            <h3>🔔 重要提醒</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>預授權說明</strong>：此筆金額已被凍結作為押金，暫不會從您的帳戶扣款</li>
              <li><strong>取機時間</strong>：您可於 <strong>${pickupTime}</strong> 開始取機</li>
              <li><strong>歸還規定</strong>：請於租借期結束前完成歸還，逾期將產生額外費用</li>
              <li><strong>押金退還</strong>：歸還手機並確認無損壞後，預授權將自動取消</li>
              <li><strong>取機地點</strong>：台北市信義區（詳細地址將另行通知）</li>
            </ul>
          </div>
          
          <div class="contact-info">
            <h3 style="color: #1F2937; margin-top: 0;">📞 聯絡我們</h3>
            <p style="margin: 5px 0;">LINE客服：@kpopphone</p>
            <p style="margin: 5px 0;">營業時間：週一至週日 10:00-20:00</p>
            <p style="margin: 5px 0;">如有任何問題，歡迎隨時聯繫我們！</p>
          </div>
        </div>
        
        <div class="footer">
          <p>此為系統自動發送的通知信件，請勿直接回覆</p>
          <p>© 2024 愛時代國際股份有限公司 - KPOP手機租借服務</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return { subject, html };
}

// 發送預授權成功通知
export async function sendPreAuthSuccessEmail(data: {
  to: string;
  customerName: string;
  orderId: string;
  phoneModel: string;
  imei: string;
  startDate: string;
  endDate: string;
  preauthAmount: number;
  preauthTransactionNo: string;
  ecpayTradeNo: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 檢查必要的環境變數
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email credentials not configured');
    }
    
    const transporter = createTransporter();
    const { subject, html } = createPreAuthSuccessEmail(data);
    
    const mailOptions = {
      from: `"KPOP手機租借" <${process.env.EMAIL_USER}>`,
      to: data.to,
      subject,
      html,
    };
    
    console.log(`Sending preauth success email to ${data.to} for order ${data.orderId}`);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`PreAuth success email sent successfully. MessageId: ${result.messageId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Send preauth success email error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// 測試email配置
export async function testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email credentials not configured');
    }
    
    const transporter = createTransporter();
    await transporter.verify();
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 