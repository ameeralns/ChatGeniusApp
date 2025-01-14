import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'chatgeniusfilesbucket';
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    const { fileKey } = await request.json();
    if (!fileKey) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    // Clean up the file key by removing any leading slashes
    const cleanFileKey = fileKey.replace(/^\/+/, '');

    console.log('Generating signed URL for:', {
      bucket: bucketName,
      key: cleanFileKey,
    });

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanFileKey,
      ResponseContentDisposition: 'inline',
    });

    try {
      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: 3600, // 1 hour
      });

      console.log('Generated signed URL:', signedUrl);

      return NextResponse.json({ url: signedUrl });
    } catch (s3Error: any) {
      console.error('S3 Error:', {
        message: s3Error.message,
        code: s3Error.code,
        requestId: s3Error.$metadata?.requestId,
      });
      
      throw new Error(`S3 Error: ${s3Error.code} - ${s3Error.message}`);
    }
  } catch (error: any) {
    console.error('Error generating signed URL:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
} 