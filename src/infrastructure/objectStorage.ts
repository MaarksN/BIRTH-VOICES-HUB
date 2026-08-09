import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;

const config: S3ClientConfig = {
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint,
  forcePathStyle: Boolean(endpoint),
};

if (accessKeyId && secretAccessKey) {
  config.credentials = { accessKeyId, secretAccessKey };
}

export const objectStorage = new S3Client(config);
export const recordingsBucket = process.env.S3_RECORDINGS_BUCKET ?? 'birth-voice-recordings';

export async function ensureRecordingsBucket(): Promise<void> {
  try {
    await objectStorage.send(new HeadBucketCommand({ Bucket: recordingsBucket }));
  } catch (error: unknown) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (statusCode && statusCode !== 404) throw error;
    await objectStorage.send(new CreateBucketCommand({ Bucket: recordingsBucket }));
  }
}
