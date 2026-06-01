const mongoose = require("mongoose");

// Serverless 連線快取：跨函式呼叫複用同一條連線，避免每次冷啟動重新建立 TLS 連線。
// 將 cache 掛在 global 上，讓同一個 lambda 實例的多次喚醒共用。
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const connectDb = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGOOSE_CONNTECTION_STRING, {
        connectTimeoutMS: 30000, // 連接超時
        socketTimeoutMS: 45000, // socket 超時
        maxPoolSize: 10, // 最大連接數
        minPoolSize: 0, // serverless：閒置不保留連線，避免被 Atlas 斷線後殘留
        maxIdleTimeMS: 30000, // 連接閒置時間
        serverSelectionTimeoutMS: 5000, // 伺服器選擇超時
        heartbeatFrequencyMS: 10000, // 心跳頻率
        retryWrites: true, // 重試寫入
        w: "majority", // 寫入確認機制
      })
      .then((m) => {
        console.log("DB connected", m.connection.host, m.connection.name);
        return m.connection;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // 連線失敗時清空 promise，讓下一個請求可以重試（serverless 不可 process.exit）
    cached.promise = null;
    console.log(err, "error on backend");
    throw err;
  }

  return cached.conn;
};

module.exports = connectDb;
