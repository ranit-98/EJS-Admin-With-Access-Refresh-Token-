


const express = require('express');
const path = require('path');
const ejs = require('ejs');
const session = require('express-session');
const app = express();
const flash = require("connect-flash");
const cookieParser=require('cookie-parser')
const expressLayouts = require('express-ejs-layouts');
const ejsRouter = require('./App/routes/ejsRouter');
// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Middleware
app.use(session({
  secret: "employee-management-secret",
  resave: false,
  saveUninitialized: true,
}));
app.use(cookieParser())
app.use(flash());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// Routes

app.use(expressLayouts);
app.set('layout', 'layout'); 
app.use('/', ejsRouter);

module.exports = app;
