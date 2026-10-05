const test = require("node:test");
const assert = require("node:assert/strict");

const { getTaipeiDayStart } = require("./taipeiTime.js");

test("台灣時間白天：回傳當天台灣午夜（前一天 UTC 16:00）", () => {
  // 台灣 2026-10-05 14:30
  const now = new Date("2026-10-05T06:30:00.000Z");
  assert.equal(
    getTaipeiDayStart(now).toISOString(),
    "2026-10-04T16:00:00.000Z",
  );
});

test("台灣凌晨（UTC 仍是前一天）：以台灣日期為準", () => {
  // 台灣 2026-10-05 02:00，UTC 仍是 10/04
  const now = new Date("2026-10-04T18:00:00.000Z");
  assert.equal(
    getTaipeiDayStart(now).toISOString(),
    "2026-10-04T16:00:00.000Z",
  );
});

test("台灣午夜整點屬於新的一天", () => {
  const now = new Date("2026-10-04T16:00:00.000Z");
  assert.equal(
    getTaipeiDayStart(now).toISOString(),
    "2026-10-04T16:00:00.000Z",
  );
});

test("台灣午夜前一毫秒仍屬前一天", () => {
  const now = new Date("2026-10-04T15:59:59.999Z");
  assert.equal(
    getTaipeiDayStart(now).toISOString(),
    "2026-10-03T16:00:00.000Z",
  );
});
