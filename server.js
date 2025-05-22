require('dotenv').config();
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const hpp = require('hpp');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiter
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet()); // Adds various HTTP headers for security
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Body parser with size limits
app.use(bodyParser.json({ limit: '10kb' })); // Limit body size to 10kb
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));

// Static files with security headers
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
  }
}));

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development'
});

// Verify email configuration on startup
transporter.verify(function(error, success) {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Function to read gallery data
const readGalleryData = () => {
  const galleryDir = path.join(__dirname, 'gallery');
  console.log('Reading gallery from:', galleryDir);
  
  if (!fs.existsSync(galleryDir)) {
    console.log('Gallery directory does not exist, creating it...');
    fs.mkdirSync(galleryDir, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(galleryDir);
  console.log('Found files in gallery:', files);

  return files
    .filter(file => file.endsWith('.json'))
    .map(file => {
      try {
        const filePath = path.join(galleryDir, file);
        console.log('Reading file:', filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        console.log('Parsed data from', file, ':', data);
        return data;
      } catch (error) {
        console.error('Error reading file', file, ':', error);
        return null;
      }
    })
    .filter(data => data !== null);
};

// Watch for changes in the gallery directory
const galleryDir = path.join(__dirname, 'gallery');
fs.watch(galleryDir, (eventType, filename) => {
  if (filename && filename.endsWith('.json')) {
    console.log(`Gallery file ${filename} ${eventType}`);
    // Clear require cache for the changed file
    const filePath = path.join(galleryDir, filename);
    delete require.cache[require.resolve(filePath)];
  }
});

// Input validation middleware
const validateSubmission = [
  body('authorName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Author name contains invalid characters')
    .escape(),
  body('creationName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Creation name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Creation name contains invalid characters')
    .escape(),
  body('art')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Art content must be between 1 and 10000 characters'),
  body('gridSize')
    .isObject()
    .withMessage('Grid size must be an object')
    .custom((value) => {
      if (!value.width || !value.height) {
        throw new Error('Grid size must have width and height');
      }
      if (value.width < 1 || value.width > 100 || value.height < 1 || value.height > 100) {
        throw new Error('Grid dimensions must be between 1 and 100');
      }
      return true;
    }),
  body('authorEmail')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
];

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message
  });
};

// Gallery endpoint with error handling
app.get('/api/gallery', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 9;
    
    if (page < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }
    
    const galleryData = readGalleryData();
    const total = galleryData.length;
    const totalPages = Math.ceil(total / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = galleryData.slice(startIndex, endIndex);

    res.json({
      items: paginatedData,
      total,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    next(error);
  }
});

// Submit endpoint with validation
app.post('/api/submit', validateSubmission, async (req, res, next) => {
  let filePath;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { authorName, creationName, art, gridSize, authorEmail } = req.body;
    
    // Create JSON data
    const artData = {
      name: creationName,
      author: authorName,
      art: art,
      gridSize: gridSize,
      submittedAt: new Date().toISOString()
    };

    // Create a safe filename
    const safeFileName = `${String(creationName).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.json`;
    filePath = path.join(__dirname, 'temp', safeFileName);
    
    // Ensure temp directory exists with proper permissions
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { mode: 0o755 });
    }

    // Write JSON file with proper error handling
    fs.writeFileSync(filePath, JSON.stringify(artData, null, 2), { mode: 0o644 });

    // Send email to admin
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
        filename: safeFileName,
        path: filePath
      }]
    };

    const adminInfo = await transporter.sendMail(adminMailOptions);
    console.log('Admin email sent:', adminInfo);

    // Send confirmation email to author if email provided
    if (authorEmail) {
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
    next(error);
  } finally {
    // Clean up temporary file with error handling
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('Error cleaning up temporary file:', error);
      }
    }
  }
});

// Serve React app with security headers
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Apply error handling middleware
app.use(errorHandler);

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
}); 