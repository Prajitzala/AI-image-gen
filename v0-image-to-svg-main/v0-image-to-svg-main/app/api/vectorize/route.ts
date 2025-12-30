import { type NextRequest, NextResponse } from "next/server"
import { vectorizeImage } from "@/lib/vectorizer-api"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const mode = (formData.get("mode") as string) || "test"
    const maxColors = formData.get("processing.max_colors") as string | null
    const retentionDays = formData.get("policy.retention_days") as string | null
    const palette = formData.get("processing.palette") as string | null
    const minAreaPx = formData.get("processing.shapes.min_area_px") as string | null
    const fileFormat = formData.get("output.file_format") as string | null

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const username = process.env.VECTORIZER_API_USERNAME
    const password = process.env.VECTORIZER_API_PASSWORD

    if (!username || !password) {
      return NextResponse.json({ error: "API credentials not configured" }, { status: 500 })
    }

    // Call the Vectorizer API using our utility function
    const { data: svgData, headers } = await vectorizeImage(
      imageFile,
      {
        mode,
        maxColors: maxColors ? Number.parseInt(maxColors) : undefined,
        retentionDays: retentionDays ? Number.parseInt(retentionDays) : undefined,
        palette: palette || undefined,
        minAreaPx: minAreaPx ? Number.parseFloat(minAreaPx) : undefined,
        fileFormat: (fileFormat as any) || undefined,
      },
      { username, password },
    )

    // Create response with appropriate headers but without Content-Disposition
    const nextResponse = new NextResponse(svgData, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    })

    // Forward relevant headers from the API response
    const headersToForward = ["X-Image-Token", "X-Credits-Charged", "X-Credits-Calculated", "X-Receipt"]

    for (const header of headersToForward) {
      const value = headers.get(header)
      if (value) {
        nextResponse.headers.set(header, value)
      }
    }

    return nextResponse
  } catch (error) {
    console.error("Error processing image:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process image",
      },
      { status: 500 },
    )
  }
}
