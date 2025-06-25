const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // 1. Check for token
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Missing authorization token' 
      });
    }

    const token = authHeader.split(' ')[1]; // Get token after "Bearer "

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // 4. Attach user to request
    req.user = {
      _id: user._id,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    
    // Specific error messages
    let message = 'Not authorized';
    if (error.name === 'TokenExpiredError') message = 'Token expired';
    if (error.name === 'JsonWebTokenError') message = 'Invalid token';

    res.status(401).json({ 
      success: false, 
      message 
    });
  }
};