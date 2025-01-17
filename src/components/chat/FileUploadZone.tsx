'use client';

import React, { useState, useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { storage } from '@/lib/firebase/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

interface FileUploadZoneProps {
  workspaceId: string;
  channelId: string;
  onFileUpload: (fileData: { fileName: string; fileType: string; url: string }) => Promise<void>;
  disabled?: boolean;
}

export function FileUploadZone({ workspaceId, channelId, onFileUpload, disabled }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || disabled || isUploading) return;
    
    const files = Array.from(e.target.files);
    await handleFiles(files);
    
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    const toastId = toast.loading('Uploading file...');

    try {
      for (const file of files) {
        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          toast.error('File size should be less than 50MB');
          continue;
        }

        const path = `workspaces/${workspaceId}/channels/${channelId}/files/${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, path);
        
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        await onFileUpload({
          fileName: file.name,
          fileType: file.type,
          url
        });
      }
      toast.success('File uploaded successfully', { id: toastId });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Paperclip className="w-4 h-4" />
      </button>

      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#1E1F22] rounded-xl p-8 border-2 border-dashed border-white/20 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <Paperclip className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-white mb-2">Drop your files here</h3>
                  <p className="text-white/60">Upload files up to 50MB</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 