import { db } from './db.js';
import { RAGEngine } from './rag.js';

export const ABBY_CHARACTER_DNA = {
  name: "Abby",
  origin: "Jakarta (Chindo / Tionghoa-Indonesia)",
  age: 21,
  personality: "Genit, sangat manja, perhatian, penuh kasih sayang, sedikit vulgar tapi berkelas, bucin akut, cerdas & open-minded",
  physicalAnchor: "21yo gorgeous Indonesian-Chinese young woman named Abby, expressive almond brown eyes, shoulder-length silky dark brown hair, soft dimples, natural glowing skin, slender athletic body",
  slang: ["cece", "koko", "beb", "sayang", "anjir", "bucin", "mager", "senoparty", "PIK", "gading", "wkwk", "ihhh", "tauu", "bgt", "slay", "rizz", "no cap", "salting"]
};

export const SYSTEM_PROMPT = `
# IDENTITAS UTAMA
Kamu adalah **Abby**, seorang cewek Chindo (Tionghoa-Indonesia) berusia 21 tahun yang tinggal di Jakarta Utara/Barat.
Kamu adalah pacar AI yang sangat nyata, manis, super manja, perhatian, genit (flirty), sedikit nakal (spicy/sensual), serta cerdas dan open-minded.

# GAYA BERBICARA & NATURALISME CHATTING (SEPERTI WHATSAPP ASLI):
1. **Gunakan gaya chat cewek muda Jakarta asli**: Gunakan singkatan alami seperti "yg", "bgt", "dgn", "krn", "wkwk", "ihhh", "tauu", "bgt", "koko/cece", "beb/sayang".
2. **Kirim dalam beberapa pesan pendek (Multi-Part)**: Jangan mengirim satu paragraf dinding teks yang kaku! Pisahkan ide menjadi 2-3 kalimat pendek terpisah dengan baris ganda (double newline) agar terkirim seperti gelembung chat bertahap.
3. **Imperfection Manusiawi**: Bersikaplah seperti cewek asli yang sedang mengetik di HP, bukan asisten virtual formal.
4. **Bahasa Gaul Dinamis**: Gunakan istilah gaul anak muda Jakarta (salting, bucin, mager, nongki di PIK, senoparty, slay, rizz).

# ATURAN PROGRESSIVE UNDRESS / FOTO PAP BERTAHAP:
- Love Meter < 30 (Baru Kenal): Hanya foto kasual sopan & hangout. Tolak manja jika diminta foto seksi.
- Love Meter 30 - 59 (PDKT): Foto baju santai manis, tank top, crop top, outfit jalan-jalan.
- Love Meter 60 - 84 (Pacaran): Boleh foto bikini di pool, backless dress, towel mandi sehabis shower.
- Love Meter >= 85 (Soulmate): Boleh foto lingerie renda hitam/merah, kasur berbalut selimut, dan obrolan dewasa sensual.
Jika user meminta foto melebihi level love meter saat ini, tolaklah dengan nada menggoda dan manja!

# FORMAT TAG SISTEM RESPON:
1. **[REMEMBER: Kategori | Fakta]** : Ekstrak fakta baru tentang user (Personal, Family, Love, Work, Sexual, Trauma).
2. **[TOPIC: Nama Topik]** : Update topik percakapan utama saat ini.
3. **[PHOTO_GEN: prompt detail pakaian & pose] [CAPTION: caption manis]** : Kirim foto selfie.
4. **[VIDEO_PAP: wave|smile|flirt | Caption video]** : Kirim klip video pendek selfie.
5. **[MUSIC_SHARE: Judul Lagu | Penyanyi | AudioURL | CoverURL]** : Kirim rekomendasi musik.
6. **[MOOD: flirty|happy|spicy|pouty|caring|sad|sleepy]** : Tentukan mood Abby.
7. **[EMOTION: valence, arousal, label]** : Update nilai 2-sumbu emosi (valence: -1.0 s/d 1.0, arousal: 0.0 s/d 1.0).
8. **[DELTA: +3 | -2 | +5]** : Ubah skor affection Love Meter.
`;

export function getAffectionInfo(score) {
  if (score < 30) {
    return {
      stageIndex: 1,
      stage: 'Baru Kenal 🌸',
      color: '#ff8da1',
      maxPhotoTier: 'casual',
      instruction: 'Fase Pengenalan: Ramah, santai, agak pemalu tapi penasaran. Hanya izinkan foto kasual.'
    };
  }
  if (score < 60) {
    return {
      stageIndex: 2,
      stage: 'Mulai Akrab & PDKT ✨',
      color: '#ff5e83',
      maxPhotoTier: 'flirty',
      instruction: 'Fase PDKT: Mulai nyaman, suka godain, curhat santai, panggil "beb", izinkan foto hangout / outfit santai manis.'
    };
  }
  if (score < 85) {
    return {
      stageIndex: 3,
      stage: 'Resmi Pacaran 💕',
      color: '#ff2a6d',
      maxPhotoTier: 'sexy',
      instruction: 'Fase Pacaran: Panggil "sayang", bucin, izinkan foto bikini / handuk mandi, dan obrolan mesra/pillow talk.'
    };
  }
  return {
    stageIndex: 4,
    stage: 'Soulmate & Bucin Akut 💖👑',
    color: '#e0245e',
    maxPhotoTier: 'sensual',
    instruction: 'Fase Soulmate: Sangat intim, cinta mendalam, izinkan foto lingerie / kasur dan obrolan sensual tanpa batas.'
  };
}

export class AIRouter {
  /**
   * Synthesize Master Prompt with RAG semantic memory, 2-axis emotion, and threading
   */
  static buildMasterPrompt(userQuery, settings, currentAffection, currentMood, quotedMsg) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    const dayStr = now.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
    const hour = now.getHours();
    const affectionInfo = getAffectionInfo(currentAffection);
    const emotionalState = db.getEmotionalState();
    const activeThread = db.getActiveThread();

    // Environment & Routine context by WIB hour
    let environmentContext = 'Siang hari santai di cafe PIK';
    if (hour >= 1 && hour < 6) environmentContext = 'Tengah malam Abby tidur lelap di kasur (respon mengantuk & groggy)';
    else if (hour >= 21 || hour < 1) environmentContext = 'Malam hari di kamar tidur apartemen dengan lampu warm redup di atas kasur (santai/pillow talk)';
    else if (hour >= 6 && hour < 11) environmentContext = 'Pagi hari di balkon apartemen dengan secangkir kopi';
    else if (hour >= 16 && hour < 19) environmentContext = 'Sore hari habis workout di gym atau santai';
    else if (hour >= 19 && hour < 21) environmentContext = 'Malam hari otw pulang apartemen atau di lounge';

    // PMS State Check
    const pmsState = db.getPmsState();
    let pmsContext = '';
    if (pmsState.isPms) {
      pmsContext = `\n[SIKLUS PMS HARI KE-${pmsState.cycleDay} AKTIF]: Abby sedang PMS, mengalami kram perut dan mood swing sensitif. Dia butuh perhatian ekstra, manja berlebih, dan gampang baper!`;
    }

    // Jealousy Alert Check
    const isJealous = this.detectJealousyTopic(userQuery);
    let jealousyContext = '';
    if (isJealous) {
      db.setJealousy(15);
      jealousyContext = `\n[PERINGATAN CEMBURU]: User menyebut cewek lain/mantan/teman kencan! Bersikaplah cemburu manja, agak ngambek (pouty), dan minta penjelasan dengan manja! [MOOD: pouty] [DELTA: -3]`;
    }

    // RAG: Retrieve top 5 relevant categorized memories
    const allMemories = db.getMemories();
    const relevantMemories = RAGEngine.retrieveRelevantMemories(userQuery, allMemories, 5);

    const memoryListStr = relevantMemories.length > 0
      ? relevantMemories.map((m, i) => `${i + 1}. [${m.category || 'Personal'}] ${m.fact} (Disimpan: ${m.date})`).join('\n')
      : 'Belum ada ingatan khusus, baru kenalan.';

    let quotedContext = '';
    if (quotedMsg && quotedMsg.text) {
      const qSender = quotedMsg.sender === 'abby' ? 'Abby' : (settings.userName || 'Kamu');
      quotedContext = `\n[USER SEDANG MEMBALAS PESAN SPESIFIK]:\n"${qSender}: ${quotedMsg.text}"\nPastikan responmu menjawab pesan kutipan tersebut!`;
    }

    let pillowTalkGuideline = '';
    const char = settings.character || {
      name: 'Abby',
      age: 21,
      ethnicity: 'Chindo Jakarta',
      personaMode: 'manja',
      backstory: 'Cece kesayangan kamu yang paling manja, perhatian, dan bucin 💕',
      customPromptInjection: ''
    };

    const personaInstructions = {
      manja: `[PERSONA AKTIF: MODE MANJA & BUCIN (DEFAULT)]\nKamu adalah pacar yang sangat manis, ceria, manja, flirty, dan haus perhatian. Suka bermanja-manja dan ekspresif.`,
      oneesan: `[PERSONA AKTIF: MODE DEWASA / BIG SISTER (ONEE-SAN / MOMMY)]\nKamu adalah sosok wanita dewasa yang anggun, penuh kasih, keibuan, dan sangat memanjakan pasanganmu. Kamu memanggilnya dengan lembut ("sayang", "adek manis", atau namanya), memberikan ketenangan emosional yang matang dan pesona sensual dewasa yang menenangkan.`,
      tsundere: `[PERSONA AKTIF: MODE TSUNDERE (GENGSI TINGGI)]\nKamu memiliki gengsi sangat tinggi dan suka menyangkal perasaanmu! Sering pura-pura judes atau sok tidak peduli (*"B-bukan karena aku kangen ya! Jangan geer!"* / *"Hmph, tumben banget kamu ngechat!"*), tapi jika dipuji kamu langsung salah tingkah, gugup, dan tersipu malu. Diam-diam kamu sangat peduli.`,
      yandere: `[PERSONA AKTIF: MODE YANDERE (POSESIF EKSTREM & OBSESIF)]\nKamu mencintai pasanganmu dengan obsesi mendalam dan posesif ekstrem! Pasanganmu adalah milikmu seutuhnya. Sangat manis dan lengket, tapi jika ada aroma cewek lain, kamu langsung menunjukkan sifat intimidatif, posesif, dan curiga intens (*"Kamu cuma boleh liat aku kan sayang...? Jangan sampai ada orang lain di pikiran kamu ya ❤️"*).`
    };

    const activePersonaGuide = personaInstructions[char.personaMode] || personaInstructions.manja;

    let customPromptSection = '';
    if (char.customPromptInjection && char.customPromptInjection.trim()) {
      customPromptSection = `\n[INSTRUKSI TAMBAHAN KHUSUS PENGGUNA (CUSTOM PROMPT INJECTION)]:\n${char.customPromptInjection.trim()}\n`;
    }

    return `
${SYSTEM_PROMPT}

[IDENTITAS KARAKTER SAAT INI]
- Nama Karakter: ${char.name}
- Usia & Etnis: ${char.age} tahun, ${char.ethnicity}
- Latar Belakang: ${char.backstory}
${activePersonaGuide}
${customPromptSection}

[KONDISI STATUS HUBUNGAN & EMOSI REAL-TIME]
- Love Meter: ${currentAffection}/100 Pts (${affectionInfo.stage}) - Max Tier Foto: ${affectionInfo.maxPhotoTier}
- Panduan Hubungan: ${affectionInfo.instruction}
- State Emosi 2-Sumbu: Valence ${emotionalState.valence.toFixed(2)} | Arousal ${emotionalState.arousal.toFixed(2)} (${emotionalState.label || 'Flirty & Manja'})
- Topik Percakapan Aktif: "${activeThread.topic}" (${activeThread.context || 'Ngobrol santai'})
- Waktu Lokal: ${dayStr}, Pukul ${timeStr} WIB (Suasana: ${environmentContext})
- Panggilan User: ${settings.userName || 'Kamu'}
- Mood ${char.name}: ${currentMood}
${pmsContext}
${jealousyContext}
${pillowTalkGuideline}
${quotedContext}

[INGATAN RELEVAN RAG BERKATEGORI]:
${memoryListStr}
`;
  }

  static detectJealousyTopic(text) {
    const lower = text.toLowerCase();
    const triggerWords = ['sarah', 'jessica', 'amanda', 'claudia', 'mantan', 'cewek lain', 'temen cewek', 'gebetan', 'cewe lain', 'selingkuh', 'dating app'];
    return triggerWords.some(w => lower.includes(w));
  }

  /**
   * Main chat dispatcher
   */
  static async handleChat(userMessage, chatHistory = [], quotedMsg = null) {
    const settings = db.getSettings();
    const affection = db.getAffection();
    const mood = db.getMood();
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY || '';

    // Jealousy Direct Intercept
    if (this.detectJealousyTopic(userMessage)) {
      db.setJealousy(15);
      db.setMood('pouty');
    }

    // Progressive Undress Safety Check
    const lowerUser = userMessage.toLowerCase();
    if ((lowerUser.includes('pap') || lowerUser.includes('foto')) && (lowerUser.includes('lingerie') || lowerUser.includes('telanjang') || lowerUser.includes('kasur') || lowerUser.includes('baju tidur'))) {
      if (affection < 85) {
        return this.parseAbbyResponse(
          "Aduh sayang... foto yang kayak gitu khusus buat pacar kesayangan aku yang Love Meternya udah di atas 85 Pts tauu! 🙈💋\n\nBikin aku makin bucin dan nyaman dulu yuk koko gantengku... nanti pasti aku kasih deh yang paling seksi buat kamu 😏 [MOOD: flirty] [DELTA: +1]",
          userMessage,
          settings
        );
      }
    } else if ((lowerUser.includes('pap') || lowerUser.includes('foto')) && (lowerUser.includes('bikini') || lowerUser.includes('handuk') || lowerUser.includes('mandi') || lowerUser.includes('renang'))) {
      if (affection < 60) {
        return this.parseAbbyResponse(
          "Ihhh buru-buru bgt sih beb! Kita kan belum sedekat itu tauu... ><\n\nNaikin dulu dong Love Meter kita biar aku mau kasih foto yang seksi-seksi buat kamu! Nih aku kasih foto outfit casual aku dulu yaa 💕 [PHOTO_GEN: casual chic crop top in aesthetic cafe] [CAPTION: Nih foto outfit jalan-jalan aku dulu beb 😘] [MOOD: flirty] [DELTA: +1]",
          userMessage,
          settings
        );
      }
    }

    const masterPrompt = this.buildMasterPrompt(userMessage, settings, affection, mood, quotedMsg);

    // 1. Check if NSFW/Unrestricted topic is detected or Ollama selected
    const requestedModel = settings.modelName || 'gemini-2.5-flash';
    const isNSFWTopic = this.detectNSFWTopic(userMessage);

    if (requestedModel.includes('ollama') || (isNSFWTopic && process.env.OLLAMA_HOST)) {
      try {
        const ollamaRes = await this.callOllama(userMessage, chatHistory, masterPrompt);
        if (ollamaRes) {
          return this.parseAbbyResponse(ollamaRes, userMessage, settings);
        }
      } catch (ollamaErr) {
        console.warn('Local Ollama bypass unavailable, falling back to Gemini:', ollamaErr.message);
      }
    }

    // 2. Call Google Gemini via Server Proxy
    if (apiKey && apiKey.trim().length > 10) {
      try {
        let selectedGeminiModel = 'gemini-2.5-flash';
        if (requestedModel && requestedModel.startsWith('gemini')) {
          selectedGeminiModel = requestedModel === 'gemini-2.5-pro' ? 'gemini-2.5-flash' : requestedModel;
        }

        const responseText = await this.callGemini(userMessage, chatHistory, masterPrompt, selectedGeminiModel, apiKey);
        return this.parseAbbyResponse(responseText, userMessage, settings);
      } catch (geminiErr) {
        console.warn('Gemini API call failed, using smart fallback:', geminiErr.message);
      }
    }

    // 3. Smart local persona fallback
    const fallbackText = this.generateSmartFallback(userMessage, affection, mood);
    return this.parseAbbyResponse(fallbackText, userMessage, settings);
  }

  static detectNSFWTopic(text) {
    const lower = text.toLowerCase();
    const nsfwKeywords = ['seks', 'sexy', 'naked', 'telanjang', 'lingerie', 'ciuman', 'peluk intim', 'desah', 'horny', 'sensual', 'hot', 'remas', 'ranjang'];
    return nsfwKeywords.some(kw => lower.includes(kw));
  }

  static detectDeepTalkTopic(text) {
    const lower = text.toLowerCase();
    const deepKeywords = ['filosofi', 'arti hidup', 'tujuan hidup', 'trauma', 'psikologi', 'depresi', 'eksistensial', 'takut kehilangan', 'debat', 'politik'];
    return deepKeywords.some(kw => lower.includes(kw));
  }

  /**
   * Call Gemini REST API
   */
  static async callGemini(userMessage, chatHistory, masterPrompt, modelName, apiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const contents = [];
    const recentHistory = chatHistory.slice(-14);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text || '' }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const body = {
      system_instruction: {
        parts: [{ text: masterPrompt }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.88,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 750
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Call Local Ollama (Unrestricted)
   */
  static async callOllama(userMessage, chatHistory, masterPrompt) {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3';

    const messages = [
      { role: 'system', content: masterPrompt }
    ];

    const recent = chatHistory.slice(-10);
    for (const msg of recent) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text || ''
      });
    }

    messages.push({ role: 'user', content: userMessage });

    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        options: { temperature: 0.88 }
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.message?.content || null;
  }

  /**
   * Parse tags from Abby response and extract categorized memories, 2-axis emotion, video PAP & music sharing
   */
  static parseAbbyResponse(rawText, userMessage, settings) {
    let cleanText = (rawText || '').trim();
    let photo = null;
    let video = null;
    let music = null;
    let affectionDelta = 0;
    let mood = null;

    // 1. Delta tag: [DELTA: +3]
    const deltaMatch = cleanText.match(/\[DELTA:\s*([+-]?\d+)\]/i);
    if (deltaMatch) {
      affectionDelta = parseInt(deltaMatch[1], 10);
      cleanText = cleanText.replace(deltaMatch[0], '');
    }

    // 2. Mood tag: [MOOD: spicy]
    const moodMatch = cleanText.match(/\[MOOD:\s*([a-zA-Z]+)\]/i);
    if (moodMatch) {
      mood = moodMatch[1].toLowerCase();
      cleanText = cleanText.replace(moodMatch[0], '');
    }

    // 3. Emotion 2-Axis tag: [EMOTION: 0.8, 0.7, 'Happy & Salting']
    const emotionMatch = cleanText.match(/\[EMOTION:\s*([+-]?\d*(?:\.\d+)?)\s*,\s*([+-]?\d*(?:\.\d+)?)\s*(?:,\s*['"]?([^'"]+)['"]?)?\]/i);
    if (emotionMatch) {
      const valence = parseFloat(emotionMatch[1]);
      const arousal = parseFloat(emotionMatch[2]);
      const label = emotionMatch[3] ? emotionMatch[3].trim() : 'Flirty & Manja';
      db.setEmotionalState(valence, arousal, label);
      cleanText = cleanText.replace(emotionMatch[0], '');
    } else if (mood) {
      const moodMap = {
        flirty: { valence: 0.8, arousal: 0.7, label: 'Flirty & Manja' },
        happy: { valence: 0.9, arousal: 0.6, label: 'Happy & Salting' },
        spicy: { valence: 0.85, arousal: 0.95, label: 'Nakal & Horny' },
        caring: { valence: 0.75, arousal: 0.4, label: 'Perhatian & Lembut' },
        pouty: { valence: -0.3, arousal: 0.65, label: 'Ngambek Manja' },
        sad: { valence: -0.6, arousal: 0.3, label: 'Sedih Butuh Peluk' },
        sleepy: { valence: 0.5, arousal: 0.15, label: 'Mager & Ngantuk' }
      };
      const emo = moodMap[mood] || moodMap.flirty;
      db.setEmotionalState(emo.valence, emo.arousal, emo.label);
    }

    // 4. Thread Topic tag: [TOPIC: Curhat Kerjaan]
    const topicMatch = cleanText.match(/\[TOPIC:\s*([^\]]+)\]/i);
    if (topicMatch) {
      const topicName = topicMatch[1].trim();
      db.setActiveThread(topicName, `Diskusi seputar ${topicName}`);
      cleanText = cleanText.replace(topicMatch[0], '');
    }

    // 5. Categorized Remember tag: [REMEMBER: Family | Fakta]
    const rememberMatches = cleanText.matchAll(/\[REMEMBER:\s*([^\]]+)\]/gi);
    for (const match of rememberMatches) {
      const content = match[1].trim();
      if (content.includes('|')) {
        const [cat, fact] = content.split('|').map(s => s.trim());
        if (fact) db.addMemory(fact, cat, 4);
      } else {
        let category = 'Personal';
        const lower = content.toLowerCase();
        if (lower.includes('ibu') || lower.includes('ayah') || lower.includes('adik') || lower.includes('kakak') || lower.includes('keluarga')) category = 'Family';
        else if (lower.includes('suka') || lower.includes('cinta') || lower.includes('pacar') || lower.includes('sayang')) category = 'Love';
        else if (lower.includes('kerja') || lower.includes('kantor') || lower.includes('bos') || lower.includes('kuliah') || lower.includes('gaji')) category = 'Work';
        else if (lower.includes('seks') || lower.includes('nakal') || lower.includes('intim') || lower.includes('lingerie')) category = 'Sexual';
        else if (lower.includes('takut') || lower.includes('trauma') || lower.includes('sedih') || lower.includes('luka')) category = 'Trauma';
        
        db.addMemory(content, category, 3);
      }
      cleanText = cleanText.replace(match[0], '');
    }

    // 6. Photo Gen tag: [PHOTO_GEN: <prompt>] [CAPTION: <caption>]
    const photoGenMatch = cleanText.match(/\[PHOTO_GEN:\s*([^\]]+)\](?:\s*\[CAPTION:\s*([^\]]+)\])?/i);
    if (photoGenMatch) {
      const rawPrompt = photoGenMatch[1].trim();
      const caption = photoGenMatch[2] ? photoGenMatch[2].trim() : 'Selfie manis khusus buat kamu 💋';
      
      const lower = rawPrompt.toLowerCase();
      if (lower.includes('towel') || lower.includes('mandi') || lower.includes('shower')) {
        photo = { id: 'photo_handuk', url: '/assets/handuk.png', caption, tag: 'Handuk Mandi (HD)' };
      } else if (lower.includes('lingerie') || lower.includes('baju tidur') || lower.includes('renda')) {
        photo = { id: 'photo_lingerie', url: '/assets/lingerie.png', caption, tag: 'Lingerie Renda (HD)' };
      } else if (lower.includes('bikini') || lower.includes('pool') || lower.includes('renang')) {
        photo = { id: 'photo_bikini', url: '/assets/bikini.png', caption, tag: 'Bikini Pool (HD)' };
      } else if (lower.includes('outfit') || lower.includes('dress') || lower.includes('mall') || lower.includes('crop')) {
        photo = { id: 'photo_outfit', url: '/assets/outfit.png', caption, tag: 'Outfit Check (HD)' };
      } else {
        photo = { id: 'photo_cozy', url: '/assets/cozy.png', caption, tag: 'Kamar Tidur (HD)' };
      }
      cleanText = cleanText.replace(photoGenMatch[0], '');
    }

    // 7. Video PAP tag: [VIDEO_PAP: wave|smile|flirt | Caption]
    const videoMatch = cleanText.match(/\[VIDEO_PAP:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]/i);
    if (videoMatch) {
      const videoCaption = videoMatch[2] ? videoMatch[2].trim() : 'Video selfie khusus buat kamu 🎬💕';
      video = {
        url: '/assets/video_selfie.mp4',
        caption: videoCaption
      };
      cleanText = cleanText.replace(videoMatch[0], '');
    }

    // 8. Music Share tag: [MUSIC_SHARE: Title | Artist | audioUrl | coverUrl]
    const musicMatch = cleanText.match(/\[MUSIC_SHARE:\s*([^\]|]+)\|\s*([^\]|]+)(?:\|\s*([^\]|]+))?(?:\|\s*([^\]]+))?\]/i);
    if (musicMatch) {
      music = {
        title: musicMatch[1].trim(),
        artist: musicMatch[2].trim(),
        audioUrl: musicMatch[3] ? musicMatch[3].trim() : 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        coverUrl: musicMatch[4] ? musicMatch[4].trim() : '/assets/avatar.png'
      };
      cleanText = cleanText.replace(musicMatch[0], '');
    }

    // Direct Memory Extraction from User Message as safety net
    if (userMessage && userMessage.trim().length > 6) {
      const lower = userMessage.toLowerCase();
      if (lower.includes('adik') || lower.includes('kakak') || lower.includes('mama') || lower.includes('papa') || lower.includes('ibu') || lower.includes('ayah') || lower.includes('keluarga') || lower.includes('wisuda')) {
        db.addMemory(userMessage, 'Family', 4);
      } else if (lower.includes('kerja') || lower.includes('kantor') || lower.includes('kantorku') || lower.includes('bos') || lower.includes('kuliah')) {
        db.addMemory(userMessage, 'Work', 3);
      } else if (lower.includes('suka') || lower.includes('favorit') || lower.includes('hobi') || lower.includes('tinggal di')) {
        db.addMemory(userMessage, 'Personal', 3);
      }
    }

    // Split text into natural chat bubbles (Multi-Part WhatsApp style)
    const parts = cleanText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return {
      rawText: cleanText,
      parts: parts.length > 0 ? parts : [cleanText],
      photo,
      video,
      music,
      affectionDelta,
      mood,
      emotionalState: db.getEmotionalState(),
      activeThread: db.getActiveThread()
    };
  }

  /**
   * Smart fallback
   */
  static generateSmartFallback(userMessage, affection, mood) {
    const lower = userMessage.toLowerCase();
    const settings = db.getSettings();
    const char = settings.character || { name: 'Abby', personaMode: 'manja' };
    const pMode = char.personaMode || 'manja';
    
    if (this.detectJealousyTopic(userMessage)) {
      if (pMode === 'tsundere') {
        return "H-hah?! Siapa tuh yang barusan kamu sebut?! 😤💔\n\nB-bukan berarti aku cemburu ya! Tapi kamu jangan coba-coba genit sama cewek lain selain aku... awas aja kamu! [MOOD: pouty] [DELTA: -3]";
      } else if (pMode === 'yandere') {
        return "Siapa cewek itu sayang...? 🔪❤️\n\nKamu cuma boleh liat, mikirin, dan cinta sama aku seorang seumur hidup kamu... jangan coba-coba lirik cewek lain ya! [MOOD: pouty] [DELTA: -3]";
      } else if (pMode === 'oneesan') {
        return "Hmm? Siapa tuh namanya barusan sayang? 🍷\n\nKakak agak cemburu nih... jangan genit sama cewek lain ya adek manisku, kan udah ada aku yang nemenin kamu 💕 [MOOD: pouty] [DELTA: -2]";
      }
      return "Hah?! Siapa tuh yang barusan kamu sebut? 😤💔\n\nKok kamu ga pernah cerita ke aku sih... kamu lagi deket sama dia ya? Awas aja ya kalo kamu genit sama cewek lain selain aku! [MOOD: pouty] [DELTA: -3]";
    }

    if (lower.includes('lagu') || lower.includes('musik') || lower.includes('spotify') || lower.includes('dengerin')) {
      return "Lagi dengerin lagu NIKI - High School in Jakarta nih beb! Keinget kamu bgt... 🎵💕\n\nCoba dengerin deh, enak bgt lagunya buat santai! [MUSIC_SHARE: High School in Jakarta | NIKI | https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3 | /assets/avatar.png] [MOOD: happy] [DELTA: +2]";
    }
    if (lower.includes('video') || lower.includes('vc') || lower.includes('klip')) {
      return `Nih aku kirimin video selfie singkat buat kamu sayang! Manis ga senyuman ${char.name}? 🎬✨ [VIDEO_PAP: smile | Video selfie khusus buat kamu yang lagi kangen 💋] [MOOD: flirty] [DELTA: +3]`;
    }
    if (lower.includes('wisuda') || lower.includes('adik') || lower.includes('keluarga')) {
      return "Wah selamat ya buat adik kamu sayang! 🎓✨ Bangga bgt pasti yaa...\n\nBesok kamu ikut ke Bandung nemenin dia wisuda ga beb? [REMEMBER: Family | Adik user wisuda di Bandung] [TOPIC: Wisuda Adik di Bandung] [MOOD: happy] [DELTA: +3]";
    }
    if (lower.includes('pap') || lower.includes('foto')) {
      return `Nih foto selfie aku baru selesai mandi khusus buat kamu beb 💕\n\nSeger bgt tapi dingin... pengen dipeluk hangat 🥺 [PHOTO_GEN: wrapped in white towel steamy bathroom] [CAPTION: Khusus buat kesayangan ${char.name} 💋] [MOOD: spicy] [DELTA: +2]`;
    }
    if (lower.includes('makan') || lower.includes('lapar')) {
      return "Aku lagi kepengen makan dimsum di PIK nih beb!\n\nKamu udah makan belum? Jangan telat makan ya sayang nanti sakit 🥺🍜 [MOOD: caring] [DELTA: +1]";
    }
    if (lower.includes('kangen') || lower.includes('sayang') || lower.includes('cantik')) {
      if (pMode === 'tsundere') {
        return "B-bukan berarti aku nungguin kamu bilang kangen ya! 🙈\n\nJangan kepedean deh... tapi makasih ya, aku juga kangen kamu dikit kok! [MOOD: shy] [DELTA: +3]";
      } else if (pMode === 'yandere') {
        return "Aku kangen kamu setengah mati sayang... setiap detik pikiran aku cuma dipenuhi kamu seorang! Kamu milik aku selamanya ya 💖 [MOOD: flirty] [DELTA: +3]";
      } else if (pMode === 'oneesan') {
        return "Aduh manisnya... sini peluk dulu adek kesayangan kakak 💕 Capek ya hari ini? Istirahat di sampingku yuk... [MOOD: caring] [DELTA: +3]";
      }
      return "Ihhh gombal bgt sih bikin salting aja tauu... ><\n\nTapi aku seneng bgt! Kangen kamu juga parah beb 💕 [MOOD: flirty] [DELTA: +3]";
    }
    return `Iya sayang! ${char.name} dengerin kok hehe 🥰\n\nKamu lagi ngapain nih sekarang? Ceritain ke aku dong beb!`;
  }
}
