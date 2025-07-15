import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { secretKey, userId } = await request.json()

    // Verify secret key
    if (secretKey !== process.env.MAIN_ORGANIZER_SECRET_KEY) {
      return NextResponse.json({ error: "Invalid secret key" }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Use server client to update user role
    const supabase = createServerClient()

    const { error } = await supabase.from("profiles").update({ role: "main_organizer" }).eq("id", userId)

    if (error) {
      console.error("Error promoting user:", error)
      return NextResponse.json({ error: "Failed to promote user" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "User promoted to main organizer" })
  } catch (error) {
    console.error("Error in promote-to-main API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
