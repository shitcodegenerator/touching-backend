const KEYS = ['landNumberVerified', 'authorizationLetterVerified'];
const isBool = (value) => typeof value === 'boolean';

const parseApprovalVerification = (body = {}) => {
  const result = Object.fromEntries(KEYS.map((key) => [key, body[key] ?? false]));
  if (!KEYS.every((key) => isBool(result[key]))) {
    throw new Error('核實狀態需為布林值');
  }
  return result;
};

const parseVerificationPatch = (body = {}) => {
  if (!KEYS.every((key) => isBool(body[key]))) {
    throw new Error('核實狀態需同時提供兩個布林值');
  }
  return Object.fromEntries(KEYS.map((key) => [key, body[key]]));
};

const createReviewLog = ({ action, operator, before, after }) => ({
  action,
  operator: { userId: String(operator.userId), username: String(operator.username) },
  ...(before && { before }),
  ...(after && { after }),
  createdAt: new Date(),
});

module.exports = { parseApprovalVerification, parseVerificationPatch, createReviewLog };
