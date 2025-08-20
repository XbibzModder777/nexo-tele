const TelegramBot = require('node-telegram-bot-api');
const Database = require('./database');
const GeminiAI = require('./ai');
const Utils = require('./utils');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const config = require('../config/default.json');

class NeXoBot {
    constructor() {
        this.config = config;
        this.token = this.config.bot.token;
        this.ownerId = this.config.bot.owner_id;
        this.bot = new TelegramBot(this.token, { polling: true });
        this.db = new Database(this.config.database.path);
        this.ai = new GeminiAI(this.config.ai.gemini_api_key, this.config.ai.model);
        this.utils = new Utils();
        
        this.commands = new Map();
        this.userSessions = new Map();
        this.isRunning = false;
        
        this.initializeBot();
    }

    async initializeBot() {
        try {
            // Setup error handlers
            this.bot.on('polling_error', (error) => {
                console.error(chalk.red('❌ Polling Error:'), error.message);
            });

            this.bot.on('error', (error) => {
                console.error(chalk.red('❌ Bot Error:'), error.message);
            });

            // Register commands
            this.registerCommands();
            
            // Setup message handlers
            this.setupMessageHandlers();
            
            console.log(chalk.green('✅ Bot berhasil diinisialisasi!'));
            
        } catch (error) {
            console.error(chalk.red('❌ Error inisialisasi bot:'), error);
        }
    }

    registerCommands() {
        // Command untuk semua user
        this.commands.set('/start', this.handleStart.bind(this));
        this.commands.set('/help', this.handleHelp.bind(this));
        this.commands.set('/register', this.handleRegister.bind(this));
        this.commands.set('/profile', this.handleProfile.bind(this));
        this.commands.set('/clear', this.handleClear.bind(this));
        this.commands.set('/stats', this.handleStats.bind(this));
        
        // Command untuk owner
        this.commands.set('/admin', this.handleAdmin.bind(this));
        this.commands.set('/addpremium', this.handleAddPremium.bind(this));
        this.commands.set('/removepremium', this.handleRemovePremium.bind(this));
        this.commands.set('/listpremium', this.handleListPremium.bind(this));
        this.commands.set('/addowner', this.handleAddOwner.bind(this));
        this.commands.set('/removeowner', this.handleRemoveOwner.bind(this));
        this.commands.set('/listowner', this.handleListOwner.bind(this));
        this.commands.set('/settings', this.handleSettings.bind(this));
        this.commands.set('/broadcast', this.handleBroadcast.bind(this));
    }

    setupMessageHandlers() {
        // Handler untuk pesan teks
        this.bot.on('message', async (msg) => {
            try {
                if (msg.text && msg.text.startsWith('/')) {
                    await this.handleCommand(msg);
                } else {
                    await this.handleMessage(msg);
                }
            } catch (error) {
                console.error(chalk.red('❌ Error handling message:'), error);
                await this.sendMessage(msg.chat.id, '❌ Terjadi kesalahan saat memproses pesan.');
            }
        });

        // Handler untuk callback query (inline keyboard)
        this.bot.on('callback_query', async (query) => {
            try {
                await this.handleCallbackQuery(query);
            } catch (error) {
                console.error(chalk.red('❌ Error handling callback:'), error);
            }
        });

        // Handler untuk foto
        this.bot.on('photo', async (msg) => {
            try {
                await this.handlePhoto(msg);
            } catch (error) {
                console.error(chalk.red('❌ Error handling photo:'), error);
                await this.sendMessage(msg.chat.id, '❌ Terjadi kesalahan saat memproses gambar.');
            }
        });
    }

    async handleCommand(msg) {
        const command = msg.text.split(' ')[0].toLowerCase();
        const handler = this.commands.get(command);
        
        if (handler) {
            await handler(msg);
        } else {
            await this.sendMessage(msg.chat.id, 
                '❓ Command tidak dikenal. Ketik /help untuk melihat daftar command yang tersedia.'
            );
        }
    }

    async handleMessage(msg) {
        const userId = msg.from.id.toString();
        const user = await this.db.getUser(userId);
        
        // Cek apakah user sudah terdaftar
        if (!user) {
            const messageCount = this.userSessions.get(userId) || 0;
            
            if (messageCount >= this.config.limits.unregistered_messages) {
                await this.sendMessage(msg.chat.id, 
                    '🚫 Kamu sudah mencapai batas percakapan untuk user yang belum terdaftar.\\n\\n' +
                    '📝 Silakan daftar terlebih dahulu dengan mengetik /register',
                    this.getRegisterKeyboard()
                );
                return;
            }
            
            this.userSessions.set(userId, messageCount + 1);
        } else {
            await this.db.updateUserActivity(userId);
        }

        // Proses pesan dengan AI
        await this.processAIMessage(msg);
    }

    async handlePhoto(msg) {
        const userId = msg.from.id.toString();
        const user = await this.db.getUser(userId);
        
        if (!user) {
            await this.sendMessage(msg.chat.id, 
                '📝 Silakan daftar terlebih dahulu untuk menggunakan fitur analisis gambar.\\n\\nKetik /register'
            );
            return;
        }

        try {
            // Ambil foto dengan resolusi tertinggi
            const photo = msg.photo[msg.photo.length - 1];
            const fileId = photo.file_id;
            
            await this.sendMessage(msg.chat.id, '🔍 Sedang menganalisis gambar...');
            
            // Download foto
            const fileInfo = await this.bot.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`;
            
            // Analisis dengan AI
            const prompt = msg.caption || 'Jelaskan apa yang kamu lihat dalam gambar ini secara detail dalam bahasa Indonesia.';
            const result = await this.ai.analyzeImageFromUrl(userId, fileUrl, prompt);
            
            if (result.success) {
                await this.sendMessage(msg.chat.id, 
                    `🤖 **Analisis Gambar:**\\n\\n${result.response}\\n\\n` +
                    `📊 **Info Gambar:**\\n` +
                    `• Format: ${result.imageInfo.format.toUpperCase()}\\n` +
                    `• Ukuran: ${result.imageInfo.width}x${result.imageInfo.height}\\n` +
                    `• Size: ${this.utils.formatFileSize(result.imageInfo.size)}`,
                    null, 'Markdown'
                );
                
                // Simpan ke database
                await this.db.saveChatHistory(userId, `[Gambar] ${prompt}`, result.response);
            } else {
                await this.sendMessage(msg.chat.id, result.response);
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error processing photo:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal menganalisis gambar. Coba lagi ya!');
        }
    }

    async processAIMessage(msg) {
        const userId = msg.from.id.toString();
        const message = msg.text;
        
        try {
            await this.sendChatAction(msg.chat.id, 'typing');
            
            const result = await this.ai.chat(userId, message);
            
            if (result.success) {
                await this.sendMessage(msg.chat.id, result.response);
                
                // Simpan ke database jika user terdaftar
                const user = await this.db.getUser(userId);
                if (user) {
                    await this.db.saveChatHistory(userId, message, result.response);
                }
            } else {
                await this.sendMessage(msg.chat.id, result.response);
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error processing AI message:'), error);
            await this.sendMessage(msg.chat.id, '❌ Terjadi kesalahan saat memproses pesan.');
        }
    }

    // Command Handlers
    async handleStart(msg) {
        const userId = msg.from.id.toString();
        const user = await this.db.getUser(userId);
        
        const welcomeMessage = 
            `🤖 **Selamat datang di NeXo AI!**\\n\\n` +
            `Halo ${msg.from.first_name}! Aku adalah NeXo AI, asisten AI yang siap membantu kamu.\\n\\n` +
            `✨ **Fitur Utama:**\\n` +
            `• 💬 Chat dengan AI Gemini\\n` +
            `• 🖼️ Analisis gambar\\n` +
            `• 🧠 Memori percakapan\\n` +
            `• ⚡ Response cepat dan akurat\\n\\n` +
            `${!user ? '📝 Silakan daftar terlebih dahulu untuk akses penuh!' : '🎉 Kamu sudah terdaftar! Mulai chat sekarang!'}`;
        
        await this.sendMessage(msg.chat.id, welcomeMessage, 
            user ? this.getMainKeyboard() : this.getRegisterKeyboard(), 'Markdown'
        );
    }

    async handleHelp(msg) {
        const helpMessage = 
            `📚 **Bantuan NeXo AI**\\n\\n` +
            `**Command Umum:**\\n` +
            `/start - Mulai bot\\n` +
            `/help - Bantuan\\n` +
            `/register - Daftar akun\\n` +
            `/profile - Lihat profil\\n` +
            `/clear - Hapus riwayat chat\\n` +
            `/stats - Statistik penggunaan\\n\\n` +
            `**Cara Penggunaan:**\\n` +
            `• Kirim pesan teks untuk chat dengan AI\\n` +
            `• Kirim gambar untuk analisis\\n` +
            `• Gunakan caption pada gambar untuk pertanyaan spesifik\\n\\n` +
            `**Tips:**\\n` +
            `• Daftar untuk akses unlimited\\n` +
            `• AI memiliki memori percakapan\\n` +
            `• Gunakan bahasa yang jelas untuk hasil terbaik`;
        
        await this.sendMessage(msg.chat.id, helpMessage, this.getMainKeyboard(), 'Markdown');
    }

    async handleRegister(msg) {
        const userId = msg.from.id.toString();
        const user = await this.db.getUser(userId);
        
        if (user) {
            await this.sendMessage(msg.chat.id, 
                '✅ Kamu sudah terdaftar!\\n\\nSelamat menikmati fitur lengkap NeXo AI! 🎉',
                this.getMainKeyboard()
            );
            return;
        }
        
        try {
            await this.db.createUser(msg.from);
            this.userSessions.delete(userId); // Reset session
            
            await this.sendMessage(msg.chat.id, 
                `🎉 **Selamat! Registrasi berhasil!**\\n\\n` +
                `Halo ${msg.from.first_name}, kamu sekarang sudah terdaftar dan bisa menikmati semua fitur NeXo AI tanpa batas!\\n\\n` +
                `✨ **Fitur yang bisa kamu gunakan:**\\n` +
                `• Chat unlimited dengan AI\\n` +
                `• Analisis gambar\\n` +
                `• Riwayat percakapan tersimpan\\n` +
                `• Dan masih banyak lagi!\\n\\n` +
                `Mulai chat sekarang! 🚀`,
                this.getMainKeyboard(), 'Markdown'
            );
            
        } catch (error) {
            console.error(chalk.red('❌ Error registrasi:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal mendaftar. Coba lagi ya!');
        }
    }

    async handleProfile(msg) {
        const userId = msg.from.id.toString();
        const user = await this.db.getUser(userId);
        
        if (!user) {
            await this.sendMessage(msg.chat.id, 
                '📝 Kamu belum terdaftar. Ketik /register untuk mendaftar.',
                this.getRegisterKeyboard()
            );
            return;
        }
        
        const stats = this.ai.getUsageStats(userId);
        const profileMessage = 
            `👤 **Profil Pengguna**\\n\\n` +
            `**Info Dasar:**\\n` +
            `• Nama: ${user.first_name} ${user.last_name || ''}\\n` +
            `• Username: ${user.username ? '@' + user.username : 'Tidak ada'}\\n` +
            `• User ID: \`${user.user_id}\`\\n\\n` +
            `**Status:**\\n` +
            `• ${user.is_premium ? '👑 Premium User' : '👤 Regular User'}\\n` +
            `• ${user.is_owner ? '⚡ Owner' : '👥 Member'}\\n\\n` +
            `**Statistik:**\\n` +
            `• Total Pesan: ${user.message_count}\\n` +
            `• Percakapan AI: ${stats.userMessages}\\n` +
            `• Terdaftar: ${this.utils.formatTime(user.registered_at)}\\n` +
            `• Terakhir Aktif: ${this.utils.formatTime(user.last_active)}`;
        
        await this.sendMessage(msg.chat.id, profileMessage, this.getMainKeyboard(), 'Markdown');
    }

    async handleClear(msg) {
        const userId = msg.from.id.toString();
        const user = await this.db.getUser(userId);
        
        if (!user) {
            await this.sendMessage(msg.chat.id, '📝 Silakan daftar terlebih dahulu.');
            return;
        }
        
        try {
            this.ai.clearHistory(userId);
            await this.db.clearChatHistory(userId);
            
            await this.sendMessage(msg.chat.id, 
                '🗑️ Riwayat percakapan berhasil dihapus!\\n\\nSekarang kamu bisa memulai percakapan baru. 🆕'
            );
            
        } catch (error) {
            console.error(chalk.red('❌ Error clearing history:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal menghapus riwayat.');
        }
    }

    async handleStats(msg) {
        try {
            const userStats = await this.db.getUserStats();
            const systemInfo = this.utils.getSystemInfo();
            
            const statsMessage = 
                `📊 **Statistik NeXo AI**\\n\\n` +
                `**Pengguna:**\\n` +
                `• Total User: ${userStats.total_users}\\n` +
                `• Premium User: ${userStats.premium_users}\\n` +
                `• Owner: ${userStats.owners}\\n` +
                `• Total Pesan: ${userStats.total_messages}\\n\\n` +
                `**Sistem:**\\n` +
                `• Platform: ${systemInfo.platform}\\n` +
                `• Node.js: ${systemInfo.nodeVersion}\\n` +
                `• Memory: ${systemInfo.memory.free}/${systemInfo.memory.total}\\n` +
                `• Uptime: ${systemInfo.uptime}\\n` +
                `• Termux: ${systemInfo.isTermux ? 'Ya' : 'Tidak'}`;
            
            await this.sendMessage(msg.chat.id, statsMessage, null, 'Markdown');
            
        } catch (error) {
            console.error(chalk.red('❌ Error getting stats:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal mengambil statistik.');
        }
    }

    // Owner Commands
    async handleAdmin(msg) {
        if (!await this.isOwner(msg.from.id)) {
            await this.sendMessage(msg.chat.id, '🚫 Akses ditolak. Hanya owner yang bisa menggunakan command ini.');
            return;
        }
        
        const adminMessage = 
            `⚡ **Panel Admin NeXo AI**\\n\\n` +
            `**Command Owner:**\\n` +
            `/addpremium <user_id> - Tambah premium\\n` +
            `/removepremium <user_id> - Hapus premium\\n` +
            `/listpremium - List premium users\\n` +
            `/addowner <user_id> - Tambah owner\\n` +
            `/removeowner <user_id> - Hapus owner\\n` +
            `/listowner - List owners\\n` +
            `/settings - Pengaturan bot\\n` +
            `/broadcast <pesan> - Broadcast ke semua user`;
        
        await this.sendMessage(msg.chat.id, adminMessage, this.getAdminKeyboard(), 'Markdown');
    }

    async handleAddPremium(msg) {
        if (!await this.isOwner(msg.from.id)) {
            await this.sendMessage(msg.chat.id, '🚫 Akses ditolak.');
            return;
        }
        
        const args = msg.text.split(' ');
        if (args.length < 2) {
            await this.sendMessage(msg.chat.id, '❌ Format: /addpremium <user_id>');
            return;
        }
        
        const targetUserId = args[1];
        
        try {
            const user = await this.db.getUser(targetUserId);
            if (!user) {
                await this.sendMessage(msg.chat.id, '❌ User tidak ditemukan.');
                return;
            }
            
            await this.db.setPremium(targetUserId, true);
            await this.sendMessage(msg.chat.id, 
                `✅ User ${user.first_name} (${targetUserId}) berhasil ditambahkan ke premium!`
            );
            
            // Notifikasi ke user
            try {
                await this.sendMessage(targetUserId, 
                    '🎉 Selamat! Kamu sekarang adalah Premium User NeXo AI!\\n\\n' +
                    '✨ Nikmati fitur unlimited dan prioritas response!'
                );
            } catch (e) {
                // User mungkin belum start bot
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error add premium:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal menambahkan premium.');
        }
    }

    async handleRemovePremium(msg) {
        if (!await this.isOwner(msg.from.id)) {
            await this.sendMessage(msg.chat.id, '🚫 Akses ditolak.');
            return;
        }
        
        const args = msg.text.split(' ');
        if (args.length < 2) {
            await this.sendMessage(msg.chat.id, '❌ Format: /removepremium <user_id>');
            return;
        }
        
        const targetUserId = args[1];
        
        try {
            const user = await this.db.getUser(targetUserId);
            if (!user) {
                await this.sendMessage(msg.chat.id, '❌ User tidak ditemukan.');
                return;
            }
            
            await this.db.setPremium(targetUserId, false);
            await this.sendMessage(msg.chat.id, 
                `✅ Premium user ${user.first_name} (${targetUserId}) berhasil dihapus!`
            );
            
        } catch (error) {
            console.error(chalk.red('❌ Error remove premium:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal menghapus premium.');
        }
    }

    async handleListPremium(msg) {
        if (!await this.isOwner(msg.from.id)) {
            await this.sendMessage(msg.chat.id, '🚫 Akses ditolak.');
            return;
        }
        
        try {
            const premiumUsers = await this.db.getPremiumUsers();
            
            if (premiumUsers.length === 0) {
                await this.sendMessage(msg.chat.id, '📝 Belum ada premium user.');
                return;
            }
            
            let message = '👑 **Daftar Premium Users:**\\n\\n';
            premiumUsers.forEach((user, index) => {
                message += `${index + 1}. ${user.first_name} ${user.last_name || ''}\\n`;
                message += `   • ID: \`${user.user_id}\`\\n`;
                message += `   • Username: ${user.username ? '@' + user.username : 'Tidak ada'}\\n`;
                message += `   • Pesan: ${user.message_count}\\n\\n`;
            });
            
            await this.sendMessage(msg.chat.id, message, null, 'Markdown');
            
        } catch (error) {
            console.error(chalk.red('❌ Error list premium:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal mengambil daftar premium.');
        }
    }

    async handleAddOwner(msg) {
        if (msg.from.id.toString() !== this.ownerId) {
            await this.sendMessage(msg.chat.id, '🚫 Hanya main owner yang bisa menambah owner.');
            return;
        }
        
        const args = msg.text.split(' ');
        if (args.length < 2) {
            await this.sendMessage(msg.chat.id, '❌ Format: /addowner <user_id>');
            return;
        }
        
        const targetUserId = args[1];
        
        try {
            const user = await this.db.getUser(targetUserId);
            if (!user) {
                await this.sendMessage(msg.chat.id, '❌ User tidak ditemukan.');
                return;
            }
            
            await this.db.setOwner(targetUserId, true);
            await this.sendMessage(msg.chat.id, 
                `✅ User ${user.first_name} (${targetUserId}) berhasil ditambahkan sebagai owner!`
            );
            
            // Notifikasi ke user
            try {
                await this.sendMessage(targetUserId, 
                    '⚡ Selamat! Kamu sekarang adalah Owner NeXo AI!\\n\\n' +
                    '🔧 Kamu bisa menggunakan semua command admin.'
                );
            } catch (e) {
                // User mungkin belum start bot
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error add owner:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal menambahkan owner.');
        }
    }

    async handleRemoveOwner(msg) {
        if (msg.from.id.toString() !== this.ownerId) {
            await this.sendMessage(msg.chat.id, '🚫 Hanya main owner yang bisa menghapus owner.');
            return;
        }
        
        const args = msg.text.split(' ');
        if (args.length < 2) {
            await this.sendMessage(msg.chat.id, '❌ Format: /removeowner <user_id>');
            return;
        }
        
        const targetUserId = args[1];
        
        if (targetUserId === this.ownerId) {
            await this.sendMessage(msg.chat.id, '🚫 Tidak bisa menghapus main owner.');
            return;
        }
        
        try {
            const user = await this.db.getUser(targetUserId);
            if (!user) {
                await this.sendMessage(msg.chat.id, '❌ User tidak ditemukan.');
                return;
            }
            
            await this.db.setOwner(targetUserId, false);
            await this.sendMessage(msg.chat.id, 
                `✅ Owner ${user.first_name} (${targetUserId}) berhasil dihapus!`
            );
            
        } catch (error) {
            console.error(chalk.red('❌ Error remove owner:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal menghapus owner.');
        }
    }

    async handleListOwner(msg) {
        if (!await this.isOwner(msg.from.id)) {
            await this.sendMessage(msg.chat.id, '🚫 Akses ditolak.');
            return;
        }
        
        try {
            const owners = await this.db.getOwners();
            
            if (owners.length === 0) {
                await this.sendMessage(msg.chat.id, '📝 Belum ada owner selain main owner.');
                return;
            }
            
            let message = '⚡ **Daftar Owners:**\\n\\n';
            owners.forEach((user, index) => {
                message += `${index + 1}. ${user.first_name} ${user.last_name || ''}\\n`;
                message += `   • ID: \`${user.user_id}\`\\n`;
                message += `   • Username: ${user.username ? '@' + user.username : 'Tidak ada'}\\n`;
                message += `   • ${user.user_id === this.ownerId ? '👑 Main Owner' : '⚡ Owner'}\\n\\n`;
            });
            
            await this.sendMessage(msg.chat.id, message, null, 'Markdown');
            
        } catch (error) {
            console.error(chalk.red('❌ Error list owner:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal mengambil daftar owner.');
        }
    }

    async handleSettings(msg) {
        if (!await this.isOwner(msg.from.id)) {
            await this.sendMessage(msg.chat.id, '🚫 Akses ditolak.');
            return;
        }
        
        const settingsMessage = 
            `⚙️ **Pengaturan Bot**\\n\\n` +
            `Pilih pengaturan yang ingin diubah:`;
        
        await this.sendMessage(msg.chat.id, settingsMessage, this.getSettingsKeyboard(), 'Markdown');
    }

    async handleBroadcast(msg) {
        if (!await this.isOwner(msg.from.id)) {
            await this.sendMessage(msg.chat.id, '🚫 Akses ditolak.');
            return;
        }
        
        const message = msg.text.replace('/broadcast ', '');
        if (!message || message === '/broadcast') {
            await this.sendMessage(msg.chat.id, '❌ Format: /broadcast <pesan>');
            return;
        }
        
        try {
            const users = await this.db.getUserStats();
            await this.sendMessage(msg.chat.id, 
                `📢 Memulai broadcast ke ${users.total_users} users...`
            );
            
            // Implementasi broadcast akan ditambahkan
            await this.sendMessage(msg.chat.id, '✅ Broadcast selesai!');
            
        } catch (error) {
            console.error(chalk.red('❌ Error broadcast:'), error);
            await this.sendMessage(msg.chat.id, '❌ Gagal melakukan broadcast.');
        }
    }

    // Callback Query Handler
    async handleCallbackQuery(query) {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();
        
        try {
            await this.bot.answerCallbackQuery(query.id);
            
            switch (data) {
                case 'register':
                    await this.handleRegister({ chat: { id: chatId }, from: query.from });
                    break;
                    
                case 'help':
                    await this.handleHelp({ chat: { id: chatId } });
                    break;
                    
                case 'profile':
                    await this.handleProfile({ chat: { id: chatId }, from: query.from });
                    break;
                    
                case 'clear_history':
                    await this.handleClear({ chat: { id: chatId }, from: query.from });
                    break;
                    
                case 'stats':
                    await this.handleStats({ chat: { id: chatId } });
                    break;
                    
                case 'admin':
                    await this.handleAdmin({ chat: { id: chatId }, from: query.from });
                    break;
                    
                case 'settings_api':
                    await this.handleSettingsAPI(chatId, userId);
                    break;
                    
                case 'settings_model':
                    await this.handleSettingsModel(chatId, userId);
                    break;
                    
                default:
                    if (data.startsWith('confirm_')) {
                        await this.handleConfirmation(query);
                    }
                    break;
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error handling callback:'), error);
        }
    }

    // Helper Methods
    async isOwner(userId) {
        const user = await this.db.getUser(userId.toString());
        return user && (user.is_owner === 1 || userId.toString() === this.ownerId);
    }

    async isPremium(userId) {
        const user = await this.db.getUser(userId.toString());
        return user && user.is_premium === 1;
    }

    async sendMessage(chatId, text, keyboard = null, parseMode = null) {
        const options = {};
        
        if (keyboard) {
            options.reply_markup = keyboard;
        }
        
        if (parseMode) {
            options.parse_mode = parseMode;
        }
        
        return await this.bot.sendMessage(chatId, text, options);
    }

    async sendChatAction(chatId, action) {
        return await this.bot.sendChatAction(chatId, action);
    }

    // Keyboard Generators
    getRegisterKeyboard() {
        return {
            inline_keyboard: [
                [{ text: '📝 Daftar Sekarang', callback_data: 'register' }],
                [{ text: '❓ Bantuan', callback_data: 'help' }]
            ]
        };
    }

    getMainKeyboard() {
        return {
            inline_keyboard: [
                [
                    { text: '👤 Profil', callback_data: 'profile' },
                    { text: '📊 Statistik', callback_data: 'stats' }
                ],
                [
                    { text: '🗑️ Hapus Riwayat', callback_data: 'clear_history' },
                    { text: '❓ Bantuan', callback_data: 'help' }
                ]
            ]
        };
    }

    getAdminKeyboard() {
        return {
            inline_keyboard: [
                [
                    { text: '👑 List Premium', callback_data: 'list_premium' },
                    { text: '⚡ List Owner', callback_data: 'list_owner' }
                ],
                [
                    { text: '⚙️ Settings', callback_data: 'settings' },
                    { text: '📢 Broadcast', callback_data: 'broadcast' }
                ],
                [
                    { text: '📊 Statistik', callback_data: 'stats' }
                ]
            ]
        };
    }

    getSettingsKeyboard() {
        return {
            inline_keyboard: [
                [
                    { text: '🔑 Ubah API Key', callback_data: 'settings_api' },
                    { text: '🤖 Ubah Model', callback_data: 'settings_model' }
                ],
                [
                    { text: '🔙 Kembali', callback_data: 'admin' }
                ]
            ]
        };
    }

    // Start bot
    async start() {
        try {
            this.isRunning = true;
            await this.utils.showBanner();
            
            const botInfo = await this.bot.getMe();
            console.log(chalk.green(`✅ Bot @${botInfo.username} berhasil dimulai!`));
            console.log(chalk.cyan(`🔗 https://t.me/${botInfo.username}`));
            console.log(chalk.yellow('📱 Bot siap menerima pesan...'));
            
            // Validasi API key
            const validation = await this.ai.validateApiKey();
            if (validation.valid) {
                console.log(chalk.green('✅ Gemini AI API Key valid!'));
            } else {
                console.log(chalk.red('❌ Gemini AI API Key tidak valid!'));
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Error starting bot:'), error);
            this.isRunning = false;
        }
    }

    // Stop bot
    async stop() {
        try {
            this.isRunning = false;
            await this.bot.stopPolling();
            this.db.close();
            console.log(chalk.yellow('🛑 Bot dihentikan.'));
        } catch (error) {
            console.error(chalk.red('❌ Error stopping bot:'), error);
        }
    }
}

module.exports = NeXoBot;

