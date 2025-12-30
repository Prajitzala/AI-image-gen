import { type NextRequest, NextResponse } from "next/server"
import { deleteImage } from "@/lib/vectorizer-api"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageToken = formData.get("image.token") as string

    if (!imageToken) {
      return NextResponse.json({ error: "No image token provided" }, { status: 400 })
    }

    const username = process.env.VECTORIZER_API_USERNAME
    const password = process.env.VECTORIZER_API_PASSWORD

    if (!username || !password) {
      return NextResponse.json({ error: "API credentials not configured" }, { status: 500 })
    }

    // Call the Vectorizer API using our utility function
    const success = await deleteImage(imageToken, { username, password })

    return NextResponse.json({ success })
  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete image",
      },
      { status: 500 },
    )
  }
}
