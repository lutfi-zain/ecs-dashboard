export const runtime = "nodejs"
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import {
  SecretsManagerClient,
  ListSecretsCommand,
  CreateSecretCommand,
} from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'ap-southeast-3',
})

// GET - List all secrets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const maxResults = Number.parseInt(searchParams.get('maxResults') || '100')

    const command = new ListSecretsCommand({ MaxResults: maxResults })
    const response = await client.send(command)

    const secrets = (response.SecretList || []).map((secret) => ({
      arn: secret.ARN || '',
      name: secret.Name || '',
      description: secret.Description,
      lastChangedDate: secret.LastChangedDate?.toISOString(),
      lastAccessedDate: secret.LastAccessedDate?.toISOString(),
    }))

    return NextResponse.json({ success: true, data: secrets })
  } catch (error: any) {
    console.error('Error listing secrets:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list secrets' },
      { status: 500 }
    )
  }
}

// POST - Create new secret
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, value, description } = body

    if (!name || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name and value are required' },
        { status: 400 }
      )
    }

    const secretString = typeof value === 'string' ? value : JSON.stringify(value)

    const command = new CreateSecretCommand({
      Name: name,
      SecretString: secretString,
      Description: description,
    })

    const response = await client.send(command)

    return NextResponse.json({
      success: true,
      data: {
        arn: response.ARN || '',
        name: response.Name || name,
        versionId: response.VersionId || '',
      },
    })
  } catch (error: any) {
    console.error('Error creating secret:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create secret' },
      { status: 500 }
    )
  }
}
