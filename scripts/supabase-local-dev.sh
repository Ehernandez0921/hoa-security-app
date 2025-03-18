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

echo -e "${YELLOW}Gate Security App - Supabase Local Development Setup${NC}"
echo "This script will help you set up your local Supabase environment for development."
echo

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please run the Docker installation script first:"
    echo "sudo bash scripts/install-docker.sh"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running or you don't have permission to use it.${NC}"
    echo "Please start Docker service and make sure your user has permissions to use Docker."
    echo "You may need to log out and log back in after installing Docker."
    exit 1
fi

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx is not available. Please make sure you have Node.js installed.${NC}"
    exit 1
fi

# Initialize Supabase if not already initialized
if [ ! -f "supabase/config.toml" ]; then
    echo -e "\n${GREEN}Initializing Supabase...${NC}"
    $SUPABASE_CMD init
fi

# Start Supabase local development
echo -e "\n${GREEN}Starting Supabase local development environment...${NC}"
echo "This will start PostgreSQL, PostgREST, and other Supabase services locally."
echo "Press Ctrl+C to stop the services when done."
echo

$SUPABASE_CMD start

# Note: The script will not reach here until Ctrl+C is pressed in the Supabase start command
echo -e "\n${GREEN}Supabase services have been stopped.${NC}"
echo "Your local development environment has been shut down." 