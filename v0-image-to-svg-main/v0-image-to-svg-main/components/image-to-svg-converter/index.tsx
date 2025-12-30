"use client"

import { useState, useEffect } from "react"
import { ImageUploader } from "@/components/image-uploader"
import { SvgPreview } from "@/components/svg-preview"
import { convertImageToSvg } from "@/lib/api"
import { useSettingsStore } from "@/lib/settings-store"
import { Download, RefreshCw, Sparkles } from "lucide-react"
import type { Props } from "./types"

// Add a global reset function that can be called from outside
declare global {
  interface Window {
    imageToSvgReset?: () => void
  }
}

export function ImageToSvgConverter({ className, onImageStateChange }: Props) {
  const [isConverting, setIsConverting] = useState(false)
  const [topImage, setTopImage] = useState<{ file: File; preview: string } | null>(null)
  const [bottomImage, setBottomImage] = useState<{ file: File; preview: string } | null>(null)
  const [fullImage, setFullImage] = useState<{ file: File; preview: string } | null>(null)
  const [svgData, setSvgData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const { getApiMode } = useSettingsStore()

  useEffect(() => {
    window.imageToSvgReset = handleReset
    return () => {
      delete window.imageToSvgReset
    }
  }, [])

  useEffect(() => {
    if (onImageStateChange) {
      const hasImages = !!topImage || !!bottomImage || !!fullImage
      onImageStateChange(hasImages, !!svgData, svgData ? handleDownload : null)
    }
  }, [topImage, bottomImage, fullImage, svgData, onImageStateChange])

  const handleTopImageUpload = (file: File, preview: string) => {
    setTopImage({ file, preview })
    setError(null)
  }

  const handleBottomImageUpload = (file: File, preview: string) => {
    setBottomImage({ file, preview })
    setError(null)
  }

  const handleFullImageUpload = (file: File, preview: string) => {
    setFullImage({ file, preview })
    setError(null)

    const img = new Image()
    img.onload = () => {
      setImageDimensions({
        width: img.width,
        height: img.height,
      })
    }
    img.src = preview
  }

  const handleGenerate = async () => {
    if (!fullImage) {
      setError("Please upload a full photo")
      return
    }

    try {
      setIsConverting(true)
      setError(null)
      const svg = await convertImageToSvg(fullImage.file, getApiMode())
      setSvgData(svg)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert image to SVG")
    } finally {
      setIsConverting(false)
    }
  }

  const handleDownload = () => {
    if (!svgData || !fullImage) return

    const blob = new Blob([svgData], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fullImage.file.name.split(".")[0] || "image"}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setTopImage(null)
    setBottomImage(null)
    setFullImage(null)
    setSvgData(null)
    setError(null)
    setImageDimensions(null)
  }

  if (!topImage && !bottomImage && !fullImage) {
    return (
      <div className={`w-full max-w-7xl mx-auto ${className}`}>
        <ImageUploader onImageUpload={handleFullImageUpload} />
      </div>
    )
  }

  const imageContainerStyle = {
    height: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  }

  const smallImageContainerStyle = {
    height: "200px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  }

  return (
    <div className={`w-full max-w-7xl mx-auto ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="flex flex-col gap-4">
          {/* Top Image Upload */}
          {!topImage ? (
            <div
              className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-purple-300 text-center cursor-pointer flex flex-col items-center justify-center"
              style={smallImageContainerStyle}
              onClick={() => document.getElementById("top-input")?.click()}
            >
              <input
                id="top-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (evt) => {
                      const preview = evt.target?.result as string
                      handleTopImageUpload(file, preview)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
              <p className="text-lg font-black text-black">+ TOP IMAGE</p>
            </div>
          ) : (
            <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-purple-200 overflow-hidden">
              <div className="bg-black text-white text-center py-2 font-black">TOP IMAGE</div>
              <div style={smallImageContainerStyle} className="p-4">
                <img
                  src={topImage.preview || "/placeholder.svg"}
                  alt="Top"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <button
                onClick={() => setTopImage(null)}
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
              style={smallImageContainerStyle}
              onClick={() => document.getElementById("bottom-input")?.click()}
            >
              <input
                id="bottom-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (evt) => {
                      const preview = evt.target?.result as string
                      handleBottomImageUpload(file, preview)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
              <p className="text-lg font-black text-black">+ BOTTOM IMAGE</p>
            </div>
          ) : (
            <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-orange-200 overflow-hidden">
              <div className="bg-black text-white text-center py-2 font-black">BOTTOM IMAGE</div>
              <div style={smallImageContainerStyle} className="p-4">
                <img
                  src={bottomImage.preview || "/placeholder.svg"}
                  alt="Bottom"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <button
                onClick={() => setBottomImage(null)}
                className="w-full bg-red-300 hover:bg-red-400 border-t-4 border-black p-2 font-black text-sm"
              >
                REMOVE
              </button>
            </div>
          )}
        </div>

        <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
          {/* Full Photo Upload */}
          {!fullImage ? (
            <div
              className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-green-300 text-center cursor-pointer flex flex-col items-center justify-center"
              style={imageContainerStyle}
              onClick={() => document.getElementById("full-input")?.click()}
            >
              <input
                id="full-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (evt) => {
                      const preview = evt.target?.result as string
                      handleFullImageUpload(file, preview)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
              <p className="text-xl font-black text-black">+ UPLOAD PHOTO</p>
              <p className="text-sm font-bold text-black mt-2">JPG, PNG, WebP, GIF</p>
            </div>
          ) : (
            <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-green-200 overflow-hidden">
              <div className="bg-black text-white text-center py-2 font-black text-xl">FULL PHOTO</div>
              <div style={imageContainerStyle} className="p-4">
                <img
                  src={fullImage.preview || "/placeholder.svg"}
                  alt="Full"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          {fullImage && (
            <div
              className="w-full border-4 border-black p-4 bg-yellow-300 shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center"
              onClick={handleGenerate}
            >
              <div className="flex items-center">
                <Sparkles className="mr-3 h-6 w-6 stroke-[3]" />
                <p className="text-black font-black text-xl">GENERATE SVG</p>
              </div>
            </div>
          )}

          {/* SVG Result */}
          <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-blue-200 overflow-hidden">
            <div className="bg-black text-white text-center py-2 font-black text-xl">SVG RESULT</div>
            <div style={imageContainerStyle} className="p-4">
              {svgData ? (
                <SvgPreview
                  svgData={svgData}
                  originalWidth={imageDimensions?.width}
                  originalHeight={imageDimensions?.height}
                />
              ) : (
                <div className="flex items-center justify-center">
                  {isConverting ? (
                    <div className="text-center">
                      <div className="inline-block border-4 border-black p-3 bg-yellow-300 shadow-[5px_5px_0px_0px_rgba(0,0,0)] animate-pulse">
                        <p className="text-black font-black text-xl">CONVERTING...</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-black font-bold">SVG will appear here</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Download and Reset Buttons */}
          <div className="flex gap-4">
            {svgData && (
              <div
                className="flex-1 border-4 border-black p-3 bg-cyan-300 shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center"
                onClick={handleDownload}
              >
                <div className="flex items-center">
                  <Download className="mr-3 h-6 w-6 stroke-[3]" />
                  <p className="text-black font-black">DOWNLOAD SVG</p>
                </div>
              </div>
            )}
            <div
              className={`${svgData ? "flex-1" : "w-full"} border-4 border-black p-3 bg-green-300 shadow-[8px_8px_0px_0px_rgba(0,0,0)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex justify-center items-center`}
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
    </div>
  )
}
