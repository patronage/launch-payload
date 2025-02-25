## Local Database

### DB Push

Database schema migrations are disabled by default for safety. To enable automatic schema migrations:

1. For local development, add `DB_PUSH=true` to your `.env.local` file
2. For CI/CD or initial deployment, set the `DB_PUSH` environment variable to `true` temporarily
3. For production, keep `DB_PUSH` unset or set to `false` to prevent automatic schema changes

## Production Database

Depending on the project, we'll use either AWS or Supabase for our database. This repo has utilities for connecting to the database in both cases, and pulling data down for local dev that mirrors production.

### AWS

We use Vercel's OIDC provider to assume a role in AWS and connect as outlined here:

https://vercel.com/docs/security/secure-backend-access/oidc
https://vercel.com/docs/security/secure-backend-access/oidc/aws

### Supabase

TODO.
