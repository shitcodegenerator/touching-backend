const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    google_id: { type: String,  default: '' },
    facebook_id: { type: String, default: '' },
    facebook_name: { type: String, default: '' },
    email: { type: String, default: '' },
    line_id: { type: String, default: '' },
    password: { type: String, default: '' },
    name: { type: String, default: '' },
    username: { type: String, default: '' },
    avatar: { type: String, default: '' },
    gender: { type: String, default: '' },
    birthday: { type: String, default: '' },
    city: { type: String, default: '' },
    mobile: { type: String, default: '' },
    level: { type: Number, default: 0 },
    subscribe: { type: Boolean, default: true },
    created_at: { type: Date, required: false, default: new Date() },
    modified_at: { type: Date, required: false },
    type: {type: [mongoose.Schema.Types.ObjectId], ref:'type'},
    resetToken: { type: String, default: '' },
    resetExpiration: { type: Number, default: 0 },
    isConsent: { type: Boolean, default: null },
    email: { type: String, default: '' },
  });

  module.exports = User = mongoose.model("member", UserSchema);