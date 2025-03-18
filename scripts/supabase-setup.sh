#!/bin/bash

# Exit on error
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define the path to the local Supabase CLI
SUPABASE_CMD="npx supabase"

echo -e "${YELLOW}Gate Security App - Supabase Setup Script${NC}"
echo "This script will help you set up your Supabase project."
echo

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx is not available. Please make sure you have Node.js installed.${NC}"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}Error: .env.local file not found.${NC}"
    echo "Please create a .env.local file with your Supabase URL and anon key."
    echo "You can copy .env.example and fill in your values."
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

# Check if the URL is a placeholder
if [[ "$PROJECT_REF" == *"your-project"* || "$PROJECT_REF" == *"project-ref"* ]]; then
    echo -e "${YELLOW}Warning: Detected placeholder URL in .env.local file.${NC}"
    echo "Your NEXT_PUBLIC_SUPABASE_URL appears to be a placeholder: $SUPABASE_URL"
    echo -e "${YELLOW}Please enter your actual Supabase project reference:${NC}"
    echo "You can find this in your Supabase dashboard URL (e.g., https://supabase.com/dashboard/project/abcdefghijklmnopqrst)"
    read -p "Project reference: " USER_PROJECT_REF
    
    if [ -z "$USER_PROJECT_REF" ]; then
        echo -e "${RED}Error: No project reference provided. Exiting.${NC}"
        exit 1
    fi
    
    PROJECT_REF="$USER_PROJECT_REF"
    echo -e "${YELLOW}Note: You should update your .env.local file with the correct URL:${NC}"
    echo "NEXT_PUBLIC_SUPABASE_URL=https://$PROJECT_REF.supabase.co"
fi

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}Error: Could not extract project reference from URL: $SUPABASE_URL${NC}"
    echo "Expected format: https://[project-ref].supabase.co"
    exit 1
fi

echo -e "${GREEN}Using project reference: $PROJECT_REF${NC}"

# Check for Supabase access token (PAT) in environment or .env.local
PAT=""

# First check if SUPABASE_ACCESS_TOKEN exists in .env.local
if grep -q SUPABASE_ACCESS_TOKEN .env.local; then
    PAT=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
    echo -e "${GREEN}Found Supabase access token in .env.local${NC}"
fi

# If not found, check environment variable
if [ -z "$PAT" ] && [ ! -z "$SUPABASE_ACCESS_TOKEN" ]; then
    PAT="$SUPABASE_ACCESS_TOKEN"
    echo -e "${GREEN}Found Supabase access token in environment variables${NC}"
fi

# If still not found, prompt the user
if [ -z "$PAT" ]; then
    echo -e "${YELLOW}Supabase access token not found.${NC}"
    echo "A personal access token (PAT) is required for CLI operations."
    echo "You can generate one at: https://supabase.com/dashboard/account/tokens"
    echo -e "${YELLOW}Please enter your Supabase access token (starts with 'sbp_'):${NC}"
    read -sp "Access token: " USER_PAT
    echo
    
    if [ -z "$USER_PAT" ]; then
        echo -e "${RED}Error: No access token provided. Exiting.${NC}"
        exit 1
    fi
    
    if [[ ! "$USER_PAT" == sbp_* ]]; then
        echo -e "${RED}Error: Invalid token format. Token should start with 'sbp_'${NC}"
        exit 1
    fi
    
    PAT="$USER_PAT"
    
    # Ask if user wants to save the token to .env.local
    echo -e "${YELLOW}Would you like to save this token to .env.local for future use? (y/n)${NC}"
    read -p "Save token: " SAVE_TOKEN
    
    if [ "$SAVE_TOKEN" = "y" ] || [ "$SAVE_TOKEN" = "Y" ]; then
        echo "SUPABASE_ACCESS_TOKEN=$PAT" >> .env.local
        echo -e "${GREEN}Token saved to .env.local${NC}"
    else
        echo -e "${YELLOW}Token not saved. You'll need to enter it again next time.${NC}"
    fi
fi

# Initialize Supabase if not already initialized
if [ ! -f "supabase/config.toml" ]; then
    echo -e "\n${GREEN}Initializing Supabase...${NC}"
    $SUPABASE_CMD init
fi

# Link to remote project - set access token as environment variable
echo -e "\n${GREEN}Linking to your Supabase project...${NC}"
echo -e "${YELLOW}Enter your database password (or leave blank to skip):${NC}"
read -sp "Database password: " DB_PASSWORD
echo
SUPABASE_ACCESS_TOKEN="$PAT" $SUPABASE_CMD link --project-ref "$PROJECT_REF"

# Ask if user wants to push database changes
echo -e "\n${YELLOW}Do you want to push database migrations?${NC}"
echo "This will create the required tables and RLS policies."
read -p "Push migrations? (y/n): " PUSH_MIGRATIONS

if [ "$PUSH_MIGRATIONS" = "y" ] || [ "$PUSH_MIGRATIONS" = "Y" ]; then
    echo -e "\n${GREEN}Pushing database migrations...${NC}"
    SUPABASE_ACCESS_TOKEN="$PAT" $SUPABASE_CMD db push
fi

# Ask if user wants to seed the database
echo -e "\n${YELLOW}Do you want to seed the database with initial data?${NC}"
echo "This will run the seed.sql file directly against your remote database."
read -p "Seed database? (y/n): " SEED_DB

if [ "$SEED_DB" = "y" ] || [ "$SEED_DB" = "Y" ]; then
    echo -e "\n${GREEN}Seeding database with initial data...${NC}"
    
    SEED_FILE="supabase/seed.sql"
    if [ -f "$SEED_FILE" ]; then
        echo -e "${GREEN}Running seed file: $SEED_FILE${NC}"
        
        if [ -z "$DB_PASSWORD" ]; then
            echo -e "${YELLOW}Database password is required for seeding. Please enter your database password:${NC}"
            read -sp "Database password: " DB_PASSWORD
            echo
        fi
        
        if [ -z "$DB_PASSWORD" ]; then
            echo -e "${RED}No password provided. Cannot seed the database.${NC}"
        else
            echo -e "${GREEN}Seeding database using migration approach...${NC}"
            
            # Create a temporary migration directory for the seed data with timestamp
            MIGRATION_DIR="supabase/migrations/$(date +%Y%m%d%H%M%S)_seed_data"
            mkdir -p "$MIGRATION_DIR"
            cp "$SEED_FILE" "$MIGRATION_DIR/seed.sql"
            
            # Push the migration to apply the seed
            echo -e "${GREEN}Pushing seed data as a migration...${NC}"
            SUPABASE_ACCESS_TOKEN="$PAT" $SUPABASE_CMD db push
            
            # Clean up temporary migration directory if desired
            echo -e "${YELLOW}Do you want to keep the seed migration for future reference? (y/n)${NC}"
            read -p "Keep seed migration? " KEEP_MIGRATION
            if [ "$KEEP_MIGRATION" != "y" ] && [ "$KEEP_MIGRATION" != "Y" ]; then
                rm -rf "$MIGRATION_DIR"
                echo -e "${GREEN}Temporary seed migration removed.${NC}"
            else
                echo -e "${GREEN}Seed migration kept at: $MIGRATION_DIR${NC}"
            fi
            
            echo -e "${GREEN}Database seeded successfully.${NC}"
        fi
    else
        echo -e "${RED}Error: Seed file not found: $SEED_FILE${NC}"
        echo "Please make sure the seed file exists."
    fi
fi

echo -e "\n${GREEN}Setup completed successfully!${NC}"
echo "Your Supabase project is now configured and ready to use." 