const Question = require('../models/question.js'); // 引入 Question 模型
const dayjs = require('dayjs');

const createQuestion = async (req, res) => {
  try {
    console.log('req.body', req.body)
    const { type, content } = req.body;
    const { userId } = req.userData;

    if (!type || !content) {
      return res.status(400).json({ data: false, message: '請選擇類型並輸入內容' });
    }

    // 檢查會員當天發問次數
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const questionCount = await Question.countDocuments({
      member: userId,
      created_at: { $gte: todayStart, $lte: todayEnd },
    });

    if (questionCount >= 3) {
      return res.status(400).json({ data: false, message: '不好意思，您已超過本日發問次數，如果有較豐富的問題需詢問，歡迎洽詢LINE官方帳號預約諮詢。' });
    }

    // 新增問題
    const newQuestion = new Question({
      member: userId,
      type,
      content,
    });
    await newQuestion.save();

    res.status(201).json({data: true,  message: '新增成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({data: false,  error: 'Server error.' });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const { type, status } = req.query; // 問題類型和狀態為可選查詢參數

    // 查詢條件
    const query = {};
    if (type) {
      query.type = type; // 按問題類型篩選
    }
    if (status) {
      query.status = status; // 按問題狀態篩選
    }

    const questions = await Question.find(query)
      .populate('member', 'name username avatar') // 填充會員資訊
      .sort({ created_at: -1 }) // 按發問時間降序排列
      .lean();

    res.status(200).json({ data: questions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
};



module.exports = {
  createQuestion,
  getAllQuestions
};
