/**
 * 建立管理員帳號的一次性 seed script
 * 執行方式: node src/seeds/seedAdmin.js
 */
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
dotenv.config();

const Admin = require("../models/admin.js");

const ADMIN_USERNAME = "zakmo";
const ADMIN_PASSWORD = "mvp1002@";

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGOOSE_CONNTECTION_STRING);
    console.log("Connected to MongoDB");

    const existing = await Admin.findOne({ username: ADMIN_USERNAME });
    if (existing) {
      console.log(`Admin "${ADMIN_USERNAME}" already exists, skipping.`);
    } else {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await Admin.create({ username: ADMIN_USERNAME, password: hashedPassword });
      console.log(`Admin "${ADMIN_USERNAME}" created successfully.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seedAdmin();
