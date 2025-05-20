const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, '../../gallery');

function loadGallery() {
  if (!fs.existsSync(GALLERY_DIR)) {
    fs.mkdirSync(GALLERY_DIR);
    return [];
  }

  const files = fs.readdirSync(GALLERY_DIR);
  return files
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const content = fs.readFileSync(path.join(GALLERY_DIR, file), 'utf8');
      return JSON.parse(content);
    });
}

module.exports = { loadGallery }; 