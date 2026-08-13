import { SYSTEM_PROMPT, DEFAULT_PHOTOS, ABBY_CHARACTER_DNA } from '../config/prompt.js';
import { StorageService } from './storage.js';

export const GeminiService = {
  /**
   * Main function to generate response from Abby via Server Proxy
   */
  async sendMessage(userMessage, chatHistory = [], quotedMsg = null) {
    const settings = StorageService.getSettings();
    const affection = StorageService.getAffection();
    const mood = StorageService.getMood();
    const affectionInfo = StorageService.getAffectionLevel(affection);
    const memories = StorageService.getMemories();
    const timeSinceLast = StorageService.getTimeSinceLastChat();

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    const dayStr = now.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });

    // 1. Try Calling Backend Server Proxy (/api/chat)
    try {
      const serverRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory.slice(-14),
          quotedMsg: quotedMsg
        })
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        return data;
      }
    } catch (serverErr) {
      console.warn('Backend proxy /api/chat unreachable, attempting direct client fallback:', serverErr);
    }

    // 2. Direct Client Fallback (if client provided an API key in settings or env)
    if (settings.apiKey && settings.apiKey.trim().length > 10) {
      try {
        let fullUserMessage = userMessage;
        if (quotedMsg && quotedMsg.text) {
          const senderName = quotedMsg.sender === 'abby' ? 'Abby' : (settings.userName || 'Kamu');
          fullUserMessage = `[MEMBALAS PESAN ${senderName}: "${quotedMsg.text.slice(0, 150)}"]\n${userMessage}`;
        }
        const responseText = await this.callGeminiAPI(fullUserMessage, chatHistory, settings, affectionInfo, mood, memories, timeSinceLast, timeStr, dayStr);
        return this.parseAbbyResponse(responseText, userMessage, settings);
      } catch (err) {
        console.warn('Direct Gemini API call failed:', err);
      }
    }

    // 3. Smart local fallback
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
    const fallbackText = this.generateSmartFallback(userMessage, affection, mood, timeStr);
    return this.parseAbbyResponse(fallbackText, userMessage, settings);
  },

  /**
   * Direct Gemini API fallback
   */
  async callGeminiAPI(userMessage, chatHistory, settings, affectionInfo, currentMood, memories, timeSinceLast, timeStr, dayStr) {
    const model = settings.modelName || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey.trim()}`;

    const contents = [];
    const recentHistory = chatHistory.slice(-14);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.rawText || msg.text }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const memoryListStr = memories.length > 0 
      ? memories.map((m, idx) => `${idx + 1}. ${m.fact} (Disimpan: ${m.date})`).join('\n')
      : 'Belum ada catatan khusus, baru kenalan.';

    const contextualPrompt = `
${SYSTEM_PROMPT}

[KONDISI STATUS HUBUNGAN REAL-TIME]
- Skor Love Meter: ${StorageService.getAffection()}/100 Pts (${affectionInfo.stage})
- Panduan Sikap Tahap Ini: ${affectionInfo.instruction}
- Waktu Lokal: ${dayStr}, Pukul ${timeStr} WIB
- Terakhir Saling Mengobrol: ${timeSinceLast}
- Panggilan User: ${settings.userName || 'Kamu'}
- Mood Abby Sekarang: ${currentMood}

[INGATAN JANGKA PANJANG ABBY TENTANG USER]
${memoryListStr}
`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: contextualPrompt }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.85,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 600
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  /**
   * Parse tags from Abby response
   */
  parseAbbyResponse(rawText, userMessage, settings) {
    let cleanText = rawText || '';
    let photo = null;
    let video = null;
    let affectionDelta = 0;
    let mood = null;

    const deltaMatch = cleanText.match(/\[DELTA:\s*([+-]?\d+)\]/i);
    if (deltaMatch) {
      affectionDelta = parseInt(deltaMatch[1], 10);
      cleanText = cleanText.replace(deltaMatch[0], '');
    }

    const moodMatch = cleanText.match(/\[MOOD:\s*([a-zA-Z]+)\]/i);
    if (moodMatch) {
      mood = moodMatch[1].toLowerCase();
      cleanText = cleanText.replace(moodMatch[0], '');
    }

    const rememberMatches = cleanText.matchAll(/\[REMEMBER:\s*([^\]]+)\]/gi);
    for (const match of rememberMatches) {
      const fact = match[1].trim();
      if (fact) {
        StorageService.addMemory(fact);
      }
      cleanText = cleanText.replace(match[0], '');
    }

    const photoGenMatch = cleanText.match(/\[PHOTO_GEN:\s*([^\]]+)\](?:\s*\[CAPTION:\s*([^\]]+)\])?/i);
    if (photoGenMatch) {
      const rawPrompt = photoGenMatch[1].trim();
      const caption = photoGenMatch[2] ? photoGenMatch[2].trim() : 'Selfie khusus buat kamu 💋';
      const lower = rawPrompt.toLowerCase();
      
      if (lower.includes('towel') || lower.includes('mandi') || lower.includes('shower')) photo = { id: 'photo_handuk', url: '/assets/handuk.png', caption, tag: 'Handuk Mandi (HD)' };
      else if (lower.includes('lingerie') || lower.includes('baju tidur') || lower.includes('renda')) photo = { id: 'photo_lingerie', url: '/assets/lingerie.png', caption, tag: 'Lingerie Renda (HD)' };
      else if (lower.includes('bikini') || lower.includes('pool') || lower.includes('renang')) photo = { id: 'photo_bikini', url: '/assets/bikini.png', caption, tag: 'Bikini Pool (HD)' };
      else photo = { id: 'photo_cozy', url: '/assets/cozy.png', caption, tag: 'Kamar Tidur (HD)' };

      cleanText = cleanText.replace(photoGenMatch[0], '');
    }

    const parts = cleanText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return {
      rawText: cleanText,
      parts: parts.length > 0 ? parts : [cleanText],
      photo,
      video,
      affectionDelta,
      mood
    };
  },

  generateSmartFallback(userMessage, affection, mood, timeStr) {
    const lower = userMessage.toLowerCase();
    if (lower.includes('pap') || lower.includes('foto')) {
      return "Nih foto selfie aku baru bangun tidur khusus buat kamu beb 💕 [PHOTO_GEN: smiling cute in pajamas cozy room] [CAPTION: Khusus buat koko kesayangan Abby 💋] [MOOD: flirty] [DELTA: +2]";
    }
    if (lower.includes('makan') || lower.includes('lapar')) {
      return "Aku lagi kepengen makan dimsum di PIK nih beb! Kamu udah makan siang belum? Jangan telat makan ya sayang nanti sakit 🥺🍜 [MOOD: caring] [DELTA: +1]";
    }
    if (lower.includes('kangen') || lower.includes('sayang') || lower.includes('cantik')) {
      return "Ihhh gombal bgt sih bikin salting aja tauu... >< tapi aku suka bgt! Kangen kamu juga parah beb 💕 [MOOD: flirty] [DELTA: +3]";
    }
    return "Iya sayang! Aku dengerin kok hehe... kamu lagi ngapain nih sekarang? Ceritain ke aku dong beb 🥰 [MOOD: happy]";
  }
};
