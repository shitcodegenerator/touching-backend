// src/controllers/indicatorController.js
const Indicator = require('../models/indicator');
async function seedExchangeRates() {
    const values = [
        27, 29, 31,
        35, 35, 38,
        35, 39, 34,
        32, 34, 38,
        35, 37, 35,
        33
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
          { index: 15, date },
          { value },
          { upsert: true, new: true }
        );
      }
    
      console.log('✅ 景氣燈號資料已成功寫入 (16 筆)');
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
    };
  
    return labels[index] || `未知指標（Index: ${index}）`;
  };

// ➕ 新增資料
const addIndicator = async (req, res) => {
  const { index, date, value } = req.body;

  if (!index || !date || !value) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    await Indicator.findOneAndUpdate(
      { index, date },
      { value },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: 'Saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// 🔍 查詢某一 index 的所有數值（依年月排序）
const getIndicatorByIndex = async (req, res) => {
  const { index } = req.params;

  try {
    const result = await Indicator.find({ index: Number(index) });

    const sorted = result
      .sort((a, b) => {
        const [y1, m1] = a.date.split('/').map(Number);
        const [y2, m2] = b.date.split('/').map(Number);
        return y1 !== y2 ? y1 - y2 : m1 - m2;
      })
      .map(item => item.value);

    res.status(200).json(sorted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getFormattedIndicators = async (req, res) => {
    try {
      const data = await Indicator.find({}).lean();
  
      // 1. 依 index 分組
      const grouped = {};
      data.forEach(item => {
        const { index,  date, value } = item;
        if (!grouped[index]) {
          grouped[index] = {
            key: getIndicatorLabel(index),
            valuesByDate: {}
          };
        }
        grouped[index].valuesByDate[date] = value;
      });
  
      // 2. 將每組資料轉為 { key, value: [...] } 格式
      const result = Object.values(grouped).map(group => {
        const sortedDates = Object.keys(group.valuesByDate)
          .sort((a, b) => {
            // 比較年月順序：'113/2' → 113*12 + 2
            const [ya, ma] = a.split('/').map(Number);
            const [yb, mb] = b.split('/').map(Number);
            return ya * 12 + ma - (yb * 12 + mb);
          });
  
        const values = sortedDates.map(date => group.valuesByDate[date]);
  
        return {
          key: group.key,
          value: values
        };
      });
  
      res.status(200).json(result);
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };

const getAllIndicators = async (req, res) => {
    try {
      const data = await Indicator.find({});
  
      // 建立 index -> { index, label, 年月: 數值... } 的 map
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
  
      // 排序 index 升冪
      const result = [...map.values()].sort((a, b) => a.index - b.index);
  
      res.status(200).json({data: result});
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
// 🔍 批次查詢多個 index 的資料
const getIndicatorsByIndexes = async (req, res) => {
    console.log(req.body)
    const { indexes } = req.body;
    console.log(indexes)
    return
    if (!Array.isArray(indexes)) {
      return res.status(400).json({ message: 'indexes must be an array' });
    }
  
    try {
      const results = await Indicator.find({ index: { $in: indexes } });
      console.log(results)
      return
      const grouped = {};
  
      indexes.forEach((idx) => {
        const filtered = results.filter(r => r.index === idx);
        grouped[idx] = filtered
          .sort((a, b) => {
            const [y1, m1] = a.date.split('/').map(Number);
            const [y2, m2] = b.date.split('/').map(Number);
            return y1 !== y2 ? y1 - y2 : m1 - m2;
          })
          .map(item => item.value);
      });
  
      res.status(200).json(grouped);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
  
module.exports = {
  addIndicator,
  getIndicatorByIndex,
  getIndicatorsByIndexes,
  getAllIndicators,
  seedExchangeRates,
  getFormattedIndicators
};
