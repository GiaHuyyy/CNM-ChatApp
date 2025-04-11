const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"Chat App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'OTP Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>OTP Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #4CAF50; font-size: 32px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendOTPEmail };