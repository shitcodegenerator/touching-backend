const User = require("../models/user.js");
const { sendSuccess, sendError } = require("../utils/response.js");

const addVisit = async (req, res) => {
  try {
    const { userId } = req.userData;
    const { title, url, duration, date } = req.body;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return sendError(res, "查無此用戶", 404);
    }

    user.visits.push({
      title,
      url,
      duration,
      date,
    });

    await user.save();

    return sendSuccess(res, user);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

module.exports = {
  addVisit,
};
