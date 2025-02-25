#!/usr/bin/env node

/**
 * Simple utility to generate secure random strings for Payload CMS secrets
 * Run with: node generate-secrets.js
 */

const crypto = require("crypto");

function generateSecureString(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

console.log("\n=== Payload CMS Secrets ===\n");
console.log(`PAYLOAD_SECRET=${generateSecureString(32)}`);
console.log(`CRON_SECRET=${generateSecureString(24)}`);
console.log(`PREVIEW_SECRET=${generateSecureString(24)}`);
console.log("\nCopy these to your .env.local file for local development");
console.log(
  "And add them to your Vercel environment variables for production\n"
);
