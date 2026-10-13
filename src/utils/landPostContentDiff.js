// 後台可編輯的案件內容欄位（不含圖片：圖片異動牽涉 R2 上傳／清除，維持由投稿者處理）
const EDITABLE_FIELDS = [
  "type",
  "landType",
  "contactName",
  "city",
  "district",
  "section",
  "landNumbers",
  "approximateLocation",
  "landArea",
  "landAreaUnit",
  "landShareNumerator",
  "landShareDenominator",
  "landOwnerCount",
  "floorAreaRatio",
  "buildingCoverageRatio",
  "frontageWidth",
  "lotDepth",
  "roadCondition",
  "landCondition",
  "description",
  "priceBudget",
  "unitPrice",
  "hasAuthorizationLetter",
  "directOwnerContact",
  "visibility",
  "contactPhone",
  "contactLine",
];

// 空字串 / null / undefined / 空陣列一律視為「空值」，避免表單送出 "" 被誤判為變更
const normalize = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;
  if (Array.isArray(value)) return value.map(String);
  return value;
};

const isSame = (a, b) => {
  const left = normalize(a);
  const right = normalize(b);
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  // 面寬欄位為字串，但 API 也接受純數字 → 以字串形式比較
  if (typeof left === "number" || typeof right === "number") {
    return String(left) === String(right);
  }
  return left === right;
};

/**
 * 比對案件目前內容與待套用的更新，回傳實際變更的欄位清單。
 * @param {object} current 案件目前內容（plain object）
 * @param {object} updates 已驗證、清洗過的更新欄位
 * @returns {{ field: string, before: unknown, after: unknown }[]}
 */
const diffLandPostContent = (current, updates) =>
  EDITABLE_FIELDS.filter((field) => Object.hasOwn(updates, field))
    .filter((field) => !isSame(current[field], updates[field]))
    .map((field) => ({
      field,
      before: normalize(current[field]),
      after: normalize(updates[field]),
    }));

module.exports = { EDITABLE_FIELDS, diffLandPostContent };
