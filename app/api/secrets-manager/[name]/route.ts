export const runtime = "nodejs"
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'ap-southeast-3',
})

// GET - Get secret value
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const secretName = decodeURIComponent(params.name)

    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await client.send(command)

    let value: string | Record<string, any> = response.SecretString || ''

    // Try to parse as JSON
    try {
      if (typeof value === 'string' && value.trim().startsWith('{')) {
        value = JSON.parse(value)
      }
    } catch {
      // Keep as string if not valid JSON
    }

    return NextResponse.json({
      success: true,
      data: {
        name: response.Name || secretName,
        value,
        versionId: response.VersionId,
        createdDate: response.CreatedDate?.toISOString(),
      },
    })
  } catch (error: any) {
    console.error(`Error getting secret ${params.name}:`, error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get secret' },
      { status: 500 }
    )
  }
}

// PUT - Update secret value
export async function PUT(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const secretName = decodeURIComponent(params.name)
    const body = await request.json()
    const { value } = body

    if (value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Value is required' },
        { status: 400 }
      )
    }

    const secretString = typeof value === 'string' ? value : JSON.stringify(value)

    const command = new PutSecretValueCommand({
      SecretId: secretName,
      SecretString: secretString,
    })

    const response = await client.send(command)

    return NextResponse.json({
      success: true,
      data: {
        arn: response.ARN || '',
        name: response.Name || secretName,
        versionId: response.VersionId || '',
      },
    })
  } catch (error: any) {
    console.error(`Error updating secret ${params.name}:`, error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update secret' },
      { status: 500 }
    )
  }
}

// DELETE - Delete secret
export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const secretName = decodeURIComponent(params.name)
    const { searchParams } = new URL(request.url)
    const recoveryWindowInDays = Number.parseInt(searchParams.get('recoveryWindowInDays') || '30')

    const command = new DeleteSecretCommand({
      SecretId: secretName,
      RecoveryWindowInDays: recoveryWindowInDays,
    })

    const response = await client.send(command)

    return NextResponse.json({
      success: true,
      data: {
        arn: response.ARN || '',
        name: response.Name || secretName,
        deletionDate: response.DeletionDate?.toISOString(),
      },
    })
  } catch (error: any) {
    console.error(`Error deleting secret ${params.name}:`, error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete secret' },
      { status: 500 }
    )
  }
}
