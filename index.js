const express = require('express')
const bodyParser = require('body-parser');
// const connectDb = require('./config.js')
const cors = require('cors');
const dotEnv = require('dotenv').config()

// const authRoutes = require('./routes/authRoutes.js'); 
// const articleRoutes = require('./routes/articleRoutes.js'); 

const PORT = 8888

const app = express()
// const corsOptions = {
//     origin: [
//       'http://localhost:8888',
//       'http://localhost:5173',
// ],
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   };
  
app.use(cors());
// connectDb()




// Middleware to parse JSON data
app.use(bodyParser.json());

// Routes
// app.use('/api/auth', authRoutes);
// app.use('/api', articleRoutes);

app.get('/', (req, res) => {
  res.send('Hey this is my API running 🥳')
})


app.listen(PORT, () => {
    console.log(`Now listening at ${PORT}`)
})