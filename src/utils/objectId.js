const mongoose = require("mongoose");

/**
 * 驗證字串是否為合法的 MongoDB ObjectId。
 *
 * 為什麼需要：Mongoose 的 findById 收到格式錯誤的字串會丟 CastError。
 * 這些 handler 沒有 try/catch，例外會變成 unhandledRejection → 500，
 * 並觸發 errorNotifier 寄出告警信。但「ID 格式錯誤」是客戶端的問題，
 * 任何 bot 或掃描器打一個亂碼進來都會製造一封信，屬於雜訊而非事故。
 *
 * 因此查詢前一律先驗證，不合法就當作「找不到」處理（回 404、不寄信）。
 *
 * 註：mongoose.isValidObjectId 對 12 字元的一般字串也會回 true
 *（因為 12 bytes 可被視為 ObjectId），所以額外要求 24 碼十六進位，
 * 避免 "landpost1234" 這種輸入被誤判為合法。
 */
const isValidObjectId = (value) =>
  typeof value === "string" &&
  /^[0-9a-fA-F]{24}$/.test(value) &&
  mongoose.Types.ObjectId.isValid(value);

module.exports = { isValidObjectId };
