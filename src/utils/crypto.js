const crypto = require("crypto");

/**
 * 用 RSA 私鑰解密前端傳來的加密密碼
 */
const decryptPassword = (encryptedPassword) => {
  const privateKey = process.env.RSA_PRIVATE_KEY.replace(/\\n/g, "\n");
  const buffer = Buffer.from(encryptedPassword, "base64");
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_V1_5,
    },
    buffer,
  );
  return decrypted.toString("utf8");
};

/**
 * 取得公鑰（提供給前端加密用）
 */
const getPublicKey = () => {
  return process.env.RSA_PUBLIC_KEY.replace(/\\n/g, "\n");
};

module.exports = { decryptPassword, getPublicKey };
