import { ECSClient } from "@aws-sdk/client-ecs"
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch"
import { fromIni } from "@aws-sdk/credential-providers"

// AWS Configuration with flexible credential handling
export const getAWSConfig = () => {
  // Try to get region from environment variables first
  const region = process.env.AWS_REGION || 
                process.env.AWS_DEFAULT_REGION || 
                "ap-southeast-3" // Use your AWS CLI region as default
  
  // Check if explicit credentials are provided via environment variables
  const hasExplicitCredentials = 
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY

  if (hasExplicitCredentials) {
    // Use explicit credentials
    console.log(`Using explicit credentials (region: ${region})`)
    return {
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }
  } else {
    // Use AWS credential chain (AWS CLI, IAM roles, etc.)
    console.log(`Using AWS credential chain (region: ${region})`)
    return {
      region,
      credentials: fromIni(), // Use AWS CLI credentials
    }
  }
}

// Create ECS client with flexible credential handling
export const createECSClient = () => {
  try {
    const config = getAWSConfig()
    return new ECSClient(config)
  } catch (error) {
    console.error("Failed to create ECS client:", error)
    throw error
  }
}

// Create CloudWatch client with flexible credential handling
export const createCloudWatchClient = () => {
  try {
    const config = getAWSConfig()
    return new CloudWatchClient(config)
  } catch (error) {
    console.error("Failed to create CloudWatch client:", error)
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

    const config = getAWSConfig()
    return {
      success: true,
      message: "AWS connection successful",
      region: config.region,
      credentialSource: config.credentials ? "Environment Variables" : "AWS Credential Chain (CLI/IAM)",
    }
  } catch (error) {
    console.error("AWS connection test failed:", error)

    let errorMessage = "Unknown AWS connection error"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    const config = getAWSConfig()
    return {
      success: false,
      message: errorMessage,
      region: config.region,
      credentialSource: config.credentials ? "Environment Variables" : "AWS Credential Chain (CLI/IAM)",
    }
  }
}
