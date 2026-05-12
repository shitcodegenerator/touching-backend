/**
 * 踏取會員感謝季 — 批次發送專屬諮詢回饋邀請信
 *
 * 使用方式：
 *   node scripts/sendThanksSeason.js
 *
 * 需要 .env 中設定 GMAIL_PASSWORD
 */

require("dotenv").config();
const nodemailer = require("nodemailer");
const thanksSeasonEmail = require("../src/email/thanksSeason");

// ====== 收件人列表（email, 會員姓名）======
const recipients = [
  { email: "cch81725@gmail.com", name: "虎牙" },
  { email: "wj21482@gmail.com", name: "張佳婉" },
  { email: "on5677@gmail.com", name: "謝宛璇" },
  { email: "on5677@yahoo.com.tw", name: "謝宛璇" },
];

const SUBJECT = "【踏取會員感謝季】專屬不動產知識諮詢回饋邀請";
const SEND_INTERVAL_MS = 2000; // 每封間隔 2 秒，避免觸發 Gmail 限流

async function main() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "touchingdevelopment.service@gmail.com",
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  await transporter.verify();
  console.log("✅ SMTP 連線驗證成功\n");

  let success = 0;
  let fail = 0;

  for (const recipient of recipients) {
    const mailOptions = {
      from: "踏取國際開發有限公司 <touchingdevelopment.service@gmail.com>",
      to: recipient.email,
      bcc: "dontz3210@gmail.com",
      subject: SUBJECT,
      html: thanksSeasonEmail(recipient.name),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      success++;
      console.log(
        `✅ [${success}] 已發送 → ${recipient.name} <${recipient.email}>  (messageId: ${info.messageId})`,
      );
    } catch (err) {
      fail++;
      console.error(
        `❌ [失敗] ${recipient.name} <${recipient.email}>:`,
        err.message,
      );
    }

    // 間隔等待（最後一封不用等）
    if (recipient !== recipients[recipients.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS));
    }
  }

  console.log(
    `\n📊 發送結果：成功 ${success} 封 / 失敗 ${fail} 封 / 共 ${recipients.length} 封`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 腳本執行失敗:", err);
  process.exit(1);
});
