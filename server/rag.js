/**
 * RAG (Retrieval-Augmented Generation) & Semantic Memory Engine
 * Provides relevance-based memory retrieval across long-term facts and past message history.
 */

const STOP_WORDS = new Set([
  'yang', 'untuk', 'pada', 'ke', 'para', 'namun', 'menurut', 'antara', 'dia', 'mereka',
  'anda', 'kita', 'aku', 'kamu', 'saya', 'dan', 'di', 'dari', 'ini', 'itu', 'dengan',
  'adalah', 'akan', 'bisa', 'ada', 'tidak', 'atau', 'sudah', 'lagi', 'buat', 'nya',
  'sih', 'deh', 'dong', 'kan', 'kok', 'ya', 'nih', 'tuh', 'aja', 'bgt', 'banget', 'tau'
]);

export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

export function computeBM25Score(queryTokens, docTokens, avgDocLen, totalDocs, docFreqMap) {
  const k1 = 1.5;
  const b = 0.75;
  const docLen = docTokens.length;
  let score = 0;

  const docTermFreq = {};
  for (const t of docTokens) {
    docTermFreq[t] = (docTermFreq[t] || 0) + 1;
  }

  for (const q of queryTokens) {
    if (!docTermFreq[q]) continue;
    const df = docFreqMap[q] || 1;
    const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
    const tf = docTermFreq[q];
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLen / (avgDocLen || 1)));
    score += idf * (numerator / denominator);
  }

  return score;
}

export class RAGEngine {
  /**
   * Search for top-K relevant memories based on user prompt
   */
  static retrieveRelevantMemories(userQuery, memories = [], topK = 4) {
    if (!memories || memories.length === 0) return [];
    if (!userQuery || userQuery.trim().length === 0) {
      return memories.slice(0, topK);
    }

    const queryTokens = tokenize(userQuery);
    if (queryTokens.length === 0) return memories.slice(0, topK);

    // Build document frequency
    const docTokensList = memories.map(m => tokenize(m.fact));
    const totalDocs = memories.length;
    const totalLen = docTokensList.reduce((acc, toks) => acc + toks.length, 0);
    const avgDocLen = totalLen / (totalDocs || 1);

    const docFreqMap = {};
    for (const tokens of docTokensList) {
      const uniqueTokens = new Set(tokens);
      for (const t of uniqueTokens) {
        docFreqMap[t] = (docFreqMap[t] || 0) + 1;
      }
    }

    // Score memories
    const scored = memories.map((mem, idx) => {
      const tokens = docTokensList[idx];
      let score = computeBM25Score(queryTokens, tokens, avgDocLen, totalDocs, docFreqMap);

      // Boost if direct substring match occurs
      const lowerQuery = userQuery.toLowerCase();
      const lowerFact = mem.fact.toLowerCase();
      if (lowerFact.includes(lowerQuery) || queryTokens.some(t => lowerFact.includes(t))) {
        score += 2.0;
      }

      return { ...mem, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Always include the highest scoring memories, with a fallback to the most recent if no score matches
    const relevant = scored.filter(s => s.score > 0);
    if (relevant.length === 0) {
      return memories.slice(0, topK);
    }

    return relevant.slice(0, topK);
  }

  /**
   * Search relevant past conversation turns from long history
   */
  static retrieveRelevantHistory(userQuery, fullHistory = [], topK = 3) {
    if (!fullHistory || fullHistory.length <= 10) return [];
    
    // Only search older history (skip the last 10 which are already in recent context)
    const olderHistory = fullHistory.slice(0, -10);
    if (olderHistory.length === 0) return [];

    const queryTokens = tokenize(userQuery);
    if (queryTokens.length === 0) return [];

    const scored = olderHistory.map(msg => {
      const tokens = tokenize(msg.text);
      let matches = 0;
      for (const qt of queryTokens) {
        if (tokens.includes(qt)) matches++;
      }
      return { msg, matches };
    });

    return scored
      .filter(s => s.matches > 0)
      .sort((a, b) => b.matches - a.matches)
      .slice(0, topK)
      .map(s => s.msg);
  }
}
