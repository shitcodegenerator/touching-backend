// 品牌信件外框：logo header + 內容 + 社群/版權 footer。
// 沿用 thanksSeason.js 的視覺（logo、社群、版權），供各通知信共用，確保品牌一致。
//
// 用法：
//   brandEmailLayout({
//     title: "標題",
//     bodyHtml: "<p>...</p>",              // 內容 HTML
//     cta: { url: "https://...", text: "按鈕文字" }  // 選填 CTA 按鈕
//   })

const SITE_URL = "https://touching-dev.com/";
const LOGO_URL = "https://touching-dev.com/logo.png";
const FB_URL = "https://www.facebook.com/touchinghouseTW/";
const IG_URL = "https://www.instagram.com/touching.house/";
const FB_ICON = "https://lh3.googleusercontent.com/u/0/d/1Vw_lLdM7_pBzDYNIWSI5JZ5iILnTZzrx";
const IG_ICON = "https://lh3.googleusercontent.com/u/0/d/1NaH1sSfatkW6l7K0iuUAVOQGgmHKwpL0";

const brandEmailLayout = ({ title, bodyHtml, cta } = {}) => {
  const year = new Date().getFullYear();
  const ctaHtml = cta
    ? `
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 28px auto 4px;">
        <tbody>
          <tr>
            <td valign="middle" align="center" bgcolor="#10b981" style="padding: 12px 32px; border-radius: 100px;">
              <a href="${cta.url}" target="_blank" rel="noopener"
                style="background-color: #10b981; border-radius: 100px; color: #ffffff; display: block; font-family: Figtree, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center;">
                ${cta.text}
              </a>
            </td>
          </tr>
        </tbody>
      </table>`
    : "";

  return `<div style="background-color: #eef2f6; margin: 0; padding: 24px 0;">
  <div style="margin: 0 auto; max-width: 600px; min-width: 280px; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">

    <!-- Logo -->
    <table bgcolor="#ffffff" border="0" cellspacing="0" cellpadding="0" width="100%">
      <tbody>
        <tr>
          <td valign="top" align="center" style="padding: 26px 0 14px 0; border-bottom: 3px solid #10b981;">
            <a href="${SITE_URL}" target="_blank" rel="noopener">
              <img src="${LOGO_URL}" alt="踏取國際開發有限公司" width="180" border="0"
                style="display: block; height: auto; border: none; outline: none;" />
            </a>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Content -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tbody>
        <tr>
          <td style="padding: 24px 32px 32px 32px;">
            <div style="font-family: Figtree, 'Microsoft JhengHei', Helvetica, Arial, sans-serif; color: #2c3e50; font-size: 21px; line-height: 1.5; font-weight: 700; padding-bottom: 16px;">
              ${title}
            </div>
            <div style="font-family: Figtree, 'Microsoft JhengHei', Helvetica, Arial, sans-serif; color: #4b4b4b; font-size: 15px; line-height: 1.8;">
              ${bodyHtml}
            </div>
            ${ctaHtml}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Footer: Social -->
    <div style="text-align: center; background: #2488c7; padding: 16px 0 12px;">
      <p style="margin: 0 0 6px; font-family: 'Microsoft JhengHei', Helvetica, Arial, sans-serif; font-size: 14px; color: #ffffff;">
        加入我們的社群
      </p>
      <a href="${FB_URL}" target="_blank" rel="noopener" style="display: inline-block; margin: 0 8px;">
        <img width="28" height="28" src="${FB_ICON}" alt="Facebook" style="display: inline-block; border: none;" />
      </a>
      <a href="${IG_URL}" target="_blank" rel="noopener" style="display: inline-block; margin: 0 8px;">
        <img width="28" height="28" src="${IG_ICON}" alt="Instagram" style="display: inline-block; border: none;" />
      </a>
    </div>

    <!-- Footer: Copyright -->
    <div style="text-align: center; background: #eeeeee; padding: 14px 12px;">
      <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; color: #999999; font-size: 11px; line-height: 1.6;">
        ${year} © 踏取國際開發有限公司　|
        <a href="${SITE_URL}" target="_blank" rel="noopener" style="color: #999999; text-decoration: underline;">touching-dev.com</a>
      </p>
    </div>

  </div>
</div>`;
};

module.exports = { brandEmailLayout };
