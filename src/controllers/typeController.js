const Type = require("../models/type");
const { sendSuccess, sendError } = require("../utils/response.js");

const getTypes = async (req, res) => {
  try {
    const types = await Type.find();

    return sendSuccess(res, types);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

module.exports = {
  getTypes,
};
