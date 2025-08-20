#!/bin/bash

# NeXo AI Bot Startup Script
# Developer: Xbibz Official - MR. Nexo444
# Compatible: Linux, macOS, Termux

set -e

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

# Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "███╗   ██╗███████╗██╗  ██╗ ██████╗      █████╗ ██╗"
    echo "████╗  ██║██╔════╝╚██╗██╔╝██╔═══██╗    ██╔══██╗██║"
    echo "██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║    ███████║██║"
    echo "██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║    ██╔══██║██║"
    echo "██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝    ██║  ██║██║"
    echo "╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝     ╚═╝  ╚═╝╚═╝"
    echo -e "${NC}"
    echo -e "${PURPLE}🤖 Bot Telegram Profesional dengan AI Gemini${NC}"
    echo -e "${YELLOW}👨‍💻 Developer: Xbibz Official - MR. Nexo444${NC}"
    echo -e "${GREEN}🚀 Version: 1.0.0${NC}"
    echo ""
}

# Check if running in Termux
is_termux() {
    [[ -n "$PREFIX" && "$PREFIX" == *"com.termux"* ]]
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js tidak ditemukan!${NC}"
        echo -e "${YELLOW}💡 Installing Node.js...${NC}"
        
        if is_termux; then
            pkg update && pkg install nodejs -y
        elif command -v apt &> /dev/null; then
            sudo apt update && sudo apt install nodejs npm -y
        elif command -v yum &> /dev/null; then
            sudo yum install nodejs npm -y
        elif command -v brew &> /dev/null; then
            brew install node
        else
            echo -e "${RED}❌ Tidak bisa install Node.js otomatis!${NC}"
            echo -e "${YELLOW}💡 Silakan install Node.js manual dari: https://nodejs.org/${NC}"
            exit 1
        fi
    fi
    
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js ${NODE_VERSION} tersedia!${NC}"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ NPM tidak ditemukan!${NC}"
        
        if is_termux; then
            pkg install npm -y
        else
            echo -e "${YELLOW}💡 NPM biasanya terinstall dengan Node.js${NC}"
            echo -e "${YELLOW}💡 Coba install ulang Node.js${NC}"
            exit 1
        fi
    fi
    
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ NPM ${NPM_VERSION} tersedia!${NC}"
}

# Install dependencies
install_deps() {
    echo -e "${CYAN}📦 Checking dependencies...${NC}"
    
    if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
        echo -e "${YELLOW}⚠️  Dependencies belum terinstall${NC}"
        echo -e "${CYAN}📥 Installing dependencies...${NC}"
        
        npm install
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Dependencies berhasil diinstall!${NC}"
        else
            echo -e "${RED}❌ Gagal install dependencies!${NC}"
            echo -e "${YELLOW}💡 Coba jalankan: npm install --force${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Dependencies sudah terinstall!${NC}"
    fi
}

# Set permissions for Termux
set_permissions() {
    if is_termux; then
        echo -e "${CYAN}📱 Setting Termux permissions...${NC}"
        
        # Set executable permissions
        chmod +x src/index.js
        chmod +x start.sh
        
        # Request storage permission
        if [ ! -d "/sdcard" ]; then
            echo -e "${YELLOW}📱 Requesting storage permission...${NC}"
            termux-setup-storage
        fi
        
        echo -e "${GREEN}✅ Termux permissions set!${NC}"
    fi
}

# Create necessary directories
create_dirs() {
    echo -e "${CYAN}📁 Creating directories...${NC}"
    
    mkdir -p data logs backup temp
    
    echo -e "${GREEN}✅ Directories created!${NC}"
}

# Check system requirements
check_requirements() {
    echo -e "${CYAN}🔍 Checking system requirements...${NC}"
    
    # Check Node.js version
    NODE_MAJOR=$(node --version | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 14 ]; then
        echo -e "${RED}❌ Node.js version 14+ diperlukan!${NC}"
        echo -e "${YELLOW}💡 Current version: $(node --version)${NC}"
        exit 1
    fi
    
    # Check available memory
    if command -v free &> /dev/null; then
        AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$AVAILABLE_MEM" -lt 100 ]; then
            echo -e "${YELLOW}⚠️  Low memory detected: ${AVAILABLE_MEM}MB${NC}"
            echo -e "${YELLOW}💡 Bot mungkin berjalan lambat${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ System requirements OK!${NC}"
}

# Start bot
start_bot() {
    echo -e "${CYAN}🚀 Starting NeXo AI Bot...${NC}"
    echo -e "${YELLOW}⚠️  Tekan Ctrl+C untuk menghentikan bot${NC}"
    echo ""
    
    # Start with error handling
    if ! node src/index.js; then
        echo -e "${RED}❌ Bot crashed!${NC}"
        echo -e "${YELLOW}💡 Check logs untuk detail error${NC}"
        
        # Ask to restart
        read -p "$(echo -e ${CYAN}Restart bot? [y/N]: ${NC})" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            start_bot
        fi
    fi
}

# Show menu
show_menu() {
    echo -e "${CYAN}📋 NeXo AI Bot - Startup Menu${NC}"
    echo -e "${YELLOW}─────────────────────────────────${NC}"
    echo -e "${GREEN}1.${NC} 🚀 Start Bot"
    echo -e "${GREEN}2.${NC} 🔧 Install Dependencies"
    echo -e "${GREEN}3.${NC} 🔄 Update Bot"
    echo -e "${GREEN}4.${NC} 📊 System Info"
    echo -e "${GREEN}5.${NC} 🗑️  Clean Install"
    echo -e "${GREEN}6.${NC} ❌ Exit"
    echo -e "${YELLOW}─────────────────────────────────${NC}"
    
    read -p "$(echo -e ${CYAN}Pilih opsi [1-6]: ${NC})" choice
    
    case $choice in
        1)
            check_nodejs
            check_npm
            install_deps
            set_permissions
            create_dirs
            check_requirements
            start_bot
            ;;
        2)
            check_nodejs
            check_npm
            install_deps
            echo -e "${GREEN}✅ Dependencies installation complete!${NC}"
            ;;
        3)
            echo -e "${CYAN}🔄 Updating bot...${NC}"
            git pull origin main
            npm install
            echo -e "${GREEN}✅ Update complete!${NC}"
            ;;
        4)
            echo -e "${CYAN}💻 System Information:${NC}"
            echo -e "${YELLOW}OS:${NC} $(uname -s)"
            echo -e "${YELLOW}Architecture:${NC} $(uname -m)"
            echo -e "${YELLOW}Node.js:${NC} $(node --version 2>/dev/null || echo 'Not installed')"
            echo -e "${YELLOW}NPM:${NC} $(npm --version 2>/dev/null || echo 'Not installed')"
            echo -e "${YELLOW}Termux:${NC} $(is_termux && echo 'Yes' || echo 'No')"
            if command -v free &> /dev/null; then
                echo -e "${YELLOW}Memory:${NC} $(free -h | awk 'NR==2{print $3"/"$2}')"
            fi
            ;;
        5)
            echo -e "${YELLOW}🗑️  Cleaning installation...${NC}"
            rm -rf node_modules package-lock.json
            npm cache clean --force
            echo -e "${GREEN}✅ Clean complete! Run option 2 to reinstall.${NC}"
            ;;
        6)
            echo -e "${CYAN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option!${NC}"
            ;;
    esac
}

# Main function
main() {
    show_banner
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json tidak ditemukan!${NC}"
        echo -e "${YELLOW}💡 Pastikan kamu berada di direktori yang benar${NC}"
        exit 1
    fi
    
    # Auto start if no arguments
    if [ $# -eq 0 ]; then
        while true; do
            show_menu
            echo ""
        done
    else
        # Handle command line arguments
        case $1 in
            start)
                check_nodejs
                check_npm
                install_deps
                set_permissions
                create_dirs
                check_requirements
                start_bot
                ;;
            install)
                check_nodejs
                check_npm
                install_deps
                ;;
            update)
                git pull origin main
                npm install
                ;;
            clean)
                rm -rf node_modules package-lock.json
                npm cache clean --force
                ;;
            *)
                echo -e "${RED}❌ Unknown command: $1${NC}"
                echo -e "${YELLOW}💡 Available commands: start, install, update, clean${NC}"
                exit 1
                ;;
        esac
    fi
}

# Trap Ctrl+C
trap 'echo -e "\\n${YELLOW}🛑 Stopping...${NC}"; exit 0' INT

# Run main function
main "$@"

