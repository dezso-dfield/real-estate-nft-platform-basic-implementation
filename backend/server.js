require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();
const port      = process.env.PORT || 4000;
const uploadDir = process.env.UPLOAD_DIR || 'uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:   (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + suffix + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/upload-multiple', upload.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const urls = req.files.map(f =>
    `${req.protocol}://${req.get('host')}/uploads/${f.filename}`
  );
  res.json({ success: true, urls });
});

app.post('/api/upload-json', (req, res) => {
  const json = req.body;
  if (!json || Object.keys(json).length === 0) {
    return res.status(400).json({ error: 'No JSON body provided' });
  }

  if (!json.image && json.cover) {
    json.image = json.cover;
  }

  const filename = `metadata-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(uploadDir, filename),
    JSON.stringify(json, null, 2)
  );
  const url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
  res.json({ success: true, url });
});


app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  if (!res.headersSent) {
    res.status(400).json({ error: err.message || 'Unknown error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
