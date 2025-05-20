require('dotenv').config();
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const fs = require('fs');

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
  debug: true, // Enable debug logging
  logger: true  // Enable logger
});

// Verify email configuration on startup
transporter.verify(function(error, success) {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// API Routes
app.post('/api/submit', async (req, res) => {
  const { authorName, creationName, art, gridSize, authorEmail } = req.body;
  
  if (!authorName || !creationName || !art) {
    return res.status(400).json({ error: 'Author name, creation name, and art are required' });
  }

  // Create JSON data
  const artData = {
    name: creationName,
    author: authorName,
    art: art,
    gridSize: gridSize,
    submittedAt: new Date().toISOString()
  };

  // Create a temporary file
  const fileName = `${creationName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
  const filePath = path.join(__dirname, 'temp', fileName);
  
  try {
    console.log('Starting submission process...');
    console.log('Email config:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE,
      user: process.env.EMAIL_USER,
      adminEmail: process.env.ADMIN_EMAIL
    });

    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }

    // Write JSON file
    fs.writeFileSync(filePath, JSON.stringify(artData, null, 2));
    console.log('JSON file created at:', filePath);

    // Send email to admin
    console.log('Attempting to send admin email...');
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `New ASCII Art Submission: "${creationName}"`,
      text: `New submission from ${authorName}:\n\nTitle: ${creationName}\n\n${art}\n\nGrid size: ${gridSize.width}x${gridSize.height}`,
      html: `
        <h1>New ASCII Art Submission</h1>
        <p><strong>Creation:</strong> ${creationName}</p>
        <p><strong>Author:</strong> ${authorName}</p>
        <p><strong>Author Email:</strong> ${authorEmail || 'Not provided'}</p>
        <pre style="background: #1a1a1a; color: #ece8e1; padding: 15px; border-radius: 4px; line-height: 1; font-family: monospace;">${art}</pre>
        <p><strong>Grid size:</strong> ${gridSize.width}x${gridSize.height}</p>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Review the attached JSON file</li>
          <li>If approved, move the file to the gallery directory</li>
          <li>The art will automatically appear in the gallery</li>
        </ol>
      `,
      attachments: [{
        filename: fileName,
        path: filePath
      }]
    };

    const adminInfo = await transporter.sendMail(adminMailOptions);
    console.log('Admin email sent:', adminInfo);

    // Send confirmation email to author if email provided
    if (authorEmail) {
      console.log('Attempting to send author confirmation email...');
      const authorMailOptions = {
        from: process.env.EMAIL_USER,
        to: authorEmail,
        subject: `Your ASCII Art Submission: "${creationName}"`,
        html: `
          <h1>Thank you for your submission!</h1>
          <p>We've received your ASCII art submission "${creationName}".</p>
          <p>We'll review it and let you know if it's added to the gallery.</p>
          <p>Here's a preview of your submission:</p>
          <pre style="background: #1a1a1a; color: #ece8e1; padding: 15px; border-radius: 4px; line-height: 1; font-family: monospace;">${art}</pre>
        `
      };

      const authorInfo = await transporter.sendMail(authorMailOptions);
      console.log('Author confirmation email sent:', authorInfo);
    }
    
    res.status(200).json({ message: 'Submission received successfully' });
  } catch (error) {
    console.error('Detailed error information:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command
    });
    res.status(500).json({ error: 'Failed to process submission' });
  } finally {
    // Clean up temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 