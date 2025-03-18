#!/bin/bash

# Exit on error
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Docker Installation Script for Ubuntu${NC}"
echo "This script will install Docker and configure it for use with Supabase."
echo

# Check if script is run with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Please run this script with sudo:${NC}"
    echo "sudo bash scripts/install-docker.sh"
    exit 1
fi

# Get the username of the user who invoked sudo
USERNAME=$(logname || echo $SUDO_USER)
if [ -z "$USERNAME" ]; then
    echo -e "${RED}Error: Could not determine the username.${NC}"
    echo "Please specify the username as an argument:"
    echo "sudo bash scripts/install-docker.sh your-username"
    exit 1
fi

echo -e "${GREEN}Installing Docker for user: $USERNAME${NC}"

# Update packages
echo -e "\n${GREEN}Updating package lists...${NC}"
apt-get update

# Install necessary packages
echo -e "\n${GREEN}Installing prerequisites...${NC}"
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
echo -e "\n${GREEN}Adding Docker's GPG key...${NC}"
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the Docker repository
echo -e "\n${GREEN}Setting up Docker repository...${NC}"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update again with Docker repository
echo -e "\n${GREEN}Updating package lists with Docker repository...${NC}"
apt-get update

# Install Docker
echo -e "\n${GREEN}Installing Docker Engine, containerd, and Docker Compose...${NC}"
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to the docker group so they can run Docker without sudo
echo -e "\n${GREEN}Adding user '$USERNAME' to the docker group...${NC}"
usermod -aG docker $USERNAME

# Enable and start Docker service
echo -e "\n${GREEN}Enabling and starting Docker service...${NC}"
systemctl enable docker
systemctl start docker

echo -e "\n${GREEN}Docker installation complete!${NC}"
echo -e "${YELLOW}IMPORTANT: You need to log out and log back in for the docker group membership to take effect.${NC}"
echo "After logging back in, verify Docker works with: docker run hello-world"
echo -e "\nAlternatively, you can run the following command in your current session (though it's less secure):"
echo -e "${YELLOW}newgrp docker${NC}" 