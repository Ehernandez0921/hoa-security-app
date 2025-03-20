/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  env: {
    // Make sure the Supabase service role key is available to server-side code
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  // Ensure the service role key is securely only available on the server
  serverRuntimeConfig: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  // Public runtime config contains browser-visible environment variables
  publicRuntimeConfig: {
    // Add any public variables here if needed
  },
};

module.exports = nextConfig;
