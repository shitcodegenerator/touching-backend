const Question = require("../models/question.js");
const dayjs = require("dayjs");
const { sendSuccess, sendError } = require("../utils/response.js");

const createQuestion = async (req, res) => {
  try {
    const { type, content } = req.body;
    const { userId } = req.userData;

    if (!type || !content) {
      return sendError(res, "請選擇類型並輸入內容", 400);
    }

    if (content.length > 400) {
      return sendError(res, "內容不得超過400字", 400);
    }

    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();
    const questionCount = await Question.countDocuments({
      member: userId,
      created_at: { $gte: todayStart, $lte: todayEnd },
    });

    if (questionCount >= 5) {
      return sendError(
        res,
        "不好意思，您已超過本日發問次數，如果有較豐富的問題需詢問，歡迎洽詢LINE官方帳號預約諮詢。",
        400,
      );
    }

    const newQuestion = new Question({
      member: userId,
      type,
      content,
    });
    await newQuestion.save();

    return sendSuccess(res, newQuestion, 201);
  } catch (error) {
    console.error(error);
    return sendError(res, "伺服器錯誤，請聯繫網站管理員。", 500);
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const { type, status } = req.query;

    const query = {};
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }

    const questions = await Question.find(query)
      .populate("member", "name username avatar")
      .sort({ created_at: -1 })
      .lean();

    return sendSuccess(res, questions);
  } catch (error) {
    console.error(error);
    return sendError(res, "Server error.", 500);
  }
};

module.exports = {
  createQuestion,
  getAllQuestions,
};
