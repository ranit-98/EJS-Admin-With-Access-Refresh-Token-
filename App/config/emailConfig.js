//--------------------------------------------------------------------------------------
//                                  Email Configuration
//--------------------------------------------------------------------------------------

const dotenv = require("dotenv");
dotenv.config(); 

const nodemailer = require("nodemailer");

//--------------------------------------------------------------------------------------
//                            Create Email Transporter using Nodemailer
//--------------------------------------------------------------------------------------
/**
 * This transporter will be used to send emails using the provided SMTP settings.
 * It reads host, port, and auth credentials from environment variables.
 */
let transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, 
  port: process.env.EMAIL_PORT, 
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

//--------------------------------------------------------------------------------------
//                          Export Transporter for Global Use
//--------------------------------------------------------------------------------------
module.exports = transporter;
