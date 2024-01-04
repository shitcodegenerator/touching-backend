const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ArticleSchema = new mongoose.Schema({
    id: {
      type: String,
      default: uuidv4, // Generate a UUID when a new article is created
      unique: true, // Ensure uniqueness of the UUID
    },
    author: { type: String, required: true, unique: true },
    avatar: { type: String, required: true },
    title: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'category' }, // Reference to Category model
    type: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String, required: true },
    created_at: { type: Date, required: false, default: new Date() },
    modified_at: { type: Date, required: false },
  });

  // 6592ebad8e5060f55fc6d828
  module.exports = Article = mongoose.model("article", ArticleSchema);