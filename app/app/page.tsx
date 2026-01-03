'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/ImageUpload';
import Wardrobe from '@/components/Wardrobe';
import { UploadedImage, ClothingItem } from '@/lib/types';
import { fileToBase64, downloadImage, convertToWhiteBackgroundPNG, normalizePoseAPI, extractGarmentAPI } from '@/lib/utils';
import { config } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Loader2, Download, RefreshCw, User as UserIcon, X, LogOut } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [topImage, setTopImage] = useState<UploadedImage | null>(null);
  const [bottomImage, setBottomImage] = useState<UploadedImage | null>(null);
  const [personImage, setPersonImage] = useState<UploadedImage | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingPersonImage, setIsProcessingPersonImage] = useState(false);
  const [isProcessingTopImage, setIsProcessingTopImage] = useState(false);
  const [isProcessingBottomImage, setIsProcessingBottomImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [selectedTop, setSelectedTop] = useState<ClothingItem | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<ClothingItem | null>(null);

  useEffect(() => {
    if (!config.supabaseEnabled) {
      setIsCheckingAuth(false);
      return;
    }
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsCheckingAuth(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsCheckingAuth(false);
      
      // If no user and Supabase is enabled, redirect to sign-in
      if (!currentUser) {
        router.push('/sign-in?redirect=/app');
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // If user signs out, redirect to sign-in
      if (!currentUser && config.supabaseEnabled) {
        router.push('/sign-in?redirect=/app');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/');
  };

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
      // Convert clothing images to PNG with white background
      // This provides consistent context matching the final output style (white background)
      // Helps AI better understand clothing in a consistent visual environment
      const topConverted = await convertToWhiteBackgroundPNG(topImage.file);
      const bottomConverted = await convertToWhiteBackgroundPNG(bottomImage.file);
      
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

      // Safely parse JSON response
      let data: any;
      const contentType = response.headers.get('content-type');
      
      // Read response as text first so we can handle both JSON and non-JSON responses
      const text = await response.text();
      
      if (contentType && contentType.includes('application/json')) {
        try {
          // Try to parse as JSON
          data = JSON.parse(text);
        } catch (jsonError: any) {
          // If JSON parsing fails, throw error with the text content
          throw new Error(text || 'Invalid response from server');
        }
      } else {
        // If not JSON, throw error with text content
        throw new Error(text || `Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data?.error || `Failed to generate outfit: ${response.status} ${response.statusText}`);
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
    // personImage is preserved - only removed via REMOVE button
    setGeneratedImageUrl(null);
    setError(null);
  };

  const handleDownload = () => {
    if (generatedImageUrl) {
      downloadImage(generatedImageUrl, 'outfit.png');
    }
  };

  // Helper function to convert data URL to File
  const dataURLtoFile = async (dataUrl: string, filename: string): Promise<File> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    return new File([blob], filename, { type: mimeType });
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

  // Show loading state while checking authentication
  if (isCheckingAuth && config.supabaseEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </main>
    );
  }

  // If Supabase is enabled and no user, don't render (will redirect)
  if (config.supabaseEnabled && !user) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col dotted-background">
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="w-full max-w-5xl flex flex-col">
        {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="w-10 h-10"></div> {/* Placeholder for spacing */}
            <div className="w-10 h-10 flex justify-end">
              {config.supabaseEnabled && user && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowWardrobe(!showWardrobe)}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors border-2 border-black"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">My Wardrobe</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">{user.email}</span>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors border-2 border-black"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
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
                  className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white text-center cursor-pointer flex flex-col items-center justify-center"
                  style={{ height: '200px' }}
                  onClick={() => document.getElementById('top-input')?.click()}
                >
                  <input
                    id="top-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsProcessingTopImage(true);
                        setError(null);
                        try {
                          // Automatically extract garment from person image
                          const extractedImageUrl = await extractGarmentAPI(file, 'top');
                          // Convert data URL to File object
                          const processedFile = await dataURLtoFile(extractedImageUrl, file.name.replace(/\.[^/.]+$/, '') + '-extracted.png');
                          const preview = URL.createObjectURL(processedFile);
                          setTopImage({
                            file: processedFile,
                            preview,
                            name: processedFile.name,
                            size: processedFile.size,
                          });
                        } catch (error: any) {
                          console.error('Error extracting garment:', error);
                          setError(error.message || 'Failed to extract garment. Using original image.');
                          // Fallback to original file if extraction fails
                          const preview = URL.createObjectURL(file);
                          setTopImage({
                            file,
                            preview,
                            name: file.name,
                            size: file.size,
                          });
                        } finally {
                          setIsProcessingTopImage(false);
                        }
                      }
                    }}
                  />
                  <p className="text-lg font-black text-black">+ TOP IMAGE</p>
                </div>
              ) : (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white overflow-hidden">
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
                    className="w-full bg-white hover:bg-gray-100 border-t-4 border-black p-2 font-black text-sm"
                  >
                    REMOVE
                  </button>
                </div>
              )}

              {/* Bottom Image Upload */}
              {!bottomImage ? (
                <div
                  className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white text-center cursor-pointer flex flex-col items-center justify-center"
                  style={{ height: '200px' }}
                  onClick={() => document.getElementById('bottom-input')?.click()}
                >
                  <input
                    id="bottom-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsProcessingBottomImage(true);
                        setError(null);
                        try {
                          // Automatically extract garment from person image
                          const extractedImageUrl = await extractGarmentAPI(file, 'bottom');
                          // Convert data URL to File object
                          const processedFile = await dataURLtoFile(extractedImageUrl, file.name.replace(/\.[^/.]+$/, '') + '-extracted.png');
                          const preview = URL.createObjectURL(processedFile);
                          setBottomImage({
                            file: processedFile,
                            preview,
                            name: processedFile.name,
                            size: processedFile.size,
                          });
                        } catch (error: any) {
                          console.error('Error extracting garment:', error);
                          setError(error.message || 'Failed to extract garment. Using original image.');
                          // Fallback to original file if extraction fails
                          const preview = URL.createObjectURL(file);
                          setBottomImage({
                            file,
                            preview,
                            name: file.name,
                            size: file.size,
                          });
                        } finally {
                          setIsProcessingBottomImage(false);
                        }
                      }
                    }}
                  />
                  <p className="text-lg font-black text-black">+ BOTTOM IMAGE</p>
                </div>
              ) : (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white overflow-hidden">
                  <div className="bg-black text-white text-center py-2 font-black">BOTTOM IMAGE</div>
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                    {isProcessingBottomImage ? (
                      <div className="text-center">
                        <div className="inline-block border-4 border-black p-3 bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0)] animate-pulse">
                          <p className="text-black font-black text-sm">EXTRACTING GARMENT...</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={bottomImage.preview}
                        alt="Bottom"
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (bottomImage?.preview) {
                        URL.revokeObjectURL(bottomImage.preview);
                      }
                      setBottomImage(null);
                    }}
                    className="w-full bg-white hover:bg-gray-100 border-t-4 border-black p-2 font-black text-sm"
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
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white overflow-hidden">
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
                  className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white text-center cursor-pointer flex flex-col items-center justify-center"
                  style={{ height: '300px' }}
                  onClick={() => document.getElementById('full-input')?.click()}
                >
                  <input
                    id="full-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsProcessingPersonImage(true);
                        setError(null);
                        try {
                          // Normalize pose of person photo using Gemini API with white background
                          const imageUrl = await normalizePoseAPI(file);
                          // Convert data URL to File object
                          const processedFile = await dataURLtoFile(imageUrl, file.name.replace(/\.[^/.]+$/, '') + '-white-bg.png');
                          const preview = URL.createObjectURL(processedFile);
                          setPersonImage({
                            file: processedFile,
                            preview,
                            name: processedFile.name,
                            size: processedFile.size,
                          });
                        } catch (error: any) {
                          console.error('Error processing person image:', error);
                          setError(error.message || 'Failed to normalize pose. Please try again.');
                          // Fallback to original file if processing fails
                          const preview = URL.createObjectURL(file);
                          setPersonImage({
                            file,
                            preview,
                            name: file.name,
                            size: file.size,
                          });
                        } finally {
                          setIsProcessingPersonImage(false);
                        }
                      }
                    }}
                  />
                  <p className="text-xl font-black text-black">+ UPLOAD PHOTO</p>
                  <p className="text-sm font-bold text-black mt-2">JPG, PNG, WebP, GIF</p>
                </div>
              ) : (
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white overflow-hidden">
                  <div className="bg-black text-white text-center py-2 font-black text-xl">FULL PHOTO</div>
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} className="p-4">
                    {isProcessingPersonImage ? (
                      <div className="text-center">
                        <div className="inline-block border-4 border-black p-3 bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0)] animate-pulse">
                          <p className="text-black font-black text-xl">REMOVING BACKGROUND...</p>
                        </div>
                      </div>
                    ) : isGenerating ? (
                      <div className="text-center">
                        <div className="inline-block border-4 border-black p-3 bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0)] animate-pulse">
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
                    className="w-full bg-white hover:bg-gray-100 border-t-4 border-black p-2 font-black text-sm"
                  >
                    REMOVE
                  </button>
                </div>
              )}

              {/* Generate Button */}
              {!generatedImageUrl && personImage && topImage && bottomImage && (
                <div
                  className="w-full border-4 border-black p-4 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex-1 border-4 border-black p-3 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center"
                    onClick={handleDownload}
                  >
                    <div className="flex items-center">
                      <Download className="mr-3 h-6 w-6 stroke-[3]" />
                      <p className="text-black font-black">DOWNLOAD</p>
                    </div>
                  </div>
                )}
                <div
                  className={`${generatedImageUrl ? 'flex-1' : 'w-full'} border-4 border-black p-3 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center`}
                  onClick={handleReset}
                >
                  <div className="flex items-center">
                    <RefreshCw className="mr-3 h-6 w-6 stroke-[3]" />
                    <p className="text-black font-black">START OVER</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 border-4 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0)] bg-white text-black font-black">
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
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white overflow-hidden">
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
                <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white overflow-hidden">
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
              <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white overflow-hidden">
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
                  className="flex-1 border-4 border-black p-3 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center"
                  onClick={handleDownload}
                >
                  <div className="flex items-center">
                    <Download className="mr-3 h-6 w-6 stroke-[3]" />
                    <p className="text-black font-black">DOWNLOAD</p>
                  </div>
                </div>
                <div
                  className="flex-1 border-4 border-black p-3 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center"
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

