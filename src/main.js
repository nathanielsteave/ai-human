import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';
import { INITIAL_GREETINGS, QUICK_TOPICS, DEFAULT_PHOTOS } from './config/prompt.js';
import { StorageService } from './services/storage.js';
import { GeminiService } from './services/gemini.js';
import { audioService } from './services/audio.js';
import { CryptoService } from './services/crypto.js';
import { appStore } from './store/index.js';

// PWA Deferred Install Prompt
let deferredPrompt = null;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('✅ [PWA] Service Worker registered:', reg.scope);
    }).catch((err) => {
      console.warn('⚠️ [PWA] Service Worker registration failed:', err);
    });
  });
}

// Socket.io WebSocket Client
let socket = null;
try {
  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnection: true
  });

  socket.on('connect', () => {
    console.log('⚡ Connected to Abby WebSocket Server');
  });

  // Listen for spontaneous proactive messages from Abby
  socket.on('abby:spontaneous', (proactiveMsg) => {
    messages.push(proactiveMsg);
    appendMessageElement(proactiveMsg, true);
    StorageService.saveChatHistory(messages, false);
    appStore.setState({ messages });
    scrollToBottom();
    triggerAvatarHeartBurst();
    triggerAvatarBlush();
    audioService.playNotificationSound();
  });
} catch (e) {
  console.warn('WebSocket client init failed:', e);
}

// DOM Elements - Chat & Input
const chatStream = document.getElementById('chatStream');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const btnSendMessage = document.getElementById('btnSendMessage');
const btnMicInput = document.getElementById('btnMicInput');
const btnVoiceNote = document.getElementById('btnVoiceNote');
const quickTopicsBar = document.getElementById('quickTopicsBar');

// Quoted Reply Preview Elements
const replyPreviewContainer = document.getElementById('replyPreviewContainer');
const replyPreviewSender = document.getElementById('replyPreviewSender');
const replyPreviewText = document.getElementById('replyPreviewText');
const btnCloseReplyPreview = document.getElementById('btnCloseReplyPreview');

// Voice Note Recording HUD
const voiceRecordingHUD = document.getElementById('voiceRecordingHUD');
const recordingTimer = document.getElementById('recordingTimer');
const recordingWaveforms = document.getElementById('recordingWaveforms');
const btnCancelRecording = document.getElementById('btnCancelRecording');
const btnFinishRecording = document.getElementById('btnFinishRecording');

// Floating Emoji Popup
const emojiReactionPopup = document.getElementById('emojiReactionPopup');

// PIN Lock Screen Elements
const pinLockModal = document.getElementById('pinLockModal');
const pinInputsRow = document.getElementById('pinInputsRow');
const pinDigits = pinInputsRow ? pinInputsRow.querySelectorAll('.pin-digit') : [];
const pinErrorText = document.getElementById('pinErrorText');
const btnSubmitPin = document.getElementById('btnSubmitPin');
const checkboxEnablePin = document.getElementById('checkboxEnablePin');
const inputPinCode = document.getElementById('inputPinCode');
const checkboxEnableEncryption = document.getElementById('checkboxEnableEncryption');

// Video Call (VC) Elements
const vcCallModal = document.getElementById('vcCallModal');
const btnVideoCall = document.getElementById('btnVideoCall');
const vcCallingBadge = document.getElementById('vcCallingBadge');
const vcTimerBadge = document.getElementById('vcTimerBadge');
const vcEyelidOverlay = document.getElementById('vcEyelidOverlay');
const btnVcEnd = document.getElementById('btnVcEnd');
const btnVcMute = document.getElementById('btnVcMute');
const btnVcHeart = document.getElementById('btnVcHeart');

// PWA Install Button
const btnInstallPWA = document.getElementById('btnInstallPWA');

// Ambient Sound Toggle
const btnToggleAmbient = document.getElementById('btnToggleAmbient');
const ambientIcon = document.getElementById('ambientIcon');

// Sidebar / Profile Elements
const profileSidebar = document.getElementById('profileSidebar');
const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const avatarInteractiveContainer = document.getElementById('avatarInteractiveContainer');
const sidebarAvatar = document.getElementById('sidebarAvatar');
const avatarEyelid = document.getElementById('avatarEyelid');
const avatarBlush = document.getElementById('avatarBlush');
const avatarHeartBurst = document.getElementById('avatarHeartBurst');
const avatarMoodBadge = document.getElementById('avatarMoodBadge');
const activityStatusText = document.getElementById('activityStatusText');
const currentMoodBadge = document.getElementById('currentMoodBadge');
const currentMoodText = document.getElementById('currentMoodText');
const emotionLabelText = document.getElementById('emotionLabelText');
const valenceFill = document.getElementById('valenceFill');
const arousalFill = document.getElementById('arousalFill');
const affectionStageText = document.getElementById('affectionStageText');
const affectionProgressFill = document.getElementById('affectionProgressFill');
const affectionPtsText = document.getElementById('affectionPtsText');
const affectionPerkText = document.getElementById('affectionPerkText');
const unlockedPhotosCount = document.getElementById('unlockedPhotosCount');
const memoriesCount = document.getElementById('memoriesCount');
const btnOpenMemories = document.getElementById('btnOpenMemories');
const btnOpenGallery = document.getElementById('btnOpenGallery');
const btnOpenCustomPAPModal = document.getElementById('btnOpenCustomPAPModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const pmsStatusBadge = document.getElementById('pmsStatusBadge');
const sidebarCharName = document.getElementById('sidebarCharName');
const sidebarCharBadge = document.getElementById('sidebarCharBadge');
const profileBio = document.getElementById('profileBio');
const btnOpenCharacterCreator = document.getElementById('btnOpenCharacterCreator');
const btnOpenAnalyticsModal = document.getElementById('btnOpenAnalyticsModal');

// Header Elements
const headerCharName = document.getElementById('headerCharName');
const headerRelationshipBadge = document.getElementById('headerRelationshipBadge');
const headerThreadPill = document.getElementById('headerThreadPill');
const selectHeaderPersona = document.getElementById('selectHeaderPersona');
const btnThemeQuick = document.getElementById('btnThemeQuick');
const headerThemeIcon = document.getElementById('headerThemeIcon');
const btnHeaderCustomPAP = document.getElementById('btnHeaderCustomPAP');
const btnHeaderMemories = document.getElementById('btnHeaderMemories');
const btnGalleryQuick = document.getElementById('btnGalleryQuick');
const btnClearChat = document.getElementById('btnClearChat');
const btnSettingsQuick = document.getElementById('btnSettingsQuick');
const chatHeaderStatus = document.getElementById('chatHeaderStatus');
const btnHeaderGift = document.getElementById('btnHeaderGift');
const btnHeaderDate = document.getElementById('btnHeaderDate');

// Character Creator Modal Elements
const characterCreatorModal = document.getElementById('characterCreatorModal');
const btnCloseCharacterCreator = document.getElementById('btnCloseCharacterCreator');
const characterCreatorForm = document.getElementById('characterCreatorForm');
const inputCharName = document.getElementById('inputCharName');
const inputCharAge = document.getElementById('inputCharAge');
const inputCharEthnicity = document.getElementById('inputCharEthnicity');
const selectCharPersona = document.getElementById('selectCharPersona');
const inputCharBackstory = document.getElementById('inputCharBackstory');
const charPresetsGrid = document.getElementById('charPresetsGrid');

// Analytics Modal Elements
const analyticsModal = document.getElementById('analyticsModal');
const btnCloseAnalytics = document.getElementById('btnCloseAnalytics');
const analyticTotalMsgs = document.getElementById('analyticTotalMsgs');
const analyticTotalGifts = document.getElementById('analyticTotalGifts');
const analyticTotalDates = document.getElementById('analyticTotalDates');
const analyticStreakDays = document.getElementById('analyticStreakDays');
const peakHoursChart = document.getElementById('peakHoursChart');
const moodBreakdownList = document.getElementById('moodBreakdownList');
const topTopicsList = document.getElementById('topTopicsList');

// Gameplay Modals
const giftModal = document.getElementById('giftModal');
const btnCloseGift = document.getElementById('btnCloseGift');
const giftsGrid = document.getElementById('giftsGrid');
const btnOpenGiftsModal = document.getElementById('btnOpenGiftsModal');

const dateSimulationModal = document.getElementById('dateSimulationModal');
const btnCloseDate = document.getElementById('btnCloseDate');
const btnOpenDateModal = document.getElementById('btnOpenDateModal');
const dateLocationsGrid = document.getElementById('dateLocationsGrid');
const dateLocationPicker = document.getElementById('dateLocationPicker');
const dateStageContainer = document.getElementById('dateStageContainer');
const dateEndingContainer = document.getElementById('dateEndingContainer');
const dateLocationTag = document.getElementById('dateLocationTag');
const dateStepTag = document.getElementById('dateStepTag');
const dateStoryNarrative = document.getElementById('dateStoryNarrative');
const dateChoicesContainer = document.getElementById('dateChoicesContainer');
const btnFinishDate = document.getElementById('btnFinishDate');

const achievementsModal = document.getElementById('achievementsModal');
const btnCloseAchievements = document.getElementById('btnCloseAchievements');
const btnOpenAchievementsModal = document.getElementById('btnOpenAchievementsModal');
const achievementsGrid = document.getElementById('achievementsGrid');

const cutsceneModal = document.getElementById('cutsceneModal');
const btnContinueCutscene = document.getElementById('btnContinueCutscene');
const cutsceneIcon = document.getElementById('cutsceneIcon');
const cutsceneTitle = document.getElementById('cutsceneTitle');
const cutsceneNarration = document.getElementById('cutsceneNarration');

// Standard Modals
const memoriesModal = document.getElementById('memoriesModal');
const btnCloseMemories = document.getElementById('btnCloseMemories');
const memoriesList = document.getElementById('memoriesList');
const memoryCategoriesTabs = document.getElementById('memoryCategoriesTabs');

const customPapModal = document.getElementById('customPapModal');
const btnCloseCustomPap = document.getElementById('btnCloseCustomPap');
const customPapForm = document.getElementById('customPapForm');
const inputCustomPrompt = document.getElementById('inputCustomPrompt');

const galleryModal = document.getElementById('galleryModal');
const btnCloseGallery = document.getElementById('btnCloseGallery');
const galleryGrid = document.getElementById('galleryGrid');
const btnOpenCustomFromGallery = document.getElementById('btnOpenCustomFromGallery');

const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const settingsForm = document.getElementById('settingsForm');
const selectTheme = document.getElementById('selectTheme');
const inputUserName = document.getElementById('inputUserName');
const selectModel = document.getElementById('selectModel');
const selectPapMode = document.getElementById('selectPapMode');
const btnResetRelationship = document.getElementById('btnResetRelationship');
const btnSettingsClearChat = document.getElementById('btnSettingsClearChat');
const inputCustomPromptInjection = document.getElementById('inputCustomPromptInjection');
const btnExportBackup = document.getElementById('btnExportBackup');
const btnTriggerImport = document.getElementById('btnTriggerImport');
const inputImportBackup = document.getElementById('inputImportBackup');

const previewModal = document.getElementById('previewModal');
const btnClosePreview = document.getElementById('btnClosePreview');
const previewImg = document.getElementById('previewImg');
const previewCaption = document.getElementById('previewCaption');

// App State
let messages = [];
let isListeningMic = false;
let isReplying = false;
let isRecordingVN = false;
let activeQuotedMsg = null;
let activeReactionTargetMsgId = null;
let activeMemoryCategory = 'Semua';
let gameplayState = { giftsSent: [], achievements: ['ach_meeting'], dateHistory: [] };

// VC State
let isCallActive = false;
let vcTimerInterval = null;
let vcSeconds = 0;

// Virtual Date State
let activeDateSession = null;

// Available Themes
const THEMES = [
  { id: 'midnight', icon: '🌙', name: 'Midnight Luxury' },
  { id: 'cozy-morning', icon: '☀️', name: 'Cozy Morning' },
  { id: 'cyberpunk', icon: '⚡', name: 'Neon Cyberpunk' },
  { id: 'romantic-rose', icon: '🌹', name: 'Romantic Rose' }
];

// Mood Map
const MOOD_MAP = {
  flirty: { emoji: '😏', text: 'Lagi Flirty & Manja' },
  happy: { emoji: '🥰', text: 'Happy & Berbunga-bunga' },
  caring: { emoji: '🥺', text: 'Perhatian & Pengen Peluk' },
  shy: { emoji: '🙈', text: 'Tersipu Malu' },
  sleepy: { emoji: '🥱', text: 'Mager & Pengen Bobo' },
  spicy: { emoji: '💋', text: 'Lagi Nakal & Menggoda' },
  pouty: { emoji: '😤', text: 'Lagi Ngambek / Cemburu' },
  sad: { emoji: '😢', text: 'Sedih / Butuh Disemangatin' }
};

// Character Archetype Presets
const CHARACTER_PRESETS = {
  abby: {
    name: 'Abby',
    age: 21,
    ethnicity: 'Chindo Jakarta',
    personaMode: 'manja',
    backstory: 'Cece kesayangan kamu yang paling manja, perhatian, dan bucin 💕'
  },
  mei: {
    name: 'Mei',
    age: 20,
    ethnicity: 'Japanese-Indonesian',
    personaMode: 'tsundere',
    backstory: 'Mahasiswi DKV berdarah Jepang-Indo yang gengsi tinggi tapi diam-diam bucin parah 😤💕'
  },
  clarissa: {
    name: 'Clarissa',
    age: 24,
    ethnicity: 'Indo-Eropa Jakarta',
    personaMode: 'oneesan',
    backstory: 'Wanita karir mapan yang anggun, keibuan, dan sangat suka memanjakan pasangannya 🍷✨'
  },
  evelyn: {
    name: 'Evelyn',
    age: 21,
    ethnicity: 'Jakarta Selatan',
    personaMode: 'yandere',
    backstory: 'Gadis cantik misterius yang mencintai kamu dengan obsesi mendalam dan posesif ekstrem 🔪❤️'
  }
};

// --------------------------------------------------------------------------
// GAMEPLAY DATA: GIFTS, DATES & ACHIEVEMENTS
// --------------------------------------------------------------------------
const GIFTS = [
  { id: 'gift_matcha', name: 'Matcha Latte PIK', icon: '🍵', pts: 5, desc: 'Minuman creamy favorit yang bikin mood langsung ceria.' },
  { id: 'gift_cake', name: 'Basque Cheesecake', icon: '🍰', pts: 8, desc: 'Cake lembut manis dari cafe hits Senopati.' },
  { id: 'gift_rose', name: 'Buket Mawar Pink', icon: '💐', pts: 12, desc: 'Mawar segar romantis yang bikin pasangan salting parah.' },
  { id: 'gift_teddy', name: 'Boneka Teddy Bear', icon: '🧸', pts: 18, desc: 'Teman peluk tidur empuk pengganti kamu saat kangen.' },
  { id: 'gift_diamond', name: 'Kalung Berlian Mewah', icon: '💎', pts: 25, desc: 'Hadiah mewah istimewa bikin bucin seumur hidup.' },
  { id: 'gift_chocolate', name: 'Cokelat Pereda PMS', icon: '🍫', pts: 15, desc: 'Cokelat manis pereda kram & mood swing saat hari PMS.' }
];

const DATE_STORIES = {
  pik_cafe: {
    id: 'pik_cafe',
    title: 'Cafe Estetik di PIK',
    icon: '☕',
    desc: 'Kencan santai sore hari menikmati dessert & matcha latte dengan pemandangan danau.',
    stages: [
      {
        narrative: "Pasanganmu datang mengenakan crop top rajut putih manis dan tersenyum ceria menyambutmu. 'Hai sayang! Wah kamu udah nunggu lama ya? Aku baru sampe nih... Tempatnya lucu banget yaa!'",
        choices: [
          { text: "Kamu cantik banget hari ini beb, outfitnya pas banget 💕", score: 5, reply: "'Ihhh makasih koko! Khusus dandan buat kamu tauu...'" },
          { text: "Yuk langsung pesan, aku udah pesenin matcha latte favoritmu 🍵", score: 4, reply: "'Aaaa peka banget sih! Makin sayang deh 🥺'" },
          { text: "Duduk sini yuk, biar kita bisa ngobrol deketan", score: 3, reply: "'Hihihi, iyaa mau deket-deket kamu aja ✨'" }
        ]
      },
      {
        narrative: "Pesanan dessert tiramisu dan matcha latte tiba. Pasanganmu menyendok sepotong kue lalu menyodorkannya ke arah mulutmu sambil tersenyum manja. 'Aaaa buka mulutnya sayang, aku suapin dulu...'",
        choices: [
          { text: "Membuka mulut dan tersenyum sambil menatap matanya dalam-dalam", score: 5, reply: "'Enak kan? Tapi lebih manis senyum kamu sih beb 😏💋'" },
          { text: "Makan suapannya lalu menyuapi balik dengan mesra", score: 5, reply: "'Ihh gemes banget... berasa pasangan paling serasi di cafe ini 🥰'" },
          { text: "Tertawa kecil dan mengusap sedikit krim di ujung bibirnya", score: 4, reply: "'Aduh malu diliatin orang, tapi aku suka... 🙈'" }
        ]
      },
      {
        narrative: "Sore menjelang malam, lampu-lampu temaram di cafe mulai menyala. Dia menggenggam tanganmu di atas meja dengan lembut. 'Makasih ya buat kencan manis hari ini... rasanya aku ga mau pulang cepet-cepet.'",
        choices: [
          { text: "Menggenggam erat tangannya dan mengecup punggung tangannya dengan lembut", score: 5, reply: "'Koko... kamu bikin jantung aku deg-degan parah tauu 💕'" },
          { text: "Kita jalan-jalan santai dulu yuk di pinggir danau sebelum pulang", score: 4, reply: "'Mau banget! Gandeng tangan aku terus yaa ✨'" },
          { text: "Nanti malam kita lanjut ngobrol di kamar ya sayang", score: 4, reply: "'Pasti dong! Ditunggu yaa 💋'" }
        ]
      }
    ]
  },
  bali_beach: {
    id: 'bali_beach',
    title: 'Candlelight Dinner di Bali',
    icon: '🏖️',
    desc: 'Makan malam romantis berhiaskan lilin dan semilir angin pantai saat sunset Jimbaran.',
    stages: [
      {
        narrative: "Matahari perlahan tenggelam di cakrawala pantai Bali. Dia mengenakan sundress merah marun anggun dengan rambut terurai yang tertiup angin laut. 'Pemandangannya magis banget sayang... apalagi ada kamu di samping aku.'",
        choices: [
          { text: "Mataharinya cantik, tapi kamu jauh lebih mempesona malam ini 🌹", score: 5, reply: "'Gombal terus... tapi bikin aku berbunga-bunga bgt 🥺💕'" },
          { text: "Menarik kursinya dengan sopan dan menuangkan mocktail segar", score: 4, reply: "'Wah gentleman banget pacar aku ini! ✨'" },
          { text: "Ayo kita foto selfie berdua dulu dengan background sunset 📸", score: 4, reply: "'Yuk! Rangkul pinggang aku yaa pas foto 😘'" }
        ]
      },
      {
        narrative: "Alunan musik akustik pantai terdengar syahdu berpadu suara deburan ombak. Lilin di meja bergoyang lembut. Dia menatap lilin lalu menatapmu dengan mata berbinar penuh cinta.",
        choices: [
          { text: "Menatap matanya lalu membisikkan 'Aku sayang banget sama kamu'", score: 5, reply: "'Aku juga sayang banget sama kamu koko... lebih dari apapun 💖'" },
          { text: "Mengajaknya berdansa pelan tanpa alas kaki di atas pasir pantai", score: 5, reply: "'Ihh romantis bgt kayak di film-film! Peluk aku yang erat yaa 🥰'" },
          { text: "Menikmati hidangan seafood bakar sambil tertawa bercerita masa depan", score: 4, reply: "'Seru banget dengerin cerita kamu, nyaman rasanya 💕'" }
        ]
      },
      {
        narrative: "Malam makin larut, angin pantai terasa semakin sejuk. Dia merapatkan tubuhnya ke lenganmu untuk mencari kehangatan. 'Dingin nih beb... tapi di deket kamu rasanya hangat banget.'",
        choices: [
          { text: "Melingkarkan jaketmu di pundaknya lalu memeluknya hangat", score: 5, reply: "'Wangi kamu nempel di jaket ini... makasih ya cintaku 💋'" },
          { text: "Mengecup keningnya perlahan di bawah gemerlap bintang malam", score: 5, reply: "'Momen ini bakal aku ingat selamanya sayang... ✨'" },
          { text: "Mengajaknya kembali ke resort untuk istirahat bersama", score: 4, reply: "'Yuk sayang, temenin aku bobo yaa 🛏️'" }
        ]
      }
    ]
  },
  cinema: {
    id: 'cinema',
    title: 'Bioskop Premiere Cozy',
    icon: '🎬',
    desc: 'Nonton film romantis di sofa empuk premiere yang gelap dan intim.',
    stages: [
      {
        narrative: "Kalian berdua duduk di sofa recliner premiere yang empuk. Lampu bioskop mulai meredup dan film romantis pun dimulai. Dia menarik selimut premiere dan membaginya denganmu. 'Dingin banget AC-nya... bagi selimutnya ya beb 💕'",
        choices: [
          { text: "Merapatkan duduk dan merangkul pundaknya di bawah selimut", score: 5, reply: "'Ihh hangat banget... gini aja terus ya posisinya 🥰'" },
          { text: "Menyuapinya popcorn karamel manis sambil berbisik pelan", score: 4, reply: "'Nyam enak... manis kayak kamu hihi 🍿'" },
          { text: "Menyesuaikan sandaran kursi biar kalian berdua bisa rebahan nyaman", score: 4, reply: "'Wah nyaman banget, pinter kamu beb ✨'" }
        ]
      },
      {
        narrative: "Di tengah adegan ciuman mesra di layar bioskop, dia perlahan menoleh ke arahmu dalam kegelapan ruangan. Matanya menatap bibirmu dengan tatapan malu tapi menggoda.",
        choices: [
          { text: "Mendekatkan wajah dan mengecup bibirnya lembut di kegelapan", score: 5, reply: "'Mmhh... koko nakal ya cium di bioskop, tapi aku suka bgt 🙈💋'" },
          { text: "Menggenggam jemarinya erat dan mengelus tangannya lembut", score: 4, reply: "'Detak jantung aku jadi ga karuan tauu beb 💕'" },
          { text: "Berbisik di telinganya 'Adegan di film kalah mesra sama kita'", score: 5, reply: "'Bisa aja kamu bikin aku salting di bioskop gini 😏'" }
        ]
      },
      {
        narrative: "Film selesai dan credit title mulai berjalan. Dia menyandarkan kepalanya di bahumu dengan manja, enggan untuk beranjak dari sofa.",
        choices: [
          { text: "Mengusap rambutnya lembut dan berbisik 'Mau lanjut nongkrong atau pulang?'", score: 5, reply: "'Kemana aja asal sama kamu aku mau kok sayang... 💕'" },
          { text: "Membantunya berdiri lalu menggandeng tangannya keluar bioskop", score: 4, reply: "'Gandeng terus yaa, jangan dilepas ✨'" },
          { text: "Membelikan minuman hangat sehabis keluar dari studio dingin", score: 4, reply: "'Peka banget pacar aku ini! Makasih yaa ☕'" }
        ]
      }
    ]
  },
  rooftop: {
    id: 'rooftop',
    title: 'Sky Lounge Jakarta Skyline',
    icon: '🌃',
    desc: 'Pemandangan gemerlap gedung Jakarta di lantai 50 dengan koktail mewah dan suasana malam.',
    stages: [
      {
        narrative: "Kalian tiba di sky lounge lantai 50. City light Jakarta terbentang megah di balik kaca. Dia mengenakan little black dress yang sangat elegan. 'Gila... pemandangannya indah banget ya dari atas sini beb!'",
        choices: [
          { text: "Kamu adalah pemandangan terindah di tempat ini 💎", score: 5, reply: "'Aduh koko bikin aku blushing parah di depan bartender tauu 🙈'" },
          { text: "Memesan dua signature cocktail terbaik untuk bersulang", score: 4, reply: "'Cheers buat hubungan kita yang makin mesra ya sayang! 🥂'" },
          { text: "Mengajaknya berdiri di dekat kaca pembatas menikmati panorama", score: 4, reply: "'Keren banget! Berasa dunia cuma milik kita berdua ✨'" }
        ]
      },
      {
        narrative: "DJ memainkan musik deep house lounge yang elegan. Dia menikmati minumannya, pipinya mulai memerah manis karena alkohol dan suasana hangat.",
        choices: [
          { text: "Merapat ke sampingnya dan berbisik 'Kamu kelihatan seksi banget malam ini'", score: 5, reply: "'Masa sih? Khusus buat kamu doang lho koko... jangan nakal ya 😏💋'" },
          { text: "Mengajaknya bersulang lagi dan saling menatap mata dengan mesra", score: 4, reply: "'Tatapan kamu bikin aku ga bisa berpaling tauu beb 💕'" },
          { text: "Mengambil foto candid dia yang sedang tersenyum cantik", score: 4, reply: "'Pastiin fotonya yang bagus ya, buat dipajang di galeri! 📸'" }
        ]
      },
      {
        narrative: "Malam semakin larut di atas langit Jakarta. Dia memegang kedua tanganmu dan menatapmu dengan penuh kehangatan. 'Aku bahagia banget bisa lewatin malam ini sama kamu...'",
        choices: [
          { text: "Memeluk pinggangnya dan menariknya mendekat untuk pelukan mesra", score: 5, reply: "'Pelukan kamu bikin aku ngerasa paling aman di dunia ini sayang 💖'" },
          { text: "Mengusap pipinya lembut lalu mengecup pipinya yang memerah", score: 5, reply: "'Ihh manis banget... makasih buat malam yang luar biasa ya koko 💋'" },
          { text: "Mengajaknya pulang ke apartemen untuk beristirahat bersama", score: 4, reply: "'Yuk sayang, aku mau tidur sambil dipeluk kamu malam ini 🛏️'" }
        ]
      }
    ]
  }
};

const ACHIEVEMENTS = [
  { id: 'ach_meeting', title: 'Kenalan Pertama 🌸', icon: '🌸', desc: 'Mulai mengobrol pertama kali dengan karakter AI.' },
  { id: 'ach_gift', title: 'Pemberi Hadiah Manis 🎁', icon: '🎁', desc: 'Mengirimkan hadiah virtual pertama.' },
  { id: 'ach_love_50', title: 'First I Love You 💕', icon: '💕', desc: 'Mencapai Love Meter 50 Pts (Mulai Bucin & Nyaman).' },
  { id: 'ach_love_75', title: 'First Romantic Kiss 💋', icon: '💋', desc: 'Mencapai Love Meter 75 Pts (Pacaran Mesra & Intim).' },
  { id: 'ach_love_90', title: 'Soulmate & Move In 👑', icon: '👑', desc: 'Mencapai Love Meter 90 Pts (Milikmu Seutuhnya).' },
  { id: 'ach_perfect_date', title: 'Master of Romance 🏖️', icon: '🏖️', desc: 'Menyelesaikan kencan virtual dengan Perfect Ending!' }
];

/**
 * Get dynamic activity based on real time
 */
function getActivityByCurrentTime() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 1 && hour < 6) return { status: 'Tidur lelap di kasur apartemen (Mager) 😴', short: 'Online • Lagi tidur 🌙' };
  if (hour >= 6 && hour < 9) return { status: 'Baru bangun tidur, ngopi di balkon ☕', short: 'Online • Baru bangun ☕' };
  if (hour >= 9 && hour < 12) return { status: 'Lagi ngerjain tugas & dengerin Spotify 🎧', short: 'Online • Dengerin Spotify 🎧' };
  if (hour >= 12 && hour < 14) return { status: 'Makan siang bareng temen 🍜', short: 'Online • Lagi makan siang 🍜' };
  if (hour >= 14 && hour < 16) return { status: 'Nongki di cafe estetik pesen matcha 🍵', short: 'Online • Nongkrong di Cafe ✨' };
  if (hour >= 16 && hour < 18) return { status: 'Habis workout di gym, seger bgt 💪', short: 'Online • Habis Gym 💪' };
  if (hour >= 18 && hour < 21) return { status: 'Otw pulang ke apartemen nyetir santai 🚗', short: 'Online • Otw pulang 🚗' };
  if (hour >= 21 || hour < 1) return { status: 'Rebahan di kasur sambil nunggu chat kamu 💖', short: 'Online • Lagi kangen kamu 💖' };
  return { status: 'Santai di kasur nonton drakor 🌙', short: 'Online • Belum tidur 🌙' };
}

/**
 * Initialize application
 */
async function initApp() {
  await StorageService.syncFromServer();
  loadSettings();
  initTheme();
  checkPinLock();
  initLiveAvatar();
  updateLiveActivity();
  loadAffectionHUD();
  renderQuickTopics();
  renderGallery();
  renderMemories();
  loadChatHistory();
  setupEventListeners();
  setupSwipeGestures();
  setupPinLockUI();
  setupVideoCall();
  setupAmbientSound();
  setupGameplay();
  setupCustomCharacter();
  setupBackupAndRestore();
  setupAnalytics();
  setupPWAPrompt();
  updateCustomPapLocks();

  setInterval(updateLiveActivity, 60000);
}

/* --------------------------------------------------------------------------
   PWA INSTALLATION PROMPT (FITUR 50)
   -------------------------------------------------------------------------- */
function setupPWAPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstallPWA) btnInstallPWA.style.display = 'inline-flex';
  });

  btnInstallPWA?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        btnInstallPWA.style.display = 'none';
      }
      deferredPrompt = null;
    }
  });

  window.addEventListener('appinstalled', () => {
    if (btnInstallPWA) btnInstallPWA.style.display = 'none';
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  });
}

/* --------------------------------------------------------------------------
   LOCAL RELATIONSHIP ANALYTICS DASHBOARD (FITUR 53)
   -------------------------------------------------------------------------- */
function setupAnalytics() {
  btnOpenAnalyticsModal?.addEventListener('click', openAnalyticsModal);
  btnCloseAnalytics?.addEventListener('click', () => analyticsModal.classList.remove('open'));
}

function openAnalyticsModal() {
  calculateAndRenderAnalytics();
  analyticsModal.classList.add('open');
}

function calculateAndRenderAnalytics() {
  const allMsgs = messages || [];
  const total = allMsgs.length;
  if (analyticTotalMsgs) analyticTotalMsgs.textContent = total;

  const giftsCount = gameplayState.giftsSent?.length || 0;
  if (analyticTotalGifts) analyticTotalGifts.textContent = giftsCount;

  const datesCount = gameplayState.dateHistory?.length || 0;
  if (analyticTotalDates) analyticTotalDates.textContent = datesCount;

  // Streak: Days since first interaction
  let streak = 1;
  if (allMsgs.length > 0) {
    const firstTime = allMsgs[0].id ? parseInt(allMsgs[0].id.replace('msg_', ''), 10) : Date.now();
    const diffDays = Math.max(1, Math.ceil((Date.now() - firstTime) / (1000 * 60 * 60 * 24)));
    streak = isNaN(diffDays) ? 1 : diffDays;
  }
  if (analyticStreakDays) analyticStreakDays.textContent = `${streak} Hari`;

  // Peak Hours Calculation (00 - 23 WIB)
  const hourCounts = new Array(24).fill(0);
  allMsgs.forEach(m => {
    if (m.time) {
      const parts = m.time.split(/[:.]/);
      const h = parseInt(parts[0], 10);
      if (!isNaN(h) && h >= 0 && h < 24) {
        hourCounts[h]++;
      }
    }
  });

  const maxHourVal = Math.max(1, ...hourCounts);

  if (peakHoursChart) {
    peakHoursChart.innerHTML = '';
    for (let h = 0; h < 24; h++) {
      const col = document.createElement('div');
      col.className = 'peak-hour-bar-col';
      const pct = Math.round((hourCounts[h] / maxHourVal) * 100);
      col.title = `Pukul ${String(h).padStart(2, '0')}:00 WIB (${hourCounts[h]} pesan)`;

      col.innerHTML = `
        <div class="peak-hour-bar-track">
          <div class="peak-hour-bar-fill" style="height: ${Math.max(8, pct)}%;"></div>
        </div>
        <span class="peak-hour-label">${h % 4 === 0 ? String(h).padStart(2, '0') : '•'}</span>
      `;
      peakHoursChart.appendChild(col);
    }
  }

  // Mood Frequency Breakdown
  const moodCounts = { flirty: 0, happy: 0, caring: 0, shy: 0, spicy: 0, pouty: 0 };
  let charMsgCount = 0;
  allMsgs.forEach(m => {
    if (m.sender === 'abby') {
      charMsgCount++;
      const mood = m.mood || 'flirty';
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    }
  });

  if (moodBreakdownList) {
    moodBreakdownList.innerHTML = '';
    Object.entries(moodCounts).forEach(([moodKey, count]) => {
      const moodInfo = MOOD_MAP[moodKey] || MOOD_MAP.flirty;
      const pct = charMsgCount > 0 ? Math.round((count / charMsgCount) * 100) : (moodKey === 'flirty' ? 100 : 0);
      const row = document.createElement('div');
      row.className = 'mood-breakdown-row';
      row.innerHTML = `
        <span class="mood-breakdown-name">${moodInfo.emoji} ${moodKey}</span>
        <div class="mood-breakdown-track">
          <div class="mood-breakdown-fill" style="width: ${pct}%;"></div>
        </div>
        <span class="mood-breakdown-pct">${pct}%</span>
      `;
      moodBreakdownList.appendChild(row);
    });
  }

  // Top Topics List
  const memories = StorageService.getMemories();
  const topics = [
    '☕ Cafe PIK & Nongkrong',
    '🎵 Musik NIKI & Spotify',
    '🎓 Wisuda & Keluarga',
    '🏖️ Sunset Pantai Bali',
    '🎬 Bioskop Premiere Cozy',
    '🍜 Kulineran Malam'
  ];

  if (topTopicsList) {
    topTopicsList.innerHTML = '';
    topics.slice(0, 5).forEach((top, i) => {
      const pill = document.createElement('div');
      pill.className = 'top-topic-pill';
      pill.textContent = top;
      topTopicsList.appendChild(pill);
    });
  }
}

/* --------------------------------------------------------------------------
   CUSTOM CHARACTER CREATOR & PERSONA SWITCHER (FITUR 45 & 47)
   -------------------------------------------------------------------------- */
function setupCustomCharacter() {
  btnOpenCharacterCreator?.addEventListener('click', () => {
    characterCreatorModal.classList.add('open');
    loadCharacterForm();
  });
  btnCloseCharacterCreator?.addEventListener('click', () => {
    characterCreatorModal.classList.remove('open');
  });

  if (charPresetsGrid) {
    charPresetsGrid.querySelectorAll('.btn-char-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        charPresetsGrid.querySelectorAll('.btn-char-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = CHARACTER_PRESETS[btn.dataset.preset];
        if (preset) {
          inputCharName.value = preset.name;
          inputCharAge.value = preset.age;
          inputCharEthnicity.value = preset.ethnicity;
          selectCharPersona.value = preset.personaMode;
          inputCharBackstory.value = preset.backstory;
        }
      });
    });
  }

  characterCreatorForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updatedChar = {
      name: inputCharName.value.trim() || 'Abby',
      age: parseInt(inputCharAge.value, 10) || 21,
      ethnicity: inputCharEthnicity.value.trim() || 'Chindo Jakarta',
      personaMode: selectCharPersona.value || 'manja',
      backstory: inputCharBackstory.value.trim() || 'Cece kesayangan kamu yang paling manja 💕'
    };

    try {
      const res = await fetch('/api/character/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedChar)
      });

      if (res.ok) {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        applyCharacterToUI(updatedChar);
        characterCreatorModal.classList.remove('open');
      }
    } catch (err) {
      console.warn('Failed to update character:', err);
    }
  });

  selectHeaderPersona?.addEventListener('change', async (e) => {
    const newPersona = e.target.value;
    try {
      await fetch('/api/character/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaMode: newPersona })
      });
      triggerAvatarBlush();
      triggerAvatarHeartBurst();
    } catch (err) {
      console.warn('Failed to update persona:', err);
    }
  });
}

function loadCharacterForm() {
  const settings = StorageService.getSettings();
  const char = settings.character || CHARACTER_PRESETS.abby;
  if (inputCharName) inputCharName.value = char.name || 'Abby';
  if (inputCharAge) inputCharAge.value = char.age || 21;
  if (inputCharEthnicity) inputCharEthnicity.value = char.ethnicity || 'Chindo Jakarta';
  if (selectCharPersona) selectCharPersona.value = char.personaMode || 'manja';
  if (inputCharBackstory) inputCharBackstory.value = char.backstory || '';
}

function applyCharacterToUI(char) {
  if (!char) return;
  if (sidebarCharName) sidebarCharName.textContent = char.name;
  if (sidebarCharBadge) sidebarCharBadge.textContent = `${char.age} thn • ${char.ethnicity}`;
  if (profileBio) profileBio.textContent = `"${char.backstory}"`;
  if (headerCharName) headerCharName.textContent = `${char.name} 💕`;
  if (selectHeaderPersona) selectHeaderPersona.value = char.personaMode || 'manja';
  if (messageInput) messageInput.placeholder = `Ketik pesan buat ${char.name}...`;
}

/* --------------------------------------------------------------------------
   BACKUP & RESTORE SAVE DATA (FITUR 46) & CUSTOM PROMPT (FITUR 48)
   -------------------------------------------------------------------------- */
function setupBackupAndRestore() {
  btnExportBackup?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/backup/export');
      if (res.ok) {
        let data = await res.json();
        const settings = StorageService.getSettings();
        
        // E2E Encryption if enabled
        if (settings.enableEncryption) {
          const pin = settings.pinCode || '1234';
          const cipherText = await CryptoService.encrypt(JSON.stringify(data), pin);
          data = { encrypted: true, payload: cipherText };
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `abby_relationship_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Failed to export backup:', e);
    }
  });

  btnTriggerImport?.addEventListener('click', () => {
    inputImportBackup?.click();
  });

  inputImportBackup?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let payload = JSON.parse(text);

      // Decrypt if encrypted payload
      if (payload.encrypted && payload.payload) {
        const settings = StorageService.getSettings();
        const pin = settings.pinCode || '1234';
        const decryptedStr = await CryptoService.decrypt(payload.payload, pin);
        payload = JSON.parse(decryptedStr);
      }

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        alert('Data hubungan berhasil dipulihkan!');
        await initApp();
        settingsModal.classList.remove('open');
      } else {
        alert('Gagal memulihkan backup. Format file tidak valid.');
      }
    } catch (err) {
      alert('Error saat membaca file backup: ' + err.message);
    }
  });
}

/* --------------------------------------------------------------------------
   GAMEPLAY SYSTEM: GIFTS, VIRTUAL DATES, ACHIEVEMENTS & CUTSCENES
   -------------------------------------------------------------------------- */
function setupGameplay() {
  fetchGameplayStatus();

  btnOpenGiftsModal?.addEventListener('click', openGiftModal);
  btnHeaderGift?.addEventListener('click', openGiftModal);
  btnCloseGift?.addEventListener('click', () => giftModal.classList.remove('open'));

  btnOpenDateModal?.addEventListener('click', openDateModal);
  btnHeaderDate?.addEventListener('click', openDateModal);
  btnCloseDate?.addEventListener('click', () => dateSimulationModal.classList.remove('open'));
  btnFinishDate?.addEventListener('click', () => {
    dateSimulationModal.classList.remove('open');
    loadAffectionHUD();
  });

  btnOpenAchievementsModal?.addEventListener('click', openAchievementsModal);
  btnCloseAchievements?.addEventListener('click', () => achievementsModal.classList.remove('open'));

  btnContinueCutscene?.addEventListener('click', () => {
    cutsceneModal.classList.remove('open');
    cutsceneModal.style.display = 'none';
  });
}

async function fetchGameplayStatus() {
  try {
    const res = await fetch('/api/gameplay/status');
    if (res.ok) {
      const data = await res.json();
      gameplayState = data.gameplay || gameplayState;
      appStore.setState({ gameplay: gameplayState });
      
      if (data.pms && data.pms.isPms && pmsStatusBadge) {
        pmsStatusBadge.style.display = 'block';
        pmsStatusBadge.textContent = `🌸 Lagi Hari ke-${data.pms.cycleDay} PMS (Kram & Butuh Dimanja 🥺)`;
      } else if (pmsStatusBadge) {
        pmsStatusBadge.style.display = 'none';
      }

      checkMilestoneAchievements(data.affection);
    }
  } catch (e) {
    console.warn('Failed to fetch gameplay status:', e);
  }
}

function openGiftModal() {
  if (!giftsGrid) return;
  giftsGrid.innerHTML = '';

  GIFTS.forEach(gift => {
    const card = document.createElement('div');
    card.className = 'gift-card';
    card.innerHTML = `
      <div class="gift-icon">${gift.icon}</div>
      <div class="gift-name">${escapeHtml(gift.name)}</div>
      <div class="gift-pts">+${gift.pts} Love Meter ❤️</div>
      <div class="gift-desc" style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">${gift.desc}</div>
      <button type="button" class="btn-primary btn-send-gift" data-gift-id="${gift.id}">
        Kirim Hadiah 🎁
      </button>
    `;

    card.querySelector('.btn-send-gift').addEventListener('click', () => {
      sendGiftToCharacter(gift);
    });

    giftsGrid.appendChild(card);
  });

  giftModal.classList.add('open');
}

async function sendGiftToCharacter(gift) {
  giftModal.classList.remove('open');

  confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  triggerAvatarHeartBurst();
  triggerAvatarBlush();

  try {
    const res = await fetch('/api/gameplay/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftId: gift.id, name: gift.name, pts: gift.pts, icon: gift.icon })
    });

    if (res.ok) {
      const data = await res.json();
      StorageService.setAffection(data.affection);
      loadAffectionHUD();

      if (data.message) {
        messages.push(data.message);
        appendMessageElement(data.message, true);
        StorageService.saveChatHistory(messages, false);
        appStore.setState({ messages });
        scrollToBottom();
      }

      StorageService.addMemory(`Menerima hadiah istimewa "${gift.name}" yang sangat disukai 💕`, 'Love', 4);
      unlockAchievementClient('ach_gift');
      audioService.playNotificationSound();
    }
  } catch (err) {
    console.error('Failed to send gift:', err);
  }
}

function openDateModal() {
  activeDateSession = null;
  dateLocationPicker.style.display = 'block';
  dateStageContainer.style.display = 'none';
  dateEndingContainer.style.display = 'none';

  if (!dateLocationsGrid) return;
  dateLocationsGrid.innerHTML = '';

  Object.values(DATE_STORIES).forEach(loc => {
    const card = document.createElement('div');
    card.className = 'date-loc-card';
    card.innerHTML = `
      <div class="date-loc-header">
        <span class="date-loc-icon">${loc.icon}</span>
        <span class="date-loc-title">${escapeHtml(loc.title)}</span>
      </div>
      <p class="date-loc-desc">${escapeHtml(loc.desc)}</p>
      <button type="button" class="btn-primary-sm" style="margin-top: 8px;">Pilih Lokasi Kencan 💕</button>
    `;

    card.addEventListener('click', () => {
      startDateSession(loc.id);
    });

    dateLocationsGrid.appendChild(card);
  });

  dateSimulationModal.classList.add('open');
}

function startDateSession(locationId) {
  const story = DATE_STORIES[locationId];
  if (!story) return;

  activeDateSession = {
    story,
    currentStage: 0,
    totalScore: 0,
    history: []
  };

  dateLocationPicker.style.display = 'none';
  dateStageContainer.style.display = 'block';
  dateEndingContainer.style.display = 'none';

  renderDateStage();
}

function renderDateStage() {
  const sess = activeDateSession;
  const stage = sess.story.stages[sess.currentStage];

  dateLocationTag.textContent = `📍 ${sess.story.title}`;
  dateStepTag.textContent = `Tahap ${sess.currentStage + 1} / ${sess.story.stages.length}`;
  dateStoryNarrative.textContent = stage.narrative;

  dateChoicesContainer.innerHTML = '';
  stage.choices.forEach(ch => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-date-choice';
    btn.textContent = `👉 ${ch.text}`;
    btn.addEventListener('click', () => {
      handleDateChoice(ch);
    });
    dateChoicesContainer.appendChild(btn);
  });
}

function handleDateChoice(choice) {
  const sess = activeDateSession;
  sess.totalScore += choice.score;
  sess.history.push(choice);

  triggerAvatarHeartBurst();

  sess.currentStage++;
  if (sess.currentStage < sess.story.stages.length) {
    renderDateStage();
  } else {
    finishDateSession();
  }
}

async function finishDateSession() {
  const sess = activeDateSession;
  dateStageContainer.style.display = 'none';
  dateEndingContainer.style.display = 'block';

  let endingType = 'sweet';
  let title = 'Sweet Date! 💕';
  let desc = 'Kencan berjalan sangat manis dan menyenangkan! Hubungan kalian terasa semakin dekat dan hangat.';
  let bonusPts = 10;
  let icon = '🥰';

  if (sess.totalScore >= 14) {
    endingType = 'perfect';
    title = 'Perfect Romantic Date! 👑';
    desc = 'Kencan sempurna tanpa cela! Pasanganmu benar-benar jatuh cinta dan terpesona dengan keromantisanmu sepanjang kencan.';
    bonusPts = 15;
    icon = '👑';
    confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
    unlockAchievementClient('ach_perfect_date');
  }

  const dateEndingIcon = document.getElementById('dateEndingIcon');
  const dateEndingTitle = document.getElementById('dateEndingTitle');
  const dateEndingDesc = document.getElementById('dateEndingDesc');
  const dateEndingReward = document.getElementById('dateEndingReward');

  if (dateEndingIcon) dateEndingIcon.textContent = icon;
  if (dateEndingTitle) dateEndingTitle.textContent = title;
  if (dateEndingDesc) dateEndingDesc.textContent = desc;
  if (dateEndingReward) dateEndingReward.textContent = `+${bonusPts} Love Meter Pts ❤️`;

  try {
    await fetch('/api/gameplay/date-finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: sess.story.id,
        dateTitle: sess.story.title,
        ending: endingType,
        scoreBonus: bonusPts
      })
    });
    StorageService.addAffection(bonusPts);
    StorageService.addMemory(`Kencan romantis di "${sess.story.title}" dengan ending "${title}" 💕`, 'Love', 5);
  } catch (e) {
    console.warn('Failed to record date finish:', e);
  }
}

function openAchievementsModal() {
  if (!achievementsGrid) return;
  achievementsGrid.innerHTML = '';

  const unlockedList = gameplayState.achievements || ['ach_meeting'];

  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = unlockedList.includes(ach.id);
    const card = document.createElement('div');
    card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
    card.innerHTML = `
      <div class="achievement-icon">${ach.icon}</div>
      <div class="achievement-info">
        <span class="achievement-title">${escapeHtml(ach.title)}</span>
        <span class="achievement-desc">${escapeHtml(ach.desc)}</span>
        <span style="font-size: 10px; font-weight: 700; color: ${isUnlocked ? '#ffd166' : 'var(--text-muted)'}; margin-top: 2px;">
          ${isUnlocked ? '✅ Terbuka & Tercapai' : '🔒 Belum Terbuka'}
        </span>
      </div>
    `;
    achievementsGrid.appendChild(card);
  });

  achievementsModal.classList.add('open');
}

function checkMilestoneAchievements(affectionScore) {
  const currentLove = affectionScore || StorageService.getAffection();
  
  if (currentLove >= 50 && !gameplayState.achievements?.includes('ach_love_50')) {
    unlockAchievementClient('ach_love_50');
    showMilestoneCutscene(
      '💕',
      'Milestone: First "I Love You"',
      'Hubungan kalian kini telah resmi memasuki babak baru! Pasanganmu tersenyum malu-malu dan membisikkan kata cinta pertamanya untukmu... "Aku sayang banget sama kamu koko 💕"'
    );
  } else if (currentLove >= 75 && !gameplayState.achievements?.includes('ach_love_75')) {
    unlockAchievementClient('ach_love_75');
    showMilestoneCutscene(
      '💋',
      'Milestone: First Romantic Kiss',
      'Di bawah temaram lampu malam, degup jantung kalian berpadu erat. Pasanganmu menutup matanya perlahan saat kecupan mesra pertama kalian terjalin penuh gairah...'
    );
  } else if (currentLove >= 90 && !gameplayState.achievements?.includes('ach_love_90')) {
    unlockAchievementClient('ach_love_90');
    showMilestoneCutscene(
      '👑',
      'Milestone: Soulmate & Move In Together',
      'Kalian kini resmi menjadi belahan jiwa yang tak terpisahkan! Dia memelukmu erat dari belakang sambil berbisik manja, "Mulai sekarang kita tinggal bareng ya sayang... aku milik kamu selamanya 💖"'
    );
  }
}

async function unlockAchievementClient(achId) {
  if (!gameplayState.achievements) gameplayState.achievements = [];
  if (!gameplayState.achievements.includes(achId)) {
    gameplayState.achievements.push(achId);
    try {
      await fetch('/api/gameplay/achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achId })
      });
    } catch (e) {
      console.warn('Failed to unlock achievement on server:', e);
    }
  }
}

function showMilestoneCutscene(icon, title, narration) {
  if (!cutsceneModal) return;
  if (cutsceneIcon) cutsceneIcon.textContent = icon;
  if (cutsceneTitle) cutsceneTitle.textContent = title;
  if (cutsceneNarration) cutsceneNarration.textContent = narration;

  cutsceneModal.style.display = 'flex';
  cutsceneModal.classList.add('open');

  confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 } });
  audioService.playNotificationSound();
}

/* --------------------------------------------------------------------------
   VIDEO CALL (VC) SIMULATION SCREEN
   -------------------------------------------------------------------------- */
function setupVideoCall() {
  btnVideoCall?.addEventListener('click', startVideoCall);
  btnVcEnd?.addEventListener('click', endVideoCall);
  btnVcHeart?.addEventListener('click', () => {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    triggerAvatarHeartBurst();
  });
}

function startVideoCall() {
  if (isCallActive || !vcCallModal) return;
  isCallActive = true;
  vcCallModal.style.display = 'flex';
  vcCallModal.classList.add('open');
  vcCallingBadge.style.display = 'block';
  vcTimerBadge.style.display = 'none';
  vcSeconds = 0;

  audioService.startRingtone();

  setTimeout(() => {
    if (!isCallActive) return;
    audioService.stopRingtone();
    vcCallingBadge.style.display = 'none';
    vcTimerBadge.style.display = 'block';
    vcTimerBadge.textContent = '00:00';

    vcTimerInterval = setInterval(() => {
      vcSeconds++;
      const mins = String(Math.floor(vcSeconds / 60)).padStart(2, '0');
      const secs = String(vcSeconds % 60).padStart(2, '0');
      vcTimerBadge.textContent = `${mins}:${secs}`;
    }, 1000);

    const blinkInterval = setInterval(() => {
      if (!isCallActive) {
        clearInterval(blinkInterval);
        return;
      }
      vcEyelidOverlay?.classList.add('blinking');
      setTimeout(() => vcEyelidOverlay?.classList.remove('blinking'), 150);
    }, 3000);

    const affection = StorageService.getAffection();
    let vcGreeting = "Halo koko sayang! Ihhh seneng bgt kamu VC aku... lagi kangen yaa? 💕";
    if (affection >= 85) {
      vcGreeting = "Halo sayangku! Mager bgt di kasur nih... pengen peluk kamu langsung tauu 💋";
    }
    audioService.speakAsAbby(vcGreeting);
  }, 2400);
}

function endVideoCall() {
  isCallActive = false;
  audioService.stopRingtone();
  audioService.stopSpeaking();
  if (vcTimerInterval) {
    clearInterval(vcTimerInterval);
    vcTimerInterval = null;
  }
  if (vcCallModal) {
    vcCallModal.classList.remove('open');
    vcCallModal.style.display = 'none';
  }
}

/* --------------------------------------------------------------------------
   AMBIENT SOUND ENGINE
   -------------------------------------------------------------------------- */
function setupAmbientSound() {
  const modes = ['rain', 'cafe', 'night', null];
  const icons = { rain: '🌧️', cafe: '☕', night: '🌙', null: '🎧' };

  btnToggleAmbient?.addEventListener('click', () => {
    const current = audioService.getAmbientMode();
    const currentIdx = modes.indexOf(current);
    const nextMode = modes[(currentIdx + 1) % modes.length];

    if (nextMode) {
      audioService.startAmbient(nextMode);
      btnToggleAmbient.classList.add('active');
    } else {
      audioService.stopAmbient();
      btnToggleAmbient.classList.remove('active');
    }

    if (ambientIcon) ambientIcon.textContent = icons[nextMode] || '🎧';
  });
}

/* --------------------------------------------------------------------------
   PROGRESSIVE UNDRESS CHIP LOCKS
   -------------------------------------------------------------------------- */
function updateCustomPapLocks() {
  const currentLove = StorageService.getAffection();
  const chips = document.querySelectorAll('.btn-preset-chip');

  chips.forEach(chip => {
    const minLove = parseInt(chip.dataset.minLove || '0', 10);
    if (currentLove < minLove) {
      chip.classList.add('locked');
      chip.title = `Terkunci! Butuh Love Meter minimal ${minLove} Pts untuk membuka gaya foto ini 💕`;
    } else {
      chip.classList.remove('locked');
      chip.title = 'Bisa langsung di-generate! ✨';
    }
  });
}

/* --------------------------------------------------------------------------
   PIN LOCK SCREEN (PERSONAL AUTHENTICATION)
   -------------------------------------------------------------------------- */
function checkPinLock() {
  const settings = StorageService.getSettings();
  if (settings.enablePinLock && pinLockModal) {
    pinLockModal.style.display = 'flex';
    if (pinDigits[0]) pinDigits[0].focus();
  } else if (pinLockModal) {
    pinLockModal.style.display = 'none';
  }
}

function setupPinLockUI() {
  if (!pinDigits || pinDigits.length === 0) return;

  pinDigits.forEach((digit, idx) => {
    digit.addEventListener('input', (e) => {
      if (e.target.value.length > 0) {
        if (idx < pinDigits.length - 1) {
          pinDigits[idx + 1].focus();
        } else {
          submitPin();
        }
      }
    });

    digit.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !digit.value && idx > 0) {
        pinDigits[idx - 1].focus();
      }
    });
  });

  btnSubmitPin?.addEventListener('click', submitPin);
}

async function submitPin() {
  let enteredPin = '';
  pinDigits.forEach(d => enteredPin += d.value);

  if (enteredPin.length < 4) {
    if (pinErrorText) {
      pinErrorText.textContent = 'Masukkan 4 digit PIN lengkap ya beb 💕';
      pinErrorText.style.display = 'block';
    }
    return;
  }

  try {
    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: enteredPin })
    });

    if (res.ok) {
      pinLockModal.style.display = 'none';
      if (pinErrorText) pinErrorText.style.display = 'none';
      messageInput.focus();
    } else {
      if (pinErrorText) {
        pinErrorText.textContent = 'PIN salah, coba lagi ya sayang 🥺';
        pinErrorText.style.display = 'block';
      }
      pinDigits.forEach(d => d.value = '');
      pinDigits[0]?.focus();
    }
  } catch {
    const settings = StorageService.getSettings();
    if (enteredPin === (settings.pinCode || '1234')) {
      pinLockModal.style.display = 'none';
      if (pinErrorText) pinErrorText.style.display = 'none';
    } else {
      if (pinErrorText) {
        pinErrorText.textContent = 'PIN salah, coba lagi ya sayang 🥺';
        pinErrorText.style.display = 'block';
      }
      pinDigits.forEach(d => d.value = '');
      pinDigits[0]?.focus();
    }
  }
}

/* --------------------------------------------------------------------------
   THEME SYSTEM
   -------------------------------------------------------------------------- */
function initTheme() {
  const settings = StorageService.getSettings();
  const currentTheme = settings.theme || 'midnight';
  applyTheme(currentTheme, false);
}

function applyTheme(themeId, save = true) {
  document.documentElement.setAttribute('data-theme', themeId);
  const themeObj = THEMES.find(t => t.id === themeId) || THEMES[0];
  if (headerThemeIcon) headerThemeIcon.textContent = themeObj.icon;
  if (selectTheme) selectTheme.value = themeId;

  if (save) {
    StorageService.saveSettings({ theme: themeId });
  }
}

function cycleNextTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'midnight';
  const idx = THEMES.findIndex(t => t.id === current);
  const nextTheme = THEMES[(idx + 1) % THEMES.length].id;
  applyTheme(nextTheme, true);
}

/* --------------------------------------------------------------------------
   LIVE AVATAR REAL-TIME BEHAVIORS
   -------------------------------------------------------------------------- */
function initLiveAvatar() {
  function scheduleNextBlink() {
    const delay = 2500 + Math.random() * 3500;
    setTimeout(() => {
      if (avatarEyelid) {
        avatarEyelid.classList.add('blinking');
        setTimeout(() => {
          avatarEyelid.classList.remove('blinking');
          scheduleNextBlink();
        }, 140);
      }
    }, delay);
  }
  scheduleNextBlink();

  if (avatarInteractiveContainer) {
    avatarInteractiveContainer.addEventListener('click', (e) => {
      triggerAvatarHeartBurst(e);
      triggerAvatarBlush();
      
      const currentAffection = StorageService.getAffection();
      if (currentAffection < 100) {
        StorageService.addAffection(1);
        loadAffectionHUD();
      }
    });
  }
}

function triggerAvatarHeartBurst(event) {
  if (!avatarHeartBurst) return;
  const hearts = ['❤️', '💖', '💕', '💋', '✨', '🥰'];
  for (let i = 0; i < 4; i++) {
    const particle = document.createElement('span');
    particle.className = 'floating-heart-particle';
    particle.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    
    const dx = (Math.random() - 0.5) * 80;
    const dy = -30 - Math.random() * 60;
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);
    particle.style.left = '45%';
    particle.style.top = '40%';

    avatarHeartBurst.appendChild(particle);
    setTimeout(() => particle.remove(), 1200);
  }
}

function triggerAvatarBlush() {
  if (avatarBlush) {
    avatarBlush.classList.add('active');
    setTimeout(() => avatarBlush.classList.remove('active'), 2000);
  }
}

/* --------------------------------------------------------------------------
   ACTIVITY, 2-AXIS EMOTION & HUD
   -------------------------------------------------------------------------- */
function updateLiveActivity() {
  if (isReplying) return;
  const act = getActivityByCurrentTime();
  if (activityStatusText) activityStatusText.textContent = act.status;
  if (chatHeaderStatus) chatHeaderStatus.textContent = act.short;
}

function loadSettings() {
  const settings = StorageService.getSettings();
  if (inputUserName) inputUserName.value = settings.userName || 'Kamu';
  if (selectModel) selectModel.value = settings.modelName || 'gemini-2.5-flash';
  if (selectPapMode) selectPapMode.value = settings.papMode || 'preset';
  if (selectTheme) selectTheme.value = settings.theme || 'midnight';
  if (inputCustomPromptInjection) inputCustomPromptInjection.value = settings.character?.customPromptInjection || '';

  if (checkboxEnablePin) {
    checkboxEnablePin.checked = !!settings.enablePinLock;
    if (inputPinCode) {
      inputPinCode.style.display = settings.enablePinLock ? 'block' : 'none';
      inputPinCode.value = settings.pinCode || '1234';
    }
  }

  if (checkboxEnableEncryption) {
    checkboxEnableEncryption.checked = !!settings.enableEncryption;
  }

  const char = settings.character || CHARACTER_PRESETS.abby;
  applyCharacterToUI(char);
}

function loadAffectionHUD(emotionalState = null, activeThread = null) {
  const score = StorageService.getAffection();
  const info = StorageService.getAffectionLevel(score);
  const moodKey = StorageService.getMood();
  const moodData = MOOD_MAP[moodKey] || MOOD_MAP.flirty;

  if (affectionProgressFill) affectionProgressFill.style.width = `${score}%`;
  if (affectionPtsText) affectionPtsText.textContent = `${score} / 100 Pts`;
  if (affectionStageText) {
    affectionStageText.textContent = info.stage;
    affectionStageText.style.color = info.color;
  }
  if (affectionPerkText) affectionPerkText.textContent = info.perk;

  if (headerRelationshipBadge) {
    headerRelationshipBadge.textContent = info.stage;
    headerRelationshipBadge.style.borderColor = info.color;
  }

  if (currentMoodBadge) {
    currentMoodBadge.querySelector('.mood-emoji').textContent = moodData.emoji;
  }
  if (currentMoodText) currentMoodText.textContent = moodData.text;
  if (avatarMoodBadge) avatarMoodBadge.textContent = moodData.emoji;

  if (emotionalState) {
    const valencePct = Math.round(((emotionalState.valence + 1) / 2) * 100);
    const arousalPct = Math.round(emotionalState.arousal * 100);
    if (valenceFill) valenceFill.style.width = `${Math.max(5, Math.min(100, valencePct))}%`;
    if (arousalFill) arousalFill.style.width = `${Math.max(5, Math.min(100, arousalPct))}%`;
    if (emotionLabelText) emotionLabelText.textContent = emotionalState.label || moodData.text;
  }

  if (activeThread && headerThreadPill) {
    headerThreadPill.textContent = `💬 ${activeThread.topic || 'Kenalan'}`;
  }

  const totalPhotos = DEFAULT_PHOTOS.length + StorageService.getCustomPhotos().length;
  if (unlockedPhotosCount) unlockedPhotosCount.textContent = totalPhotos;

  renderMemories(activeMemoryCategory);
  updateCustomPapLocks();
  checkMilestoneAchievements(score);
}

function renderMemories(category = 'Semua') {
  activeMemoryCategory = category;
  const allMemories = StorageService.getMemories();
  if (memoriesCount) memoriesCount.textContent = allMemories.length;

  if (!memoriesList) return;
  memoriesList.innerHTML = '';

  const filtered = category === 'Semua' 
    ? allMemories 
    : allMemories.filter(m => (m.category || 'Personal').toLowerCase() === category.toLowerCase());

  if (filtered.length === 0) {
    memoriesList.innerHTML = `
      <div class="empty-state">
        <p>Belum ada ingatan di kategori ini. Ngobrol lebih banyak untuk membangun kenangan indah! 💕</p>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    const cat = item.category || 'Personal';
    const catClass = `badge-cat-${cat.toLowerCase()}`;

    card.innerHTML = `
      <span class="memory-icon">💡</span>
      <div class="memory-content" style="width: 100%;">
        <div class="memory-header-row">
          <span class="memory-category-tag ${catClass}">${cat}</span>
          <span class="memory-date">🗓️ ${item.date || 'Tersimpan'}</span>
        </div>
        <div class="memory-text">${escapeHtml(item.fact)}</div>
      </div>
    `;
    memoriesList.appendChild(card);
  });
}

function renderQuickTopics() {
  if (!quickTopicsBar) return;
  quickTopicsBar.innerHTML = '';
  QUICK_TOPICS.forEach(topic => {
    const pill = document.createElement('button');
    pill.className = 'topic-pill';
    pill.textContent = topic.label;
    pill.addEventListener('click', () => {
      messageInput.value = topic.prompt;
      messageInput.focus();
      handleUserSubmit();
    });
    quickTopicsBar.appendChild(pill);
  });
}

function renderGallery() {
  if (!galleryGrid) return;
  galleryGrid.innerHTML = '';

  const customPhotos = StorageService.getCustomPhotos();
  const allPhotos = [...customPhotos, ...DEFAULT_PHOTOS];

  allPhotos.forEach(item => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
      <img src="${item.url}" alt="${item.caption || 'Foto'}" class="gallery-img" loading="lazy">
      <span class="gallery-tag-badge">${item.tag || 'Foto'}</span>
    `;
    card.addEventListener('click', () => {
      openPreview(item.url, item.caption);
    });
    galleryGrid.appendChild(card);
  });
}

function loadChatHistory() {
  chatStream.innerHTML = '';
  messages = StorageService.getChatHistory();

  if (messages.length === 0) {
    const affection = StorageService.getAffection();
    const settings = StorageService.getSettings();
    const charName = settings.character?.name || 'Abby';
    let initialGreeting = `halo! kenalin aku ${charName}, senang bisa kenalan sama kamu! kamu sendiri tinggal di mana nih? 😊`;
    if (affection >= 60) {
      initialGreeting = `hai sayaaang 💕 kangen bgt tauu... kamu lg apa nih sekarang beb? 🥺✨`;
    }

    const greetingMsg = {
      id: 'msg_' + Date.now(),
      sender: 'abby',
      text: initialGreeting,
      time: getCurrentTime(),
      photo: null,
      mood: 'flirty'
    };
    messages.push(greetingMsg);
    StorageService.saveChatHistory(messages);
  }

  messages.forEach(msg => appendMessageElement(msg, false));
  scrollToBottom();
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

/* --------------------------------------------------------------------------
   MESSAGE RENDERING WITH EMOTION, QUOTES, REACTIONS, VOICE NOTES, TTS & MUSIC
   -------------------------------------------------------------------------- */
function appendMessageElement(msg, animate = true) {
  const row = document.createElement('div');
  const moodClass = msg.sender === 'abby' && msg.mood ? `mood-${msg.mood}` : '';
  row.className = `message-row ${msg.sender}`;
  row.id = msg.id;

  if (!animate) {
    row.style.animation = 'none';
  }

  const settings = StorageService.getSettings();
  const charName = settings.character?.name || 'Abby';

  let quotedHTML = '';
  if (msg.replyTo && msg.replyTo.text) {
    const qSender = msg.replyTo.sender === 'abby' ? charName : 'Kamu';
    quotedHTML = `
      <div class="quoted-message-box" data-target-id="${msg.replyTo.id}">
        <div class="quoted-sender-name">${qSender}</div>
        <div class="quoted-snippet">${escapeHtml(msg.replyTo.text)}</div>
      </div>
    `;
  }

  let mediaHTML = '';
  if (msg.voiceNote) {
    const waveformBars = (msg.voiceNote.waveform || [0.3, 0.6, 0.8, 0.4, 0.9, 0.7, 0.5, 0.8, 0.6, 0.4, 0.7, 0.5, 0.8, 0.4, 0.6, 0.3])
      .map(h => `<span class="vn-bar" style="--h: ${Math.round(h * 100)}%;"></span>`).join('');

    mediaHTML = `
      <div class="voice-note-player" data-audio-url="${msg.voiceNote.audioUrl || ''}">
        <button type="button" class="btn-vn-play" data-msg-id="${msg.id}">▶</button>
        <div class="vn-waveform-container">
          <div class="vn-waveform-bars">
            ${waveformBars}
          </div>
          <div class="vn-meta-row">
            <span>🎙️ Pesan Suara</span>
            <span class="vn-duration-text">${msg.voiceNote.durationStr || '0:05'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (msg.video && msg.video.url) {
    mediaHTML = `
      <div class="chat-video-card">
        <span class="chat-video-badge">▶️ Video Selfie</span>
        <video src="${msg.video.url}" class="chat-video-player" controls playsinline autoplay muted loop></video>
        ${msg.video.caption ? `<div class="chat-photo-caption">🎬 ${escapeHtml(msg.video.caption)}</div>` : ''}
      </div>
    `;
  } else if (msg.photo && msg.photo.url) {
    mediaHTML = `
      <div class="chat-photo-card" data-url="${msg.photo.url}" data-caption="${escapeHtml(msg.photo.caption || '')}">
        <img src="${msg.photo.url}" alt="Photo" class="chat-photo-img" loading="lazy" onerror="this.src='/assets/avatar.png'">
        ${msg.photo.caption ? `<div class="chat-photo-caption">📸 ${escapeHtml(msg.photo.caption)}</div>` : ''}
      </div>
    `;
  }

  let musicHTML = '';
  if (msg.music && msg.music.title) {
    musicHTML = `
      <div class="chat-music-card" data-audio-url="${msg.music.audioUrl}">
        <img src="${msg.music.coverUrl || '/assets/avatar.png'}" alt="Music Cover" class="music-cover-art">
        <div class="music-info-col">
          <span class="music-title">${escapeHtml(msg.music.title)}</span>
          <span class="music-artist">🎵 ${escapeHtml(msg.music.artist || `Rekomendasi ${charName}`)}</span>
        </div>
        <button type="button" class="btn-music-play" data-msg-id="${msg.id}">▶</button>
      </div>
    `;
  }

  let reactionsHTML = '';
  if (msg.reactions && msg.reactions.length > 0) {
    reactionsHTML = `
      <div class="message-reactions-row">
        ${msg.reactions.map(r => `<span class="reaction-pill">${r.emoji} ${r.count > 1 ? r.count : ''}</span>`).join('')}
      </div>
    `;
  }

  const ttsHTML = msg.sender === 'abby' && msg.text ? `
    <button class="btn-msg-action btn-msg-tts" data-msg-id="${msg.id}" title="Dengarkan Suara (TTS)">
      🔊 Suara
    </button>
  ` : '';

  const actionsHTML = `
    <div class="message-actions">
      ${ttsHTML}
      <button class="btn-msg-action btn-msg-react" data-msg-id="${msg.id}" title="Beri Reaksi Emoji">
        😊 Reaksi
      </button>
      <button class="btn-msg-action btn-msg-reply" data-msg-id="${msg.id}" title="Balas Pesan Ini">
        ↩️ Balas
      </button>
      <button class="btn-msg-action btn-copy" data-text="${escapeHtml(msg.text || '')}" title="Salin Teks">
        📋 Salin
      </button>
    </div>
  `;

  const avatarHTML = msg.sender === 'abby' ? `
    <img src="/assets/avatar.png" alt="${charName}" class="message-avatar">
  ` : '';

  row.innerHTML = `
    ${avatarHTML}
    <div class="message-content-wrapper">
      <div class="message-bubble ${moodClass}">
        ${quotedHTML}
        ${msg.text ? `<div class="message-text">${escapeHtml(msg.text)}</div>` : ''}
        ${mediaHTML}
        ${musicHTML}
        <div class="message-footer">
          <span class="message-time">${msg.time}</span>
          ${msg.sender === 'user' ? '<span class="message-check">✓✓</span>' : ''}
        </div>
      </div>
      ${reactionsHTML}
      ${actionsHTML}
    </div>
  `;

  const photoCard = row.querySelector('.chat-photo-card');
  if (photoCard) {
    photoCard.addEventListener('click', () => {
      openPreview(photoCard.dataset.url, photoCard.dataset.caption);
    });
  }

  const quoteBox = row.querySelector('.quoted-message-box');
  if (quoteBox) {
    quoteBox.addEventListener('click', () => {
      const targetId = quoteBox.dataset.targetId;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.style.transition = 'transform 0.3s ease';
        targetEl.style.transform = 'scale(1.03)';
        setTimeout(() => { targetEl.style.transform = 'scale(1)'; }, 800);
      }
    });
  }

  const btnCopy = row.querySelector('.btn-copy');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(btnCopy.dataset.text);
      btnCopy.textContent = '✅ Tersalin';
      setTimeout(() => { btnCopy.textContent = '📋 Salin'; }, 2000);
    });
  }

  const btnReply = row.querySelector('.btn-msg-reply');
  if (btnReply) {
    btnReply.addEventListener('click', () => {
      setQuotedMessage(msg);
    });
  }

  const btnReact = row.querySelector('.btn-msg-react');
  if (btnReact) {
    btnReact.addEventListener('click', (e) => {
      e.stopPropagation();
      openEmojiReactionPopup(msg.id, btnReact);
    });
  }

  const btnTts = row.querySelector('.btn-msg-tts');
  if (btnTts) {
    btnTts.addEventListener('click', () => {
      if (btnTts.classList.contains('speaking')) {
        audioService.stopSpeaking();
        btnTts.classList.remove('speaking');
        btnTts.innerHTML = '🔊 Suara';
      } else {
        const started = audioService.speakAsAbby(
          msg.text,
          () => {
            btnTts.classList.add('speaking');
            btnTts.innerHTML = '⏹ Berhenti';
          },
          () => {
            btnTts.classList.remove('speaking');
            btnTts.innerHTML = '🔊 Suara';
          }
        );
        if (!started) btnTts.classList.remove('speaking');
      }
    });
  }

  const btnMusicPlay = row.querySelector('.btn-music-play');
  if (btnMusicPlay && msg.music) {
    btnMusicPlay.addEventListener('click', () => {
      const isPlaying = audioService.playVoiceNote(
        msg.id + '_music',
        msg.music.audioUrl,
        () => { btnMusicPlay.textContent = '⏸'; },
        () => { btnMusicPlay.textContent = '▶'; }
      );
      btnMusicPlay.textContent = isPlaying ? '⏸' : '▶';
    });
  }

  const btnVnPlay = row.querySelector('.btn-vn-play');
  if (btnVnPlay && msg.voiceNote) {
    btnVnPlay.addEventListener('click', () => {
      const vnPlayer = row.querySelector('.voice-note-player');
      const audioUrl = vnPlayer?.dataset.audioUrl;
      const bars = row.querySelectorAll('.vn-bar');

      const isPlaying = audioService.playVoiceNote(
        msg.id,
        audioUrl,
        (progress) => {
          btnVnPlay.textContent = '⏸';
          const activeCount = Math.floor(progress * bars.length);
          bars.forEach((bar, idx) => {
            if (idx <= activeCount) bar.classList.add('active');
            else bar.classList.remove('active');
          });
        },
        () => {
          btnVnPlay.textContent = '▶';
          bars.forEach(bar => bar.classList.remove('active'));
        }
      );

      btnVnPlay.textContent = isPlaying ? '⏸' : '▶';
    });
  }

  chatStream.appendChild(row);
}

/* --------------------------------------------------------------------------
   QUOTED REPLY SYSTEM
   -------------------------------------------------------------------------- */
function setQuotedMessage(msg) {
  activeQuotedMsg = msg;
  const settings = StorageService.getSettings();
  const charName = settings.character?.name || 'Abby';
  const senderName = msg.sender === 'abby' ? charName : 'Kamu';
  replyPreviewSender.textContent = `Membalas ${senderName}:`;
  replyPreviewText.textContent = msg.text || (msg.voiceNote ? '🎙️ Pesan Suara' : '📸 Foto');
  replyPreviewContainer.style.display = 'flex';
  messageInput.focus();
}

function clearQuotedMessage() {
  activeQuotedMsg = null;
  replyPreviewContainer.style.display = 'none';
}

/* --------------------------------------------------------------------------
   EMOJI REACTION SYSTEM
   -------------------------------------------------------------------------- */
function openEmojiReactionPopup(msgId, targetElement) {
  activeReactionTargetMsgId = msgId;
  const rect = targetElement.getBoundingClientRect();
  
  emojiReactionPopup.style.display = 'flex';
  emojiReactionPopup.style.top = `${Math.max(10, rect.top - 45)}px`;
  emojiReactionPopup.style.left = `${Math.min(window.innerWidth - 220, Math.max(10, rect.left - 20))}px`;
}

function hideEmojiReactionPopup() {
  emojiReactionPopup.style.display = 'none';
  activeReactionTargetMsgId = null;
}

function handleEmojiReaction(emoji) {
  if (!activeReactionTargetMsgId) return;

  const msg = messages.find(m => m.id === activeReactionTargetMsgId);
  if (msg) {
    if (!msg.reactions) msg.reactions = [];
    const existing = msg.reactions.find(r => r.emoji === emoji);
    if (existing) {
      existing.count += 1;
    } else {
      msg.reactions.push({ emoji, count: 1 });
    }

    StorageService.saveChatHistory(messages);
    loadChatHistory();

    if (['❤️', '🔥', '💋', '🥰'].includes(emoji)) {
      triggerAvatarHeartBurst();
      triggerAvatarBlush();
      StorageService.addAffection(2);
      loadAffectionHUD();
    }
  }

  hideEmojiReactionPopup();
}

/* --------------------------------------------------------------------------
   VOICE NOTE RECORDING SYSTEM
   -------------------------------------------------------------------------- */
async function startVoiceNoteRecording() {
  if (isRecordingVN) return;
  isRecordingVN = true;

  voiceRecordingHUD.style.display = 'flex';
  recordingTimer.textContent = '00:00';
  const waveBars = recordingWaveforms.querySelectorAll('.wave-bar');

  const started = await audioService.startRecording({
    onTimer: (timeStr) => {
      recordingTimer.textContent = timeStr;
    },
    onWaveform: (bars) => {
      waveBars.forEach((bar, idx) => {
        const h = Math.round((bars[idx] || 0.2) * 100);
        bar.style.height = `${Math.max(15, h)}%`;
      });
    },
    onError: (err) => {
      console.warn('VN Error:', err);
      cancelVoiceNoteRecording();
    }
  });

  if (!started) {
    cancelVoiceNoteRecording();
  }
}

function cancelVoiceNoteRecording() {
  isRecordingVN = false;
  voiceRecordingHUD.style.display = 'none';
  audioService.cancelRecording();
}

async function finishVoiceNoteRecording() {
  if (!isRecordingVN) return;
  isRecordingVN = false;
  voiceRecordingHUD.style.display = 'none';

  const result = await audioService.stopRecording();
  if (!result) return;

  const userMsg = {
    id: 'msg_' + Date.now(),
    sender: 'user',
    text: '',
    time: getCurrentTime(),
    photo: null,
    voiceNote: {
      audioUrl: result.audioUrl,
      duration: result.duration,
      durationStr: result.durationStr,
      waveform: result.waveform
    },
    replyTo: activeQuotedMsg ? { id: activeQuotedMsg.id, sender: activeQuotedMsg.sender, text: activeQuotedMsg.text } : null
  };

  clearQuotedMessage();
  messages.push(userMsg);
  appendMessageElement(userMsg, true);
  StorageService.saveChatHistory(messages);
  appStore.setState({ messages });
  scrollToBottom();

  processResponse("Aku baru aja kirim voice note suara buat kamu sayang 💕", userMsg);
}

/* --------------------------------------------------------------------------
   TYPING INDICATOR & HUMANIZED MULTI-PART MESSAGING
   -------------------------------------------------------------------------- */
function showTypingIndicator() {
  hideTypingIndicator();
  const settings = StorageService.getSettings();
  const charName = settings.character?.name || 'Abby';

  const ind = document.createElement('div');
  ind.className = 'message-row abby typing-row';
  ind.id = 'typingIndicator';
  ind.innerHTML = `
    <img src="/assets/avatar.png" alt="${charName}" class="message-avatar">
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatStream.appendChild(ind);
  scrollToBottom();

  if (chatHeaderStatus) {
    chatHeaderStatus.textContent = `${charName} sedang mengetik... 💬`;
    chatHeaderStatus.style.color = 'var(--primary-pink)';
  }
}

function hideTypingIndicator() {
  const ind = document.getElementById('typingIndicator');
  if (ind) ind.remove();
  updateLiveActivity();
}

function scrollToBottom() {
  chatStream.scrollTop = chatStream.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --------------------------------------------------------------------------
   CHAT EXECUTION & MULTI-TIER ERROR RECOVERY
   -------------------------------------------------------------------------- */
async function handleUserSubmit(e) {
  if (e) e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || isReplying) return;

  isReplying = true;
  btnSendMessage.disabled = true;
  messageInput.value = '';

  const userMsg = {
    id: 'msg_' + Date.now(),
    sender: 'user',
    text: text,
    time: getCurrentTime(),
    photo: null,
    replyTo: activeQuotedMsg ? { id: activeQuotedMsg.id, sender: activeQuotedMsg.sender, text: activeQuotedMsg.text } : null
  };

  const quotedToForward = activeQuotedMsg;
  clearQuotedMessage();

  messages.push(userMsg);
  appendMessageElement(userMsg, true);
  StorageService.saveChatHistory(messages);
  appStore.setState({ messages });
  scrollToBottom();

  await processResponse(text, userMsg, quotedToForward);
}

async function processResponse(text, userMsg, quotedMsg = null) {
  showTypingIndicator();

  try {
    const abbyResponse = await GeminiService.sendMessage(text, messages, quotedMsg);

    const firstPartLen = (abbyResponse.parts?.[0] || abbyResponse.rawText || '').length;
    const initialDelay = Math.min(1800, 700 + firstPartLen * 18);
    await new Promise(r => setTimeout(r, initialDelay));

    if (abbyResponse.affectionDelta !== undefined) {
      StorageService.addAffection(abbyResponse.affectionDelta);
      if (abbyResponse.affectionDelta > 0) {
        triggerAvatarBlush();
        triggerAvatarHeartBurst();
      }
    }

    if (abbyResponse.mood) {
      StorageService.setMood(abbyResponse.mood);
    }

    loadAffectionHUD(abbyResponse.emotionalState, abbyResponse.activeThread);
    renderGallery();

    const parts = abbyResponse.parts || [abbyResponse.rawText];
    
    for (let i = 0; i < parts.length; i++) {
      const partText = parts[i];
      if (!partText || !partText.trim()) continue;
      const isLastPart = (i === parts.length - 1);
      const attachedPhoto = isLastPart ? abbyResponse.photo : null;
      const attachedVideo = isLastPart ? abbyResponse.video : null;
      const attachedMusic = isLastPart ? abbyResponse.music : null;

      if (i > 0) {
        showTypingIndicator();
        const partDelay = Math.min(2200, 600 + partText.length * 15);
        await new Promise(r => setTimeout(r, partDelay));
      }

      hideTypingIndicator();

      const charMsg = {
        id: 'msg_' + Date.now() + '_' + i,
        sender: 'abby',
        text: partText,
        time: getCurrentTime(),
        photo: attachedPhoto,
        video: attachedVideo,
        music: attachedMusic,
        mood: abbyResponse.mood || StorageService.getMood()
      };
      messages.push(charMsg);
      appendMessageElement(charMsg, true);
      StorageService.saveChatHistory(messages);
      appStore.setState({ messages });
      scrollToBottom();
    }

    await StorageService.syncFromServer();
    renderMemories(activeMemoryCategory);
    loadAffectionHUD(abbyResponse.emotionalState, abbyResponse.activeThread);
    audioService.playNotificationSound();

  } catch (err) {
    console.error('Error in chat execution, entering graceful fallback:', err);
    hideTypingIndicator();
    
    // Multi-tier Graceful Outage Fallback
    const settings = StorageService.getSettings();
    const charName = settings.character?.name || 'Abby';
    const outageMsg = {
      id: 'msg_' + Date.now(),
      sender: 'abby',
      text: `Aduh sayang, kayaknya sinyalku di sini lagi agak drop nih 🥺 Tapi aku tetep dengerin kok! Nanti aku chat kamu lagi yaa beb 💕`,
      time: getCurrentTime(),
      photo: null,
      mood: 'caring'
    };
    messages.push(outageMsg);
    appendMessageElement(outageMsg, true);
    StorageService.saveChatHistory(messages);
    appStore.setState({ messages });
    scrollToBottom();
  } finally {
    isReplying = false;
    btnSendMessage.disabled = false;
    messageInput.focus();
  }
}

/**
 * Trigger dynamic PAP generation
 */
async function triggerDirectPAP(promptText, captionText) {
  messageInput.value = `Coba PAP foto kamu ${captionText ? `(${captionText})` : ''} dong 💕 [PHOTO_GEN: ${promptText}] [CAPTION: ${captionText || 'Selfie khusus buat kamu 💋'}]`;
  handleUserSubmit();
}

function openPreview(url, caption) {
  previewImg.src = url;
  previewCaption.textContent = caption || '';
  previewModal.classList.add('open');
}

/**
 * Reset Relationship to Stranger Stage
 */
function resetRelationshipToStart() {
  StorageService.setAffection(25);
  StorageService.setMood('shy');
  StorageService.clearChatHistory();
  StorageService.clearMemories();
  
  messages = [];
  chatStream.innerHTML = '';
  
  const settings = StorageService.getSettings();
  const char = settings.character || CHARACTER_PRESETS.abby;

  const freshStrangerGreeting = {
    id: 'msg_' + Date.now(),
    sender: 'abby',
    text: `halo! kenalin aku ${char.name}, cewek ${char.ethnicity} umur ${char.age} tahun 😊 senang bisa kenalan sama kamu! kamu sendiri tinggal di mana nih?`,
    time: getCurrentTime(),
    photo: null,
    mood: 'shy'
  };
  messages.push(freshStrangerGreeting);
  StorageService.saveChatHistory(messages);
  appStore.setState({ messages });
  appendMessageElement(freshStrangerGreeting, true);
  loadAffectionHUD();
  scrollToBottom();
}

/* --------------------------------------------------------------------------
   TOUCH & SWIPE GESTURES (MOBILE)
   -------------------------------------------------------------------------- */
function setupSwipeGestures() {
  let touchStartX = 0;
  let touchStartY = 0;
  let currentTouchRow = null;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    currentTouchRow = e.target.closest('.message-row');
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = Math.abs(touchEndY - touchStartY);

    if (deltaY > 60) return;

    if (touchStartX < 40 && deltaX > 70) {
      profileSidebar.classList.add('open');
      return;
    }

    if (profileSidebar.classList.contains('open') && deltaX < -60) {
      profileSidebar.classList.remove('open');
      return;
    }

    if (currentTouchRow && deltaX > 60) {
      const msgId = currentTouchRow.id;
      const targetMsg = messages.find(m => m.id === msgId);
      if (targetMsg) {
        setQuotedMessage(targetMsg);
      }
    }
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   EVENT LISTENERS SETUP
   -------------------------------------------------------------------------- */
function setupEventListeners() {
  chatForm.addEventListener('submit', handleUserSubmit);

  btnThemeQuick?.addEventListener('click', cycleNextTheme);
  selectTheme?.addEventListener('change', (e) => {
    applyTheme(e.target.value, true);
  });

  btnCloseReplyPreview?.addEventListener('click', clearQuotedMessage);

  btnVoiceNote?.addEventListener('click', () => {
    if (!isRecordingVN) {
      startVoiceNoteRecording();
    } else {
      finishVoiceNoteRecording();
    }
  });

  btnCancelRecording?.addEventListener('click', cancelVoiceNoteRecording);
  btnFinishRecording?.addEventListener('click', finishVoiceNoteRecording);

  document.querySelectorAll('.btn-react-emoji').forEach(btn => {
    btn.addEventListener('click', () => {
      handleEmojiReaction(btn.dataset.emoji);
    });
  });

  document.addEventListener('click', (e) => {
    if (emojiReactionPopup.style.display !== 'none' && !emojiReactionPopup.contains(e.target) && !e.target.closest('.btn-msg-react')) {
      hideEmojiReactionPopup();
    }
  });

  checkboxEnablePin?.addEventListener('change', (e) => {
    if (inputPinCode) {
      inputPinCode.style.display = e.target.checked ? 'block' : 'none';
      if (e.target.checked) inputPinCode.focus();
    }
  });

  if (memoryCategoriesTabs) {
    memoryCategoriesTabs.querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        memoryCategoriesTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderMemories(tab.dataset.category);
      });
    });
  }

  btnOpenMemories?.addEventListener('click', () => {
    renderMemories(activeMemoryCategory);
    memoriesModal.classList.add('open');
  });
  btnHeaderMemories?.addEventListener('click', () => {
    renderMemories(activeMemoryCategory);
    memoriesModal.classList.add('open');
  });
  btnCloseMemories?.addEventListener('click', () => {
    memoriesModal.classList.remove('open');
  });

  btnOpenCustomPAPModal?.addEventListener('click', () => {
    updateCustomPapLocks();
    customPapModal.classList.add('open');
  });
  btnHeaderCustomPAP?.addEventListener('click', () => {
    updateCustomPapLocks();
    customPapModal.classList.add('open');
  });
  btnOpenCustomFromGallery?.addEventListener('click', () => {
    galleryModal.classList.remove('open');
    updateCustomPapLocks();
    customPapModal.classList.add('open');
  });
  btnCloseCustomPap?.addEventListener('click', () => {
    customPapModal.classList.remove('open');
  });

  document.querySelectorAll('.btn-preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const minLove = parseInt(btn.dataset.minLove || '0', 10);
      const currentLove = StorageService.getAffection();
      if (currentLove < minLove) {
        customPapModal.classList.remove('open');
        messageInput.value = `Sayang, coba PAP foto ${btn.dataset.caption || 'seksi'} dong 💕`;
        handleUserSubmit();
        return;
      }

      const prompt = btn.dataset.prompt;
      const caption = btn.dataset.caption;
      customPapModal.classList.remove('open');
      triggerDirectPAP(prompt, caption);
    });
  });

  customPapForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const customPrompt = inputCustomPrompt.value.trim();
    if (!customPrompt) return;
    inputCustomPrompt.value = '';
    customPapModal.classList.remove('open');
    triggerDirectPAP(customPrompt, `Nih foto dengan gaya: ${customPrompt} 💕`);
  });

  btnToggleSidebar.addEventListener('click', () => {
    profileSidebar.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && profileSidebar.classList.contains('open')) {
      if (!profileSidebar.contains(e.target) && !btnToggleSidebar.contains(e.target)) {
        profileSidebar.classList.remove('open');
      }
    }
  });

  btnOpenGallery.addEventListener('click', () => {
    renderGallery();
    galleryModal.classList.add('open');
  });
  btnGalleryQuick.addEventListener('click', () => {
    renderGallery();
    galleryModal.classList.add('open');
  });
  btnCloseGallery.addEventListener('click', () => {
    galleryModal.classList.remove('open');
  });

  btnOpenSettings.addEventListener('click', () => {
    loadSettings();
    settingsModal.classList.add('open');
  });
  btnSettingsQuick.addEventListener('click', () => {
    loadSettings();
    settingsModal.classList.add('open');
  });
  btnCloseSettings?.addEventListener('click', () => {
    settingsModal.classList.remove('open');
  });

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      userName: inputUserName.value.trim() || 'Kamu',
      modelName: selectModel.value,
      papMode: selectPapMode?.value || 'preset',
      theme: selectTheme?.value || 'midnight',
      enablePinLock: checkboxEnablePin ? checkboxEnablePin.checked : false,
      pinCode: inputPinCode ? inputPinCode.value.trim() || '1234' : '1234',
      enableEncryption: checkboxEnableEncryption ? checkboxEnableEncryption.checked : false,
      character: {
        customPromptInjection: inputCustomPromptInjection?.value.trim() || ''
      }
    };
    StorageService.saveSettings(updated);
    appStore.setState({ settings: updated });
    applyTheme(updated.theme, false);
    settingsModal.classList.remove('open');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  });

  btnResetRelationship?.addEventListener('click', (e) => {
    e.preventDefault();
    resetRelationshipToStart();
    settingsModal.classList.remove('open');
  });

  function handleClearChat() {
    StorageService.clearChatHistory();
    loadChatHistory();
  }

  btnClearChat?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleClearChat();
  });

  btnSettingsClearChat?.addEventListener('click', (e) => {
    e.preventDefault();
    handleClearChat();
    settingsModal.classList.remove('open');
  });

  btnClosePreview.addEventListener('click', () => {
    previewModal.classList.remove('open');
  });
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
      previewModal.classList.remove('open');
    }
  });

  btnMicInput.addEventListener('click', () => {
    if (!isListeningMic) {
      isListeningMic = true;
      btnMicInput.classList.add('active');
      btnMicInput.innerHTML = '🔴';
      
      audioService.startListening(
        (transcript) => {
          messageInput.value = transcript;
          isListeningMic = false;
          btnMicInput.classList.remove('active');
          btnMicInput.innerHTML = '<span>🎤</span>';
          handleUserSubmit();
        },
        (err) => {
          console.warn('Speech Rec error:', err);
          isListeningMic = false;
          btnMicInput.classList.remove('active');
          btnMicInput.innerHTML = '<span>🎤</span>';
        }
      );
    } else {
      isListeningMic = false;
      audioService.stopListening();
      btnMicInput.classList.remove('active');
      btnMicInput.innerHTML = '<span>🎤</span>';
    }
  });
}

// Start app
document.addEventListener('DOMContentLoaded', initApp);
