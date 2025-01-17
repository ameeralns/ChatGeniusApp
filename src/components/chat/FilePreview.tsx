'use client';

import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Download, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface FilePreviewProps {
  fileName: string;
  fileType: string;
  url: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function FilePreview({ fileName, fileType, url, onClose, showCloseButton = false }: FilePreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isImage = fileType.startsWith('image/');

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <>
      <div className="relative group">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          {isImage ? (
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/5">
              <Image
                src={url}
                alt={fileName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white/80" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{fileName}</p>
            <p className="text-xs text-white/60">{fileType}</p>
          </div>

          <div className="flex items-center gap-2">
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            {isImage && (
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {isImage && isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative max-w-4xl w-full bg-[#1E1F22] rounded-xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
              <Image
                src={url}
                alt={fileName}
                fill
                className="object-contain"
              />
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-white/60">{fileName}</p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
} 