const test = require("node:test");
const assert = require("node:assert/strict");
const { MAX_VISITS, sanitizeVisit, buildVisitPush } = require("./memberVisit.js");

test("合法的瀏覽紀錄原樣保留", () => {
  const visit = sanitizeVisit({ title: "免費刊登", url: "/land-mutual/publish", date: "2026-10-08 10:00:00", duration: 65 });
  assert.deepEqual(visit, { title: "免費刊登", url: "/land-mutual/publish", date: "2026-10-08 10:00:00", duration: 65 });
});

test("缺少 url 視為無效", () => {
  assert.equal(sanitizeVisit({ title: "x", duration: 3 }), null);
  assert.equal(sanitizeVisit(null), null);
});

test("過長字串截斷、停留秒數取非負整數", () => {
  const visit = sanitizeVisit({ title: "a".repeat(500), url: "/" + "b".repeat(1000), date: "d", duration: -4.7 });
  assert.equal(visit.title.length, 200);
  assert.equal(visit.url.length, 500);
  assert.equal(visit.duration, 0);
  assert.equal(sanitizeVisit({ url: "/", duration: "abc" }).duration, 0);
});

test("寫入時只保留最近 MAX_VISITS 筆", () => {
  const visit = { title: "t", url: "/", date: "d", duration: 1 };
  assert.deepEqual(buildVisitPush(visit), { $push: { visits: { $each: [visit], $slice: -MAX_VISITS } } });
  assert.equal(MAX_VISITS, 500);
});
