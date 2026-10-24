import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { createTtlCache } from './ttlCache.js';

// Initialize the S3 client for Cloudflare R2
const getS3Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('R2 credentials not fully configured in .env. Skipping R2 upload.');
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const s3Client = getS3Client();

/**
 * Uploads a base64 image string to Cloudflare R2
 * @param {string} base64String - The base64 string (e.g. data:image/jpeg;base64,/9j/4AAQSkZJRg...)
 * @param {string} folderPrefix - e.g. 'partner-dl' or 'vehicle-rc'
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export const uploadBase64ToR2 = async (base64String, folderPrefix) => {
  // If R2 is not configured or base64 is missing/invalid, fallback to returning the original string
  if (!s3Client || !base64String || !base64String.startsWith('data:image')) {
    return base64String; 
  }

  try {
    // Extract mime type and base64 data
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches.length !== 3) {
      throw new Error('Invalid input string');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Get file extension from mime type (e.g. image/jpeg -> jpeg)
    const extension = mimeType.split('/')[1] || 'jpg';
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const fileName = `${folderPrefix}_${timestamp}_${uniqueId}.${extension}`;

    const bucketName = process.env.R2_BUCKET || 'advmenngo';
    const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-advmenngo.r2.dev';

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    // Return the final public URL
    return `${publicUrl}/${fileName}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    // On failure, fallback to saving the base64 string directly so onboarding doesn't break
    return base64String; 
  }
};

/**
 * Turns a stored R2 object URL into a time-limited presigned GET URL.
 * Non-R2 values (data URLs, external URLs, empty) are returned unchanged.
 * @param {string} storedUrl - e.g. https://pub-xxx.r2.dev/vehicle-type_123.png
 * @param {number} expiresIn - seconds (R2 max is 7 days)
 */
// Presigned URLs live for days but are reused for a day: a URL that is stable across requests lets the
// browser cache the image (a fresh signature on every request defeats caching and re-downloads each time).
const presignCache = createTtlCache({ ttlMs: 24 * 60 * 60 * 1000, maxEntries: 1000 });

export const getPresignedUrl = async (storedUrl, expiresIn = 6 * 24 * 60 * 60) => {
  if (!s3Client || !storedUrl) return storedUrl;
  const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-advmenngo.r2.dev';
  if (!storedUrl.startsWith(`${publicUrl}/`)) return storedUrl;

  return presignCache.wrap(storedUrl, async () => {
    try {
      const key = decodeURIComponent(storedUrl.slice(publicUrl.length + 1).split('?')[0]);
      const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET || 'advmenngo', Key: key });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error presigning R2 URL:', error);
      return storedUrl;
    }
  });
};
