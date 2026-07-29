import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.HF_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.HF_S3_ACCESS_KEY!,
    secretAccessKey: process.env.HF_S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export const BUCKET = process.env.HF_S3_BUCKET!;

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return `${process.env.HF_S3_ENDPOINT}/${BUCKET}/${key}`;
}

export async function deleteFromS3(key: string) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3Client.send(command);
}

export async function getPresignedUrl(key: string, expiresIn = 3600) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export function getPublicUrl(key: string) {
  return `${process.env.HF_S3_ENDPOINT}/${BUCKET}/${key}`;
}
