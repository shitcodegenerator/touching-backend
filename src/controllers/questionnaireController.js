const { nanoid } = require("nanoid");
const Questionnaire = require("../models/questionnaire.js");
const QuestionnaireResponse = require("../models/questionnaireResponse.js");
const { sendSuccess, sendError } = require("../utils/response.js");

function generateAccessCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const createQuestionnaire = async (req, res) => {
  const { initiatorName, phone, lineId, community } = req.body;

  try {
    if (
      !initiatorName ||
      !community ||
      !community.county ||
      !community.district ||
      !community.name
    ) {
      return sendError(res, "請填寫所有必填欄位", 400);
    }

    if (!phone && !lineId) {
      return sendError(res, "請提供手機號碼或 LINE ID", 400);
    }

    let shortId;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      shortId = nanoid(8);
      try {
        const accessCode = generateAccessCode();

        const newQuestionnaire = new Questionnaire({
          initiatorName,
          phone: phone || "",
          lineId: lineId || "",
          community,
          shortId,
          accessCode,
          isActive: true,
        });

        await newQuestionnaire.save();

        const questionnaireUrl = `https://touching-dev.com/questionnaire/${shortId}`;
        const statsUrl = `https://touching-dev.com/questionnaire/${shortId}/stats?accessCode=${accessCode}`;

        return sendSuccess(res, {
          shortId,
          questionnaireUrl,
          statsUrl,
          accessCode,
        });
      } catch (err) {
        if (err.code === 11000) {
          retries++;
          if (retries >= maxRetries) {
            return sendError(res, "系統錯誤，請稍後再試", 500);
          }
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    console.log(err);
    return sendError(res, "系統錯誤，請稍後再試", 500);
  }
};

const getQuestionnaireInfo = async (req, res) => {
  const { shortId } = req.params;

  try {
    const questionnaire = await Questionnaire.findOne({ shortId });

    if (!questionnaire) {
      return sendError(res, "找不到此問卷", 404);
    }

    const communityName = `${questionnaire.community.county}${questionnaire.community.district}${questionnaire.community.name}`;

    return sendSuccess(res, {
      shortId: questionnaire.shortId,
      communityName,
      isActive: questionnaire.isActive,
      createdAt: questionnaire.createdAt,
    });
  } catch (err) {
    console.log(err);
    return sendError(res, "系統錯誤，請稍後再試", 500);
  }
};

const submitResponse = async (req, res) => {
  const { shortId } = req.params;
  const { supportLevel, comment, respondentName, contactInfo } = req.body;

  try {
    const questionnaire = await Questionnaire.findOne({ shortId });

    if (!questionnaire) {
      return sendError(res, "找不到此問卷", 404);
    }

    if (!questionnaire.isActive) {
      return sendError(res, "此問卷已關閉，無法填寫", 403);
    }

    if (!supportLevel) {
      return sendError(res, "請選擇您的支持程度", 400);
    }

    if (!comment) {
      return sendError(res, "請填寫您的意見", 400);
    }

    const validSupportLevels = [
      "very_supportive",
      "supportive",
      "neutral",
      "not_supportive",
      "very_not_supportive",
    ];
    if (!validSupportLevels.includes(supportLevel)) {
      return sendError(res, "支持程度選項無效", 400);
    }

    const newResponse = new QuestionnaireResponse({
      questionnaireId: questionnaire._id,
      supportLevel,
      comment,
      respondentName: respondentName || "",
      contactInfo: contactInfo || "",
    });

    await newResponse.save();

    return sendSuccess(res, true, 201);
  } catch (err) {
    console.log(err);
    return sendError(res, "系統錯誤，請稍後再試", 500);
  }
};

const getQuestionnaireStats = async (req, res) => {
  const { shortId } = req.params;
  const { accessCode } = req.query;

  try {
    if (!accessCode) {
      return sendError(res, "請提供存取密碼", 400);
    }

    const questionnaire = await Questionnaire.findOne({ shortId });

    if (!questionnaire) {
      return sendError(res, "找不到此問卷", 404);
    }

    if (questionnaire.accessCode !== accessCode) {
      return sendError(res, "存取密碼錯誤", 403);
    }

    const [statsResult, latestComments] = await Promise.all([
      QuestionnaireResponse.aggregate([
        { $match: { questionnaireId: questionnaire._id } },
        {
          $facet: {
            supportDistribution: [
              { $group: { _id: "$supportLevel", count: { $sum: 1 } } },
            ],
            totalCount: [{ $count: "total" }],
          },
        },
      ]),
      QuestionnaireResponse.find({ questionnaireId: questionnaire._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("supportLevel comment respondentName createdAt")
        .lean(),
    ]);

    const supportDistMap = {
      very_supportive: 0,
      supportive: 0,
      neutral: 0,
      not_supportive: 0,
      very_not_supportive: 0,
    };

    if (statsResult[0]?.supportDistribution) {
      statsResult[0].supportDistribution.forEach((item) => {
        supportDistMap[item._id] = item.count;
      });
    }

    const totalResponses = statsResult[0]?.totalCount?.[0]?.total || 0;

    const formattedComments = latestComments.map((comment) => ({
      supportLevel: comment.supportLevel,
      comment: comment.comment,
      respondentName: comment.respondentName || "匿名",
      createdAt: comment.createdAt,
    }));

    return sendSuccess(res, {
      initiator: {
        name: questionnaire.initiatorName,
        phone: questionnaire.phone,
        lineId: questionnaire.lineId,
      },
      community: questionnaire.community,
      totalResponses,
      supportDistribution: supportDistMap,
      latestComments: formattedComments,
    });
  } catch (err) {
    console.log(err);
    return sendError(res, "系統錯誤，請稍後再試", 500);
  }
};

const listAllQuestionnaires = async (req, res) => {
  try {
    const questionnairesWithStats = await Questionnaire.aggregate([
      {
        $lookup: {
          from: "questionnaireresponses",
          localField: "_id",
          foreignField: "questionnaireId",
          as: "responses",
        },
      },
      {
        $addFields: {
          totalResponses: { $size: "$responses" },
        },
      },
      {
        $project: {
          shortId: 1,
          community: 1,
          initiator: {
            name: "$initiatorName",
            phone: "$phone",
            lineId: "$lineId",
          },
          isActive: 1,
          totalResponses: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return sendSuccess(res, questionnairesWithStats);
  } catch (err) {
    console.log(err);
    return sendError(res, "系統錯誤，請稍後再試", 500);
  }
};

const toggleQuestionnaireStatus = async (req, res) => {
  const { shortId } = req.params;

  try {
    const questionnaire = await Questionnaire.findOne({ shortId });

    if (!questionnaire) {
      return sendError(res, "找不到此問卷", 404);
    }

    questionnaire.isActive = !questionnaire.isActive;
    await questionnaire.save();

    return sendSuccess(res, { isActive: questionnaire.isActive });
  } catch (err) {
    console.log(err);
    return sendError(res, "系統錯誤，請稍後再試", 500);
  }
};

module.exports = {
  createQuestionnaire,
  getQuestionnaireInfo,
  submitResponse,
  getQuestionnaireStats,
  listAllQuestionnaires,
  toggleQuestionnaireStatus,
};
