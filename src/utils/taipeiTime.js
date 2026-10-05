// 台灣固定 UTC+8、無日光節約時間，可直接以固定偏移換算，不依賴伺服器時區
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 取得「台灣時間當天 00:00」對應的 Date（UTC 表示為前一天 16:00）
 * @param {Date} [now]
 * @returns {Date}
 */
const getTaipeiDayStart = (now = new Date()) => {
  const taipeiMs = now.getTime() + TAIPEI_OFFSET_MS;
  const taipeiMidnightMs = taipeiMs - (((taipeiMs % DAY_MS) + DAY_MS) % DAY_MS);
  return new Date(taipeiMidnightMs - TAIPEI_OFFSET_MS);
};

module.exports = { getTaipeiDayStart };
