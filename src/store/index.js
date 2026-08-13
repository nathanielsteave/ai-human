/**
 * Centralized Reactive State Management Store for Abby AI Girlfriend
 * Implements lightweight EventEmitter / PubSub pattern with single source of truth.
 */
class AppStore {
  constructor() {
    this.state = {
      messages: [],
      settings: {
        userName: 'Kamu',
        modelName: 'gemini-2.5-flash',
        papMode: 'preset',
        theme: 'midnight',
        enablePinLock: false,
        pinCode: '1234',
        enableEncryption: false,
        character: {
          name: 'Abby',
          age: 21,
          ethnicity: 'Chindo Jakarta',
          personaMode: 'manja',
          backstory: 'Cece kesayangan kamu yang paling manja, perhatian, dan bucin 💕',
          customPromptInjection: ''
        }
      },
      affection: {
        score: 30,
        mood: 'flirty',
        emotionalState: {
          valence: 0.7,
          arousal: 0.6,
          label: 'Flirty & Manja'
        }
      },
      activeThread: {
        topic: 'Kenalan & Sapaan Hangat',
        context: 'Baru saling mengenal dan PDKT santai',
        lastUpdated: Date.now()
      },
      memories: [],
      customPhotos: [],
      gameplay: {
        giftsSent: [],
        achievements: ['ach_meeting'],
        dateHistory: [],
        jealousyLevel: 0
      },
      pms: {
        cycleDay: 14,
        isPms: false
      },
      ui: {
        isReplying: false,
        isRecordingVN: false,
        isListeningMic: false,
        activeQuotedMsg: null,
        activeMemoryCategory: 'Semua',
        ambientMode: null
      }
    };

    this.listeners = new Map();
  }

  /**
   * Get complete state snapshot
   */
  getState() {
    return this.state;
  }

  /**
   * Update state and notify listeners
   */
  setState(updater) {
    const patch = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = {
      ...this.state,
      ...patch,
      settings: {
        ...this.state.settings,
        ...(patch.settings || {}),
        character: {
          ...(this.state.settings.character || {}),
          ...(patch.settings?.character || {})
        }
      },
      affection: {
        ...this.state.affection,
        ...(patch.affection || {})
      },
      ui: {
        ...this.state.ui,
        ...(patch.ui || {})
      }
    };

    this.emit('*', this.state);
    Object.keys(patch).forEach(key => this.emit(key, this.state[key]));
  }

  /**
   * Subscribe to state slice changes
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(key);
      }
    };
  }

  /**
   * Emit event to subscribers
   */
  emit(key, data) {
    const set = this.listeners.get(key);
    if (set) {
      set.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in subscriber callback for key "${key}":`, err);
        }
      });
    }
  }

  // Helper Getters
  getCharacter() {
    return this.state.settings.character;
  }

  getAffectionScore() {
    return this.state.affection.score;
  }

  getMood() {
    return this.state.affection.mood;
  }

  getMessages() {
    return this.state.messages;
  }
}

export const appStore = new AppStore();
