const https = require('https');
const fs = require('fs');
const path = require('path');

const images = [
  {
    name: 'hero-gate.jpg',
    url: 'https://images.unsplash.com/photo-1545193544-312983719627?q=80&w=2000&auto=format&fit=crop',
    alt: 'Modern gated community entrance with security booth'
  },
  {
    name: 'guard-check.jpg',
    url: 'https://images.unsplash.com/photo-1582898967731-b5834427fd66?q=80&w=2000&auto=format&fit=crop',
    alt: 'Security guard checking credentials'
  },
  {
    name: 'mobile-app.jpg',
    url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=2000&auto=format&fit=crop',
    alt: 'Modern mobile app interface'
  },
  {
    name: 'community.jpg',
    url: 'https://images.unsplash.com/photo-1580041065738-e72023775cdc?q=80&w=2000&auto=format&fit=crop',
    alt: 'Beautiful gated community view'
  },
  {
    name: 'dashboard.jpg',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop',
    alt: 'Professional security dashboard interface'
  }
];

const imagesDir = path.join(__dirname, '..', 'public', 'images');

// Create images directory if it doesn't exist
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Download each image
images.forEach(image => {
  const filePath = path.join(imagesDir, image.name);
  
  https.get(image.url, (response) => {
    const fileStream = fs.createWriteStream(filePath);
    response.pipe(fileStream);
    
    fileStream.on('finish', () => {
      console.log(`Downloaded ${image.name}`);
      fileStream.close();
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${image.name}:`, err.message);
  });
}); 