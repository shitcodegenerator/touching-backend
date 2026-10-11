const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const errorNotifier = require("../utils/errorNotifier.js");

// 先替換通知函式再載入 controller，確認 invalid_grant 不會寄錯誤信
const notified = [];
errorNotifier.notifyError = async (args) => {
  notified.push(args);
};
const { login } = require("./authController.js");

const fakeRes = () => {
  const res = { statusCode: 200, body: null, req: { method: "POST", originalUrl: "/api/auth/login" } };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  res.cookie = () => res;
  return res;
};

test("LINE 授權碼重送（invalid_grant）回 400 且不寄錯誤通知", async (t) => {
  t.mock.method(axios, "post", async () => {
    const err = new Error("Request failed with status code 400");
    err.response = { status: 400, data: { error: "invalid_grant", error_description: "invalid authorization code" } };
    throw err;
  });
  notified.length = 0;
  const res = fakeRes();
  await login({ body: { type: "line", code: "used-code", redirect_uri: "https://touching-dev.com/login/callback" } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /授權已失效/);
  assert.equal(notified.length, 1);
  assert.equal(notified[0].error, null, "invalid_grant 不應帶原始例外（不寄信）");
});
