'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadedImage } from '@/lib/types';
import { validateImageFile, formatFileSize } from '@/lib/utils';
import { X } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  description: string;
  value: UploadedImage | null;
  onChange: (image: UploadedImage | null) => void;
  required?: boolean;
  bgColor?: string; // For color-coded backgrounds
  containerHeight?: string; // For different heights
}

export default function ImageUpload({
  label,
  description,
  value,
  onChange,
  required = false,
  bgColor = 'bg-white',
  containerHeight = '200px',
}: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const validation = validateImageFile(file);

      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      setError(null);
      const preview = URL.createObjectURL(file);

      onChange({
        file,
        preview,
        name: file.name,
        size: file.size,
      });
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    multiple: false,
  });

  const handleRemove = () => {
    if (value?.preview) {
      URL.revokeObjectURL(value.preview);
    }
    onChange(null);
    setError(null);
  };

  const containerStyle = {
    height: containerHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (value) {
    return (
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] overflow-hidden" style={{ backgroundColor: bgColor.replace('300', '200').replace('bg-', '') }}>
        <div className="bg-black text-white text-center py-2 font-black uppercase">{label}</div>
        <div style={containerStyle} className="p-4">
          <img
            src={value.preview}
            alt={value.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <button
          onClick={handleRemove}
          className="w-full bg-white hover:bg-gray-100 border-t-4 border-black p-2 font-black text-sm"
        >
          REMOVE
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] text-center cursor-pointer flex flex-col items-center justify-center
          ${bgColor}
          ${isDragActive ? 'opacity-80' : ''}
        `}
        style={containerStyle}
      >
        <input {...getInputProps()} />
        <p className="text-lg font-black text-black">+ {label.toUpperCase()}</p>
      </div>

      {error && (
        <div className="mt-2 p-3 border-4 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0)] bg-white text-black font-black">
          {error}
        </div>
      )}
    </div>
  );
}
