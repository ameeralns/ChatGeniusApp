import React, { useState, useRef } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";

interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
  initialImageUrl?: string;
  s3Key?: string;
}

export default function ImageUpload({ onImageChange, initialImageUrl, s3Key }: ImageUploadProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
  const [isImageError, setIsImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setIsImageError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    onImageChange(null);
    setImagePreview(null);
    setIsImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageError = async () => {
    setIsImageError(true);
    // If we have an S3 key, use it to refresh the URL
    if (s3Key) {
      try {
        const response = await fetch('/api/get-file-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileKey: s3Key }),
        });

        if (response.ok) {
          const { url } = await response.json();
          setImagePreview(url);
          setIsImageError(false);
        } else {
          toast.error('Failed to refresh image URL');
        }
      } catch (error) {
        console.error('Error refreshing image URL:', error);
        toast.error('Failed to load image');
      }
    } else if (initialImageUrl?.includes('amazonaws.com')) {
      // Fallback to using the URL if no key is provided
      try {
        const fileKey = initialImageUrl.split('?')[0].split('/').pop();
        if (fileKey) {
          const response = await fetch('/api/get-file-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileKey }),
          });

          if (response.ok) {
            const { url } = await response.json();
            setImagePreview(url);
            setIsImageError(false);
          } else {
            toast.error('Failed to refresh image URL');
          }
        }
      } catch (error) {
        console.error('Error refreshing image URL:', error);
        toast.error('Failed to load image');
      }
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      {imagePreview && !isImageError ? (
        <div className="relative w-full h-64">
          <Image
            src={imagePreview}
            alt="Preview"
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
            onError={handleImageError}
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <label
          htmlFor="image"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 800x400px)</p>
          </div>
        </label>
      )}
      <input
        type="file"
        id="image"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
        ref={fileInputRef}
      />
    </div>
  );
}
