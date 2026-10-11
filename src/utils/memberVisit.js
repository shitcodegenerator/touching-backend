// 會員瀏覽紀錄（members.visits）的輸入整理與寫入方式。
// 前端改為全站記錄後筆數會變多，寫入時用 $slice 只保留最近 MAX_VISITS 筆，避免文件無限長大。
const MAX_VISITS = 500;
const MAX_TITLE_LENGTH = 200;
const MAX_URL_LENGTH = 500;

const toText = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");

const sanitizeVisit = (body) => {
  const url = toText(body?.url, MAX_URL_LENGTH);
  if (!url) return null;
  const duration = Number(body.duration);
  return {
    title: toText(body.title, MAX_TITLE_LENGTH),
    url,
    date: toText(body.date, 32),
    duration: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0,
  };
};

const buildVisitPush = (visit) => ({
  $push: { visits: { $each: [visit], $slice: -MAX_VISITS } },
});

module.exports = { MAX_VISITS, sanitizeVisit, buildVisitPush };
