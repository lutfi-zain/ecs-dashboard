import { ECSClient } from "@aws-sdk/client-ecs"

// AWS Configuration with credential validation
const validateAWSCredentials = () => {
  const requiredEnvVars = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key)

  if (missingVars.length > 0) {
    throw new Error(`Missing required AWS environment variables: ${missingVars.join(", ")}`)
  }

  return requiredEnvVars as Record<string, string>
}

// Create ECS client with explicit credentials
export const createECSClient = () => {
  try {
    const credentials = validateAWSCredentials()

    return new ECSClient({
      region: credentials.AWS_REGION,
      credentials: {
        accessKeyId: credentials.AWS_ACCESS_KEY_ID,
        secretAccessKey: credentials.AWS_SECRET_ACCESS_KEY,
      },
    })
  } catch (error) {
    console.error("Failed to create ECS client:", error)
    throw error
  }
}

// Test AWS connection
export const testAWSConnection = async () => {
  try {
    const client = createECSClient()
    const { DescribeClustersCommand } = await import("@aws-sdk/client-ecs")

    // Test with a simple describe clusters call
    await client.send(new DescribeClustersCommand({}))

    return {
      success: true,
      message: "AWS connection successful",
      region: process.env.AWS_REGION,
    }
  } catch (error) {
    console.error("AWS connection test failed:", error)

    let errorMessage = "Unknown AWS connection error"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      message: errorMessage,
      region: process.env.AWS_REGION,
    }
  }
}
