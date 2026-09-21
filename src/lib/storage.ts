import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

/**
 * Works with any S3-compatible object store. Configured by default for
 * Cloudflare R2 (cheap/free egress, S3 API-compatible) but plain AWS S3
 * works too — just set S3_ENDPOINT to the AWS regional endpoint or omit it.
 */
function getClient() {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT; // e.g. https://<account>.r2.cloudflarestorage.com

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not set. See .env.example for the media storage setup."
    );
  }

  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint,
    forcePathStyle: !!endpoint, // R2 and most non-AWS S3 stores need path-style
    credentials: { accessKeyId, secretAccessKey },
  });
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB, generous for a short video clip

const ALLOWED_CONTENT_TYPES: Record<string, "photo" | "video"> = {
  "image/jpeg": "photo",
  "image/png": "photo",
  "image/webp": "photo",
  "image/gif": "photo",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
};

export function mediaKindFor(contentType: string) {
  return ALLOWED_CONTENT_TYPES[contentType];
}

export async function createPresignedUpload(params: {
  userId: string;
  contentType: string;
  fileSizeBytes: number;
}) {
  const kind = ALLOWED_CONTENT_TYPES[params.contentType];
  if (!kind) {
    throw new Error(`Unsupported file type: ${params.contentType}`);
  }
  if (params.fileSizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large (100MB max).");
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set. See .env.example for the media storage setup.");
  }

  const extension = params.contentType.split("/")[1] ?? "bin";
  const key = `reviews/${params.userId}/${randomUUID()}.${extension}`;

  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });

  const publicBaseUrl = process.env.S3_PUBLIC_URL_BASE; // e.g. https://media.yoursite.com or the R2 public bucket URL
  const publicUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, "")}/${key}`
    : `${process.env.S3_ENDPOINT?.replace(/\/$/, "")}/${bucket}/${key}`;

  return { uploadUrl, publicUrl, key, kind };
}
