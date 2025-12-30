import { type NextRequest, NextResponse } from "next/server"
import { downloadVector } from "@/lib/vectorizer-api"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageToken = formData.get("image.token") as string
    const receipt = formData.get("receipt") as string | null
    const fileFormat = (formData.get("output.file_format") as string) || "svg"

    if (!imageToken) {
      return NextResponse.json({ error: "No image token provided" }, { status: 400 })
    }

    const username = process.env.VECTORIZER_API_USERNAME
    const password = process.env.VECTORIZER_API_PASSWORD

    if (!username || !password) {
      return NextResponse.json({ error: "API credentials not configured" }, { status: 500 })
    }

    // Call the Vectorizer API using our utility function
    const { data: responseData, headers } = await downloadVector(
      {
        imageToken,
        receipt: receipt || undefined,
        fileFormat: fileFormat as any,
      },
      { username, password },
    )

    // Determine content type based on file format
    let contentType = "image/svg+xml"
    switch (fileFormat) {
      case "pdf":
        contentType = "application/pdf"
        break
      case "eps":
        contentType = "application/postscript"
        break
      case "dxf":
        contentType = "application/dxf"
        break
      case "png":
        contentType = "image/png"
        break
    }

    // Create response with appropriate headers - removed Content-Disposition to prevent auto-download
    const nextResponse = new NextResponse(responseData, {
      headers: {
        "Content-Type": contentType,
      },
    })

    // Forward relevant headers from the API response
    const headersToForward = ["X-Credits-Charged", "X-Credits-Calculated", "X-Receipt"]

    for (const header of headersToForward) {
      const value = headers.get(header)
      if (value) {
        nextResponse.headers.set(header, value)
      }
    }

    return nextResponse
  } catch (error) {
    console.error("Error downloading vectorized image:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to download vectorized image",
      },
      { status: 500 },
    )
  }
}
