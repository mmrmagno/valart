require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('Config:', {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE,
    user: process.env.EMAIL_USER,
    adminEmail: process.env.ADMIN_EMAIL
  });

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true,
    logger: true
  });

  try {
    // Verify connection configuration
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('Connection verified successfully');

    // Send test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test Email from VALART',
      text: 'This is a test email to verify the email configuration.',
      html: '<h1>Test Email</h1><p>This is a test email to verify the email configuration.</p>'
    });

    console.log('Test email sent successfully:', info);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command
    });
  }
}

testEmail(); 