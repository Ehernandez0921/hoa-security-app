#!/bin/bash

# Exit on error
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Gate Security App - Database Seed Script${NC}"
echo "This script will apply seed data directly to your Supabase database."
echo

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not available. Please install PostgreSQL client tools.${NC}"
    echo "On Ubuntu, you can install it with: sudo apt-get install postgresql-client"
    exit 1
fi

# Extract project reference from NEXT_PUBLIC_SUPABASE_URL in .env.local
# The URL format is typically: https://[project-ref].supabase.co
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}Error: Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local${NC}"
    echo "Please ensure your .env.local file contains NEXT_PUBLIC_SUPABASE_URL=your-project-url"
    exit 1
fi

# Extract project reference from URL
# Remove https:// prefix if present
SUPABASE_URL=${SUPABASE_URL#https://}
# Get the part before .supabase.co
PROJECT_REF=$(echo "$SUPABASE_URL" | cut -d '.' -f1)

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}Error: Could not extract project reference from URL: $SUPABASE_URL${NC}"
    echo "Expected format: https://[project-ref].supabase.co"
    exit 1
fi

echo -e "${GREEN}Using project reference: $PROJECT_REF${NC}"

# Ask for database password
echo -e "${YELLOW}Please enter your database password:${NC}"
read -sp "Database password: " DB_PASSWORD
echo

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Error: No password provided. Cannot seed the database.${NC}"
    exit 1
fi

# Construct the connection string
DB_CONNECTION="postgres://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Check which seed file to use
SEED_FILE="supabase/seed.sql"
if [ ! -f "$SEED_FILE" ]; then
    echo -e "${RED}Error: Seed file not found: $SEED_FILE${NC}"
    echo "Please make sure the seed file exists."
    exit 1
fi

echo -e "${GREEN}Running seed file: $SEED_FILE${NC}"
echo -e "${GREEN}Connecting to remote database...${NC}"

# Run the seed file against the remote database
PGPASSWORD="$DB_PASSWORD" psql "$DB_CONNECTION" -f "$SEED_FILE"

echo -e "${GREEN}Database seeded successfully!${NC}" 