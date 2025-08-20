const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class Database {
    constructor(dbPath = './data/nexo_ai.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Pastikan direktori data ada
            await fs.ensureDir(path.dirname(this.dbPath));
            
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error(chalk.red('❌ Error membuka database:'), err.message);
                } else {
                    console.log(chalk.green('✅ Database terhubung!'));
                    this.createTables();
                }
            });
        } catch (error) {
            console.error(chalk.red('❌ Error inisialisasi database:'), error);
        }
    }

    createTables() {
        const tables = [
            // Tabel users
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                is_premium INTEGER DEFAULT 0,
                is_owner INTEGER DEFAULT 0,
                message_count INTEGER DEFAULT 0,
                registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabel chat history
            `CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )`,
            
            // Tabel settings
            `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        tables.forEach(sql => {
            this.db.run(sql, (err) => {
                if (err) {
                    console.error(chalk.red('❌ Error membuat tabel:'), err.message);
                }
            });
        });

        // Insert default settings
        this.insertDefaultSettings();
    }

    insertDefaultSettings() {
        const defaultSettings = [
            ['gemini_api_key', 'AIzaSyB01zhUpcSaz_jPn7Af9m4zgmEMfQ_aLcM'],
            ['gemini_model', 'gemini-1.5-flash'],
            ['max_tokens', '8192'],
            ['temperature', '0.7']
        ];

        defaultSettings.forEach(([key, value]) => {
            this.db.run(
                'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
                [key, value],
                (err) => {
                    if (err) {
                        console.error(chalk.red(`❌ Error insert setting ${key}:`), err.message);
                    }
                }
            );
        });
    }

    // User management
    async getUser(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async createUser(userInfo) {
        return new Promise((resolve, reject) => {
            const { id, username, first_name, last_name } = userInfo;
            this.db.run(
                `INSERT OR REPLACE INTO users 
                (user_id, username, first_name, last_name, message_count, last_active) 
                VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                [id.toString(), username, first_name, last_name],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateUserActivity(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET message_count = message_count + 1, last_active = CURRENT_TIMESTAMP WHERE user_id = ?',
                [userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async setPremium(userId, isPremium = true) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET is_premium = ? WHERE user_id = ?',
                [isPremium ? 1 : 0, userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async setOwner(userId, isOwner = true) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET is_owner = ? WHERE user_id = ?',
                [isOwner ? 1 : 0, userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async getPremiumUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM users WHERE is_premium = 1',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getOwners() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM users WHERE is_owner = 1',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // Chat history management
    async saveChatHistory(userId, message, response) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)',
                [userId, message, response],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getChatHistory(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
                [userId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.reverse()); // Reverse untuk urutan chronological
                }
            );
        });
    }

    async clearChatHistory(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM chat_history WHERE user_id = ?',
                [userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Settings management
    async getSetting(key) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT value FROM settings WHERE key = ?',
                [key],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.value : null);
                }
            );
        });
    }

    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [key, value],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async getAllSettings() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM settings',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const settings = {};
                        rows.forEach(row => {
                            settings[row.key] = row.value;
                        });
                        resolve(settings);
                    }
                }
            );
        });
    }

    // Statistics
    async getUserStats() {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT 
                    COUNT(*) as total_users,
                    SUM(is_premium) as premium_users,
                    SUM(is_owner) as owners,
                    SUM(message_count) as total_messages
                FROM users`,
                [],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error(chalk.red('❌ Error menutup database:'), err.message);
                } else {
                    console.log(chalk.yellow('📦 Database ditutup.'));
                }
            });
        }
    }
}

module.exports = Database;

