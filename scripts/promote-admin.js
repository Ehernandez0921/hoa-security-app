#!/usr/bin/env node

/**
 * Script to promote a user to SYSTEM_ADMIN role
 * 
 * Usage:
 * node promote-admin.js user@example.com your-setup-secret
 */

// Use node-fetch which needs to be installed
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Get arguments from command line
const [email, secret] = process.argv.slice(2);

if (!email || !secret) {
  console.error('Please provide both email and setup secret');
  console.error('Usage: node promote-admin.js user@example.com your-setup-secret');
  process.exit(1);
}

async function promoteToAdmin(email, secret) {
  try {
    console.log(`Promoting ${email} to SYSTEM_ADMIN...`);
    
    const response = await fetch('http://localhost:3000/apis/admin/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: email,
        secret: secret
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error(`Error: ${result.error || response.statusText}`);
      process.exit(1);
    }
    
    console.log(`✅ Success: ${result.message}`);
    console.log('User details:');
    console.log(`- ID: ${result.user.id}`);
    console.log(`- Email: ${result.user.email}`);
    console.log(`- Role: ${result.user.role}`);
    console.log(`- Status: ${result.user.status}`);
    
  } catch (error) {
    console.error('Error promoting user:', error.message);
    process.exit(1);
  }
}

promoteToAdmin(email, secret); 