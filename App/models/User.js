//--------------------------------------------------------------------------------------
//                            User Model with JWT Support
//--------------------------------------------------------------------------------------

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'manager', 'employee'],
    default: 'employee'
  },
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days
    }
  }],
  rememberMe: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

//--------------------------------------------------------------------------------------
//                            Hash Password Before Save
//--------------------------------------------------------------------------------------
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

//--------------------------------------------------------------------------------------
//                            Compare Password Method
//--------------------------------------------------------------------------------------
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

//--------------------------------------------------------------------------------------
//                            Generate Access Token
//--------------------------------------------------------------------------------------
userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { 
      userId: this._id, 
      username: this.username, 
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '2s' }
  );
};

//--------------------------------------------------------------------------------------
//                            Generate Refresh Token
//--------------------------------------------------------------------------------------
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { userId: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE }
  );
};

//--------------------------------------------------------------------------------------
//                            Add Refresh Token to User
//--------------------------------------------------------------------------------------
userSchema.methods.addRefreshToken = async function(refreshToken) {
  this.refreshTokens.push({ token: refreshToken });
  await this.save();
};

//--------------------------------------------------------------------------------------
//                            Remove Refresh Token
//--------------------------------------------------------------------------------------
userSchema.methods.removeRefreshToken = async function(refreshToken) {
  this.refreshTokens = this.refreshTokens.filter(
    tokenObj => tokenObj.token !== refreshToken
  );
  await this.save();
};

//--------------------------------------------------------------------------------------
//                            Clear All Refresh Tokens
//--------------------------------------------------------------------------------------
userSchema.methods.clearRefreshTokens = async function() {
  this.refreshTokens = [];
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
