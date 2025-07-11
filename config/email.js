const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "pasirmanggu21@gmail.com",
    pass: "zytr nfwz ppgm kmmb",
  },
});

module.exports = transporter;
