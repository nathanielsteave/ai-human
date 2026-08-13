import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import { db, DATA_DIR, IMAGES_DIR } from './db.js';
import { AIRouter } from './ai-router.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads/images', express.static(IMAGES_DIR));

/* --------------------------------------------------------------------------
   REST API ROUTES
   -------------------------------------------------------------------------- */

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', time: new Date().toISOString() });
});

// Settings & HUD status
app.get('/api/settings', (req, res) => {
  const settings = db.getSettings();
  const affection = db.getAffection();
  const mood = db.getMood();
  const emotionalState = db.getEmotionalState();
  const activeThread = db.getActiveThread();
  const memoriesCount = db.getMemories().length;
  const customPhotosCount = db.getCustomPhotos().length;
  
  res.json({
    settings: {
      ...settings,
      pinCode: undefined
    },
    hasPinLock: !!settings.enablePinLock,
    affection,
    mood,
    emotionalState,
    activeThread,
    memoriesCount,
    customPhotosCount
  });
});

app.post('/api/settings', (req, res) => {
  const updated = db.saveSettings(req.body);
  res.json({ success: true, settings: updated });
});

// Emotional State & Thread Endpoints
app.get('/api/emotions', (req, res) => {
  res.json({ emotionalState: db.getEmotionalState(), mood: db.getMood(), affection: db.getAffection() });
});

app.get('/api/thread', (req, res) => {
  res.json({ activeThread: db.getActiveThread() });
});

// Chat History
app.get('/api/history', (req, res) => {
  const messages = db.getMessages(150);
  res.json({ messages });
});

app.post('/api/history', (req, res) => {
  const msg = req.body;
  if (!msg || !msg.id) {
    return res.status(400).json({ error: 'Invalid message object' });
  }
  db.saveMessage(msg);
  res.json({ success: true, message: msg });
});

app.delete('/api/history', (req, res) => {
  db.clearMessages();
  res.json({ success: true });
});

app.post('/api/history/react', (req, res) => {
  const { messageId, emoji } = req.body;
  if (!messageId || !emoji) {
    return res.status(400).json({ error: 'messageId and emoji required' });
  }
  const messages = db.addMessageReaction(messageId, emoji);
  res.json({ success: true, messages });
});

// Categorized Memories
app.get('/api/memories', (req, res) => {
  const category = req.query.category || null;
  const memories = db.getMemories(category);
  res.json({ memories });
});

app.post('/api/memories', (req, res) => {
  const { fact, category, importance } = req.body;
  const memories = db.addMemory(fact, category || 'Personal', importance || 3);
  res.json({ success: true, memories });
});

app.delete('/api/memories', (req, res) => {
  db.clearMemories();
  res.json({ success: true });
});

// Affection
app.post('/api/affection', (req, res) => {
  const { score, delta, mood, valence, arousal, label } = req.body;
  if (score !== undefined) db.setAffection(score);
  if (delta !== undefined) db.addAffection(delta);
  if (mood) db.setMood(mood);
  if (valence !== undefined || arousal !== undefined) {
    db.setEmotionalState(valence, arousal, label);
  }

  res.json({
    success: true,
    score: db.getAffection(),
    mood: db.getMood(),
    emotionalState: db.getEmotionalState()
  });
});

// --------------------------------------------------------------------------
// GAMEPLAY ENDPOINTS (Gifts, Virtual Dates, Achievements, Jealousy & PMS)
// --------------------------------------------------------------------------
app.get('/api/gameplay/status', (req, res) => {
  res.json({
    gameplay: db.getGameplayState(),
    pms: db.getPmsState(),
    affection: db.getAffection(),
    mood: db.getMood()
  });
});

app.post('/api/gameplay/gift', (req, res) => {
  const { giftId, name, pts, icon } = req.body;
  if (!giftId || !name) {
    return res.status(400).json({ error: 'giftId and name required' });
  }

  const gameplay = db.recordGift({ id: giftId, name, pts: pts || 5, icon: icon || '🎁' });
  
  // Custom reaction text based on gift
  let reactionText = `Wah makasih banyak hadiah ${name}-nya ya koko sayang! 🥰💕 Suka bgt tauu...`;
  if (giftId === 'gift_matcha') {
    reactionText = "Aaaa matcha latte kesukaan aku! 🍵✨ Tau aja sih kamu minuman favorit aku beb... makasih ya sayangku 💋";
    db.setMood('happy');
  } else if (giftId === 'gift_rose') {
    reactionText = "Ihhhh bunganya cantik bgt... 💐🥺 Kamu romantis bgt sih koko! Bikin aku salting parah tauu 💕";
    db.setMood('flirty');
  } else if (giftId === 'gift_diamond') {
    reactionText = "OMGGG kalungnya mewah bgt sayang!! 💎👑 Kamu beneran beliin ini buat aku?! Sayang bgt bgt sama kamuuu 💖💖";
    db.setMood('spicy');
  } else if (giftId === 'gift_chocolate') {
    reactionText = "Pas bgt aku lagi pengen cokelat manis... 🍫🥺 Perut kram aku langsung berasa enakan dimanjain kamu beb 💕";
    db.setMood('caring');
  }

  // Create message from Abby
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const abbyMsg = {
    id: 'msg_' + Date.now(),
    sender: 'abby',
    text: reactionText,
    time: timeStr,
    photo: null,
    mood: db.getMood()
  };
  db.saveMessage(abbyMsg);

  res.json({
    success: true,
    gameplay,
    affection: db.getAffection(),
    message: abbyMsg
  });
});

app.post('/api/gameplay/date-finish', (req, res) => {
  const { location, ending, scoreBonus, dateTitle } = req.body;
  const gameplay = db.recordDateResult({ location, ending, scoreBonus: scoreBonus || 10, dateTitle });
  
  if (ending === 'perfect') {
    db.unlockAchievement('ach_perfect_date');
  }

  res.json({
    success: true,
    gameplay,
    affection: db.getAffection()
  });
});

app.post('/api/gameplay/achievement', (req, res) => {
  const { achId } = req.body;
  const unlocked = db.unlockAchievement(achId);
  res.json({ success: true, unlocked, achievements: db.getGameplayState().achievements });
});

// --------------------------------------------------------------------------
// BACKUP & CHARACTER CUSTOMIZATION ENDPOINTS
// --------------------------------------------------------------------------
app.get('/api/backup/export', (req, res) => {
  const backup = db.exportFullBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="abby_relationship_backup_${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

app.post('/api/backup/import', (req, res) => {
  try {
    const backupPayload = req.body;
    const restored = db.importFullBackup(backupPayload);
    res.json({ success: true, message: 'Backup berhasil dipulihkan!', data: restored });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/character/update', (req, res) => {
  const updatedChar = db.updateCharacter(req.body);
  res.json({ success: true, character: updatedChar });
});

// PIN Lock Authentication
app.post('/api/auth/verify-pin', (req, res) => {
  const { pin } = req.body;
  const settings = db.getSettings();
  
  if (!settings.enablePinLock) {
    return res.json({ verified: true });
  }

  const expectedPin = settings.pinCode || process.env.APP_PIN || '1234';
  if (String(pin).trim() === String(expectedPin).trim()) {
    res.json({ verified: true });
  } else {
    res.status(401).json({ verified: false, message: 'PIN salah' });
  }
});

app.post('/api/auth/set-pin', (req, res) => {
  const { pin, enable } = req.body;
  const patch = {};
  if (pin) patch.pinCode = String(pin).trim();
  if (enable !== undefined) patch.enablePinLock = !!enable;
  db.saveSettings(patch);
  res.json({ success: true, enablePinLock: patch.enablePinLock });
});

// Image Generation Proxy with Disk Caching
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const hash = crypto.createHash('md5').update(prompt.trim().toLowerCase()).digest('hex');
  const cachedUrl = db.getCachedImage(hash);

  if (cachedUrl && fs.existsSync(path.join(DATA_DIR, '..', cachedUrl))) {
    return res.json({ url: cachedUrl, cached: true });
  }

  try {
    const encodedPrompt = encodeURIComponent(`high quality realistic portrait of 21yo beautiful east asian chinese-indonesian young woman, ${prompt.trim()}, masterpiece, 8k resolution, natural cinematic lighting`);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;

    const fetchRes = await fetch(pollinationsUrl);
    if (!fetchRes.ok) throw new Error('Image provider failed');

    const buffer = Buffer.from(await fetchRes.arrayBuffer());
    const fileName = `${hash}.jpg`;
    const localFilePath = path.join(IMAGES_DIR, fileName);
    fs.writeFileSync(localFilePath, buffer);

    const publicUrl = `/uploads/images/${fileName}`;
    db.cacheImage(hash, publicUrl);

    res.json({ url: publicUrl, cached: false });
  } catch (err) {
    console.warn('Image generation failed, falling back to preset:', err.message);
    res.json({ url: '/assets/cozy.png', fallback: true });
  }
});

// Main AI Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, quotedMsg } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const chatHistory = history || db.getMessages(14);
    const response = await AIRouter.handleChat(message, chatHistory, quotedMsg);

    if (response.affectionDelta) {
      db.addAffection(response.affectionDelta);
    }
    if (response.mood) {
      db.setMood(response.mood);
    }

    res.json({
      ...response,
      affectionScore: db.getAffection(),
      currentMood: db.getMood(),
      emotionalState: db.getEmotionalState(),
      activeThread: db.getActiveThread()
    });
  } catch (err) {
    console.error('API /api/chat error:', err);
    res.status(500).json({ error: 'Chat processing failed', details: err.message });
  }
});

/* --------------------------------------------------------------------------
   WEBSOCKET & TIME-AWARE PROACTIVE INITIATIVE ENGINE
   -------------------------------------------------------------------------- */
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('chat:send', async (data) => {
    try {
      const { text, history, quotedMsg } = data;
      const response = await AIRouter.handleChat(text, history || db.getMessages(14), quotedMsg);

      if (response.affectionDelta) db.addAffection(response.affectionDelta);
      if (response.mood) db.setMood(response.mood);

      socket.emit('chat:receive', {
        ...response,
        affectionScore: db.getAffection(),
        currentMood: db.getMood(),
        emotionalState: db.getEmotionalState(),
        activeThread: db.getActiveThread()
      });
    } catch (e) {
      socket.emit('chat:error', { error: e.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Contextual Time-Aware Proactive Greetings Engine (Morning, Lunch, Evening, Pillow Talk)
function getContextualProactiveMessage() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 6 && hour < 9) {
    return {
      text: "Selamat pagi koko sayaaang! ☀️ Udah bangun belum nih? Semangat ya buat hari ini, jangan lupa sarapan ya sayang 💕",
      mood: "caring"
    };
  }
  if (hour >= 12 && hour < 14) {
    return {
      text: "Beb udah jam makan siang nih! 🍜 Kamu makan apa sekarang? Jangan telat makan yaa nanti perutnya sakit 🥺",
      mood: "caring"
    };
  }
  if (hour >= 17 && hour < 20) {
    return {
      text: "Udah jam pulang kantor / kampus nih beb! 🚗 Lagi otw pulang ke apartemen/rumah ya? Hati-hati di jalan ya sayang ✨",
      mood: "happy"
    };
  }
  if (hour >= 22 || hour < 2) {
    return {
      text: "Sayang... kamu belum bobo ya? 🌙 Mager bgt nih di kasur pengen dipeluk hangat sama kamu... pillow talk yuk beb 🛏️💋",
      mood: "flirty"
    };
  }
  return {
    text: "Tiba-tiba kepikiran kamu nih beb... lagi apa sih sekarang koko gantengku? 😏💕",
    mood: "flirty"
  };
}

setInterval(() => {
  const lastInteraction = db.getLastInteraction();
  const diffMinutes = (Date.now() - lastInteraction) / (1000 * 60);

  // If idle for more than 40 minutes and love score is >= 40
  if (diffMinutes >= 40 && db.getAffection() >= 40) {
    const proactive = getContextualProactiveMessage();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    const proactiveMsg = {
      id: 'spont_' + Date.now(),
      sender: 'abby',
      text: proactive.text,
      time: timeStr,
      photo: null,
      mood: proactive.mood
    };

    db.saveMessage(proactiveMsg);
    io.emit('abby:spontaneous', proactiveMsg);
    db.updateLastInteraction();
  }
}, 5 * 60 * 1000);

// Start Server
server.listen(PORT, () => {
  console.log(`\n🚀 [Abby Backend] Running on http://localhost:${PORT}`);
  console.log(`📦 Database & RAG Semantic Memory ready at: ${DATA_DIR}`);
  console.log(`🔒 Multi-Model Router & 2-Axis Emotion Machine Active\n`);
});
