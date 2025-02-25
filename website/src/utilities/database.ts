// utils/database.ts
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { Signer } from '@aws-sdk/rds-signer'

type PostgresConfig =
  | {
      connectionString?: string
    }
  | {
      host: string
      port: number
      database: string
      user: string
      password: string | (() => Promise<string>)
      ssl: boolean
    }

// Get database connection configuration
export const getDatabaseConfig = (): PostgresConfig => {
  // Use connection string for local development with Docker
  if (process.env.DATABASE_URI) {
    return {
      connectionString: process.env.DATABASE_URI,
    }
  }

  // Use AWS RDS with OIDC for production/remote
  const RDS_PORT = parseInt(process.env.RDS_PORT || '5432')
  const RDS_HOSTNAME = process.env.RDS_HOSTNAME || ''
  const RDS_USERNAME = process.env.RDS_USERNAME || ''
  const RDS_DATABASE = process.env.RDS_DATABASE || ''
  const AWS_REGION = process.env.AWS_REGION || ''
  const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN || ''

  // Initialize the RDS Signer for production
  const signer = new Signer({
    credentials: awsCredentialsProvider({
      roleArn: AWS_ROLE_ARN,
    }),
    region: AWS_REGION,
    port: RDS_PORT,
    hostname: RDS_HOSTNAME,
    username: RDS_USERNAME,
  })

  return {
    host: RDS_HOSTNAME,
    port: RDS_PORT,
    database: RDS_DATABASE,
    user: RDS_USERNAME,
    password: signer.getAuthToken,
    ssl: true,
  }
}
