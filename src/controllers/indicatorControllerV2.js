const IndicatorV2 = require("../models/indicatorV2");
const Indicator = require("../models/indicator");
const { sendSuccess, sendError } = require("../utils/response.js");

/**
 * V2 API - 使用獨立的 indicator_v2 collection
 * 完全隔離，不影響 PROD 的 indicators collection
 */

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
    26: "台北市第一次移轉棟數",
    28: "台北市成交量(筆)",
    29: "台北市單坪均價(萬)",
    30: "台北市成交均價(萬)",
    31: "新北市買賣移轉棟數",
    33: "新北市第一次移轉棟數",
    35: "新北市成交量(筆)",
    36: "新北市單坪均價(萬)",
    37: "新北市成交均價(萬)",
    38: "台北市各區買賣移轉棟數",
    41: "新北市各區買賣移轉棟數",
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

// GET /api/indicator/v2/list
const getIndicatorListV2 = async (req, res) => {
  const { indexes } = req.query;

  const query = {};
  if (indexes) {
    const indexArray = indexes.split(",").map(Number).filter(Boolean);
    if (indexArray.length > 0) {
      query.index = { $in: indexArray };
    }
  }

  const data = await IndicatorV2.find(query).lean();

  const grouped = {};
  data.forEach((item) => {
    const { index, key, date, value } = item;
    if (!grouped[index]) {
      grouped[index] = {
        index,
        key: key || getIndicatorLabel(index),
        values: [],
      };
    }
    grouped[index].values.push({ date, value });
  });

  const result = Object.values(grouped)
    .sort((a, b) => a.index - b.index)
    .map((group) => ({
      ...group,
      values: group.values.sort((a, b) => {
        const [ya, ma] = a.date.split("/").map(Number);
        const [yb, mb] = b.date.split("/").map(Number);
        if (isNaN(ya) || isNaN(yb)) return 0;
        return ya * 12 + ma - (yb * 12 + mb);
      }),
    }));

  return sendSuccess(res, result);
};

// PUT /api/indicator/v2/batch
const batchUpdateIndicators = async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return sendError(res, "updates must be a non-empty array", 400);
  }

  const MAX_BATCH_SIZE = 200;
  if (updates.length > MAX_BATCH_SIZE) {
    return sendError(res, `batch size exceeds limit of ${MAX_BATCH_SIZE}`, 400);
  }

  for (const item of updates) {
    if (!item.index || !item.date || item.value == null) {
      return sendError(
        res,
        "Invalid update item: index, date, value are all required",
        400,
      );
    }
  }

  const bulkOps = updates.map((item) => ({
    updateOne: {
      filter: { index: item.index, date: item.date },
      update: {
        $set: { value: item.value, key: getIndicatorLabel(item.index) },
      },
      upsert: true,
    },
  }));

  const result = await IndicatorV2.bulkWrite(bulkOps);

  return sendSuccess(res, {
    matched: result.matchedCount,
    modified: result.modifiedCount,
    upserted: result.upsertedCount,
  });
};

// POST /api/indicator/v2
const addIndicatorV2 = async (req, res) => {
  const { index, date, value } = req.body;

  if (!index || !date || value == null) {
    return sendError(res, "index, date, value are all required", 400);
  }

  await IndicatorV2.findOneAndUpdate(
    { index, date },
    { value, key: getIndicatorLabel(index) },
    { upsert: true, new: true },
  );

  return sendSuccess(res, null, 200, null, "新增成功");
};

// POST /api/indicator/v2/migrate
// 從 PROD indicators collection 複製全部資料到 indicator_v2
const migrateFromProd = async (req, res) => {
  const existing = await IndicatorV2.countDocuments();
  if (existing > 0) {
    return sendError(
      res,
      `indicator_v2 已有 ${existing} 筆資料，請先確認是否要覆蓋（加 ?force=true）`,
      400,
    );
  }

  await runMigration();
  const count = await IndicatorV2.countDocuments();
  return sendSuccess(res, { migrated: count }, 200, null, "遷移完成");
};

// POST /api/indicator/v2/migrate?force=true
const migrateFromProdForce = async (req, res) => {
  if (req.query.force === "true") {
    await IndicatorV2.deleteMany({});
  } else {
    const existing = await IndicatorV2.countDocuments();
    if (existing > 0) {
      return sendError(
        res,
        `indicator_v2 已有 ${existing} 筆資料，加 ?force=true 覆蓋`,
        400,
      );
    }
  }

  await runMigration();
  const count = await IndicatorV2.countDocuments();
  return sendSuccess(res, { migrated: count }, 200, null, "遷移完成");
};

async function runMigration() {
  const prodData = await Indicator.find({}).lean();
  if (prodData.length === 0) return;

  const docs = prodData.map((item) => ({
    index: item.index,
    key: getIndicatorLabel(item.index),
    date: item.date,
    value: item.value,
  }));

  await IndicatorV2.insertMany(docs, { ordered: false });
}

// GET /api/indicator/v2/list-compat
// 回傳與舊 API /indicator/list 完全相同的 {key, value: [num, ...]} 格式
// 但讀的是 indicator_v2s collection
// 支援 ?endDate=114/7 過濾，只回傳 <= endDate 的資料
const getIndicatorListCompat = async (req, res) => {
  const { endDate, indexes } = req.query;

  // 支援 ?indexes=38,39,40 只取特定 index
  const query = {};
  if (indexes) {
    const indexArray = indexes.split(",").map(Number).filter(Boolean);
    if (indexArray.length > 0) {
      query.index = { $in: indexArray };
    }
  }

  const data = await IndicatorV2.find(query).lean();

  // 日期轉數值，用於比較大小
  const dateToNum = (d) => {
    const [y, m] = d.split("/").map(Number);
    if (isNaN(y) || isNaN(m)) return null;
    return y * 12 + m;
  };

  const endDateNum = endDate ? dateToNum(endDate) : null;

  const grouped = {};
  data.forEach((item) => {
    const { index, key, date, value } = item;

    // 若有指定 endDate，過濾掉超過截止日的資料
    if (endDateNum != null) {
      const num = dateToNum(date);
      if (num == null || num > endDateNum) return;
    }

    if (!grouped[index]) {
      grouped[index] = {
        key: key || getIndicatorLabel(index),
        valuesByDate: {},
      };
    }
    grouped[index].valuesByDate[date] = value;
  });

  // 補齊現有資料範圍內缺漏的月份（不延伸超過最後一筆實際資料）
  const fillInternalGaps = (sortedDates, valuesByDate) => {
    if (sortedDates.length <= 1) {
      return {
        dates: sortedDates,
        values: sortedDates.map((d) => valuesByDate[d]),
      };
    }
    // 複合日期（如 "113/8/松山"）不做月份補齊
    const isComposite = sortedDates.some((d) => d.split("/").length > 2);
    if (isComposite) {
      return {
        dates: sortedDates,
        values: sortedDates.map((d) => valuesByDate[d]),
      };
    }
    const [startY, startM] = sortedDates[0].split("/").map(Number);
    const lastDate = sortedDates[sortedDates.length - 1];
    const [endY, endM] = lastDate.split("/").map(Number);
    if (isNaN(startY) || isNaN(endY)) {
      return {
        dates: sortedDates,
        values: sortedDates.map((d) => valuesByDate[d]),
      };
    }

    const filledDates = [];
    const filledValues = [];
    let y = startY,
      m = startM;
    while (y * 12 + m <= endY * 12 + endM) {
      const dateStr = `${y}/${m}`;
      filledDates.push(dateStr);
      filledValues.push(valuesByDate[dateStr] ?? null);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return { dates: filledDates, values: filledValues };
  };

  const result = Object.entries(grouped).map(([index, group]) => {
    const sortedDates = Object.keys(group.valuesByDate).sort((a, b) => {
      const [ya, ma] = a.split("/").map(Number);
      const [yb, mb] = b.split("/").map(Number);
      if (isNaN(ya) || isNaN(yb)) return 0;
      return ya * 12 + ma - (yb * 12 + mb);
    });

    const filled = fillInternalGaps(sortedDates, group.valuesByDate);

    return {
      index: Number(index),
      key: group.key,
      value: filled.values,
      dates: filled.dates,
    };
  });

  return sendSuccess(res, result);
};

module.exports = {
  getIndicatorListV2,
  getIndicatorListCompat,
  batchUpdateIndicators,
  addIndicatorV2,
  migrateFromProd: migrateFromProdForce,
};
