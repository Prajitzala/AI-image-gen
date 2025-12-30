import { type NextRequest, NextResponse } from "next/server"
import { getAccountStatus } from "@/lib/vectorizer-api"

export async function GET(request: NextRequest) {
  try {
    const username = process.env.VECTORIZER_API_USERNAME
    const password = process.env.VECTORIZER_API_PASSWORD

    if (!username || !password) {
      return NextResponse.json({ error: "API credentials not configured" }, { status: 500 })
    }

    // Call the Vectorizer API using our utility function
    const accountStatus = await getAccountStatus({ username, password })

    return NextResponse.json(accountStatus)
  } catch (error) {
    console.error("Error getting account status:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get account status",
      },
      { status: 500 },
    )
  }
}
