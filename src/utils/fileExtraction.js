const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { env } = require('../config/env');

const normalizeText = (text) => {
  if (!text) return '';
  return text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const isPrivateS3Url = (urlObject) => {
  const host = (urlObject.host || '').toLowerCase();
  if (!env.S3_BUCKET || !env.S3_REGION) {
    return false;
  }
  return host.includes(`${env.S3_BUCKET.toLowerCase()}.s3.${env.S3_REGION.toLowerCase()}.amazonaws.com`);
};

const downloadFromS3Url = async (urlObject) => {
  if (!env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_BUCKET) {
    throw new Error('S3 credentials not configured for private object download');
  }

  const key = decodeURIComponent((urlObject.pathname || '').replace(/^\//, ''));
  if (!key) {
    throw new Error('Invalid S3 URL key');
  }

  const s3 = new S3Client({
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  );

  return streamToBuffer(response.Body);
};

const downloadFile = async (fileUrl) => {
  if (!fileUrl) {
    throw new Error('No file URL provided');
  }

  if (fileUrl.startsWith('/uploads/')) {
    const resolvedPath = path.join(process.cwd(), fileUrl.replace(/^\//, ''));
    return fs.promises.readFile(resolvedPath);
  }

  if (!/^https?:\/\//i.test(fileUrl)) {
    throw new Error('Only http/https or /uploads file URLs are supported');
  }

  try {
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    return Buffer.from(response.data);
  } catch (error) {
    const statusCode = error?.response?.status;
    const urlObject = new URL(fileUrl);

    if (statusCode === 403 && isPrivateS3Url(urlObject)) {
      return downloadFromS3Url(urlObject);
    }

    throw error;
  }
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
