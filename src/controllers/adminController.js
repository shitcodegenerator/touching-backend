const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.js');


const register = async (req, res) => {
  const { username, password } = req.body;

  // Simple validation
  if (!username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if the username is already taken
    const existingUser = await Admin.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user object with the hashed password
    const newUser = new Admin({
      username,
      password: hashedPassword
    });

    // Save the user to MongoDB
    await newUser.save();

    // Respond with the registered user
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  // Simple validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Find the user by username
    const user = await Admin.findOne({ username });

    // Check if the user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      // Passwords match, generate JWT token
      const token = jwt.sign({ username: user.username, userId: user._id }, process.env.ADMIN_KEY, { expiresIn: '1h' });

      // Return the token along with a success message and user information
      res.status(200).json({
        message: 'Login successful',
        token,
        expiresIn: 3600, // Token expiration time in seconds (1 hour in this example)
        user: {
          username: user.username,
          email: user.email,
        },
      });
    } else {
      // Passwords do not match
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// const getUserData = async (req, res) => {
//   try {
//     // Use the decoded user data from the middleware
//     const { userId } = req.userData;

//     // Find the user by ID and exclude the password field
//     const user = await Admin.findById(userId, { password: 0 });

//     if (!user) {
//       return res.status(404).json({ error: 'Admin not found' });
//     }

//     // Return user data
//     res.status(200).json({
//       userId: user._id,
//       username: user.username,
//       name: user.name,
//       gender: user.gender,
//       email: user.email,
//       mobile: user.mobile,
//       age: user.age,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

module.exports = {
  register,
  login,
  // getUserData,
};