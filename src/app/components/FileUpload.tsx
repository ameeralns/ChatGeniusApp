import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { storage } from '@/lib/firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

interface FileUploadProps {
  onUpload: (fileData: { fileName: string; fileKey: string; fileType: string; url: string }) => void;
  path: string;
}

export default function FileUpload({ onUpload, path }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size should be less than 50MB');
      }

      // Create a unique file path
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = `${path}/${uniqueFileName}`;
      const fileRef = ref(storage, filePath);

      // Upload to Firebase Storage
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);

      // Call onUpload with file data
      onUpload({
        fileName: file.name,
        fileKey: filePath,
        fileType: file.type,
        url
      });

      // Reset input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={isUploading}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-purple-50 file:text-purple-700
          hover:file:bg-purple-100
          disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
} 