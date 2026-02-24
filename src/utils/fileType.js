const path = require('path');

const inferFileTypeFromUpload = (file) => {
  if (!file) return null;

  const mimetype = (file.mimetype || '').toLowerCase();
  const ext = (path.extname(file.originalname || '') || '').toLowerCase();

  if (mimetype === 'application/pdf' || ext === '.pdf') {
    return 'pdf';
  }

  if (mimetype.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff'].includes(ext)) {
    return 'image';
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    return 'docx';
  }

  if (mimetype.startsWith('video/') || ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)) {
    return 'video';
  }

  if (
    mimetype.startsWith('text/') ||
    ['.txt', '.md', '.csv', '.json', '.xml'].includes(ext)
  ) {
    return 'text';
  }

  return null;
};

module.exports = {
  inferFileTypeFromUpload,
};
