const test = require("node:test");
const assert = require("node:assert");

const { notifyListingApproved } = require("./notifySite.js");

const data = { memberId: "m1", listing: { slug: "abc" } };

test("審核通過：Promise 只等 LINE 推播，不等分享圖預熱", async (t) => {
  process.env.SITE_NOTIFY_BASE_URL = "https://site.example";
  process.env.LINE_INTERNAL_TOKEN = "token";
  const calls = [];
  t.mock.method(global, "fetch", (url) => {
    calls.push(url);
    // 預熱永不回應（模擬 10–20s 的產圖），推播立即成功
    if (url.endsWith("/api/og/warm")) return new Promise(() => {});
    return Promise.resolve(new Response("ok", { status: 200 }));
  });

  const result = await Promise.race([
    notifyListingApproved(data).then(() => "resolved"),
    new Promise((r) => setTimeout(() => r("timeout"), 200)),
  ]);

  assert.strictEqual(result, "resolved");
  assert.deepStrictEqual(calls.sort(), [
    "https://site.example/api/line/notify",
    "https://site.example/api/og/warm",
  ]);
});

test("推播失敗也不 throw", async (t) => {
  process.env.SITE_NOTIFY_BASE_URL = "https://site.example";
  process.env.LINE_INTERNAL_TOKEN = "token";
  t.mock.method(global, "fetch", () => Promise.reject(new Error("network down")));

  await assert.doesNotReject(notifyListingApproved(data));
});
