const test = require('node:test');
const assert = require('node:assert/strict');
const { corsOptions, isAllowedOrigin } = require('./cors.js');

const callOrigin = (origin) =>
  new Promise((resolve) => {
    corsOptions.origin(origin, (err, allowed) => resolve({ err, allowed }));
  });

test('白名單內的來源放行', async () => {
  const { err, allowed } = await callOrigin('https://touching-dev.com');
  assert.equal(err, null);
  assert.equal(allowed, true);
});

test('無 origin（server-to-server、同源）放行', async () => {
  assert.equal(isAllowedOrigin(undefined), true);
});

// 來源不在白名單是「對方沒權限」，不是伺服器壞掉。
// 若不帶狀態碼，errorHandler 會當成 500 並寄送告警信，造成告警疲勞。
test('未授權來源回 403，而非 500', async () => {
  const { err } = await callOrigin('https://api.touching-dev.com');
  assert.ok(err instanceof Error);
  assert.equal(err.statusCode, 403, `statusCode=${err.statusCode}，應為 403`);
});

test('未授權來源標記為可預期錯誤，不觸發告警信', async () => {
  const { err } = await callOrigin('https://evil.example.com');
  assert.equal(err.isOperational, true);
  assert.equal(err.code, 'CORS_BLOCKED');
});
