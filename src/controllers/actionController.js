
const User = require("../models/user.js");


const addVisit = async (req, res) => {
  try {
    const { userId } = req.userData;
    const { title, url, duration, date } = req.body

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ data: user, message: '查無此用戶' });
    }

    user.visits.push({
      title, url, duration, date
    });

    await user.save();

    // Return user data
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  addVisit
};
