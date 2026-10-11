const test = require("node:test");
const assert = require("node:assert/strict");
const { diagnoseLineLoginError } = require("./lineErrorDiagnosis.js");

const lineErr = (data, status = 400) => Object.assign(new Error("Request failed"), { response: { status, data } });

test("授權碼重送或過期", () => {
  const d = diagnoseLineLoginError(lineErr({ error: "invalid_grant", error_description: "invalid authorization code" }), "token");
  assert.equal(d.title, "LINE 授權碼已使用過或已過期");
  assert.match(d.cause, /重新整理|還原分頁/);
  assert.match(d.upstream, /invalid_grant/);
});

test("redirect_uri 不一致要跟授權碼失效分開", () => {
  const d = diagnoseLineLoginError(lineErr({ error: "invalid_grant", error_description: "redirect_uri does not match" }), "token");
  assert.equal(d.title, "redirect_uri 與授權時不一致");
});

test("Channel 憑證錯誤", () => {
  const d = diagnoseLineLoginError(lineErr({ error: "invalid_client" }, 401), "token");
  assert.equal(d.title, "LINE Channel ID／Secret 錯誤");
  assert.match(d.action, /LINE_CLIENT_SECRET/);
});

test("取個人資料失敗與資料庫失敗依步驟判讀", () => {
  assert.equal(diagnoseLineLoginError(lineErr({ message: "invalid token" }, 401), "profile").title, "LINE 個人資料取得失敗");
  assert.equal(diagnoseLineLoginError(new Error("E11000 duplicate key"), "save").title, "會員資料寫入失敗");
});

test("未知錯誤仍回傳可讀摘要", () => {
  const d = diagnoseLineLoginError(lineErr({ error: "server_error" }, 500), "token");
  assert.equal(d.title, "LINE 換取 token 失敗（server_error）");
});
