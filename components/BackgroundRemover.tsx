'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadedImage } from '@/lib/types';
import { validateImageFile, removeBackgroundAPI, downloadImage } from '@/lib/utils';
import { Loader2, Download, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type BackgroundType = 'transparent' | 'white' | 'custom';

export default function BackgroundRemover() {
  const [originalImage, setOriginalImage] = useState<UploadedImage | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('transparent');
  const [customColor, setCustomColor] = useState<string>('#FFFFFF');

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const validation = validateImageFile(file);

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setError(null);
    const preview = URL.createObjectURL(file);
    setOriginalImage({
      file,
      preview,
      name: file.name,
      size: file.size,
    });
    setProcessedImageUrl(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    multiple: false,
  });

  const handleRemoveBackground = async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    setError(null);
    setProcessedImageUrl(null);

    try {
      const resultUrl = await removeBackgroundAPI(
        originalImage.file,
        backgroundType,
        backgroundType === 'custom' ? customColor : undefined
      );
      setProcessedImageUrl(resultUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to remove background');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (originalImage?.preview) {
      URL.revokeObjectURL(originalImage.preview);
    }
    setOriginalImage(null);
    setProcessedImageUrl(null);
    setError(null);
  };

  const handleDownload = () => {
    if (processedImageUrl) {
      const filename = originalImage?.name.replace(/\.[^/.]+$/, '') || 'background-removed';
      downloadImage(processedImageUrl, `${filename}-no-bg.png`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          AI Background Remover
        </h1>
        <p className="text-gray-600">
          Remove backgrounds from your images using Gemini AI
        </p>
      </div>

      {/* Background Type Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Background Options</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="backgroundType"
              value="transparent"
              checked={backgroundType === 'transparent'}
              onChange={(e) => setBackgroundType(e.target.value as BackgroundType)}
              className="w-4 h-4"
            />
            <span>Transparent</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="backgroundType"
              value="white"
              checked={backgroundType === 'white'}
              onChange={(e) => setBackgroundType(e.target.value as BackgroundType)}
              className="w-4 h-4"
            />
            <span>White</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="backgroundType"
              value="custom"
              checked={backgroundType === 'custom'}
              onChange={(e) => setBackgroundType(e.target.value as BackgroundType)}
              className="w-4 h-4"
            />
            <span>Custom Color</span>
          </label>
          {backgroundType === 'custom' && (
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-12 h-8 border rounded cursor-pointer"
            />
          )}
        </div>
      </Card>

      {/* Upload Area */}
      {!originalImage ? (
        <Card className="p-8">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'}
            `}
          >
            <input {...getInputProps()} />
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">
              {isDragActive ? 'Drop the image here' : 'Drag & drop an image here'}
            </p>
            <p className="text-sm text-gray-500">or click to select</p>
            <p className="text-xs text-gray-400 mt-2">PNG, JPG, JPEG, WEBP up to 10MB</p>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original Image */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Original Image</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
              <img
                src={originalImage.preview}
                alt="Original"
                className="w-full h-full object-contain"
              />
            </div>
            <Button
              onClick={handleRemoveBackground}
              disabled={isProcessing}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Remove Background
                </>
              )}
            </Button>
          </Card>

          {/* Processed Image */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Processed Image</h3>
              {processedImageUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-green-600 hover:text-green-700"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              )}
            </div>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
              {isProcessing ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : processedImageUrl ? (
                <img
                  src={processedImageUrl}
                  alt="Processed"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Processed image will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">{error}</p>
        </Card>
      )}
    </div>
  );
}
