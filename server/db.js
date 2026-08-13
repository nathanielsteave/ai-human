import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'abby-db.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

// Ensure data and images directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const DEFAULT_DB = {
  settings: {
    userName: 'Kamu',
    modelName: 'gemini-2.5-flash',
    papMode: 'preset',
    theme: 'midnight',
    enablePinLock: false,
    pinCode: '1234',
    character: {
      name: 'Abby',
      age: 21,
      ethnicity: 'Chindo Jakarta',
      personaMode: 'manja', // 'manja', 'oneesan', 'tsundere', 'yandere'
      backstory: 'Cece kesayangan kamu yang paling manja, perhatian, dan bucin 💕',
      customPromptInjection: ''
    }
  },
  affection: {
    score: 30,
    mood: 'flirty',
    lastInteraction: Date.now(),
    // 2-Axis Emotional State Machine (Valence: -1.0 to 1.0, Arousal: 0.0 to 1.0)
    emotionalState: {
      valence: 0.7,
      arousal: 0.6,
      label: 'Flirty & Manja'
    }
  },
  gameplay: {
    giftsSent: [],
    achievements: ['ach_meeting'],
    dateHistory: [],
    jealousyLevel: 0,
    pmsCycleDay: 14 // Day 26-28 is PMS
  },
  activeThread: {
    topic: 'Kenalan & Sapaan Hangat',
    context: 'Baru saling mengenal dan PDKT santai',
    lastUpdated: Date.now()
  },
  memories: [
    { 
      id: 'mem_1', 
      fact: 'Pertama kali saling menyapa dan kenalan dengan Abby di Jakarta', 
      category: 'Personal',
      importance: 5,
      date: new Date().toLocaleDateString('id-ID') 
    }
  ],
  messages: [],
  customPhotos: [],
  cachedImages: {}
};

class Database {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_DB,
          ...parsed,
          settings: { 
            ...DEFAULT_DB.settings, 
            ...(parsed.settings || {}),
            character: {
              ...DEFAULT_DB.settings.character,
              ...(parsed.settings?.character || {})
            }
          },
          affection: { 
            ...DEFAULT_DB.affection, 
            ...(parsed.affection || {}),
            emotionalState: {
              ...DEFAULT_DB.affection.emotionalState,
              ...(parsed.affection?.emotionalState || {})
            }
          },
          gameplay: { ...DEFAULT_DB.gameplay, ...(parsed.gameplay || {}) },
          activeThread: { ...DEFAULT_DB.activeThread, ...(parsed.activeThread || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to read database file, initializing default:', e);
    }
    this.save(DEFAULT_DB);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  save(data = this.data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  // Settings & Character Customization
  getSettings() {
    return this.data.settings;
  }

  saveSettings(patch) {
    this.data.settings = { 
      ...this.data.settings, 
      ...patch,
      character: {
        ...(this.data.settings.character || DEFAULT_DB.settings.character),
        ...(patch.character || {})
      }
    };
    this.save();
    return this.data.settings;
  }

  getCharacter() {
    return this.data.settings.character || DEFAULT_DB.settings.character;
  }

  updateCharacter(characterPatch) {
    this.data.settings.character = {
      ...(this.data.settings.character || DEFAULT_DB.settings.character),
      ...characterPatch
    };
    this.save();
    return this.data.settings.character;
  }

  // Full Backup Import & Export
  exportFullBackup() {
    return {
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      data: {
        settings: this.data.settings,
        affection: this.data.affection,
        gameplay: this.data.gameplay,
        activeThread: this.data.activeThread,
        memories: this.data.memories,
        messages: this.data.messages,
        customPhotos: this.data.customPhotos
      }
    };
  }

  importFullBackup(backupPayload) {
    if (!backupPayload || !backupPayload.data) {
      throw new Error('Invalid backup file structure');
    }
    const d = backupPayload.data;
    this.data = {
      ...DEFAULT_DB,
      settings: { ...DEFAULT_DB.settings, ...(d.settings || {}) },
      affection: { ...DEFAULT_DB.affection, ...(d.affection || {}) },
      gameplay: { ...DEFAULT_DB.gameplay, ...(d.gameplay || {}) },
      activeThread: { ...DEFAULT_DB.activeThread, ...(d.activeThread || {}) },
      memories: Array.isArray(d.memories) ? d.memories : [],
      messages: Array.isArray(d.messages) ? d.messages : [],
      customPhotos: Array.isArray(d.customPhotos) ? d.customPhotos : [],
      cachedImages: this.data.cachedImages || {}
    };
    this.save();
    return this.data;
  }

  // Affection & Mood & 2-Axis Emotion
  getAffection() {
    return this.data.affection.score ?? 30;
  }

  setAffection(score) {
    const clamped = Math.max(0, Math.min(100, score));
    this.data.affection.score = clamped;
    this.data.affection.lastInteraction = Date.now();
    this.save();
    return clamped;
  }

  addAffection(delta) {
    const current = this.getAffection();
    return this.setAffection(current + delta);
  }

  getMood() {
    return this.data.affection.mood || 'flirty';
  }

  setMood(mood) {
    this.data.affection.mood = mood;
    this.save();
    return mood;
  }

  getEmotionalState() {
    return this.data.affection.emotionalState || { valence: 0.7, arousal: 0.6, label: 'Flirty & Manja' };
  }

  setEmotionalState(valence, arousal, label) {
    if (!this.data.affection.emotionalState) {
      this.data.affection.emotionalState = {};
    }
    if (valence !== undefined) this.data.affection.emotionalState.valence = Math.max(-1, Math.min(1, valence));
    if (arousal !== undefined) this.data.affection.emotionalState.arousal = Math.max(0, Math.min(1, arousal));
    if (label) this.data.affection.emotionalState.label = label;
    this.save();
    return this.data.affection.emotionalState;
  }

  // GAMEPLAY SYSTEM: Gifts, Dates, Achievements, Jealousy & PMS
  getGameplayState() {
    if (!this.data.gameplay) {
      this.data.gameplay = { ...DEFAULT_DB.gameplay };
    }
    return this.data.gameplay;
  }

  recordGift(gift) {
    const gp = this.getGameplayState();
    if (!gp.giftsSent) gp.giftsSent = [];
    gp.giftsSent.push({
      ...gift,
      timestamp: Date.now()
    });
    this.addAffection(gift.pts || 5);
    this.save();
    return gp;
  }

  unlockAchievement(achId) {
    const gp = this.getGameplayState();
    if (!gp.achievements) gp.achievements = [];
    if (!gp.achievements.includes(achId)) {
      gp.achievements.push(achId);
      this.save();
      return true;
    }
    return false;
  }

  recordDateResult(dateResult) {
    const gp = this.getGameplayState();
    if (!gp.dateHistory) gp.dateHistory = [];
    gp.dateHistory.push({
      ...dateResult,
      timestamp: Date.now()
    });
    if (dateResult.scoreBonus) {
      this.addAffection(dateResult.scoreBonus);
    }
    this.save();
    return gp;
  }

  setJealousy(delta) {
    const gp = this.getGameplayState();
    gp.jealousyLevel = Math.max(0, Math.min(100, (gp.jealousyLevel || 0) + delta));
    this.save();
    return gp.jealousyLevel;
  }

  getPmsState() {
    const gp = this.getGameplayState();
    const day = gp.pmsCycleDay || 14;
    return {
      cycleDay: day,
      isPms: day >= 26 && day <= 28
    };
  }

  // Conversational Thread Tracking
  getActiveThread() {
    return this.data.activeThread || { topic: 'Umum & Santai', context: 'Ngobrol santai', lastUpdated: Date.now() };
  }

  setActiveThread(topic, context = '') {
    this.data.activeThread = {
      topic: topic || 'Umum & Santai',
      context: context || '',
      lastUpdated: Date.now()
    };
    this.save();
    return this.data.activeThread;
  }

  getLastInteraction() {
    return this.data.affection.lastInteraction || Date.now();
  }

  updateLastInteraction() {
    this.data.affection.lastInteraction = Date.now();
    this.save();
  }

  // Messages
  getMessages(limit = 150) {
    return (this.data.messages || []).slice(-limit);
  }

  saveMessage(msg) {
    if (!this.data.messages) this.data.messages = [];
    this.data.messages.push(msg);
    if (this.data.messages.length > 250) {
      this.data.messages = this.data.messages.slice(-250);
    }
    this.updateLastInteraction();
    this.save();
    return msg;
  }

  saveAllMessages(messages) {
    this.data.messages = messages.slice(-250);
    this.updateLastInteraction();
    this.save();
    return this.data.messages;
  }

  clearMessages() {
    this.data.messages = [];
    this.save();
  }

  addMessageReaction(messageId, emoji) {
    const msg = (this.data.messages || []).find(m => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      const existing = msg.reactions.find(r => r.emoji === emoji);
      if (existing) {
        existing.count += 1;
      } else {
        msg.reactions.push({ emoji, count: 1 });
      }
      this.save();
    }
    return this.data.messages;
  }

  // Memories with Category Tagging
  getMemories(category = null) {
    const list = this.data.memories || [];
    if (category && category !== 'Semua') {
      return list.filter(m => (m.category || 'Personal').toLowerCase() === category.toLowerCase());
    }
    return list;
  }

  addMemory(fact, category = 'Personal', importance = 3) {
    if (!fact || fact.trim().length < 3) return this.getMemories();
    if (!this.data.memories) this.data.memories = [];
    const clean = fact.trim();
    if (!this.data.memories.some(m => m.fact.toLowerCase() === clean.toLowerCase())) {
      this.data.memories.unshift({
        id: 'mem_' + Date.now(),
        fact: clean,
        category: category || 'Personal',
        importance: importance || 3,
        date: new Date().toLocaleDateString('id-ID')
      });
      if (this.data.memories.length > 80) {
        this.data.memories = this.data.memories.slice(0, 80);
      }
      this.save();
    }
    return this.data.memories;
  }

  clearMemories() {
    this.data.memories = [];
    this.save();
  }

  // Custom Photos
  getCustomPhotos() {
    return this.data.customPhotos || [];
  }

  saveCustomPhoto(photo) {
    if (!this.data.customPhotos) this.data.customPhotos = [];
    if (!this.data.customPhotos.some(p => p.url === photo.url)) {
      this.data.customPhotos.unshift(photo);
      if (this.data.customPhotos.length > 60) {
        this.data.customPhotos = this.data.customPhotos.slice(0, 60);
      }
      this.save();
    }
    return this.data.customPhotos;
  }

  // Image Caching
  getCachedImage(key) {
    return this.data.cachedImages ? this.data.cachedImages[key] : null;
  }

  cacheImage(key, localPath) {
    if (!this.data.cachedImages) this.data.cachedImages = {};
    this.data.cachedImages[key] = localPath;
    this.save();
  }

  // Reset
  resetAll() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DB));
    this.save();
    return this.data;
  }
}

export const db = new Database();
export { DATA_DIR, IMAGES_DIR };
