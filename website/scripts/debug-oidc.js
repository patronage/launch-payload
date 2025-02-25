// debug-oidc.js
import jwt from 'jsonwebtoken'
import { execSync } from 'child_process'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

// Get the token from environment
const token = process.env.VERCEL_OIDC_TOKEN

if (!token) {
  console.error('VERCEL_OIDC_TOKEN not found! Make sure to run "vercel env pull" first.')
  process.exit(1)
}

// Decode the JWT (without verification)
try {
  // Split the token and decode the payload part (second part)
  const parts = token.split('.')
  if (parts.length !== 3) {
    console.error('Invalid JWT format')
    process.exit(1)
  }

  const payload = Buffer.from(parts[1], 'base64').toString('utf8')
  const claims = JSON.parse(payload)

  console.log('OIDC Token Claims:')
  console.log(JSON.stringify(claims, null, 2))

  // Check for the critical claims needed by your trust policy
  console.log('\nVerifying against Trust Policy Requirements:')
  console.log(`Audience (aud): ${claims.aud}`)
  console.log(`Subject (sub): ${claims.sub}`)

  // Check if the token matches your policy conditions
  const expectedAud = 'https://vercel.com/patronage'
  const expectedSubPatterns = [
    'owner:patronage:project:launch-payload:environment:production',
    'owner:patronage:project:launch-payload:environment:preview',
    'owner:patronage:project:launch-payload:environment:development',
  ]

  const audMatch = claims.aud === expectedAud
  const subMatch = expectedSubPatterns.some(
    (pattern) =>
      claims.sub === pattern ||
      (pattern.includes('*') &&
        new RegExp('^' + pattern.replace('*', '.*') + '$').test(claims.sub)),
  )

  console.log('\nTrust Policy Compatibility:')
  console.log(`Audience match: ${audMatch ? '✅' : '❌'}`)
  console.log(`Subject match: ${subMatch ? '✅' : '❌'}`)

  if (!audMatch || !subMatch) {
    console.log('\n❌ Token claims do NOT match trust policy requirements!')

    if (!audMatch) {
      console.log(`Expected aud: "${expectedAud}"`)
      console.log(`Actual aud: "${claims.aud}"`)
    }

    if (!subMatch) {
      console.log(`Expected sub patterns: ${JSON.stringify(expectedSubPatterns)}`)
      console.log(`Actual sub: "${claims.sub}"`)
    }
  } else {
    console.log('\n✅ Token claims match trust policy requirements!')
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = claims.exp - now
  console.log(`\nToken expires in: ${expiresIn} seconds (${Math.floor(expiresIn / 60)} minutes)`)

  if (expiresIn <= 0) {
    console.log('❌ Token is EXPIRED! Run "vercel env pull --force" to refresh.')
  }
} catch (error) {
  console.error('Error decoding token:', error)
}

// Test with AWS CLI if requested
if (process.argv.includes('--test-aws')) {
  console.log('\nTesting AWS STS AssumeRoleWithWebIdentity:')
  try {
    const result = execSync(
      `
      aws sts assume-role-with-web-identity \
        --role-arn arn:aws:iam::075360401050:role/vercel-rds \
        --role-session-name local-debug \
        --web-identity-token $VERCEL_OIDC_TOKEN
    `,
      { encoding: 'utf8' },
    )

    console.log('✅ Successfully assumed role!')
    const credentials = JSON.parse(result)
    console.log('Temporary credentials received:')
    console.log('AccessKeyId:', credentials.Credentials.AccessKeyId)
    console.log('Expiration:', credentials.Credentials.Expiration)
  } catch (error) {
    console.log('❌ Failed to assume role:')
    console.error(error.stderr || error.message)
  }
}
