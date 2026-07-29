import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
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

export async function deleteFolderFromS3(prefix: string) {
  let isTruncated = true;
  let continuationToken: string | undefined = undefined;

  while (isTruncated) {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
        },
      });
      await s3Client.send(deleteCommand);
    }
    
    isTruncated = listResponse.IsTruncated || false;
    continuationToken = listResponse.NextContinuationToken;
  }
}

export async function getPresignedUrl(key: string, expiresIn = 3600) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export function getPublicUrl(key: string) {
  return `${process.env.HF_S3_ENDPOINT}/${BUCKET}/${key}`;
}
