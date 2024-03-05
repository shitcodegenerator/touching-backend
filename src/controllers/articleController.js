const Article = require("../models/article.js");
const Category = require("../models/category.js");
const { google } = require("googleapis");
const multer = require("multer");
const stream = require("stream");

const addArticle = async (req, res) => {
  const { author, avatar, title, summary, categoryId, type, content, image } = req.body;

  try {
    const newArticle = new Article({
      author,
      avatar,
      title,
      type,
      categoryId,
      content,
      image,
      summary
    });

    await newArticle.save();

    res.status(201).json({ message: "Article added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getArticles = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default page is 1
  const perPage = 10; // Number of articles per page
  const sort = req.query.sort ?? 1; // 1: asc 升冪 2: desc 降冪
  const type = req.query.type ?? 'knowledge'; // 1: asc 升冪 2: desc 降冪

  try {
    // Retrieve articles from your MongoDB collection and apply pagination
    const articles = await Article.find({ type })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ created_at: sort }); // Sort by created_at in descending order

    const totalArticles = await Article.countDocuments();

    res.status(200).json({ data: articles, total: totalArticles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getArticleById = async (req, res) => {
  const { articleId } = req.params;

  try {
    // Find the article by its ID in the MongoDB collection
    const article = await Article.findOne({ id: articleId });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.status(200).json(article);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Define the PUT route to edit an article by its ID
const editArticle = async (req, res) => {
  const { articleId } = req.params; // Get the article ID from the URL
  const { title, content, categoryId, summary, type, image, author, avatar } = req.body; // Get the updated title and content from the request body

  try {
    // Find the article by its ID in the MongoDB collection
    const article = await Article.findOne({ id: articleId });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Update the article properties
    article.title = title;
    article.content = content;
    article.categoryId = categoryId;
    article.summary = summary;
    article.type = type;
    article.image = image;
    article.author = author;
    article.avatar = avatar;
    article.modified_at = new Date()

    // Save the updated article
    await article.save();

    res.status(200).json({ message: 'Article updated successfully', article });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Define the DELETE route to delete an article by its ID
const deleteArticle = async (req, res) => {
  const { articleId } = req.params; // Get the article ID from the URL

  try {
    // Find the article by its ID in the MongoDB collection
    const article = await Article.findOne({ id: articleId });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Delete the article
    await article.deleteOne({ id: articleId });

    res.status(200).json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Define the POST route to add a new article category
const addCategory = async (req, res) => {
  const { title } = req.body;

  // Create a new category with an automatically generated incrementing ID
  const newCategory = new Category({ title });

  try {
    // Save the new category to the MongoDB collection
    await newCategory.save();

    res.status(201).json(newCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCategories = async (req, res) => {
  try {
    // Retrieve all categories from the MongoDB collection
    const categories = await Category.find();

    res.status(200).json({ data: categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const upload = multer();

const uploadImage = async ({file}, res) => {
  // console.log(fileObject.file)
  // return
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: "touching-picture",
      private_key_id: "b5aa97de76cbedd59d72e019c4d6b6c0ebf0a7a8",
      private_key: process.env.DRIVE_KEY.replace(/\\n/gm, "\n"),
      client_email: "touching@touching-picture.iam.gserviceaccount.com",
      client_id: "108673518045441453985",
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

  // if (fileId) {
  //   const { data } = await google
  //     .drive({
  //       version: "v3",
  //       auth,
  //     })
  //     .files.update({
  //       fileId,
  //       media: {
  //         mimeType: fileObject.mimeType,
  //         body: bufferStream,
  //       },
  //       fields: "id, name",
  //     });

  //   console.log(`SUCCESSFULLY UPDATED PHOTO`);

  //   return data;
  // } else {
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
          parents: ["127-GyqK5mQVtib6D9HdY2VM9rgvAud3y"], //GoogleDrive Folder ID
        },
        name: new Date(),
        fields: "id, name",
      });


      console.log(`SUCCESSFULLY UPLOADED: ${data.name} ${data.id}`);
      return res.status(200).json({data: `https://lh3.googleusercontent.com/u/0/d/${data.id}`})

    } catch(err) {
      console.log(err)
      res.status(500).json({ error: "Internal Server Error" });
    }
  // }
};

module.exports = {
  addArticle,
  getArticles,
  getArticleById,
  addCategory,
  getCategories,
  uploadImage,
  editArticle,
  deleteArticle
};
