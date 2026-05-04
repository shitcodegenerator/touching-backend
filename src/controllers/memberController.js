const User = require("../models/user.js");
const { sendSuccess, sendError } = require("../utils/response.js");

const getMembers = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const selectFields =
    "email name username birthday city mobile avatar visits created_at";

  const [data, total] = await Promise.all([
    User.find({})
      .select(selectFields)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({}),
  ]);

  return res.status(200).json({
    success: true,
    data,
    total,
    page,
    limit,
  });
};

module.exports = { getMembers };
