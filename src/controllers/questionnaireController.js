const { nanoid } = require('nanoid');
const Questionnaire = require('../models/questionnaire.js');
const QuestionnaireResponse = require('../models/questionnaireResponse.js');

// 產生 6 碼隨機數字作為 accessCode
function generateAccessCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 建立問卷
const createQuestionnaire = async (req, res) => {
  const { initiatorName, phone, lineId, community } = req.body;

  try {
    // 驗證必填欄位
    if (!initiatorName || !community || !community.county || !community.district || !community.name) {
      return res.status(400).json({ data: false, message: '請填寫所有必填欄位' });
    }

    // 至少要有手機或 LINE ID 其中一個
    if (!phone && !lineId) {
      return res.status(400).json({ data: false, message: '請提供手機號碼或 LINE ID' });
    }

    // 產生 shortId 和 accessCode，最多重試 3 次
    let shortId;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      shortId = nanoid(8);
      try {
        const accessCode = generateAccessCode();

        const newQuestionnaire = new Questionnaire({
          initiatorName,
          phone: phone || '',
          lineId: lineId || '',
          community,
          shortId,
          accessCode,
          isActive: true
        });

        await newQuestionnaire.save();

        // 成功建立，回傳資料
        const questionnaireUrl = `https://touching-dev.com/questionnaire/${shortId}`;
        const statsUrl = `https://touching-dev.com/questionnaire/${shortId}/stats?accessCode=${accessCode}`;

        return res.status(200).json({
          data: {
            shortId,
            questionnaireUrl,
            statsUrl,
            accessCode
          },
          message: '問卷建立成功'
        });
      } catch (err) {
        // 檢查是否是 shortId 碰撞錯誤
        if (err.code === 11000) {
          retries++;
          if (retries >= maxRetries) {
            return res.status(500).json({ data: false, message: '系統錯誤，請稍後再試' });
          }
          // 繼續重試
          continue;
        }
        // 其他錯誤直接拋出
        throw err;
      }
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: false, message: '系統錯誤，請稍後再試' });
  }
};

// 查詢問卷基本資訊
const getQuestionnaireInfo = async (req, res) => {
  const { shortId } = req.params;

  try {
    const questionnaire = await Questionnaire.findOne({ shortId });

    if (!questionnaire) {
      return res.status(404).json({ data: false, message: '找不到此問卷' });
    }

    const communityName = `${questionnaire.community.county}${questionnaire.community.district}${questionnaire.community.name}`;

    return res.status(200).json({
      data: {
        shortId: questionnaire.shortId,
        communityName,
        isActive: questionnaire.isActive,
        createdAt: questionnaire.createdAt
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: false, message: '系統錯誤，請稍後再試' });
  }
};

// 提交住戶回覆
const submitResponse = async (req, res) => {
  const { shortId } = req.params;
  const { supportLevel, comment, respondentName, contactInfo } = req.body;

  try {
    // 查詢問卷
    const questionnaire = await Questionnaire.findOne({ shortId });

    if (!questionnaire) {
      return res.status(404).json({ data: false, message: '找不到此問卷' });
    }

    // 檢查問卷是否啟用
    if (!questionnaire.isActive) {
      return res.status(403).json({ data: false, message: '此問卷已關閉，無法填寫' });
    }

    // 驗證必填欄位
    if (!supportLevel) {
      return res.status(400).json({ data: false, message: '請選擇您的支持程度' });
    }

    if (!comment) {
      return res.status(400).json({ data: false, message: '請填寫您的意見' });
    }

    // 驗證 supportLevel 是否為有效值
    const validSupportLevels = ['very_supportive', 'supportive', 'neutral', 'not_supportive', 'very_not_supportive'];
    if (!validSupportLevels.includes(supportLevel)) {
      return res.status(400).json({ data: false, message: '支持程度選項無效' });
    }

    // 建立回覆
    const newResponse = new QuestionnaireResponse({
      questionnaireId: questionnaire._id,
      supportLevel,
      comment,
      respondentName: respondentName || '',
      contactInfo: contactInfo || ''
    });

    await newResponse.save();

    return res.status(201).json({ data: true, message: '感謝您的填寫' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: false, message: '系統錯誤，請稍後再試' });
  }
};

// 查詢問卷統計資料
const getQuestionnaireStats = async (req, res) => {
  const { shortId } = req.params;
  const { accessCode } = req.query;

  try {
    // 驗證是否提供 accessCode
    if (!accessCode) {
      return res.status(400).json({ data: false, message: '請提供存取密碼' });
    }

    // 查詢問卷
    const questionnaire = await Questionnaire.findOne({ shortId });

    if (!questionnaire) {
      return res.status(404).json({ data: false, message: '找不到此問卷' });
    }

    // 驗證 accessCode
    if (questionnaire.accessCode !== accessCode) {
      return res.status(403).json({ data: false, message: '存取密碼錯誤' });
    }

    // 使用聚合查詢一次性獲取所有統計資料
    const [statsResult, latestComments] = await Promise.all([
      QuestionnaireResponse.aggregate([
        { $match: { questionnaireId: questionnaire._id } },
        {
          $facet: {
            supportDistribution: [
              { $group: { _id: '$supportLevel', count: { $sum: 1 } } }
            ],
            totalCount: [
              { $count: "total" }
            ]
          }
        }
      ]),
      QuestionnaireResponse.find({ questionnaireId: questionnaire._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('supportLevel comment respondentName createdAt')
        .lean() // 使用 lean() 提升查詢效能
    ]);

    // 處理聚合結果
    const supportDistMap = {
      very_supportive: 0,
      supportive: 0,
      neutral: 0,
      not_supportive: 0,
      very_not_supportive: 0
    };

    if (statsResult[0]?.supportDistribution) {
      statsResult[0].supportDistribution.forEach(item => {
        supportDistMap[item._id] = item.count;
      });
    }

    const totalResponses = statsResult[0]?.totalCount?.[0]?.total || 0;

    // 格式化最新意見
    const formattedComments = latestComments.map(comment => ({
      supportLevel: comment.supportLevel,
      comment: comment.comment,
      respondentName: comment.respondentName || '匿名',
      createdAt: comment.createdAt
    }));

    return res.status(200).json({
      data: {
        initiator: {
          name: questionnaire.initiatorName,
          phone: questionnaire.phone,
          lineId: questionnaire.lineId
        },
        community: questionnaire.community,
        totalResponses,
        supportDistribution: supportDistMap,
        latestComments: formattedComments
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: false, message: '系統錯誤，請稍後再試' });
  }
};

// 後台列出所有問卷
const listAllQuestionnaires = async (req, res) => {
  try {
    // 使用聚合查詢優化效能，避免 N+1 查詢問題
    const questionnairesWithStats = await Questionnaire.aggregate([
      // 關聯問卷回覆
      {
        $lookup: {
          from: 'questionnaireresponses',
          localField: '_id',
          foreignField: 'questionnaireId',
          as: 'responses'
        }
      },
      // 添加計算欄位
      {
        $addFields: {
          totalResponses: { $size: '$responses' }
        }
      },
      // 選擇需要的欄位
      {
        $project: {
          shortId: 1,
          community: 1,
          initiator: {
            name: '$initiatorName',
            phone: '$phone',
            lineId: '$lineId'
          },
          isActive: 1,
          totalResponses: 1,
          createdAt: 1
        }
      },
      // 排序
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return res.status(200).json({ data: questionnairesWithStats });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: false, message: '系統錯誤，請稍後再試' });
  }
};

// 後台啟用/停用問卷
const toggleQuestionnaireStatus = async (req, res) => {
  const { shortId } = req.params;

  try {
    const questionnaire = await Questionnaire.findOne({ shortId });

    if (!questionnaire) {
      return res.status(404).json({ data: false, message: '找不到此問卷' });
    }

    // 切換狀態
    questionnaire.isActive = !questionnaire.isActive;
    await questionnaire.save();

    const message = questionnaire.isActive ? '問卷已啟用' : '問卷已停用';

    return res.status(200).json({
      data: { isActive: questionnaire.isActive },
      message
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: false, message: '系統錯誤，請稍後再試' });
  }
};

module.exports = {
  createQuestionnaire,
  getQuestionnaireInfo,
  submitResponse,
  getQuestionnaireStats,
  listAllQuestionnaires,
  toggleQuestionnaireStatus
};
