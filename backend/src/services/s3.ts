import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import config from '../config';

// Configure AWS SDK
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
});

const s3 = new AWS.S3();

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Upload file to S3 bucket
 */
export const uploadToS3 = async (
  filePath: string,
  fileName: string,
  folder: string = 'uploads'
): Promise<UploadResult> => {
  try {
    // Check if AWS credentials are configured
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      return {
        success: false,
        error: 'AWS credentials not configured',
      };
    }

    // Read file
    const fileContent = fs.readFileSync(filePath);
    const fileExtension = path.extname(fileName);
    const timestamp = Date.now();
    const key = `${folder}/${timestamp}-${fileName}`;

    // Determine content type
    const contentType = getContentType(fileExtension);

    // Upload parameters
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: config.aws.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read', // Make file publicly accessible
    };

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();

    return {
      success: true,
      url: result.Location,
      key: result.Key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Delete file from S3 bucket
 */
export const deleteFromS3 = async (key: string): Promise<boolean> => {
  try {
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      console.warn('AWS credentials not configured, skipping S3 delete');
      return false;
    }

    const deleteParams: AWS.S3.DeleteObjectRequest = {
      Bucket: config.aws.bucketName,
      Key: key,
    };

    await s3.deleteObject(deleteParams).promise();
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    return false;
  }
};

/**
 * Generate presigned URL for direct upload
 */
export const generatePresignedUrl = async (
  fileName: string,
  contentType: string,
  folder: string = 'uploads'
): Promise<UploadResult> => {
  try {
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      return {
        success: false,
        error: 'AWS credentials not configured',
      };
    }

    const timestamp = Date.now();
    const key = `${folder}/${timestamp}-${fileName}`;

    const presignedUrl = s3.getSignedUrl('putObject', {
      Bucket: config.aws.bucketName,
      Key: key,
      ContentType: contentType,
      Expires: 300, // 5 minutes
      ACL: 'public-read',
    });

    return {
      success: true,
      url: presignedUrl,
      key,
    };
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Check if S3 is configured and accessible
 */
export const checkS3Connection = async (): Promise<boolean> => {
  try {
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      return false;
    }

    await s3.headBucket({ Bucket: config.aws.bucketName }).promise();
    return true;
  } catch (error) {
    console.error('S3 connection check failed:', error);
    return false;
  }
};

/**
 * Get content type based on file extension
 */
const getContentType = (extension: string): string => {
  const contentTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
  };

  return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Upload multiple files to S3
 */
export const uploadMultipleToS3 = async (
  files: Array<{ filePath: string; fileName: string }>,
  folder: string = 'uploads'
): Promise<UploadResult[]> => {
  const uploadPromises = files.map(file =>
    uploadToS3(file.filePath, file.fileName, folder)
  );

  return Promise.all(uploadPromises);
};

export default {
  uploadToS3,
  deleteFromS3,
  generatePresignedUrl,
  checkS3Connection,
  uploadMultipleToS3,
};
