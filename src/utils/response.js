const { notifyError } = require("./errorNotifier.js");

const sendSuccess = (
  res,
  data,
  statusCode = 200,
  meta = null,
  message = null,
) => {
  const response = { success: true, data };
  if (meta) response.meta = meta;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

// 統一錯誤回應。第四個參數 error 為「原始例外物件」（選填）：
// 在 catch 區塊中把例外傳入，可讓被包成 400 的真正例外也觸發 email 通知。
// 一般驗證類 4xx（密碼錯誤、欄位驗證…）不傳 error，不會發信。
const sendError = async (res, message, statusCode = 400, error = null) => {
  // 只有「真的需要通知」時 notifyError 才會 await 寄信；其餘情況即時返回。
  await notifyError({ req: res.req, statusCode, message, error });
  return res
    .status(statusCode)
    .json({ success: false, data: null, error: message });
};

module.exports = { sendSuccess, sendError };
