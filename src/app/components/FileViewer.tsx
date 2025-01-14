import { useState } from 'react';
import Image from 'next/image';
import { FileText, Download } from 'lucide-react';

interface FileViewerProps {
  fileKey: string;
  fileType: string;
  fileName: string;
  url: string;
}

export default function FileViewer({ fileKey, fileType, fileName, url }: FileViewerProps) {
  const [error, setError] = useState<string>('');

  // Early return if no URL is provided
  if (!url) {
    console.error('No URL provided for file:', { fileKey, fileName });
    return (
      <div className="text-sm text-red-400">
        <p>Error: No URL available</p>
        <p className="text-xs mt-1">File: {fileName}</p>
      </div>
    );
  }

  // Early return if there's an error
  if (error) {
    return (
      <div className="text-sm text-red-400">
        <p>Error: {error}</p>
        <p className="text-xs mt-1">File: {fileName}</p>
      </div>
    );
  }

  // Handle image files
  if (fileType.startsWith('image/')) {
    return (
      <div className="relative w-48 h-48">
        <div className="relative w-full h-full">
          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
            <Image
              src={url}
              alt={fileName}
              fill
              className="object-cover rounded-lg hover:opacity-80 transition-opacity"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized={true}
              onError={() => {
                console.error('Image failed to load:', { url, fileKey });
                setError('Failed to load image');
              }}
            />
          </a>
        </div>
      </div>
    );
  }

  // Handle other file types
  return (
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4 text-gray-400" />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-400 hover:text-blue-500 flex items-center gap-1"
      >
        {fileName}
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
} 