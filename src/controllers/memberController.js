const User = require("../models/user.js");
const { sendSuccess, sendError } = require("../utils/response.js");

/** 允許的排序欄位白名單 */
const ALLOWED_SORTS = {
  "-created_at": { created_at: -1 },
  created_at: { created_at: 1 },
  "-lastVisitAt": { lastVisitAt: -1 },
  lastVisitAt: { lastVisitAt: 1 },
  "-visitCount": { visitCount: -1 },
  visitCount: { visitCount: 1 },
};

const getMembers = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const sortParam = req.query.sort || "-created_at";
  const sortStage = ALLOWED_SORTS[sortParam] || ALLOWED_SORTS["-created_at"];

  const pipeline = [
    {
      $project: {
        email: 1,
        name: 1,
        username: 1,
        birthday: 1,
        city: 1,
        mobile: 1,
        avatar: 1,
        visits: 1,
        created_at: 1,
        lastVisitAt: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ["$visits", []] } }, 0] },
            then: { $arrayElemAt: ["$visits.date", -1] },
            else: null,
          },
        },
        visitCount: { $size: { $ifNull: ["$visits", []] } },
      },
    },
    { $sort: sortStage },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await User.aggregate(pipeline);
  const data = result.data || [];
  const total = result.total[0]?.count || 0;

  return res.status(200).json({
    success: true,
    data,
    total,
    page,
    limit,
  });
};

module.exports = { getMembers };
