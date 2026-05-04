const express = require("express");
const router = express.Router();
const authenticateAdmin = require("../middleware/authenticateAdmin");
const memberController = require("../controllers/memberController");

router.get("/members", authenticateAdmin, memberController.getMembers);

module.exports = router;
