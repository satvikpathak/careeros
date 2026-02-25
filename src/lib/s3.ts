// ============================================
// CareerOS — AWS S3 Client
// ============================================

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET_NAME || "careeros-resumes";

function getS3Client() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }

  return new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const s3Client = getS3Client();
  const key = `resumes/${Date.now()}-${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function getPresignedUrl(key: string): Promise<string> {
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
