const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const sharp = require('sharp');

class GeminiAI {
    constructor(apiKey, model = 'gemini-1.5-flash') {
        this.apiKey = apiKey;
        this.model = model;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
        this.conversationHistory = new Map(); // Menyimpan history per user
    }

    // Inisialisasi conversation untuk user baru
    initConversation(userId) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }
    }

    // Menambah pesan ke history
    addToHistory(userId, role, content) {
        this.initConversation(userId);
        const history = this.conversationHistory.get(userId);
        
        history.push({
            role: role,
            parts: [{ text: content }]
        });

        // Batasi history maksimal 20 pesan terakhir untuk performa
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }
        
        this.conversationHistory.set(userId, history);
    }

    // Mendapatkan history conversation
    getHistory(userId) {
        this.initConversation(userId);
        return this.conversationHistory.get(userId) || [];
    }

    // Membersihkan history conversation
    clearHistory(userId) {
        this.conversationHistory.set(userId, []);
    }

    // Chat dengan teks biasa
    async chat(userId, message, systemPrompt = null) {
        try {
            this.initConversation(userId);
            
            // System prompt untuk memberikan konteks
            const defaultSystemPrompt = `Kamu adalah NeXo AI, asisten AI yang cerdas dan ramah. 
            Kamu dibuat oleh Xbibz Official - MR. Nexo444. 
            Selalu jawab dalam bahasa Indonesia yang gaul dan friendly.
            Berikan jawaban yang informatif, akurat, dan membantu.
            Jika ditanya tentang identitasmu, jelaskan bahwa kamu adalah NeXo AI.`;

            const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
            
            // Gabungkan system prompt dengan history
            const history = this.getHistory(userId);
            const fullHistory = [
                {
                    role: 'user',
                    parts: [{ text: finalSystemPrompt }]
                },
                {
                    role: 'model', 
                    parts: [{ text: 'Siap! Aku NeXo AI, asisten AI yang siap membantu kamu. Ada yang bisa aku bantu?' }]
                },
                ...history
            ];

            // Mulai chat dengan history
            const chat = this.generativeModel.startChat({
                history: fullHistory,
                generationConfig: {
                    maxOutputTokens: 8192,
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40
                }
            });

            // Kirim pesan
            const result = await chat.sendMessage(message);
            const response = result.response.text();

            // Simpan ke history
            this.addToHistory(userId, 'user', message);
            this.addToHistory(userId, 'model', response);

            return {
                success: true,
                response: response,
                usage: {
                    promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
                    completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: result.response.usageMetadata?.totalTokenCount || 0
                }
            };

        } catch (error) {
            console.error(chalk.red('❌ Error AI Chat:'), error);
            return {
                success: false,
                error: error.message,
                response: 'Maaf, terjadi kesalahan saat memproses pesan kamu. Coba lagi ya! 😅'
            };
        }
    }

    // Analisis gambar
    async analyzeImage(userId, imageBuffer, prompt = 'Jelaskan apa yang kamu lihat dalam gambar ini secara detail dalam bahasa Indonesia.') {
        try {
            // Konversi buffer ke base64
            const base64Image = imageBuffer.toString('base64');
            
            // Deteksi format gambar
            const imageMetadata = await sharp(imageBuffer).metadata();
            const mimeType = `image/${imageMetadata.format}`;

            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            };

            // System prompt untuk analisis gambar
            const systemPrompt = `Kamu adalah NeXo AI yang ahli dalam menganalisis gambar. 
            Berikan deskripsi yang detail, akurat, dan informatif tentang gambar yang diberikan.
            Jawab dalam bahasa Indonesia yang mudah dipahami.
            Jika ada teks dalam gambar, baca dan jelaskan juga.`;

            const fullPrompt = `${systemPrompt}\\n\\n${prompt}`;

            const result = await this.generativeModel.generateContent([
                fullPrompt,
                imagePart
            ]);

            const response = result.response.text();

            // Simpan ke history
            this.addToHistory(userId, 'user', `[Mengirim gambar] ${prompt}`);
            this.addToHistory(userId, 'model', response);

            return {
                success: true,
                response: response,
                imageInfo: {
                    format: imageMetadata.format,
                    width: imageMetadata.width,
                    height: imageMetadata.height,
                    size: imageBuffer.length
                },
                usage: {
                    promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
                    completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: result.response.usageMetadata?.totalTokenCount || 0
                }
            };

        } catch (error) {
            console.error(chalk.red('❌ Error Analisis Gambar:'), error);
            return {
                success: false,
                error: error.message,
                response: 'Maaf, aku tidak bisa menganalisis gambar ini. Pastikan gambar dalam format yang didukung ya! 📸'
            };
        }
    }

    // Download dan analisis gambar dari URL
    async analyzeImageFromUrl(userId, imageUrl, prompt = 'Jelaskan apa yang kamu lihat dalam gambar ini secara detail dalam bahasa Indonesia.') {
        try {
            console.log(chalk.cyan('📥 Mengunduh gambar...'));
            
            const response = await axios({
                method: 'GET',
                url: imageUrl,
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const imageBuffer = Buffer.from(response.data);
            
            // Validasi ukuran gambar (max 20MB)
            if (imageBuffer.length > 20 * 1024 * 1024) {
                throw new Error('Gambar terlalu besar (max 20MB)');
            }

            return await this.analyzeImage(userId, imageBuffer, prompt);

        } catch (error) {
            console.error(chalk.red('❌ Error Download Gambar:'), error);
            return {
                success: false,
                error: error.message,
                response: 'Maaf, aku tidak bisa mengunduh atau menganalisis gambar dari URL tersebut. Pastikan URL valid dan gambar dapat diakses! 🔗'
            };
        }
    }

    // Optimasi gambar sebelum analisis
    async optimizeImage(imageBuffer, maxWidth = 1024, maxHeight = 1024, quality = 80) {
        try {
            const optimized = await sharp(imageBuffer)
                .resize(maxWidth, maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: quality })
                .toBuffer();

            return optimized;
        } catch (error) {
            console.error(chalk.red('❌ Error Optimasi Gambar:'), error);
            return imageBuffer; // Return original jika gagal optimasi
        }
    }

    // Generate response dengan konteks
    async generateContextualResponse(userId, message, context = {}) {
        try {
            const contextPrompt = `
            Konteks tambahan:
            - Waktu: ${new Date().toLocaleString('id-ID')}
            - User ID: ${userId}
            ${context.location ? `- Lokasi: ${context.location}` : ''}
            ${context.mood ? `- Mood: ${context.mood}` : ''}
            ${context.topic ? `- Topik: ${context.topic}` : ''}
            
            Berikan response yang sesuai dengan konteks di atas.
            `;

            return await this.chat(userId, message, contextPrompt);
        } catch (error) {
            console.error(chalk.red('❌ Error Contextual Response:'), error);
            return await this.chat(userId, message); // Fallback ke chat biasa
        }
    }

    // Mendapatkan statistik penggunaan
    getUsageStats(userId) {
        const history = this.getHistory(userId);
        const userMessages = history.filter(msg => msg.role === 'user').length;
        const modelMessages = history.filter(msg => msg.role === 'model').length;
        
        return {
            totalMessages: history.length,
            userMessages: userMessages,
            modelMessages: modelMessages,
            conversationStarted: history.length > 0 ? new Date() : null
        };
    }

    // Update API key
    updateApiKey(newApiKey) {
        this.apiKey = newApiKey;
        this.genAI = new GoogleGenerativeAI(newApiKey);
        this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
        console.log(chalk.green('✅ API Key berhasil diperbarui!'));
    }

    // Update model
    updateModel(newModel) {
        this.model = newModel;
        this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
        console.log(chalk.green(`✅ Model berhasil diubah ke: ${newModel}`));
    }

    // Validasi API key
    async validateApiKey() {
        try {
            const result = await this.generativeModel.generateContent('Test');
            return { valid: true, message: 'API Key valid!' };
        } catch (error) {
            return { 
                valid: false, 
                message: error.message.includes('API_KEY_INVALID') ? 
                    'API Key tidak valid!' : 
                    'Gagal validasi API Key: ' + error.message 
            };
        }
    }

    // Export conversation history
    exportHistory(userId, format = 'json') {
        const history = this.getHistory(userId);
        
        if (format === 'json') {
            return JSON.stringify(history, null, 2);
        } else if (format === 'txt') {
            return history.map(msg => 
                `[${msg.role.toUpperCase()}]: ${msg.parts[0].text}`
            ).join('\\n\\n');
        }
        
        return history;
    }

    // Import conversation history
    importHistory(userId, historyData, format = 'json') {
        try {
            let history;
            
            if (format === 'json') {
                history = typeof historyData === 'string' ? 
                    JSON.parse(historyData) : historyData;
            } else {
                throw new Error('Format tidak didukung');
            }
            
            this.conversationHistory.set(userId, history);
            return { success: true, message: 'History berhasil diimport!' };
        } catch (error) {
            return { success: false, message: 'Gagal import history: ' + error.message };
        }
    }
}

module.exports = GeminiAI;

