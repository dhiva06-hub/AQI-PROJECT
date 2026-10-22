const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('../middleware/errorHandler');
const { isConnected } = require('../config/db');

function signToken(user) {
  return jwt.sign(
    { sub: (user._id || user.id).toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/register
 * body: { name, email, password }
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, 'name, email and password are all required');
    }
    if (password.length < 8) {
      throw new ApiError(400, 'password must be at least 8 characters');
    }

    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected. Please ensure your network has access to MongoDB Atlas (Port 27017).',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new ApiError(409, 'An account with that email already exists');

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, email, passwordHash });

    const token = signToken(user);
    res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ApiError(400, 'email and password are required');

    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected. Please ensure your network has access to MongoDB Atlas (Port 27017).',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const match = await user.comparePassword(password);
    if (!match) throw new ApiError(401, 'Invalid email or password');

    const token = signToken(user);
    res.json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
