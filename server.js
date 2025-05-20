require('dotenv').config();
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// API Routes
app.post('/api/submit', async (req, res) => {
  const { authorName, creationName, art, gridSize } = req.body;
  
  if (!authorName || !creationName || !art) {
    return res.status(400).json({ error: 'Author name, creation name, and art are required' });
  }
  
  try {
    // Send email to admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `New ASCII Art Submission: "${creationName}"`,
      text: `New submission from ${authorName}:\n\nTitle: ${creationName}\n\n${art}\n\nGrid size: ${gridSize.width}x${gridSize.height}`,
      html: `
        <h1>New ASCII Art Submission</h1>
        <p><strong>Creation:</strong> ${creationName}</p>
        <p><strong>Author:</strong> ${authorName}</p>
        <pre style="background: #1a1a1a; color: #ece8e1; padding: 15px; border-radius: 4px; line-height: 1;">${art}</pre>
        <p><strong>Grid size:</strong> ${gridSize.width}x${gridSize.height}</p>
      `,
    });
    
    res.status(200).json({ message: 'Submission received successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 