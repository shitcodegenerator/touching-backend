const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('./user.js');
const Article = require('./article.js');

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// default: new Date() 會在模組載入時算一次，之後每筆資料共用同一個時間。
// 先等一小段時間再建立，若 created_at 早於建立當下，代表預設值被凍結在載入時。
for (const [label, Model] of [['會員', User], ['文章', Article]]) {
  test(`${label} created_at 應為建立當下的時間`, async () => {
    await waitMs(30);
    const createdAfter = Date.now();
    const doc = new Model();
    assert.ok(
      doc.created_at.getTime() >= createdAfter,
      `created_at=${doc.created_at.toISOString()} 早於建立時間 ${new Date(createdAfter).toISOString()}`
    );
  });

  test(`${label} 先後建立的兩筆資料 created_at 不應相同`, async () => {
    const first = new Model();
    await waitMs(30);
    const second = new Model();
    assert.notEqual(first.created_at.getTime(), second.created_at.getTime());
  });
}
