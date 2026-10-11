const User = require("../models/user.js");
const { sendSuccess, sendError } = require("../utils/response.js");
const { loggerUtils } = require("../utils/logger.js");
const { sanitizeVisit, buildVisitPush } = require("../utils/memberVisit.js");

const addVisit = async (req, res) => {
  try {
    const { userId } = req.userData;
    const visit = sanitizeVisit(req.body);

    if (!visit) {
      return sendError(res, "缺少瀏覽頁面網址", 400);
    }

    // 原子寫入並只保留最近的紀錄；不再整份讀出再 save()
    const result = await User.updateOne({ _id: userId }, buildVisitPush(visit));

    if (result.matchedCount === 0) {
      return sendError(res, "查無此用戶", 404);
    }

    loggerUtils.logBusinessEvent("member_visit", { userId, ...visit });

    // 前端以 keepalive 送出、不讀回應，只回確認即可（不再回傳整份會員資料）
    return sendSuccess(res, { recorded: true });
  } catch (error) {
    loggerUtils.logError(error, {
      context: "addVisit",
      userId: req.userData?.userId,
    });
    return sendError(res, "Internal Server Error", 500);
  }
};

module.exports = {
  addVisit,
};
