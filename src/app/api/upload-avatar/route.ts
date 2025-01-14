import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3 = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const randomString = crypto.randomBytes(16).toString('hex');
    const key = `avatars/${userId}/${randomString}.${fileExtension}`;

    // Get file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || 'chatgeniusfilesbucket',
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3.send(uploadCommand);

    // Generate pre-signed URL for reading the file
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || 'chatgeniusfilesbucket',
      Key: key,
    });

    // Generate a URL that expires in 1 week (604800 seconds)
    const url = await getSignedUrl(s3, getObjectCommand, { expiresIn: 604800 });

    return NextResponse.json({ 
      url,
      key 
    });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 