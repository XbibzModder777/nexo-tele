#!/usr/bin/env node

/**
 * NeXo AI - Bot Telegram Profesional dengan AI Gemini
 * Developer: Xbibz Official - MR. Nexo444
 * Version: 1.0.0
 * 
 * Bot Telegram tingkat profesional dengan fitur:
 * - AI Chat dengan Gemini
 * - Analisis Gambar
 * - Sistem Premium & Owner
 * - Auto Update
 * - Memori Percakapan
 * - UI Terminal yang Menarik
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

// Import modules
const NeXoBot = require('./bot');
const DependencyInstaller = require('./installer');
const AutoUpdater = require('./updater');
const Utils = require('./utils');

class NeXoAI {
    constructor() {
        this.bot = null;
        this.installer = new DependencyInstaller();
        this.updater = new AutoUpdater();
        this.utils = new Utils();
        this.isRunning = false;
        
        // Bind methods
        this.handleExit = this.handleExit.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    async init() {
        try {
            // Setup error handlers
            process.on('SIGINT', this.handleExit);
            process.on('SIGTERM', this.handleExit);
            process.on('uncaughtException', this.handleError);
            process.on('unhandledRejection', this.handleError);

            // Show banner
            await this.utils.showBanner();
            
            // Check if first run
            const isFirstRun = await this.checkFirstRun();
            
            if (isFirstRun) {
                await this.firstTimeSetup();
            }
            
            // Check dependencies
            const depsOk = await this.checkDependencies();
            
            if (!depsOk) {
                console.log(chalk.red('❌ Dependencies tidak lengkap!'));
                
                const { autoInstall } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'autoInstall',
                        message: 'Apakah kamu ingin menginstall dependencies otomatis?',
                        default: true
                    }
                ]);
                
                if (autoInstall) {
                    const installSuccess = await this.installer.autoInstall();
                    
                    if (!installSuccess) {
                        console.log(chalk.red('❌ Gagal install dependencies!'));
                        process.exit(1);
                    }
                } else {
                    console.log(chalk.yellow('⚠️  Silakan install dependencies manual dengan: npm install'));
                    process.exit(1);
                }
            }
            
            // Check for updates
            await this.checkUpdates();
            
            // Show main menu
            await this.showMainMenu();
            
        } catch (error) {
            console.error(chalk.red('❌ Error during initialization:'), error);
            process.exit(1);
        }
    }

    async checkFirstRun() {
        const configExists = await fs.pathExists('./config/default.json');
        const dataExists = await fs.pathExists('./data');
        
        return !configExists || !dataExists;
    }

    async firstTimeSetup() {
        console.log(chalk.cyan('\\n🎉 Selamat datang di NeXo AI!'));
        console.log(chalk.yellow('🔧 Ini adalah pertama kali kamu menjalankan bot ini.'));
        console.log(chalk.white('📋 Mari kita setup bot terlebih dahulu...\\n'));
        
        // Create necessary directories
        await fs.ensureDir('./config');
        await fs.ensureDir('./data');
        await fs.ensureDir('./logs');
        await fs.ensureDir('./backup');
        
        // Setup configuration
        const config = await this.setupConfiguration();
        
        // Save configuration
        await fs.writeJson('./config/default.json', config, { spaces: 2 });
        
        console.log(chalk.green('✅ Setup selesai!'));
        console.log(chalk.cyan('🚀 Bot siap dijalankan!\\n'));
    }

    async setupConfiguration() {
        console.log(chalk.cyan('⚙️  Konfigurasi Bot'));
        
        const questions = [
            {
                type: 'input',
                name: 'botToken',
                message: 'Masukkan Bot Token Telegram:',
                default: '7435411681:AAGmnhc8JCg7ehMgX_kY5wHxlEVv6rdX4A8',
                validate: (input) => {
                    if (!input || input.length < 10) {
                        return 'Bot token tidak valid!';
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'ownerId',
                message: 'Masukkan Owner ID Telegram:',
                default: '7377733784',
                validate: (input) => {
                    if (!input || isNaN(input)) {
                        return 'Owner ID harus berupa angka!';
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'geminiApiKey',
                message: 'Masukkan Gemini AI API Key:',
                default: 'AIzaSyB01zhUpcSaz_jPn7Af9m4zgmEMfQ_aLcM',
                validate: (input) => {
                    if (!input || input.length < 10) {
                        return 'API Key tidak valid!';
                    }
                    return true;
                }
            },
            {
                type: 'list',
                name: 'geminiModel',
                message: 'Pilih model Gemini AI:',
                choices: [
                    'gemini-1.5-flash',
                    'gemini-1.5-pro',
                    'gemini-pro'
                ],
                default: 'gemini-1.5-flash'
            }
        ];
        
        const answers = await inquirer.prompt(questions);
        
        return {
            bot: {
                token: answers.botToken,
                owner_id: answers.ownerId,
                version: '1.0.0',
                update_url: 'https://raw.githubusercontent.com/nexo444/nexo-ai-bot/main/version.json'
            },
            ai: {
                gemini_api_key: answers.geminiApiKey,
                model: answers.geminiModel,
                max_tokens: 8192,
                temperature: 0.7
            },
            limits: {
                unregistered_messages: 5,
                premium_messages: -1,
                regular_messages: 100
            },
            database: {
                path: './data/nexo_ai.db'
            },
            ui: {
                colors: {
                    primary: '#00ff88',
                    secondary: '#ff0088',
                    accent: '#0088ff',
                    warning: '#ffaa00',
                    error: '#ff4444',
                    success: '#44ff44'
                },
                animations: true,
                banner_style: 'neon'
            }
        };
    }

    async checkDependencies() {
        try {
            const { installed, missing } = await this.installer.checkInstalledPackages();
            
            if (missing.length === 0) {
                console.log(chalk.green('✅ Semua dependencies tersedia!'));
                return true;
            } else {
                console.log(chalk.yellow(`⚠️  ${missing.length} dependencies tidak ditemukan:`));
                missing.forEach(dep => {
                    console.log(chalk.red(`  • ${dep}`));
                });
                return false;
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error checking dependencies:'), error);
            return false;
        }
    }

    async checkUpdates() {
        try {
            console.log(chalk.cyan('🔍 Memeriksa update...'));
            
            const updateCheck = await this.updater.checkForUpdates();
            
            if (updateCheck.hasUpdate) {
                console.log(chalk.green(`🆕 Update tersedia: v${updateCheck.latestVersion}`));
                
                const { doUpdate } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'doUpdate',
                        message: 'Apakah kamu ingin update sekarang?',
                        default: false
                    }
                ]);
                
                if (doUpdate) {
                    const updateResult = await this.updater.performUpdate();
                    
                    if (updateResult.success) {
                        console.log(chalk.green('✅ Update berhasil!'));
                        console.log(chalk.cyan('🔄 Silakan restart bot.'));
                        process.exit(0);
                    } else {
                        console.log(chalk.red('❌ Update gagal: ' + updateResult.message));
                    }
                }
            } else if (!updateCheck.error) {
                console.log(chalk.green('✅ Bot sudah menggunakan versi terbaru!'));
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error checking updates:'), error);
        }
    }

    async showMainMenu() {
        while (true) {
            console.log(chalk.cyan('\\n🤖 NeXo AI - Main Menu'));
            console.log(chalk.gray('─'.repeat(50)));
            
            const choices = [
                '🚀 Start Bot',
                '⚙️  Settings',
                '🔄 Check Updates',
                '🔧 Repair Installation',
                '📊 System Info',
                '❌ Exit'
            ];
            
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Pilih aksi:',
                    choices: choices
                }
            ]);
            
            switch (action) {
                case '🚀 Start Bot':
                    await this.startBot();
                    break;
                    
                case '⚙️  Settings':
                    await this.showSettings();
                    break;
                    
                case '🔄 Check Updates':
                    await this.checkUpdates();
                    break;
                    
                case '🔧 Repair Installation':
                    await this.repairInstallation();
                    break;
                    
                case '📊 System Info':
                    await this.showSystemInfo();
                    break;
                    
                case '❌ Exit':
                    await this.handleExit();
                    return;
            }
        }
    }

    async startBot() {
        try {
            if (this.isRunning) {
                console.log(chalk.yellow('⚠️  Bot sudah berjalan!'));
                return;
            }
            
            console.log(chalk.cyan('🚀 Memulai NeXo AI Bot...'));
            
            // Initialize bot
            this.bot = new NeXoBot();
            
            // Start bot
            await this.bot.start();
            
            this.isRunning = true;
            
            // Start auto update checker
            this.updater.autoUpdateCheck();
            
            console.log(chalk.green('\\n✅ Bot berhasil dimulai!'));
            console.log(chalk.cyan('💬 Bot siap menerima pesan di Telegram'));
            console.log(chalk.yellow('⚠️  Tekan Ctrl+C untuk menghentikan bot\\n'));
            
            // Keep process alive
            await this.keepAlive();
            
        } catch (error) {
            console.error(chalk.red('❌ Error starting bot:'), error);
            this.isRunning = false;
        }
    }

    async keepAlive() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (!this.isRunning) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 1000);
        });
    }

    async showSettings() {
        const settingsChoices = [
            '🔑 Ubah Bot Token',
            '👤 Ubah Owner ID',
            '🤖 Ubah Gemini API Key',
            '⚙️  Ubah Model AI',
            '📊 Lihat Konfigurasi',
            '🔙 Kembali'
        ];
        
        const { setting } = await inquirer.prompt([
            {
                type: 'list',
                name: 'setting',
                message: 'Pilih pengaturan:',
                choices: settingsChoices
            }
        ]);
        
        switch (setting) {
            case '🔑 Ubah Bot Token':
                await this.changeBotToken();
                break;
                
            case '👤 Ubah Owner ID':
                await this.changeOwnerId();
                break;
                
            case '🤖 Ubah Gemini API Key':
                await this.changeGeminiApiKey();
                break;
                
            case '⚙️  Ubah Model AI':
                await this.changeAIModel();
                break;
                
            case '📊 Lihat Konfigurasi':
                await this.showConfiguration();
                break;
        }
    }

    async changeBotToken() {
        const { newToken } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newToken',
                message: 'Masukkan Bot Token baru:',
                validate: (input) => {
                    if (!input || input.length < 10) {
                        return 'Bot token tidak valid!';
                    }
                    return true;
                }
            }
        ]);
        
        await this.updateConfig('bot.token', newToken);
        console.log(chalk.green('✅ Bot token berhasil diubah!'));
    }

    async changeOwnerId() {
        const { newOwnerId } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newOwnerId',
                message: 'Masukkan Owner ID baru:',
                validate: (input) => {
                    if (!input || isNaN(input)) {
                        return 'Owner ID harus berupa angka!';
                    }
                    return true;
                }
            }
        ]);
        
        await this.updateConfig('bot.owner_id', newOwnerId);
        console.log(chalk.green('✅ Owner ID berhasil diubah!'));
    }

    async changeGeminiApiKey() {
        const { newApiKey } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newApiKey',
                message: 'Masukkan Gemini API Key baru:',
                validate: (input) => {
                    if (!input || input.length < 10) {
                        return 'API Key tidak valid!';
                    }
                    return true;
                }
            }
        ]);
        
        await this.updateConfig('ai.gemini_api_key', newApiKey);
        console.log(chalk.green('✅ Gemini API Key berhasil diubah!'));
    }

    async changeAIModel() {
        const { newModel } = await inquirer.prompt([
            {
                type: 'list',
                name: 'newModel',
                message: 'Pilih model AI baru:',
                choices: [
                    'gemini-1.5-flash',
                    'gemini-1.5-pro',
                    'gemini-pro'
                ]
            }
        ]);
        
        await this.updateConfig('ai.model', newModel);
        console.log(chalk.green('✅ Model AI berhasil diubah!'));
    }

    async updateConfig(path, value) {
        try {
            const configPath = './config/default.json';
            const config = await fs.readJson(configPath);
            
            // Update nested property
            const keys = path.split('.');
            let current = config;
            
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
            
            await fs.writeJson(configPath, config, { spaces: 2 });
            
        } catch (error) {
            console.error(chalk.red('❌ Error updating config:'), error);
        }
    }

    async showConfiguration() {
        try {
            const config = await fs.readJson('./config/default.json');
            
            console.log(chalk.cyan('\\n📋 Konfigurasi Saat Ini:'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.yellow('Bot Token:'), chalk.white(config.bot.token.substring(0, 20) + '...'));
            console.log(chalk.yellow('Owner ID:'), chalk.white(config.bot.owner_id));
            console.log(chalk.yellow('Gemini API Key:'), chalk.white(config.ai.gemini_api_key.substring(0, 20) + '...'));
            console.log(chalk.yellow('AI Model:'), chalk.white(config.ai.model));
            console.log(chalk.yellow('Version:'), chalk.white(config.bot.version));
            console.log(chalk.gray('─'.repeat(50)));
            
        } catch (error) {
            console.error(chalk.red('❌ Error reading config:'), error);
        }
    }

    async repairInstallation() {
        console.log(chalk.cyan('🔧 Memperbaiki instalasi...'));
        
        const success = await this.installer.repairInstallation();
        
        if (success) {
            console.log(chalk.green('✅ Instalasi berhasil diperbaiki!'));
        } else {
            console.log(chalk.red('❌ Gagal memperbaiki instalasi!'));
        }
    }

    async showSystemInfo() {
        const systemInfo = this.utils.getSystemInfo();
        
        console.log(chalk.cyan('\\n💻 System Information:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.yellow('Platform:'), chalk.white(systemInfo.platform));
        console.log(chalk.yellow('Architecture:'), chalk.white(systemInfo.arch));
        console.log(chalk.yellow('Node.js:'), chalk.white(systemInfo.nodeVersion));
        console.log(chalk.yellow('Memory Total:'), chalk.white(systemInfo.memory.total));
        console.log(chalk.yellow('Memory Free:'), chalk.white(systemInfo.memory.free));
        console.log(chalk.yellow('Uptime:'), chalk.white(systemInfo.uptime));
        console.log(chalk.yellow('Termux:'), chalk.white(systemInfo.isTermux ? 'Ya' : 'Tidak'));
        console.log(chalk.gray('─'.repeat(50)));
    }

    async handleExit() {
        console.log(chalk.yellow('\\n🛑 Menghentikan NeXo AI Bot...'));
        
        this.isRunning = false;
        
        if (this.bot) {
            await this.bot.stop();
        }
        
        console.log(chalk.green('✅ Bot berhasil dihentikan!'));
        console.log(chalk.cyan('👋 Terima kasih telah menggunakan NeXo AI!'));
        
        process.exit(0);
    }

    async handleError(error) {
        console.error(chalk.red('\\n❌ Unexpected Error:'), error);
        
        // Log error to file
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack
        };
        
        try {
            await fs.ensureDir('./logs');
            await fs.appendJson('./logs/error.log', errorLog);
        } catch (logError) {
            console.error(chalk.red('❌ Failed to log error:'), logError);
        }
        
        // Graceful shutdown
        await this.handleExit();
    }
}

// Main execution
async function main() {
    try {
        const nexoAI = new NeXoAI();
        await nexoAI.init();
    } catch (error) {
        console.error(chalk.red('❌ Fatal Error:'), error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = NeXoAI;

