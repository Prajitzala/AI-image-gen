'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import Auth from '@/components/Auth';
import Wardrobe from '@/components/Wardrobe';
import { UploadedImage, ClothingItem } from '@/lib/types';
import { fileToBase64, downloadImage, convertToTransparentPNG } from '@/lib/utils';
import { config } from '@/lib/config';
import { Loader2, Download, RefreshCw, User, X } from 'lucide-react';

export default function Home() {
  const [topImage, setTopImage] = useState<UploadedImage | null>(null);
  const [bottomImage, setBottomImage] = useState<UploadedImage | null>(null);
  const [personImage, setPersonImage] = useState<UploadedImage | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [selectedTop, setSelectedTop] = useState<ClothingItem | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<ClothingItem | null>(null);

  const handleGenerate = async () => {
    if (!topImage || !bottomImage) {
      setError('Please upload both top and bottom images');
      return;
    }

    if (!personImage) {
      setError('Please upload a full-body photo');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImageUrl(null);

    try {
      // Convert clothing images to PNG with transparent background
      // This helps AI better understand clothing edges by removing background noise
      const topConverted = await convertToTransparentPNG(topImage.file);
      const bottomConverted = await convertToTransparentPNG(bottomImage.file);
      
      // Person image: keep original format (don't remove background - needs full photo context)
      const personBase64 = personImage
        ? await fileToBase64(personImage.file)
        : undefined;

      // Helper function to get MIME type from file
      const getMimeType = (file: File): string => {
        // Preserve the original MIME type, defaulting to JPEG for compatibility
        return file.type || 'image/jpeg';
      };

      const response = await fetch('/api/generate-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topImage: {
            data: topConverted.data,
            mimeType: topConverted.mimeType, // Always PNG now
          },
          bottomImage: {
            data: bottomConverted.data,
            mimeType: bottomConverted.mimeType, // Always PNG now
          },
          personImage: personBase64
            ? {
                data: personBase64,
                mimeType: getMimeType(personImage.file), // Keep original format
              }
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate outfit');
      }

      setGeneratedImageUrl(data.imageUrl);
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating the outfit');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setTopImage(null);
    setBottomImage(null);
    setPersonImage(null);
    setGeneratedImageUrl(null);
    setError(null);
  };

  const handleDownload = () => {
    if (generatedImageUrl) {
      downloadImage(generatedImageUrl, 'outfit.png');
    }
  };

  const handleSelectTop = (item: ClothingItem) => {
    setSelectedTop(item);
    // Convert URL to file for compatibility
    fetch(item.image_url)
      .then((res) => {
        // Get MIME type from response header or blob type, default to JPEG
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return res.blob().then((blob) => ({ blob, contentType }));
      })
      .then(({ blob, contentType }) => {
        // Determine file extension from MIME type
        const extension = contentType.includes('png') ? 'png' : 
                         contentType.includes('webp') ? 'webp' : 'jpg';
        const file = new File([blob], `top-${item.id}.${extension}`, { type: contentType });
        const preview = URL.createObjectURL(file);
        setTopImage({
          file,
          preview,
          name: `top-${item.id}.${extension}`,
          size: blob.size,
        });
        setShowWardrobe(false);
      });
  };

  const handleSelectBottom = (item: ClothingItem) => {
    setSelectedBottom(item);
    // Convert URL to file for compatibility
    fetch(item.image_url)
      .then((res) => {
        // Get MIME type from response header or blob type, default to JPEG
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return res.blob().then((blob) => ({ blob, contentType }));
      })
      .then(({ blob, contentType }) => {
        // Determine file extension from MIME type
        const extension = contentType.includes('png') ? 'png' : 
                         contentType.includes('webp') ? 'webp' : 'jpg';
        const file = new File([blob], `bottom-${item.id}.${extension}`, { type: contentType });
        const preview = URL.createObjectURL(file);
        setBottomImage({
          file,
          preview,
          name: `bottom-${item.id}.${extension}`,
          size: blob.size,
        });
        setShowWardrobe(false);
      });
  };

  return (
    <main className="min-h-screen flex flex-col dotted-background">
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="w-full max-w-5xl flex flex-col">
        {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="w-10 h-10"></div> {/* Placeholder for spacing */}
            <h1
              className="text-6xl font-chango text-center flex-grow tracking-tight leading-none"
              style={{
                textShadow: "4px 4px 0px #FFD700",
                letterSpacing: "1px",
                color: "#000",
              }}
            >
              AI OUTFIT GENERATOR
              </h1>
            <div className="w-10 h-10 flex justify-end">
              {config.supabaseEnabled && (
                <div className="flex items-center gap-4">
                  {user && (
                    <button
                      onClick={() => setShowWardrobe(!showWardrobe)}
                      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors border-2 border-black"
                    >
                      <User className="w-5 h-5" />
                      <span className="text-sm font-medium">My Wardrobe</span>
                    </button>
                  )}
                  <Auth onAuthChange={setUser} />
                </div>
              )}
            </div>
          </div>
          
          <div className="w-full">

        {/* Wardrobe Section */}
        {showWardrobe && user && (
          <div className="mb-6">
            <Wardrobe
              user={user}
              onSelectTop={handleSelectTop}
              onSelectBottom={handleSelectBottom}
            />
          </div>
        )}

        {/* Main Content */}
        {!generatedImageUrl ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Top and Bottom Image Uploads */}
            <div className="flex flex-col gap-4">
              {/* Top Image Upload */}
              {!topImage ? (
                <div
                  className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-purple-300 text-center cursor-pointer flex flex-col items-center justify-center"
                  style={{ height: '200px' }}
                  onClick={() => document.getElementById('top-input')?.click()}
                >
                  <input
                    id="top-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const preview = URL.createObjectURL(file);
                        setTopImage({
                          file,
                          preview,
                          name: file.name,
                          size: file.size,
                        });
                      }
                    }}
                  />
                  <p className="text-lg font-black text-black">+ TOP IMAGE</p>
                </div>
              ) : (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-purple-200 overflow-hidden">
                  <div className="bg-black text-white text-center py-2 font-black">TOP IMAGE</div>
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                    <img
                      src={topImage.preview}
                      alt="Top"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (topImage?.preview) {
                        URL.revokeObjectURL(topImage.preview);
                      }
                      setTopImage(null);
                    }}
                    className="w-full bg-red-300 hover:bg-red-400 border-t-4 border-black p-2 font-black text-sm"
                  >
                    REMOVE
                  </button>
                </div>
              )}

              {/* Bottom Image Upload */}
              {!bottomImage ? (
                <div
                  className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-orange-300 text-center cursor-pointer flex flex-col items-center justify-center"
                  style={{ height: '200px' }}
                  onClick={() => document.getElementById('bottom-input')?.click()}
                >
                  <input
                    id="bottom-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const preview = URL.createObjectURL(file);
                        setBottomImage({
                          file,
                          preview,
                          name: file.name,
                          size: file.size,
                        });
                      }
                    }}
                  />
                  <p className="text-lg font-black text-black">+ BOTTOM IMAGE</p>
                </div>
              ) : (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-orange-200 overflow-hidden">
                  <div className="bg-black text-white text-center py-2 font-black">BOTTOM IMAGE</div>
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                    <img
                      src={bottomImage.preview}
                      alt="Bottom"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (bottomImage?.preview) {
                        URL.revokeObjectURL(bottomImage.preview);
                      }
                      setBottomImage(null);
                    }}
                    className="w-full bg-red-300 hover:bg-red-400 border-t-4 border-black p-2 font-black text-sm"
                  >
                    REMOVE
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Full Photo, Generate, Result */}
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
              {/* Full Photo Upload / Generated Outfit Display */}
              {generatedImageUrl ? (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-green-200 overflow-hidden">
                  <div className="bg-black text-white text-center py-2 font-black text-xl">FULL PHOTO</div>
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                    <img
                      src={generatedImageUrl}
                      alt="Generated outfit"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              ) : !personImage ? (
                <div
                  className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-green-300 text-center cursor-pointer flex flex-col items-center justify-center"
                  style={{ height: '300px' }}
                  onClick={() => document.getElementById('full-input')?.click()}
                >
                  <input
                    id="full-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const preview = URL.createObjectURL(file);
                        setPersonImage({
                          file,
                          preview,
                          name: file.name,
                          size: file.size,
                        });
                      }
                    }}
                  />
                  <p className="text-xl font-black text-black">+ UPLOAD PHOTO</p>
                  <p className="text-sm font-bold text-black mt-2">JPG, PNG, WebP, GIF</p>
                </div>
              ) : (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-green-200 overflow-hidden">
                  <div className="bg-black text-white text-center py-2 font-black text-xl">FULL PHOTO</div>
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                    {isGenerating ? (
                      <div className="text-center">
                        <div className="inline-block border-4 border-black p-3 bg-yellow-300 shadow-[5px_5px_0px_0px_rgba(0,0,0)] animate-pulse">
                          <p className="text-black font-black text-xl">GENERATING...</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={personImage.preview}
                        alt="Full"
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (personImage?.preview) {
                        URL.revokeObjectURL(personImage.preview);
                      }
                      setPersonImage(null);
                    }}
                    className="w-full bg-red-300 hover:bg-red-400 border-t-4 border-black p-2 font-black text-sm"
                  >
                    REMOVE
                  </button>
                </div>
              )}

              {/* Generate Button */}
              {!generatedImageUrl && personImage && topImage && bottomImage && (
                <div
                  className="w-full border-4 border-black p-4 bg-yellow-300 shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGenerate}
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-3 h-6 w-6 animate-spin stroke-[3]" />
                      <p className="text-black font-black text-xl">GENERATING...</p>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="mr-3 text-2xl">⚡</span>
                      <p className="text-black font-black text-xl">GENERATE OUTFIT</p>
                    </div>
                  )}
                </div>
              )}

              {/* Download and Reset Buttons */}
              <div className="flex gap-4">
                {generatedImageUrl && (
                  <div
                    className="flex-1 border-4 border-black p-3 bg-cyan-300 shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center"
                    onClick={handleDownload}
                  >
                    <div className="flex items-center">
                      <Download className="mr-3 h-6 w-6 stroke-[3]" />
                      <p className="text-black font-black">DOWNLOAD</p>
                    </div>
                  </div>
                )}
                <div
                  className={`${generatedImageUrl ? 'flex-1' : 'w-full'} border-4 border-black p-3 bg-green-300 shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center`}
                  onClick={handleReset}
                >
                  <div className="flex items-center">
                    <RefreshCw className="mr-3 h-6 w-6 stroke-[3]" />
                    <p className="text-black font-black">START OVER</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 border-4 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0)] bg-red-300 text-black font-black">
                  {error}
                </div>
            )}
            </div>
          </div>
        ) : (
          /* Result View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Input Images */}
            <div className="flex flex-col gap-4">
                {topImage && (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-purple-200 overflow-hidden">
                  <div className="bg-black text-white text-center py-2 font-black">TOP IMAGE</div>
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                    <img
                      src={topImage.preview}
                      alt="Top"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  </div>
                )}
                {bottomImage && (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-orange-200 overflow-hidden">
                  <div className="bg-black text-white text-center py-2 font-black">BOTTOM IMAGE</div>
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                    <img
                      src={bottomImage.preview}
                      alt="Bottom"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  </div>
                )}
            </div>

            {/* Right Column - Generated Result in FULL PHOTO container */}
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
              {/* Full Photo Container with Generated Outfit */}
              <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-green-200 overflow-hidden">
                <div className="bg-black text-white text-center py-2 font-black text-xl">FULL PHOTO</div>
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                  <img
                    src={generatedImageUrl}
                    alt="Generated outfit"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <div
                  className="flex-1 border-4 border-black p-3 bg-cyan-300 shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center"
                  onClick={handleDownload}
                >
                  <div className="flex items-center">
                    <Download className="mr-3 h-6 w-6 stroke-[3]" />
                    <p className="text-black font-black">DOWNLOAD</p>
                  </div>
                </div>
                <div
                  className="flex-1 border-4 border-black p-3 bg-green-300 shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center"
                  onClick={handleReset}
                >
                  <div className="flex items-center">
                    <RefreshCw className="mr-3 h-6 w-6 stroke-[3]" />
                    <p className="text-black font-black">START OVER</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
      </div>
    </main>
  );
}

