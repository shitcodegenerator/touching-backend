const Article = require("../models/article.js");
const Category = require("../models/category.js");
const { google } = require("googleapis");
const multer = require("multer");
const stream = require("stream");
const mongoose = require("mongoose");
const { sendSuccess, sendError } = require("../utils/response.js");

let translate;
(async () => {
  const module = await import("@vitalets/google-translate-api");
  translate = module.default;
})();

const addArticle = async (req, res) => {
  const {
    author,
    avatar,
    title,
    summary,
    categoryId,
    type,
    content,
    image,
    keyword,
  } = req.body;

  try {
    if (!translate) {
      const module = await import("@vitalets/google-translate-api");
      translate = module.default;
    }
    const translation = await translate.translate(title, { to: "en" });
    let translatedTitle = translation.text;
    translatedTitle = translatedTitle.replace(/[^a-zA-Z\s]/g, "");
    const words = translatedTitle.trim().split(/\s+/).slice(0, 7);
    const id = words.join("-").toLowerCase();

    const newArticle = new Article({
      _id: id,
      author,
      avatar,
      title,
      type,
      categoryId,
      content,
      image,
      keyword: keyword || "",
      summary,
    });

    await newArticle.save();

    return sendSuccess(res, newArticle, 201);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const getArticles = async (req, res) => {
  const pageNum = parseInt(req.query.pageNum) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const sort = req.query.sort === "-1" ? -1 : 1;
  const type = req.query.type ?? "knowledge";
  const categoryIds = req.query.categoryId;

  const query = { type };

  if (categoryIds) {
    const categoryArray = Array.isArray(categoryIds)
      ? categoryIds
      : [categoryIds];
    query.categoryId = {
      $in: categoryArray.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  try {
    const articles = await Article.find(query)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .sort({ created_at: sort });

    const total = await Article.countDocuments(query);
    const totalPages = Math.ceil(total / pageSize);

    return sendSuccess(res, articles, 200, {
      total,
      page: pageNum,
      limit: pageSize,
      totalPage: totalPages,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const getArticleById = async (req, res) => {
  const { articleId } = req.params;

  try {
    const article = await Article.findOne({ id: articleId });

    if (!article) {
      return sendError(res, "Article not found", 404);
    }

    return sendSuccess(res, article);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const editArticle = async (req, res) => {
  const { articleId } = req.params;
  const {
    title,
    content,
    categoryId,
    summary,
    type,
    image,
    author,
    avatar,
    keyword,
  } = req.body;

  try {
    const article = await Article.findOneAndUpdate(
      { id: articleId },
      {
        title,
        content,
        categoryId,
        summary,
        type,
        image,
        author,
        avatar,
        keyword: keyword || "",
        modified_at: new Date(),
      },
      { new: true },
    );

    if (!article) {
      return sendError(res, "Article not found", 404);
    }

    return sendSuccess(res, article);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const deleteArticle = async (req, res) => {
  const { articleId } = req.params;

  try {
    const article = await Article.findOneAndDelete({ id: articleId });

    if (!article) {
      return sendError(res, "Article not found", 404);
    }

    return sendSuccess(res, null);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const addCategory = async (req, res) => {
  const { title } = req.body;

  const newCategory = new Category({ title });

  try {
    await newCategory.save();

    return sendSuccess(res, newCategory, 201);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const getCategories = async (_req, res) => {
  try {
    const categories = await Category.find();

    return sendSuccess(res, categories);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const upload = multer();

const uploadImage = async ({ file }, res) => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.DRIVE_PROJECT_ID,
      private_key_id: process.env.DRIVE_PRIVATE_KEY_ID,
      private_key: process.env.DRIVE_KEY.replace(/\\n/gm, "\n"),
      client_email: process.env.DRIVE_CLIENT_EMAIL,
      client_id: process.env.DRIVE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url:
        "https://www.googleapis.com/robot/v1/metadata/x509/touching%40touching-picture.iam.gserviceaccount.com",
      universe_domain: "googleapis.com",
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);

  try {
    const { data } = await google
      .drive({
        version: "v3",
        auth,
      })
      .files.create({
        media: {
          mimeType: file.mimeType,
          body: bufferStream,
        },
        requestBody: {
          name: new Date(),
          parents: ["127-GyqK5mQVtib6D9HdY2VM9rgvAud3y"],
        },
        name: new Date(),
        fields: "id, name",
      });

    console.log(`SUCCESSFULLY UPLOADED: ${data.name} ${data.id}`);
    return sendSuccess(
      res,
      `https://lh3.googleusercontent.com/u/0/d/${data.id}`,
    );
  } catch (err) {
    console.log(err);
    return sendError(res, "Internal Server Error", 500);
  }
};

module.exports = {
  addArticle,
  getArticles,
  getArticleById,
  addCategory,
  getCategories,
  uploadImage,
  editArticle,
  deleteArticle,
};
