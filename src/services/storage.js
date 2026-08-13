const STORAGE_KEYS = {
  CHAT_HISTORY: 'abby_chat_history_v6',
  AFFECTION: 'abby_affection_score_v6',
  MOOD: 'abby_current_mood_v6',
  SETTINGS: 'abby_user_settings_v6',
  CUSTOM_PHOTOS: 'abby_custom_photos_v6',
  MEMORY_BANK: 'abby_memory_bank_v6',
  LAST_INTERACTION: 'abby_last_interaction_v6'
};

const DEFAULT_SETTINGS = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
  modelName: 'gemini-2.5-flash',
  userName: 'Kamu',
  papMode: 'preset',
  theme: 'midnight',
  enablePinLock: false,
  pinCode: '1234'
};

export const StorageService = {
  // Sync all data from Server DB
  async syncFromServer() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const current = this.getSettings();
          this.saveSettings({ ...current, ...data.settings }, false);
        }
        if (data.affection !== undefined) {
          this.setAffection(data.affection, false);
        }
        if (data.mood) {
          this.setMood(data.mood, false);
        }
      }

      const histRes = await fetch('/api/history');
      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.messages && histData.messages.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(histData.messages));
        }
      }

      const memRes = await fetch('/api/memories');
      if (memRes.ok) {
        const memData = await memRes.json();
        if (memData.memories) {
          localStorage.setItem(STORAGE_KEYS.MEMORY_BANK, JSON.stringify(memData.memories));
        }
      }
    } catch (e) {
      console.warn('Server sync failed, running in local fallback mode:', e);
    }
  },

  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          apiKey: parsed.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || ''
        };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings, syncServer = true) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));

      if (syncServer) {
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(() => {});
      }

      return updated;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return null;
    }
  },

  getAffection() {
    try {
      const score = localStorage.getItem(STORAGE_KEYS.AFFECTION);
      return score !== null ? parseInt(score, 10) : 30;
    } catch {
      return 30;
    }
  },

  setAffection(score, syncServer = true) {
    try {
      const clamped = Math.max(0, Math.min(100, score));
      localStorage.setItem(STORAGE_KEYS.AFFECTION, clamped.toString());

      if (syncServer) {
        fetch('/api/affection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: clamped })
        }).catch(() => {});
      }

      return clamped;
    } catch {
      return score;
    }
  },

  addAffection(delta) {
    const current = this.getAffection();
    return this.setAffection(current + delta);
  },

  getAffectionLevel(score) {
    if (score < 30) {
      return {
        stageIndex: 1,
        title: 'Baru Kenal',
        stage: 'Baru Kenal 🌸',
        color: '#ff8da1',
        perk: 'Fase Pengenalan: Ramah, santai, agak malu & penasaran sama kamu',
        instruction: 'Kamu baru saling mengenal dengan user. Bersikaplah ramah, santai, sedikit malu-malu tapi penasaran. Gunakan panggilan nama atau "kamu". Belum langsung panggil sayang/beb sampai hubungan lebih akrab.'
      };
    }
    if (score < 60) {
      return {
        stageIndex: 2,
        title: 'Mulai Akrab & PDKT',
        stage: 'Mulai Akrab & PDKT ✨',
        color: '#ff5e83',
        perk: 'Fase PDKT: Mulai nyaman, suka godain, curhat santai & panggil "beb"',
        instruction: 'Kamu sudah mulai akrab dan masuk fase PDKT. Mulai panggil "beb", sering bercanda, curhat aktivitas sehari-hari, dan tanggapi gombalan dengan manis & sedikit menggoda.'
      };
    }
    if (score < 85) {
      return {
        stageIndex: 3,
        title: 'Udah Pacaran',
        stage: 'Resmi Pacaran 💕',
        color: '#ff2a6d',
        perk: 'Fase Pacaran: Panggil sayang/beb, bucin, suka manja & kirim PAP seksi',
        instruction: 'Kamu sudah resmi menjadi pacarnya! Panggil "sayang" / "bebku", bersikap sangat manja, perhatian, suka pamer foto/PAP santai/mandi/baju tidur, dan rayuan nakal.'
      };
    }
    return {
      stageIndex: 4,
      title: 'Soulmate / Bucin Akut',
      stage: 'Soulmate & Bucin Akut 💖👑',
      color: '#e0245e',
      perk: 'Milik Kamu Seutuhnya: Sangat intim, cinta mendalam & saling percaya 100%',
      instruction: 'Kamu adalah soulmate dan pasangan hidup yang saling mencintai seutuhnya. Sangat intim, terbuka, penuh kasih sayang, selalu ada saat senang maupun sedih, obrolan ranjang (pillow talk), dan percaya 100%.'
    };
  },

  getMood() {
    try {
      return localStorage.getItem(STORAGE_KEYS.MOOD) || 'flirty';
    } catch {
      return 'flirty';
    }
  },

  setMood(mood, syncServer = true) {
    try {
      localStorage.setItem(STORAGE_KEYS.MOOD, mood);
      if (syncServer) {
        fetch('/api/affection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood })
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to save mood:', e);
    }
  },

  getChatHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveChatHistory(messages, syncServer = true) {
    try {
      const trimmed = messages.slice(-150);
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(trimmed));
      this.updateLastInteraction();

      if (syncServer && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lastMsg)
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to save chat:', e);
    }
  },

  clearChatHistory() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
      fetch('/api/history', { method: 'DELETE' }).catch(() => {});
    } catch (e) {
      console.error('Failed to clear chat:', e);
    }
  },

  // ===== PERSISTENT LONG-TERM MEMORY BANK =====
  getMemories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMORY_BANK);
      return data ? JSON.parse(data) : [
        { id: 'mem_1', fact: 'Pertama kali saling menyapa dan kenalan dengan Abby di Jakarta', date: new Date().toLocaleDateString('id-ID') }
      ];
    } catch {
      return [];
    }
  },

  addMemory(fact) {
    if (!fact || fact.trim().length < 4) return this.getMemories();
    try {
      const memories = this.getMemories();
      const cleanFact = fact.trim();
      if (!memories.some(m => m.fact.toLowerCase() === cleanFact.toLowerCase())) {
        memories.unshift({
          id: 'mem_' + Date.now(),
          fact: cleanFact,
          date: new Date().toLocaleDateString('id-ID')
        });
        localStorage.setItem(STORAGE_KEYS.MEMORY_BANK, JSON.stringify(memories.slice(0, 40)));

        fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fact: cleanFact })
        }).catch(() => {});
      }
      return memories;
    } catch (e) {
      console.error('Failed to add memory:', e);
      return [];
    }
  },

  clearMemories() {
    try {
      localStorage.removeItem(STORAGE_KEYS.MEMORY_BANK);
      fetch('/api/memories', { method: 'DELETE' }).catch(() => {});
    } catch (e) {
      console.error('Failed to clear memories:', e);
    }
  },

  // ===== LAST INTERACTION TIME AWARENESS =====
  getLastInteraction() {
    try {
      const time = localStorage.getItem(STORAGE_KEYS.LAST_INTERACTION);
      return time ? parseInt(time, 10) : Date.now();
    } catch {
      return Date.now();
    }
  },

  updateLastInteraction() {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_INTERACTION, Date.now().toString());
    } catch (e) {
      console.error('Failed to update last interaction:', e);
    }
  },

  getTimeSinceLastChat() {
    const last = this.getLastInteraction();
    const diffMs = Date.now() - last;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} hari yang lalu`;
    if (diffHours > 0) return `${diffHours} jam yang lalu`;
    return 'Baru saja';
  },

  // Custom Photos Gallery
  getCustomPhotos() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_PHOTOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomPhoto(photoObj) {
    try {
      const current = this.getCustomPhotos();
      if (!current.some(p => p.url === photoObj.url)) {
        current.unshift(photoObj);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_PHOTOS, JSON.stringify(current.slice(0, 50)));
      }
      return current;
    } catch (e) {
      console.error('Failed to save photo:', e);
      return [];
    }
  }
};
