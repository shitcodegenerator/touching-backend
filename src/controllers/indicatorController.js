// src/controllers/indicatorController.js
const Indicator = require("../models/indicator");
const { sendSuccess, sendError } = require("../utils/response.js");

const clearIndicatorValues = async (indexes) => {
  if (!Array.isArray(indexes)) {
    console.log("indexes must be an array");
  }

  try {
    const result = await Indicator.deleteMany({ index: { $in: indexes } });
    console.log("已刪除");
  } catch (err) {
    console.error(err);
  }
};

async function seedTaipeiCityPrice() {
  const values = [
    12028,
    5348,
    14240,
    12115,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];

  const dates = Array.from({ length: 12 }, (_, i) => `114/${i + 1}`);

  for (let i = 0; i < values.length; i++) {
    const date = dates[i];
    const value = values[i];

    await Indicator.findOneAndUpdate(
      { index: 51, date },
      { value },
      { upsert: true, new: true },
    );
  }

  console.log("核發使照-今年 index: 51）資料已寫入");
}

async function seedExchangeRates() {
  return;
  await clearIndicatorValues([47]);

  const values = [
    9779, 6599, 8887, 8699, 10882, 8070, 17331, 11817, 11294, 10369, 11205,
    12951, 9660, 12747, 10928, 10598,
  ];

  const dates = [];
  for (let y = 113; y <= 114; y++) {
    for (let m = 1; m <= 12; m++) {
      if (dates.length >= values.length) break;
      dates.push(`${y}/${m}`);
    }
  }

  for (let i = 0; i < values.length; i++) {
    const date = dates[i];
    const value = values[i];
    await Indicator.findOneAndUpdate(
      { index: 47, date },
      { value },
      { upsert: true, new: true },
    );
  }

  console.log("核發使照-去年 index: 50）已寫入完畢");
}

const getIndicatorLabel = (index) => {
  const labels = {
    1: "購屋貸款金額",
    2: "購屋貸款利率",
    3: "出口貿易總額",
    4: "進口貿易總額",
    5: "建物所有權第一次登記- 住宅(H-2類)",
    6: "建物買賣移轉登記- 住宅(H-2類)",
    7: "國內生產毛額GDP",
    8: "美台匯率(月平均)",
    9: "台股市場股價指數",
    10: "未來半年是否為購買房地產好時機(指數)",
    11: "物價類房租指數",
    12: "消費者物價指數(CPI)",
    13: "經濟成長率(季)",
    14: "國內生產毛額GDP(名目值,百萬元)",
    15: "景氣燈號",
    16: "台北市30-40年宅",
    17: "台北市40-50年宅",
    18: "台北市50年以上宅",
    19: "新北市30-40年宅",
    20: "新北市40-50年宅",
    21: "新北市50年以上宅",
    22: "新北市50年以上宅",
    23: "未來半年購買耐久財貨時機(指數)",
    24: "台北市買賣移轉棟數",
    25: "台北市買賣移轉棟數(本期)",
    26: "台北市第一次移轉棟數",
    27: "台北市第一次移轉棟數(本期)",
    28: "台北市成交量(筆)",
    29: "台北市單坪均價(萬)",
    30: "台北市成交均價(萬)",
    31: "新北市買賣移轉棟數",
    32: "新北市買賣移轉棟數(本期)",
    33: "新北市第一次移轉棟數",
    34: "新北市第一次移轉棟數(本期)",
    35: "新北市成交量(筆)",
    36: "新北市單坪均價(萬)",
    37: "新北市成交均價(萬)",
    38: "台北市各區去年同月買賣移轉棟數",
    39: "台北市各區今年上月買賣移轉棟數",
    40: "台北市各區今年當月買賣移轉棟數",
    41: "新北市各區去年同月買賣移轉棟數",
    42: "新北市各區今年上月買賣移轉棟數",
    43: "新北市各區今年當月買賣移轉棟數",
    44: "營造工程物價指數",
    45: "核發建照",
    46: "核發使照",
    47: "開工宅數(住宅H-2類)",
    48: "核發建照-去年",
    49: "核發建照-今年",
    50: "核發使照-去年",
    51: "核發使照-今年",
    52: "台北市30~40年宅佔比(%)",
    53: "台北市40~50年宅佔比(%)",
    54: "台北市50年以上宅佔比(%)",
    55: "新北市30~40年宅佔比(%)",
    56: "新北市40~50年宅佔比(%)",
    57: "新北市50年以上宅佔比(%)",
    58: "台北市危老重建申請件數",
    59: "台北市危老重建核准件數",
    60: "新北市危老重建申請件數",
    61: "新北市危老重建核准件數",
    62: "台北市都市更新核定案件數",
    63: "新北市都市更新核定案件數",
  };

  return labels[index] || `未知指標（Index: ${index}）`;
};

const addIndicator = async (req, res) => {
  const { index, date, value } = req.body;

  if (!index || !date || !value) {
    return sendError(res, "Missing required fields", 400);
  }

  try {
    await Indicator.findOneAndUpdate(
      { index, date },
      { value },
      { upsert: true, new: true },
    );
    return sendSuccess(res, null);
  } catch (err) {
    console.error(err);
    return sendError(res, "Internal Server Error", 500);
  }
};

const getIndicatorByIndex = async (req, res) => {
  const { index } = req.params;

  try {
    const result = await Indicator.find({ index: Number(index) });

    const sorted = result
      .sort((a, b) => {
        const [y1, m1] = a.date.split("/").map(Number);
        const [y2, m2] = b.date.split("/").map(Number);
        return y1 !== y2 ? y1 - y2 : m1 - m2;
      })
      .map((item) => item.value);

    return sendSuccess(res, sorted);
  } catch (err) {
    console.error(err);
    return sendError(res, "Internal Server Error", 500);
  }
};

const getFormattedIndicators = async (req, res) => {
  try {
    const data = await Indicator.find({}).lean();

    const grouped = {};
    data.forEach((item) => {
      const { index, date, value } = item;
      if (!grouped[index]) {
        grouped[index] = {
          key: getIndicatorLabel(index),
          valuesByDate: {},
        };
      }
      grouped[index].valuesByDate[date] = value;
    });

    const result = Object.values(grouped).map((group) => {
      const sortedDates = Object.keys(group.valuesByDate).sort((a, b) => {
        const [ya, ma] = a.split("/").map(Number);
        const [yb, mb] = b.split("/").map(Number);
        return ya * 12 + ma - (yb * 12 + mb);
      });

      const values = sortedDates.map((date) => group.valuesByDate[date]);

      return {
        key: group.key,
        value: values,
      };
    });

    return sendSuccess(res, result);
  } catch (err) {
    console.error(err);
    return sendError(res, "Internal Server Error", 500);
  }
};

const getAllIndicators = async (req, res) => {
  try {
    const data = await Indicator.find({});

    const map = new Map();

    for (const item of data) {
      const { index, date, value } = item;

      if (!map.has(index)) {
        map.set(index, {
          index,
          label: getIndicatorLabel(index),
        });
      }

      map.get(index)[date] = value;
    }

    const result = [...map.values()].sort((a, b) => a.index - b.index);

    return sendSuccess(res, result);
  } catch (err) {
    console.error(err);
    return sendError(res, "Internal Server Error", 500);
  }
};

const getIndicatorsByIndexes = async (req, res) => {
  const { indexes } = req.body;

  if (!Array.isArray(indexes)) {
    return sendError(res, "indexes must be an array", 400);
  }

  try {
    const results = await Indicator.find({ index: { $in: indexes } });

    const grouped = {};

    indexes.forEach((idx) => {
      const filtered = results.filter((r) => r.index === idx);
      grouped[idx] = filtered
        .sort((a, b) => {
          const [y1, m1] = a.date.split("/").map(Number);
          const [y2, m2] = b.date.split("/").map(Number);
          return y1 !== y2 ? y1 - y2 : m1 - m2;
        })
        .map((item) => item.value);
    });

    return sendSuccess(res, grouped);
  } catch (err) {
    console.error(err);
    return sendError(res, "Internal Server Error", 500);
  }
};

module.exports = {
  addIndicator,
  getIndicatorByIndex,
  getIndicatorsByIndexes,
  getAllIndicators,
  seedExchangeRates,
  getFormattedIndicators,
  clearIndicatorValues,
};
