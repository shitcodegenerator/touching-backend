const mongoose = require('mongoose');
const increment = require('mongoose-auto-increment');
const { v4: uuidv4 } = require('uuid');


const CategorySchema = new mongoose.Schema({
  title: String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // Add timestamps
});

  module.exports = Category = mongoose.model("category", CategorySchema);