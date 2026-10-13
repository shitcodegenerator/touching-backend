const test = require("node:test");
const assert = require("node:assert/strict");
const { diffLandPostContent } = require("./landPostContentDiff.js");

test("只列出實際變更的欄位並保留 before/after（依欄位白名單順序）", () => {
  const changes = diffLandPostContent(
    { description: "舊描述", city: "臺北市", landArea: 100 },
    { description: "新描述", city: "臺北市", landArea: 120 },
  );
  assert.deepEqual(changes, [
    { field: "landArea", before: 100, after: 120 },
    { field: "description", before: "舊描述", after: "新描述" },
  ]);
});

test("空字串、null、undefined 視為同一個「空值」不算變更", () => {
  const changes = diffLandPostContent(
    { section: undefined, roadCondition: null, contactLine: "" },
    { section: "", roadCondition: "", contactLine: undefined },
  );
  assert.deepEqual(changes, []);
});

test("陣列依內容比較，順序不同視為變更", () => {
  assert.deepEqual(
    diffLandPostContent(
      { landNumbers: ["1", "2"] },
      { landNumbers: ["1", "2"] },
    ),
    [],
  );
  assert.deepEqual(
    diffLandPostContent({ landType: ["farmland"] }, { landType: ["building"] }),
    [{ field: "landType", before: ["farmland"], after: ["building"] }],
  );
});

test("面寬數字與字串形式相同時不算變更", () => {
  assert.deepEqual(
    diffLandPostContent({ frontageWidth: "12" }, { frontageWidth: 12 }),
    [],
  );
});

test("未提供的欄位與不在白名單的欄位不納入比對", () => {
  assert.deepEqual(
    diffLandPostContent(
      { description: "x", status: "approved" },
      { status: "rejected", version: 3 },
    ),
    [],
  );
});

test("清空欄位時 before 保留舊值、after 為 null", () => {
  assert.deepEqual(
    diffLandPostContent({ priceBudget: "3000" }, { priceBudget: "" }),
    [{ field: "priceBudget", before: "3000", after: null }],
  );
});

test("空陣列與未設定視為相同", () => {
  assert.deepEqual(
    diffLandPostContent({ landType: undefined }, { landType: [], landNumbers: [] }),
    [],
  );
});
