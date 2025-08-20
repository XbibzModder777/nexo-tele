const { execSync, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Utils = require('./utils');

class DependencyInstaller {
    constructor() {
        this.utils = new Utils();
        this.requiredDependencies = [
            'node-telegram-bot-api',
            '@google/generative-ai',
            'sqlite3',
            'axios',
            'fs-extra',
            'chalk',
            'figlet',
            'gradient-string',
            'inquirer',
            'ora',
            'boxen',
            'cli-progress',
            'node-fetch',
            'sharp',
            'moment',
            'uuid',
            'semver'
        ];
        
        this.devDependencies = [
            'nodemon'
        ];
    }

    async checkNodeVersion() {
        try {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            
            console.log(chalk.cyan(`📦 Node.js version: ${nodeVersion}`));
            
            if (majorVersion < 14) {
                console.log(chalk.red('❌ Node.js version 14 atau lebih tinggi diperlukan!'));
                console.log(chalk.yellow('💡 Silakan update Node.js terlebih dahulu.'));
                return false;
            }
            
            console.log(chalk.green('✅ Node.js version kompatibel!'));
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ Error checking Node.js version:'), error);
            return false;
        }
    }

    async checkNpmVersion() {
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            console.log(chalk.cyan(`📦 NPM version: ${npmVersion}`));
            console.log(chalk.green('✅ NPM tersedia!'));
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ NPM tidak ditemukan!'));
            console.log(chalk.yellow('💡 Silakan install NPM terlebih dahulu.'));
            return false;
        }
    }

    async detectPackageManager() {
        const managers = [
            { name: 'npm', command: 'npm --version' },
            { name: 'yarn', command: 'yarn --version' },
            { name: 'pnpm', command: 'pnpm --version' }
        ];
        
        for (const manager of managers) {
            try {
                execSync(manager.command, { stdio: 'ignore' });
                console.log(chalk.green(`✅ Menggunakan ${manager.name}`));
                return manager.name;
            } catch (error) {
                // Manager tidak tersedia
            }
        }
        
        console.log(chalk.yellow('⚠️  Menggunakan npm sebagai default'));
        return 'npm';
    }

    async checkInstalledPackages() {
        try {
            const packageJsonPath = './package.json';
            
            if (!await fs.pathExists(packageJsonPath)) {
                console.log(chalk.red('❌ package.json tidak ditemukan!'));
                return { installed: [], missing: this.requiredDependencies };
            }
            
            const packageJson = await fs.readJson(packageJsonPath);
            const installedDeps = {
                ...packageJson.dependencies || {},
                ...packageJson.devDependencies || {}
            };
            
            const installed = [];
            const missing = [];
            
            for (const dep of this.requiredDependencies) {
                if (installedDeps[dep]) {
                    installed.push(dep);
                } else {
                    missing.push(dep);
                }
            }
            
            return { installed, missing };
            
        } catch (error) {
            console.error(chalk.red('❌ Error checking packages:'), error);
            return { installed: [], missing: this.requiredDependencies };
        }
    }

    async installDependencies(packageManager = 'npm', packages = null) {
        try {
            const packagesToInstall = packages || this.requiredDependencies;
            
            if (packagesToInstall.length === 0) {
                console.log(chalk.green('✅ Semua dependencies sudah terinstall!'));
                return true;
            }
            
            console.log(chalk.cyan(`📦 Installing ${packagesToInstall.length} packages...`));
            
            // Tampilkan daftar packages
            console.log(chalk.yellow('📋 Packages yang akan diinstall:'));
            packagesToInstall.forEach(pkg => {
                console.log(chalk.white(`  • ${pkg}`));
            });
            
            const commands = {
                npm: `npm install ${packagesToInstall.join(' ')}`,
                yarn: `yarn add ${packagesToInstall.join(' ')}`,
                pnpm: `pnpm add ${packagesToInstall.join(' ')}`
            };
            
            const command = commands[packageManager];
            
            if (!command) {
                throw new Error(`Package manager ${packageManager} tidak didukung`);
            }
            
            console.log(chalk.cyan(`🔄 Menjalankan: ${command}`));
            
            // Progress indicator
            const spinner = this.utils.createSpinner('Installing dependencies...');
            spinner.start();
            
            try {
                execSync(command, { 
                    stdio: 'pipe',
                    cwd: process.cwd(),
                    timeout: 300000 // 5 menit timeout
                });
                
                spinner.succeed(chalk.green('Dependencies berhasil diinstall!'));
                return true;
                
            } catch (error) {
                spinner.fail(chalk.red('Gagal install dependencies!'));
                console.error(chalk.red('Error:'), error.message);
                return false;
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error installing dependencies:'), error);
            return false;
        }
    }

    async installDevDependencies(packageManager = 'npm') {
        try {
            console.log(chalk.cyan('📦 Installing dev dependencies...'));
            
            const commands = {
                npm: `npm install --save-dev ${this.devDependencies.join(' ')}`,
                yarn: `yarn add --dev ${this.devDependencies.join(' ')}`,
                pnpm: `pnpm add --save-dev ${this.devDependencies.join(' ')}`
            };
            
            const command = commands[packageManager];
            
            const spinner = this.utils.createSpinner('Installing dev dependencies...');
            spinner.start();
            
            try {
                execSync(command, { 
                    stdio: 'pipe',
                    timeout: 120000 // 2 menit timeout
                });
                
                spinner.succeed(chalk.green('Dev dependencies berhasil diinstall!'));
                return true;
                
            } catch (error) {
                spinner.fail(chalk.red('Gagal install dev dependencies!'));
                console.error(chalk.red('Error:'), error.message);
                return false;
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error installing dev dependencies:'), error);
            return false;
        }
    }

    async checkSystemRequirements() {
        console.log(chalk.cyan('🔍 Memeriksa system requirements...'));
        
        const checks = [
            { name: 'Node.js Version', check: () => this.checkNodeVersion() },
            { name: 'NPM Availability', check: () => this.checkNpmVersion() }
        ];
        
        let allPassed = true;
        
        for (const check of checks) {
            console.log(chalk.yellow(`\\n🔍 Checking ${check.name}...`));
            const result = await check.check();
            
            if (!result) {
                allPassed = false;
            }
        }
        
        if (allPassed) {
            console.log(chalk.green('\\n✅ Semua system requirements terpenuhi!'));
        } else {
            console.log(chalk.red('\\n❌ Beberapa requirements tidak terpenuhi!'));
        }
        
        return allPassed;
    }

    async setupProject() {
        try {
            console.log(chalk.cyan('🚀 Setting up NeXo AI Bot project...'));
            
            // 1. Check system requirements
            const systemOk = await this.checkSystemRequirements();
            if (!systemOk) {
                console.log(chalk.red('❌ System requirements tidak terpenuhi!'));
                return false;
            }
            
            // 2. Detect package manager
            const packageManager = await this.detectPackageManager();
            
            // 3. Check installed packages
            const { installed, missing } = await this.checkInstalledPackages();
            
            console.log(chalk.green(`\\n✅ ${installed.length} packages sudah terinstall`));
            
            if (missing.length > 0) {
                console.log(chalk.yellow(`⚠️  ${missing.length} packages perlu diinstall`));
                
                // Install missing dependencies
                const installSuccess = await this.installDependencies(packageManager, missing);
                
                if (!installSuccess) {
                    console.log(chalk.red('❌ Gagal install dependencies!'));
                    return false;
                }
            }
            
            // 4. Install dev dependencies
            await this.installDevDependencies(packageManager);
            
            // 5. Create necessary directories
            await this.createDirectories();
            
            // 6. Set permissions (untuk Termux)
            await this.setPermissions();
            
            console.log(chalk.green('\\n🎉 Project setup selesai!'));
            console.log(chalk.cyan('🚀 Jalankan: npm start'));
            
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ Error setting up project:'), error);
            return false;
        }
    }

    async createDirectories() {
        try {
            const directories = [
                './data',
                './logs',
                './backup',
                './temp'
            ];
            
            console.log(chalk.cyan('📁 Membuat direktori...'));
            
            for (const dir of directories) {
                await fs.ensureDir(dir);
                console.log(chalk.green(`✅ Created: ${dir}`));
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error creating directories:'), error);
        }
    }

    async setPermissions() {
        try {
            if (this.utils.isTermux()) {
                console.log(chalk.cyan('📱 Setting Termux permissions...'));
                
                // Set executable permissions
                const files = [
                    './src/index.js'
                ];
                
                for (const file of files) {
                    if (await fs.pathExists(file)) {
                        execSync(`chmod +x ${file}`, { stdio: 'ignore' });
                    }
                }
                
                console.log(chalk.green('✅ Permissions set for Termux'));
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error setting permissions:'), error);
        }
    }

    async verifyInstallation() {
        try {
            console.log(chalk.cyan('🔍 Verifying installation...'));
            
            const { installed, missing } = await this.checkInstalledPackages();
            
            if (missing.length === 0) {
                console.log(chalk.green('✅ Semua dependencies terinstall dengan benar!'));
                
                // Test import packages
                const testPackages = [
                    'node-telegram-bot-api',
                    '@google/generative-ai',
                    'sqlite3',
                    'chalk'
                ];
                
                let importErrors = 0;
                
                for (const pkg of testPackages) {
                    try {
                        require(pkg);
                        console.log(chalk.green(`✅ ${pkg} - OK`));
                    } catch (error) {
                        console.log(chalk.red(`❌ ${pkg} - Error: ${error.message}`));
                        importErrors++;
                    }
                }
                
                if (importErrors === 0) {
                    console.log(chalk.green('\\n🎉 Installation verified successfully!'));
                    return true;
                } else {
                    console.log(chalk.red(`\\n❌ ${importErrors} packages have import errors!`));
                    return false;
                }
                
            } else {
                console.log(chalk.red(`❌ ${missing.length} packages masih missing!`));
                return false;
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error verifying installation:'), error);
            return false;
        }
    }

    async autoInstall() {
        try {
            await this.utils.showBanner();
            
            console.log(chalk.cyan('🤖 NeXo AI Bot - Auto Installer'));
            console.log(chalk.yellow('🔧 Memulai instalasi otomatis...\\n'));
            
            const success = await this.setupProject();
            
            if (success) {
                const verified = await this.verifyInstallation();
                
                if (verified) {
                    console.log(chalk.green('\\n🎉 Instalasi berhasil!'));
                    console.log(chalk.cyan('\\n📋 Langkah selanjutnya:'));
                    console.log(chalk.white('1. Jalankan: npm start'));
                    console.log(chalk.white('2. Bot akan otomatis dimulai'));
                    console.log(chalk.white('3. Scan QR code atau buka link Telegram'));
                    
                    return true;
                } else {
                    console.log(chalk.red('\\n❌ Verifikasi gagal!'));
                    return false;
                }
            } else {
                console.log(chalk.red('\\n❌ Setup gagal!'));
                return false;
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Auto install error:'), error);
            return false;
        }
    }

    // Repair installation
    async repairInstallation() {
        try {
            console.log(chalk.cyan('🔧 Memperbaiki instalasi...'));
            
            // 1. Clean node_modules
            console.log(chalk.yellow('🗑️  Membersihkan node_modules...'));
            await fs.remove('./node_modules');
            await fs.remove('./package-lock.json');
            
            // 2. Reinstall everything
            const packageManager = await this.detectPackageManager();
            
            console.log(chalk.cyan('📦 Reinstalling semua packages...'));
            const installCmd = packageManager === 'npm' ? 'npm install' : 
                              packageManager === 'yarn' ? 'yarn install' : 'pnpm install';
            
            execSync(installCmd, { stdio: 'inherit' });
            
            // 3. Verify
            const verified = await this.verifyInstallation();
            
            if (verified) {
                console.log(chalk.green('✅ Repair berhasil!'));
                return true;
            } else {
                console.log(chalk.red('❌ Repair gagal!'));
                return false;
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error repairing installation:'), error);
            return false;
        }
    }
}

module.exports = DependencyInstaller;

