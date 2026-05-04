const express = require("express");
const router = express.Router();
const passport = require("passport");

const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const authenticate = require("../middleware/authenticate");
const authenticateAdmin = require("../middleware/authenticateAdmin");
const { getPublicKey } = require("../utils/crypto");

// Define the registration route
router.post("/register", authController.register);
// Define the login route
router.post("/login", authController.login);
// Define the logout route
router.post("/logout", authController.logout);

// Define the getUserData route
router.get("/profile", authenticate, authController.getUserData);
router.put("/profile/:id", authenticate, authController.editUserData);
router.post("/password/forget", authController.sendEmail);
router.post("/email/hint", authController.sendHintEmail);
router.post("/password/reset", authController.resetPassword);
router.post("/line/check", authController.lineFriendCheck);
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  }),
);

// 公鑰端點（前端用來加密密碼）
router.get("/public-key", (req, res) => {
  res.json({ success: true, data: { publicKey: getPublicKey() } });
});

// Define the ADMIN registration route (需要管理員身份才能註冊新管理員)
router.post("/register/admin", authenticateAdmin, adminController.register);
// Define the ADMIN login route
router.post("/login/admin", adminController.login);

module.exports = router;
