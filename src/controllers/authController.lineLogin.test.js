const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const errorNotifier = require("../utils/errorNotifier.js");

// 先替換通知函式再載入 controller，檢查錯誤信帶到的內容
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

test("LINE 授權碼重送（invalid_grant）照常通知，並附上原因判讀", async (t) => {
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
  assert.ok(notified[0].error, "要帶原始例外才會寄信");
  assert.equal(notified[0].error.diagnosis.title, "LINE 授權碼已使用過或已過期");
  assert.equal(notified[0].error.diagnosis.step, "用授權碼向 LINE 換取 token");
});

test("錯誤信 HTML 顯示原因判讀、外部服務回應與真實裝置", () => {
  const { buildHtml } = require("../utils/errorNotifier.js");
  const { diagnoseLineLoginError } = require("../utils/lineErrorDiagnosis.js");
  const err = Object.assign(new Error("Request failed with status code 400"), {
    response: { status: 400, data: { error: "invalid_grant", error_description: "invalid authorization code" } },
  });
  err.diagnosis = diagnoseLineLoginError(err, "token");
  const html = buildHtml({
    method: "POST",
    path: "/api/auth/login",
    statusCode: 400,
    message: "LINE 授權已失效，請重新登入。",
    error: err,
    req: {
      ip: "::ffff:10.42.0.1",
      headers: { "user-agent": "node", "x-client-user-agent": "Mozilla/5.0 (iPhone) Safari", "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
      body: { code: "secret-code", type: "line" },
    },
  });
  assert.match(html, /原因判讀：LINE 授權碼已使用過或已過期/);
  assert.match(html, /外部服務回應/);
  assert.match(html, /invalid_grant/);
  assert.match(html, /iPhone/);
  assert.match(html, /1\.2\.3\.4/);
  assert.doesNotMatch(html, /secret-code/);
});
