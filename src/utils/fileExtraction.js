const axios = require('axios');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

const normalizeText = (text) => {
  if (!text) return '';
  return text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

const downloadFile = async (fileUrl) => {
  if (!/^https?:\/\//i.test(fileUrl || '')) {
    throw new Error('Only http/https file URLs are supported');
  }

  const response = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });

  return Buffer.from(response.data);
};

const extractFromPdf = async (buffer) => {
  const parsed = await pdfParse(buffer);
  return normalizeText(parsed.text);
};

const extractFromImage = async (buffer) => {
  const result = await Tesseract.recognize(buffer, 'eng');
  return normalizeText(result?.data?.text || '');
};

const extractFromText = async (buffer) => {
  return normalizeText(buffer.toString('utf8'));
};

const extractTextFromBuffer = async (buffer, fileType) => {
  if (!buffer) {
    return '';
  }

  switch ((fileType || '').toLowerCase()) {
    case 'pdf':
      return extractFromPdf(buffer);
    case 'image':
      return extractFromImage(buffer);
    case 'text':
      return extractFromText(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

const extractTextFromMaterial = async ({ fileBuffer, fileUrl, fileType }) => {
  const buffer = fileBuffer || (fileUrl ? await downloadFile(fileUrl) : null);
  return extractTextFromBuffer(buffer, fileType);
};

module.exports = {
  extractTextFromMaterial,
  normalizeText,
};
