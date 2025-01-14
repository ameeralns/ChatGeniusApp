import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function uploadFileToS3(file: File, path: string): Promise<{ key: string; url: string; fileName: string; fileType: string }> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueKey = `${path}/${timestamp}-${sanitizedFileName}`;
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload file');
    }

    const data = await response.json();
    console.log('Upload response:', data);
    
    if (!data.url) {
      throw new Error('No URL returned from upload');
    }

    return {
      key: data.key,
      url: data.url,
      fileName: file.name,
      fileType: file.type
    };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

export async function generatePresignedUrl(key: string): Promise<string> {
  try {
    const response = await fetch('/api/get-file-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileKey: key }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate file URL');
    }

    const data = await response.json();
    return data.url;
  } catch (error: any) {
    console.error('Error generating file URL:', error);
    throw new Error(`Failed to generate file URL: ${error.message}`);
  }
} 
