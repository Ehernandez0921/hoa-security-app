#!/usr/bin/env node

/**
 * Script to apply Supabase migrations using environment variables from .env.local
 * 
 * Usage:
 * node scripts/apply-migrations.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  
  // Set environment variables
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
  
  console.log('Loaded environment variables from .env.local');
} else {
  console.warn('Warning: .env.local file not found');
}

// Check for required environment variables
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Extract project reference from SUPABASE_URL
// Format: https://[project-ref].supabase.co
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch ? projectRefMatch[1] : null;

if (!projectRef) {
  console.error('Error: Could not extract project reference from SUPABASE_URL');
  console.error('Expected format: https://[project-ref].supabase.co');
  process.exit(1);
}

console.log(`Using Supabase project reference: ${projectRef}`);

// Run Supabase commands
try {
  // Check if project is linked
  console.log('Checking project link status...');
  try {
    execSync('npx supabase projects list', { stdio: 'pipe' });
  } catch (error) {
    console.log('Not logged in. Logging in to Supabase...');
    // This will prompt for login in the terminal
    execSync('npx supabase login', { stdio: 'inherit' });
  }

  console.log(`Linking project ${projectRef}...`);
  execSync(`npx supabase link --project-ref ${projectRef}`, { stdio: 'inherit' });
  
  console.log('Pushing migrations...');
  execSync('npx supabase db push', { stdio: 'inherit' });
  
  console.log('✅ Migrations applied successfully!');
} catch (error) {
  console.error('Error applying migrations:', error.message);
  process.exit(1);
} 