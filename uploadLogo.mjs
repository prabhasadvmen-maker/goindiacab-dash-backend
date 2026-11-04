import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const file = readFileSync('C:\\Users\\user\\Desktop\\Advmen Goindiacab Dashboard\\Advmen Goindiacab Website\\frontend\\public\\goindiacab-logo-wide.png');

await client.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET,
  Key: 'goindiacab-logo-wide.png',
  Body: file,
  ContentType: 'image/png',
  CacheControl: 'public, max-age=31536000',
}));

console.log('Uploaded! URL:', process.env.R2_PUBLIC_URL + '/goindiacab-logo-wide.png');
