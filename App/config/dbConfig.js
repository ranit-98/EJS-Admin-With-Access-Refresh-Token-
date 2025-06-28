const mongoose = require('mongoose');
const dotenv = require('dotenv');
const e = require('express');
dotenv.config();

const dbConfig = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}

module.exports = dbConfig;