const multer = require('multer');
const path = require('path');
const fs = require('fs');

const File_type = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpeg',
};

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const isValid = File_type[file.mimetype];
    let errorImage = new Error('Invalid image type');
    if (isValid) {
      errorImage = null;
    }
    cb(errorImage, 'uploads');
  },
  filename: function(req, file, cb) {
    const fileName = file.originalname.toLowerCase().split(' ').join('-');
    const extension = File_type[file.mimetype];
    cb(null, fileName + '-' + Date.now() + '.' + extension);
  }
});

const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 
  }
});

module.exports = imageUpload;
