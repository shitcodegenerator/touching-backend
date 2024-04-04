const Type = require("../models/type");

const getTypes = async (req, res) => {

  try {
    // Retrieve articles from your MongoDB collection and apply pagination
    const types = await Type.find()

    res.status(200).json({ data: types});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



module.exports = {
  getTypes
};
