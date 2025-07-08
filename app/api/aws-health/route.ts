export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { testAWSConnection } from "@/lib/aws-config"

export async function GET() {
  try {
    const connectionTest = await testAWSConnection()

    if (connectionTest.success) {
      return NextResponse.json({
        status: "healthy",
        message: connectionTest.message,
        region: connectionTest.region,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          status: "unhealthy",
          message: connectionTest.message,
          region: connectionTest.region,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("AWS health check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "AWS health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
