import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { Signer } from '@aws-sdk/rds-signer'
import { Pool } from 'pg'
import type { PoolClient } from 'pg'

// Export the route handler
export async function GET() {
  const RDS_PORT = parseInt(process.env.RDS_PORT!)
  const RDS_HOSTNAME = process.env.RDS_HOSTNAME!
  const RDS_DATABASE = process.env.RDS_DATABASE!
  const RDS_USERNAME = process.env.RDS_USERNAME!
  const RDS_CA_PEM = process.env.RDS_CA_PEM!
  const AWS_REGION = process.env.AWS_REGION!
  const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN!

  // Add debugging info
  console.log('Connecting with:', {
    hostname: RDS_HOSTNAME,
    port: RDS_PORT,
    database: RDS_DATABASE,
    username: RDS_USERNAME,
    region: AWS_REGION,
    roleArn: AWS_ROLE_ARN?.replace(/(\d{6})\d{6}(\d{2})/, '$1******$2'), // Mask the middle of ARN
  })

  try {
    // Initialize the OIDC credentials provider
    const credentialsProvider = awsCredentialsProvider({
      roleArn: AWS_ROLE_ARN,
    })

    // Debug the credentials
    try {
      const credentials = await credentialsProvider()
      console.log('Credentials obtained:', {
        accessKeyId: credentials.accessKeyId?.substring(0, 5) + '...',
        expiration: credentials.expiration,
        hasSecretKey: !!credentials.secretAccessKey,
      })
    } catch (credError) {
      console.error('Error getting credentials:', credError)
      return Response.json({ error: 'Failed to obtain AWS credentials' }, { status: 500 })
    }

    // Initialize the RDS Signer
    const signer = new Signer({
      credentials: credentialsProvider,
      region: AWS_REGION,
      port: RDS_PORT,

      hostname: RDS_HOSTNAME,
      username: RDS_USERNAME,
    })

    // Get the auth token for debugging
    try {
      const token = await signer.getAuthToken()
      console.log(
        'Auth token obtained successfully (first 10 chars):',
        token.substring(0, 10) + '...',
      )
    } catch (tokenError) {
      console.error('Error getting auth token:', tokenError)
      return Response.json({ error: 'Failed to obtain RDS auth token' }, { status: 500 })
    }

    // Initialize the Postgres Pool
    const pool = new Pool({
      password: signer.getAuthToken,
      user: RDS_USERNAME,
      host: RDS_HOSTNAME,
      database: RDS_DATABASE,
      port: RDS_PORT,
      // Add connection timeout for faster debugging
      connectionTimeoutMillis: 10000,
    })

    // Debug DNS resolution
    console.log(`Attempting to connect to ${RDS_HOSTNAME}:${RDS_PORT}`)

    // Connect with proper error handling
    let client
    try {
      client = await pool.connect()
      console.log('Connected successfully to database')
      const { rows } = await client.query('SELECT current_database() as db')
      return Response.json({ status: 'connected', database: rows[0].db })
    } catch (dbError: unknown) {
      console.error('Database connection error:', dbError)
      const error = dbError as { message?: string; code?: string }
      return Response.json(
        {
          error: 'Database connection failed',
          details: error.message || 'Unknown error',
          code: error.code,
        },
        { status: 500 },
      )
    } finally {
      if (client) client.release()
    }
  } catch (error: unknown) {
    console.error('Unexpected error:', error)
    return Response.json(
      {
        error: 'Server error',
        details: (error as { message?: string }).message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
