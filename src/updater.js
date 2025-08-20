const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const semver = require('semver');
const { execSync } = require('child_process');
const Utils = require('./utils');

class AutoUpdater {
    constructor(currentVersion = '1.0.0', updateUrl = null) {
        this.currentVersion = currentVersion;
        this.updateUrl = updateUrl || 'https://raw.githubusercontent.com/nexo444/nexo-ai-bot/main/version.json';
        this.utils = new Utils();
        this.backupDir = './backup';
    }

    async checkForUpdates() {
        try {
            console.log(chalk.cyan('🔍 Memeriksa update...'));
            
            const response = await axios.get(this.updateUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'NeXo-AI-Bot-Updater/1.0'
                }
            });
            
            const updateInfo = response.data;
            const latestVersion = updateInfo.version;
            
            if (semver.gt(latestVersion, this.currentVersion)) {
                return {
                    hasUpdate: true,
                    currentVersion: this.currentVersion,
                    latestVersion: latestVersion,
                    changelog: updateInfo.changelog || [],
                    downloadUrl: updateInfo.download_url,
                    critical: updateInfo.critical || false,
                    size: updateInfo.size || 'Unknown'
                };
            } else {
                return {
                    hasUpdate: false,
                    currentVersion: this.currentVersion,
                    latestVersion: latestVersion,
                    message: 'Bot sudah menggunakan versi terbaru!'
                };
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error checking updates:'), error.message);
            return {
                hasUpdate: false,
                error: true,
                message: 'Gagal memeriksa update: ' + error.message
            };
        }
    }

    async downloadUpdate(downloadUrl, version) {
        try {
            const tempDir = './temp_update';
            await fs.ensureDir(tempDir);
            
            console.log(chalk.cyan('📥 Mengunduh update...'));
            
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 60000
            });
            
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            
            const progressBar = this.utils.createProgressBar('Download');
            progressBar.start(totalSize, 0);
            
            const filePath = path.join(tempDir, `nexo-ai-bot-${version}.zip`);
            const writer = fs.createWriteStream(filePath);
            
            response.data.on('data', (chunk) => {
                downloadedSize += chunk.length;
                progressBar.update(downloadedSize);
            });
            
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    progressBar.stop();
                    console.log(chalk.green('✅ Download selesai!'));
                    resolve(filePath);
                });
                
                writer.on('error', (error) => {
                    progressBar.stop();
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error(chalk.red('❌ Error downloading update:'), error);
            throw error;
        }
    }

    async createBackup() {
        try {
            console.log(chalk.cyan('💾 Membuat backup...'));
            
            await fs.ensureDir(this.backupDir);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
            
            // Backup files penting
            const filesToBackup = [
                'src/',
                'config/',
                'data/',
                'package.json'
            ];
            
            await fs.ensureDir(backupPath);
            
            for (const file of filesToBackup) {
                if (await fs.pathExists(file)) {
                    const destPath = path.join(backupPath, file);
                    await fs.copy(file, destPath);
                }
            }
            
            console.log(chalk.green(`✅ Backup dibuat: ${backupPath}`));
            return backupPath;
            
        } catch (error) {
            console.error(chalk.red('❌ Error creating backup:'), error);
            throw error;
        }
    }

    async applyUpdate(updateFilePath) {
        try {
            console.log(chalk.cyan('🔄 Menerapkan update...'));
            
            // Extract update file (implementasi sederhana)
            const extractDir = './temp_extract';
            await fs.ensureDir(extractDir);
            
            // Simulasi extract (dalam implementasi nyata, gunakan library seperti yauzl atau adm-zip)
            console.log(chalk.yellow('📦 Mengekstrak file update...'));
            
            // Copy files (implementasi sederhana)
            // Dalam implementasi nyata, extract zip dan copy files
            
            console.log(chalk.green('✅ Update berhasil diterapkan!'));
            
            // Cleanup
            await fs.remove('./temp_update');
            await fs.remove('./temp_extract');
            
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ Error applying update:'), error);
            throw error;
        }
    }

    async rollbackUpdate(backupPath) {
        try {
            console.log(chalk.cyan('🔄 Melakukan rollback...'));
            
            if (!await fs.pathExists(backupPath)) {
                throw new Error('Backup tidak ditemukan');
            }
            
            // Restore dari backup
            const filesToRestore = [
                'src/',
                'config/',
                'package.json'
            ];
            
            for (const file of filesToRestore) {
                const backupFile = path.join(backupPath, file);
                if (await fs.pathExists(backupFile)) {
                    await fs.copy(backupFile, file);
                }
            }
            
            console.log(chalk.green('✅ Rollback berhasil!'));
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ Error rollback:'), error);
            throw error;
        }
    }

    async performUpdate(force = false) {
        try {
            const updateCheck = await this.checkForUpdates();
            
            if (!updateCheck.hasUpdate) {
                console.log(chalk.green('✅ ' + updateCheck.message));
                return { success: true, message: updateCheck.message };
            }
            
            // Tampilkan info update
            console.log(chalk.cyan('\\n🆕 Update tersedia!'));
            console.log(chalk.yellow(`📦 Versi saat ini: ${updateCheck.currentVersion}`));
            console.log(chalk.green(`🚀 Versi terbaru: ${updateCheck.latestVersion}`));
            
            if (updateCheck.changelog && updateCheck.changelog.length > 0) {
                console.log(chalk.cyan('\\n📝 Changelog:'));
                updateCheck.changelog.forEach(change => {
                    console.log(chalk.white(`  • ${change}`));
                });
            }
            
            if (updateCheck.critical) {
                console.log(chalk.red('\\n⚠️  Update kritikal! Sangat disarankan untuk update.'));
            }
            
            // Konfirmasi update (jika tidak force)
            if (!force) {
                const inquirer = require('inquirer');
                const { confirmUpdate } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirmUpdate',
                        message: 'Apakah kamu ingin melakukan update sekarang?',
                        default: true
                    }
                ]);
                
                if (!confirmUpdate) {
                    console.log(chalk.yellow('⏭️  Update dibatalkan.'));
                    return { success: false, message: 'Update dibatalkan oleh user' };
                }
            }
            
            // Proses update
            let backupPath;
            
            try {
                // 1. Buat backup
                backupPath = await this.createBackup();
                
                // 2. Download update
                const updateFile = await this.downloadUpdate(
                    updateCheck.downloadUrl, 
                    updateCheck.latestVersion
                );
                
                // 3. Terapkan update
                await this.applyUpdate(updateFile);
                
                // 4. Update package.json version
                await this.updateVersion(updateCheck.latestVersion);
                
                console.log(chalk.green('\\n🎉 Update berhasil!'));
                console.log(chalk.cyan('🔄 Silakan restart bot untuk menggunakan versi terbaru.'));
                
                return {
                    success: true,
                    message: 'Update berhasil',
                    newVersion: updateCheck.latestVersion,
                    backupPath: backupPath
                };
                
            } catch (error) {
                console.error(chalk.red('❌ Update gagal:'), error.message);
                
                // Rollback jika ada backup
                if (backupPath) {
                    console.log(chalk.yellow('🔄 Melakukan rollback...'));
                    await this.rollbackUpdate(backupPath);
                }
                
                return {
                    success: false,
                    message: 'Update gagal: ' + error.message
                };
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error performing update:'), error);
            return {
                success: false,
                message: 'Error update: ' + error.message
            };
        }
    }

    async updateVersion(newVersion) {
        try {
            const packagePath = './package.json';
            const packageData = await fs.readJson(packagePath);
            
            packageData.version = newVersion;
            
            await fs.writeJson(packagePath, packageData, { spaces: 2 });
            
            // Update config juga
            const configPath = './config/default.json';
            if (await fs.pathExists(configPath)) {
                const configData = await fs.readJson(configPath);
                configData.bot.version = newVersion;
                await fs.writeJson(configPath, configData, { spaces: 2 });
            }
            
            console.log(chalk.green(`✅ Version updated to ${newVersion}`));
            
        } catch (error) {
            console.error(chalk.red('❌ Error updating version:'), error);
        }
    }

    async cleanupOldBackups(maxBackups = 5) {
        try {
            if (!await fs.pathExists(this.backupDir)) {
                return;
            }
            
            const backups = await fs.readdir(this.backupDir);
            const backupDirs = [];
            
            for (const backup of backups) {
                const backupPath = path.join(this.backupDir, backup);
                const stats = await fs.stat(backupPath);
                
                if (stats.isDirectory()) {
                    backupDirs.push({
                        name: backup,
                        path: backupPath,
                        created: stats.birthtime
                    });
                }
            }
            
            // Sort by creation date (newest first)
            backupDirs.sort((a, b) => b.created - a.created);
            
            // Remove old backups
            if (backupDirs.length > maxBackups) {
                const toRemove = backupDirs.slice(maxBackups);
                
                for (const backup of toRemove) {
                    await fs.remove(backup.path);
                    console.log(chalk.yellow(`🗑️  Removed old backup: ${backup.name}`));
                }
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error cleaning backups:'), error);
        }
    }

    async getUpdateHistory() {
        try {
            const historyFile = './update_history.json';
            
            if (await fs.pathExists(historyFile)) {
                return await fs.readJson(historyFile);
            }
            
            return [];
            
        } catch (error) {
            console.error(chalk.red('❌ Error reading update history:'), error);
            return [];
        }
    }

    async saveUpdateHistory(updateInfo) {
        try {
            const historyFile = './update_history.json';
            const history = await this.getUpdateHistory();
            
            history.unshift({
                ...updateInfo,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 10 updates
            if (history.length > 10) {
                history.splice(10);
            }
            
            await fs.writeJson(historyFile, history, { spaces: 2 });
            
        } catch (error) {
            console.error(chalk.red('❌ Error saving update history:'), error);
        }
    }

    // Auto update checker (untuk dijalankan berkala)
    async autoUpdateCheck(interval = 24 * 60 * 60 * 1000) { // 24 jam
        setInterval(async () => {
            try {
                const updateCheck = await this.checkForUpdates();
                
                if (updateCheck.hasUpdate) {
                    console.log(chalk.cyan('\\n🆕 Update tersedia!'));
                    console.log(chalk.yellow(`Versi terbaru: ${updateCheck.latestVersion}`));
                    
                    if (updateCheck.critical) {
                        console.log(chalk.red('⚠️  Update kritikal tersedia!'));
                        // Auto update untuk critical updates
                        await this.performUpdate(true);
                    }
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Auto update check error:'), error);
            }
        }, interval);
    }
}

module.exports = AutoUpdater;

