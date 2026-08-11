const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('./landPostVerification');

test('核准時未傳項目預設 false', () => {
  assert.deepEqual(api.parseApprovalVerification({ landNumberVerified: true }), {
    landNumberVerified: true,
    authorizationLetterVerified: false,
  });
});

test('後續更新必須傳入兩個布林值', () => {
  assert.throws(
    () => api.parseVerificationPatch({ landNumberVerified: true }),
    /核實狀態需同時提供兩個布林值/
  );
});

test('歷程保存操作者與前後值', () => {
  const log = api.createReviewLog({
    action: 'verification_updated',
    operator: { userId: 'admin-1', username: 'reviewer' },
    before: { landNumberVerified: false, authorizationLetterVerified: false },
    after: { landNumberVerified: true, authorizationLetterVerified: false },
  });
  assert.equal(log.operator.username, 'reviewer');
  assert.equal(log.before.landNumberVerified, false);
  assert.equal(log.after.landNumberVerified, true);
  assert.ok(log.createdAt instanceof Date);
});
