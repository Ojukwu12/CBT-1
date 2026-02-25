const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const mime = require('mime-types');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

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
    throw new ApiError(500, 'S3 storage is not fully configured');
  }

  const key = `materials/${uuidv4()}-${fileName || 'upload'}`;
  const s3 = getS3Client();

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
        ContentDisposition: `attachment; filename=\"${fileName || 'material'}\"`,
      })
    );
  } catch (error) {
    const isAccessDenied =
      error?.name === 'AccessDenied' ||
      error?.Code === 'AccessDenied' ||
      error?.$metadata?.httpStatusCode === 403;

    if (isAccessDenied) {
      throw new ApiError(
        403,
        `S3 upload denied. Allow s3:PutObject on arn:aws:s3:::${env.S3_BUCKET}/materials/* for the configured IAM user.`
      );
    }

    throw error;
  }

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

const deleteLocalFile = async (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
    return;
  }

  const uploadsDir = ensureUploadsDir();
  const fileName = fileUrl.replace('/uploads/', '');
  const filePath = path.join(uploadsDir, fileName);

  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
};

const deleteS3File = async (fileUrl) => {
  if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new ApiError(500, 'S3 storage is not fully configured');
  }

  const urlPattern = new RegExp(`https://${env.S3_BUCKET}\\.s3\\.${env.S3_REGION}\\.amazonaws\\.com/(.+)`);
  const match = fileUrl.match(urlPattern);

  if (!match || !match[1]) {
    return;
  }

  const key = decodeURIComponent(match[1]);
  const s3 = getS3Client();

  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  );
};

const deleteFile = async (fileUrl) => {
  const provider = (env.STORAGE_PROVIDER || 'local').toLowerCase();

  if (provider === 's3') {
    await deleteS3File(fileUrl);
    return;
  }

  await deleteLocalFile(fileUrl);
};

const generatePresignedUrl = async ({ fileUrl, expiresIn = 300, fileName, inline = false }) => {
  const provider = (env.STORAGE_PROVIDER || 'local').toLowerCase();

  // For local files, return the original URL
  if (provider !== 's3' || !fileUrl.includes('.s3.')) {
    return fileUrl;
  }

  if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new ApiError(500, 'S3 storage is not fully configured');
  }

  // Extract the S3 key from the URL
  const urlPattern = new RegExp(`https://${env.S3_BUCKET}\.s3\.${env.S3_REGION}\.amazonaws\.com/(.+)`);
  const match = fileUrl.match(urlPattern);
  
  if (!match || !match[1]) {
    throw new ApiError(400, 'Invalid S3 file URL');
  }

  const key = decodeURIComponent(match[1]);
  const s3 = getS3Client();

  let disposition;
  if (inline) {
    disposition = fileName ? `inline; filename="${fileName}"` : 'inline';
  } else {
    disposition = fileName ? `attachment; filename="${fileName}"` : 'attachment';
  }

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ResponseContentDisposition: disposition,
  });

  try {
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    const isAccessDenied =
      error?.name === 'AccessDenied' ||
      error?.Code === 'AccessDenied' ||
      error?.$metadata?.httpStatusCode === 403;

    if (isAccessDenied) {
      throw new ApiError(
        403,
        `S3 access denied. Ensure s3:GetObject permission is granted on arn:aws:s3:::${env.S3_BUCKET}/materials/* for the configured IAM user.`
      );
    }

    throw error;
  }
};

module.exports = {
  uploadBuffer,
  deleteFile,
  generatePresignedUrl,
};
