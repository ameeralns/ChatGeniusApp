import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

export async function POST(request: NextRequest) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'chatgeniusfilesbucket';
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    const userId = formData.get('userId') as string || 'anonymous';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    console.log('Received file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      path: path,
      userId: userId
    });

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = path ? `${path}/${timestamp}-${sanitizedFileName}` : `${timestamp}-${sanitizedFileName}`;

    console.log('Generated file key:', key);

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('File buffer created, size:', buffer.length);

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        originalname: file.name,
        userId: userId,
      },
    });

    console.log('Sending to S3:', {
      bucket: bucketName,
      key: key,
      contentType: file.type
    });

    await s3.send(uploadCommand);
    console.log('Upload successful');

    // Generate pre-signed URL for reading the file
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: 'inline',
    });

    // Generate a URL that expires in 1 week (604800 seconds)
    const url = await getSignedUrl(s3, getObjectCommand, { expiresIn: 604800 });
    console.log('Generated pre-signed URL:', url);

    return NextResponse.json({ 
      key,
      url,
      fileName: file.name,
      fileType: file.type,
      size: file.size 
    });
  } catch (error: any) {
    console.error('Error in upload process:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
} 