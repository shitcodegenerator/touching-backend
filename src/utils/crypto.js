const crypto = require("crypto");

/**
 * 用 RSA 私鑰解密前端傳來的加密密碼
 */
const decryptPassword = (encryptedPassword) => {
  if (!process.env.RSA_PRIVATE_KEY) {
    throw new Error("[crypto] RSA_PRIVATE_KEY 環境變數未設定");
  }

  const privateKey = process.env.RSA_PRIVATE_KEY.replace(/\\n/g, "\n");

  // 診斷：確認金鑰格式正確
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      `[crypto] RSA_PRIVATE_KEY 格式異常，開頭為: ${privateKey.substring(0, 50)}...`,
    );
  }

  const buffer = Buffer.from(encryptedPassword, "base64");

  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_V1_5,
      },
      buffer,
    );
    return decrypted.toString("utf8");
  } catch (err) {
    throw new Error(
      `[crypto] RSA 解密失敗: ${err.message} | 密文長度: ${buffer.length} bytes | 私鑰長度: ${privateKey.length} chars`,
    );
  }
};

/**
 * 取得公鑰（提供給前端加密用）
 */
const getPublicKey = () => {
  if (!process.env.RSA_PUBLIC_KEY) {
    throw new Error("[crypto] RSA_PUBLIC_KEY 環境變數未設定");
  }

  const publicKey = process.env.RSA_PUBLIC_KEY.replace(/\\n/g, "\n");

  if (!publicKey.includes("-----BEGIN PUBLIC KEY-----")) {
    throw new Error(
      `[crypto] RSA_PUBLIC_KEY 格式異常，開頭為: ${publicKey.substring(0, 50)}...`,
    );
  }

  return publicKey;
};

module.exports = { decryptPassword, getPublicKey };
