const {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

let s3Client = null;

const getS3Client = () => {
  if (s3Client) return s3Client;

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "R2 環境變數未設定（R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY）",
    );
  }

  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  return s3Client;
};

/**
 * 產生預簽名上傳 URL
 * @param {string} key - 檔案路徑 key
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} presigned URL
 */
const generatePresignedUploadUrl = async (key, contentType) => {
  if (!process.env.R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME 環境變數未設定");
  }

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 300 });
  return url;
};

/**
 * 批次刪除 R2 物件
 * @param {string[]} keys - 要刪除的檔案 key 陣列
 */
const deleteObjects = async (keys) => {
  if (!keys || keys.length === 0) return;
  if (!process.env.R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME 環境變數未設定");
  }

  const command = new DeleteObjectsCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Delete: {
      Objects: keys.map((key) => ({ Key: key })),
      Quiet: true,
    },
  });

  await getS3Client().send(command);
};

module.exports = { generatePresignedUploadUrl, deleteObjects };
