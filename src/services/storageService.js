const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const { env } = require('../config/env');

const getS3Client = () => {
  return new S3Client({
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
};

const ensureUploadsDir = () => {
  const dir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const uploadToLocal = async ({ buffer, fileName, mimeType }) => {
  const uploadsDir = ensureUploadsDir();
  const ext = path.extname(fileName || '') || `.${mime.extension(mimeType) || 'bin'}`;
  const finalName = `${uuidv4()}${ext}`;
  const filePath = path.join(uploadsDir, finalName);
  await fs.promises.writeFile(filePath, buffer);
  return {
    fileUrl: `/uploads/${finalName}`,
    fileSize: buffer.length,
  };
};

const uploadToS3 = async ({ buffer, fileName, mimeType }) => {
  if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3 storage is not fully configured');
  }

  const key = `materials/${uuidv4()}-${fileName || 'upload'}`;
  const s3 = getS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
    })
  );

  const fileUrl = `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
  return {
    fileUrl,
    fileSize: buffer.length,
  };
};

const uploadBuffer = async ({ buffer, fileName, mimeType }) => {
  const provider = (env.STORAGE_PROVIDER || 'local').toLowerCase();

  if (provider === 's3') {
    return uploadToS3({ buffer, fileName, mimeType });
  }

  return uploadToLocal({ buffer, fileName, mimeType });
};

module.exports = {
  uploadBuffer,
};
