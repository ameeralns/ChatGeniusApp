import { useState } from 'react';
import { uploadFileToS3 } from '@/lib/aws/s3Utils';
import { useAuth } from '@/lib/hooks/useAuth';

interface FileUploadProps {
  onUpload: (fileData: { fileName: string; fileKey: string; fileType: string; url: string }) => void;
  path?: string;
}

export default function FileUpload({ onUpload, path = 'uploads' }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { key, url, fileName, fileType } = await uploadFileToS3(file, path);
      console.log('File uploaded successfully. Data:', { key, url, fileName, fileType });
      
      onUpload({
        fileKey: key,
        url,
        fileName,
        fileType
      });
      
      // Clear the file input
      setFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input 
        type="file" 
        onChange={handleFileChange}
        className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        className={`px-4 py-2 rounded-lg text-sm font-semibold ${
          !file || uploading 
            ? 'bg-gray-100 text-gray-400' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
} 