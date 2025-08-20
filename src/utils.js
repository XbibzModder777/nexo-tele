const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const boxen = require('boxen');
const ora = require('ora');
const cliProgress = require('cli-progress');

class Utils {
    constructor() {
        this.colors = {
            primary: '#00ff88',
            secondary: '#ff0088', 
            accent: '#0088ff',
            warning: '#ffaa00',
            error: '#ff4444',
            success: '#44ff44'
        };
    }

    // Banner animasi
    async showBanner() {
        console.clear();
        
        const banner = figlet.textSync('NeXo AI', {
            font: 'ANSI Shadow',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        });

        const gradientBanner = gradient(['#00ff88', '#0088ff', '#ff0088'])(banner);
        console.log(gradientBanner);
        
        const info = boxen(
            chalk.cyan('🤖 Bot Telegram AI Profesional\n') +
            chalk.yellow('👨‍💻 Developer: Xbibz Official - MR. Nexo444\n') +
            chalk.green('🚀 Version: 1.0.0\n') +
            chalk.magenta('⚡ Powered by Gemini AI'),
            {
                padding: 1,
                margin: 1,
                borderStyle: 'double',
                borderColor: 'cyan',
                backgroundColor: 'black'
            }
        );
        
        console.log(info);
        await this.sleep(1000);
    }

    // Loading spinner
    createSpinner(text, color = 'cyan') {
        return ora({
            text: chalk[color](text),
            spinner: 'dots12',
            color: color
        });
    }

    // Progress bar
    createProgressBar(title = 'Progress') {
        return new cliProgress.SingleBar({
            format: chalk.cyan(title + ' |') + chalk.green('{bar}') + chalk.cyan('| {percentage}% | {value}/{total}'),
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true
        });
    }

    // Animasi teks bergerak
    async animateText(text, delay = 50) {
        for (let i = 0; i <= text.length; i++) {
            process.stdout.write('\\r' + chalk.green(text.substring(0, i)));
            await this.sleep(delay);
        }
        console.log();
    }

    // Pesan sukses dengan animasi
    success(message) {
        console.log(chalk.green('✅ ' + message));
    }

    // Pesan error dengan animasi
    error(message) {
        console.log(chalk.red('❌ ' + message));
    }

    // Pesan warning
    warning(message) {
        console.log(chalk.yellow('⚠️  ' + message));
    }

    // Pesan info
    info(message) {
        console.log(chalk.cyan('ℹ️  ' + message));
    }

    // Loading dengan pesan
    async loading(message, duration = 2000) {
        const spinner = this.createSpinner(message);
        spinner.start();
        await this.sleep(duration);
        spinner.succeed(chalk.green(message + ' - Selesai!'));
    }

    // Membuat box untuk pesan penting
    createBox(content, title = '', options = {}) {
        const defaultOptions = {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            title: title,
            titleAlignment: 'center'
        };
        
        return boxen(content, { ...defaultOptions, ...options });
    }

    // Format pesan bot
    formatBotMessage(message, type = 'info') {
        const icons = {
            info: '💬',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            ai: '🤖'
        };
        
        const colors = {
            info: 'cyan',
            success: 'green',
            error: 'red',
            warning: 'yellow',
            ai: 'magenta'
        };
        
        return chalk[colors[type]](`${icons[type]} ${message}`);
    }

    // Animasi loading dots
    async loadingDots(message, duration = 3000) {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        
        const interval = setInterval(() => {
            process.stdout.write(`\\r${chalk.cyan(frames[i % frames.length])} ${message}`);
            i++;
        }, 100);
        
        setTimeout(() => {
            clearInterval(interval);
            process.stdout.write(`\\r${chalk.green('✅')} ${message} - Selesai!\\n`);
        }, duration);
    }

    // Format ukuran file
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Format waktu
    formatTime(date) {
        return new Date(date).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Sleep function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Membersihkan console
    clear() {
        console.clear();
    }

    // Menampilkan menu dengan animasi
    async showMenu(options, title = 'Menu') {
        console.log(chalk.cyan.bold(`\\n📋 ${title}:`));
        console.log(chalk.gray('─'.repeat(50)));
        
        for (let i = 0; i < options.length; i++) {
            await this.sleep(100);
            console.log(chalk.green(`${i + 1}. ${options[i]}`));
        }
        
        console.log(chalk.gray('─'.repeat(50)));
    }

    // Validasi input
    validateInput(input, type = 'string') {
        switch (type) {
            case 'number':
                return !isNaN(input) && input.trim() !== '';
            case 'email':
                return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input);
            case 'url':
                try {
                    new URL(input);
                    return true;
                } catch {
                    return false;
                }
            default:
                return input && input.trim().length > 0;
        }
    }

    // Generate random ID
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Escape HTML
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Truncate text
    truncate(text, length = 100) {
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    // Check if running in Termux
    isTermux() {
        return process.env.PREFIX && process.env.PREFIX.includes('com.termux');
    }

    // Get system info
    getSystemInfo() {
        const os = require('os');
        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            memory: {
                total: this.formatFileSize(os.totalmem()),
                free: this.formatFileSize(os.freemem())
            },
            uptime: Math.floor(os.uptime() / 60) + ' menit',
            isTermux: this.isTermux()
        };
    }
}

module.exports = Utils;

