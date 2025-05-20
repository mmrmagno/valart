require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Starting email test...');
  
  // Log configuration (without password)
  console.log('Email Configuration:');
  console.log('Host:', process.env.EMAIL_HOST);
  console.log('Port:', process.env.EMAIL_PORT);
  console.log('Secure:', process.env.EMAIL_SECURE);
  console.log('User:', process.env.EMAIL_USER);
  console.log('Admin Email:', process.env.ADMIN_EMAIL);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true,
    logger: true,
    tls: {
      rejectUnauthorized: false // Add this for testing
    }
  });

  try {
    console.log('\nTesting connection...');
    await transporter.verify();
    console.log('Connection successful!');

    console.log('\nSending test email...');
    const info = await transporter.sendMail({
      from: `"VALART Test" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test Email from VALART',
      text: 'This is a test email to verify the email configuration.',
      html: '<h1>Test Email</h1><p>This is a test email to verify the email configuration.</p>'
    });

    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('\nError occurred:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.command) console.error('Failed command:', error.command);
    if (error.responseCode) console.error('Response code:', error.responseCode);
    if (error.response) console.error('Response:', error.response);
    console.error('\nFull error:', error);
  }
}

testEmail(); 