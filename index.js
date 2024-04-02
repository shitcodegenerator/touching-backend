const express = require('express')
const bodyParser = require('body-parser');
const connectDb = require('./src/config.js')
const cors = require('cors');
const dotEnv = require('dotenv').config()

const authRoutes = require('./src/routes/authRoutes.js'); 
const articleRoutes = require('./src/routes/articleRoutes.js'); 


const PORT = 3006

const app = express()
// const corsOptions = {
//     origin: [
//       'http://localhost:8888',
//       'http://localhost:5173',
//       'https://touching-dev.com/',
// ],
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   };
app.use(cors());



connectDb()


// const Type = require('./src/models/type.js');

// // 示例：添加一个新的TypeList文档
// const addTypeList = async (label, value) => {
//   try {
//     const typeList = new Type({ label, value });
//     await typeList.save();
//     console.log('TypeList added:', typeList);
//   } catch (error) {
//     console.error('Error adding TypeList:', error);
//   }
// };

// // 调用函数添加一个TypeList
// addTypeList('房市資訊', 1);
// addTypeList('都更與危老重建', 2);
// addTypeList('區段徵收、市地重劃', 3);
// addTypeList('買賣/贈與/遺產房地稅務', 4);
// addTypeList('土地價值與資產活化', 5);

// Middleware to parse JSON data
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', articleRoutes);

app.get('/', (req, res) => {
  res.send('Hey this is my API running 🥳')
})


app.listen(PORT, () => {
    console.log(`Now listening at ${PORT}`)
})