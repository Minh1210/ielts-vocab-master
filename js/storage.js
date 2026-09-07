// Local Storage & Data Persistence Manager - High Performance Delta Storage

const STORAGE_KEYS = {
  CARDS: 'ielts_vocab_cards_v1', // Legacy key
  REVIEWS: 'ielts_vocab_reviews_v2', // id/word -> SRS review metadata
  CUSTOM: 'ielts_vocab_custom_v2',   // user custom words array
  STATS: 'ielts_vocab_stats_v1',
  SETTINGS: 'ielts_vocab_settings_v1'
};

class StorageManager {
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        accent: 'en-GB', // default UK British for IELTS
        speechRate: 0.9,
        autoPlayAudio: true,
        dailyGoal: 20,
        theme: 'dark'
      };
    } catch (e) {
      return { accent: 'en-GB', speechRate: 0.9, autoPlayAudio: true, dailyGoal: 20, theme: 'dark' };
    }
  }

  static saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static getStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STATS);
      const todayStr = new Date().toISOString().split('T')[0];
      let stats = data ? JSON.parse(data) : null;

      if (!stats) {
        stats = {
          streak: 1,
          lastStudyDate: todayStr,
          studyDates: [todayStr],
          reviewsToday: 0,
          totalReviews: 0
        };
      } else {
        // Check streak
        if (stats.lastStudyDate !== todayStr) {
          const lastDate = new Date(stats.lastStudyDate);
          const today = new Date(todayStr);
          const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            stats.streak += 1;
          } else if (diffDays > 1) {
            stats.streak = 1;
          }
          stats.lastStudyDate = todayStr;
          stats.reviewsToday = 0;
          if (!stats.studyDates.includes(todayStr)) {
            stats.studyDates.push(todayStr);
          }
        }
      }
      return stats;
    } catch (e) {
      return { streak: 1, lastStudyDate: new Date().toISOString().split('T')[0], studyDates: [], reviewsToday: 0, totalReviews: 0 };
    }
  }

  static saveStats(stats) {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }

  static incrementReviewCount() {
    const stats = StorageManager.getStats();
    stats.reviewsToday = (stats.reviewsToday || 0) + 1;
    stats.totalReviews = (stats.totalReviews || 0) + 1;
    StorageManager.saveStats(stats);
    return stats;
  }

  // Get map of cardId -> SRS progress
  static getReviewsMap() {
    try {
      // Migrate legacy if exists
      const legacyCardsStr = localStorage.getItem(STORAGE_KEYS.CARDS);
      let reviews = {};
      let custom = [];

      if (legacyCardsStr) {
        try {
          const legacyCards = JSON.parse(legacyCardsStr);
          if (Array.isArray(legacyCards)) {
            legacyCards.forEach(c => {
              if (c.isCustom) {
                custom.push(c);
              } else if (c.repetitions && c.repetitions > 0) {
                reviews[c.id || c.word.toLowerCase()] = {
                  repetitions: c.repetitions,
                  easeFactor: c.easeFactor,
                  interval: c.interval,
                  nextReviewDate: c.nextReviewDate,
                  lastReviewed: c.lastReviewed,
                  history: c.history || []
                };
              }
            });
            localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
            localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(custom));
          }
        } catch (err) {
          console.error("Migration error:", err);
        }
        localStorage.removeItem(STORAGE_KEYS.CARDS); // clean up large legacy key
      } else {
        const stored = localStorage.getItem(STORAGE_KEYS.REVIEWS);
        if (stored) reviews = JSON.parse(stored);
      }
      return reviews;
    } catch (e) {
      return {};
    }
  }

  static saveReviewsMap(map) {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(map));
  }

  static getCustomCards() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  static saveCustomCards(customCards) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(customCards));
  }

  /**
   * Get combined list of all cards (DEFAULT_IELTS_WORDS + customCards + applied SRS review status)
   */
  static getCards() {
    const reviewsMap = StorageManager.getReviewsMap();
    const customCards = StorageManager.getCustomCards();
    const baseWords = (typeof DEFAULT_IELTS_WORDS !== 'undefined') ? DEFAULT_IELTS_WORDS : [];

    const merged = baseWords.map(bw => {
      const review = reviewsMap[bw.id] || reviewsMap[bw.word.toLowerCase()];
      if (review) {
        return {
          ...bw,
          repetitions: review.repetitions,
          easeFactor: review.easeFactor,
          interval: review.interval,
          nextReviewDate: review.nextReviewDate,
          lastReviewed: review.lastReviewed,
          history: review.history || []
        };
      }
      return SRSManager.initCardSRS(bw);
    });

    customCards.forEach(cc => {
      const review = reviewsMap[cc.id] || reviewsMap[cc.word.toLowerCase()];
      if (review) {
        merged.unshift({
          ...cc,
          repetitions: review.repetitions,
          easeFactor: review.easeFactor,
          interval: review.interval,
          nextReviewDate: review.nextReviewDate,
          lastReviewed: review.lastReviewed,
          history: review.history || []
        });
      } else {
        merged.unshift(SRSManager.initCardSRS(cc));
      }
    });

    return merged;
  }

  static updateCard(updatedCard) {
    const reviewsMap = StorageManager.getReviewsMap();
    const key = updatedCard.id || updatedCard.word.toLowerCase();
    reviewsMap[key] = {
      repetitions: updatedCard.repetitions || 0,
      easeFactor: updatedCard.easeFactor || 2.5,
      interval: updatedCard.interval || 0,
      nextReviewDate: updatedCard.nextReviewDate || Date.now(),
      lastReviewed: updatedCard.lastReviewed || Date.now(),
      history: updatedCard.history || []
    };
    StorageManager.saveReviewsMap(reviewsMap);

    if (updatedCard.isCustom) {
      const customCards = StorageManager.getCustomCards();
      const idx = customCards.findIndex(c => c.id === updatedCard.id);
      if (idx !== -1) {
        customCards[idx] = updatedCard;
        StorageManager.saveCustomCards(customCards);
      }
    }
  }

  static addCard(cardData) {
    const customCards = StorageManager.getCustomCards();
    const id = "custom_" + Date.now();
    const newCard = SRSManager.initCardSRS({
      id,
      word: cardData.word.trim(),
      type: cardData.type || 'noun',
      ipa: cardData.ipa ? cardData.ipa.trim() : '',
      meaning: cardData.meaning.trim(),
      definition: cardData.definition ? cardData.definition.trim() : '',
      example: cardData.example ? cardData.example.trim() : '',
      exampleVi: cardData.exampleVi ? cardData.exampleVi.trim() : '',
      collocations: Array.isArray(cardData.collocations) ? cardData.collocations : (cardData.collocations ? cardData.collocations.split(',').map(s => s.trim()) : []),
      topic: cardData.topic || 'Custom',
      band: cardData.band || '7.0',
      isCustom: true
    });

    customCards.unshift(newCard);
    StorageManager.saveCustomCards(customCards);
    return newCard;
  }

  static deleteCard(id) {
    let customCards = StorageManager.getCustomCards();
    customCards = customCards.filter(c => c.id !== id);
    StorageManager.saveCustomCards(customCards);

    const reviewsMap = StorageManager.getReviewsMap();
    if (reviewsMap[id]) {
      delete reviewsMap[id];
      StorageManager.saveReviewsMap(reviewsMap);
    }
  }

  static getDueCards(topic = 'all', band = 'all') {
    const cards = StorageManager.getCards();
    return cards.filter(card => {
      const topicMatches = topic === 'all' || card.topic === topic;
      const bandMatches = band === 'all' || (card.band && card.band.startsWith(band));
      return topicMatches && bandMatches && SRSManager.isCardDue(card);
    });
  }

  static getStatistics() {
    const cards = StorageManager.getCards();
    const stats = StorageManager.getStats();
    const settings = StorageManager.getSettings();

    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;
    let masteredCount = 0;
    let dueCount = 0;

    cards.forEach(card => {
      const stage = SRSManager.getCardStage(card);
      if (stage === 'new') newCount++;
      else if (stage === 'learning') learningCount++;
      else if (stage === 'review') reviewCount++;
      else if (stage === 'mastered') masteredCount++;

      if (SRSManager.isCardDue(card)) dueCount++;
    });

    return {
      totalWords: cards.length,
      newCount,
      learningCount,
      reviewCount,
      masteredCount,
      dueCount,
      streak: stats.streak,
      reviewsToday: stats.reviewsToday || 0,
      dailyGoal: settings.dailyGoal || 20,
      totalReviews: stats.totalReviews || 0
    };
  }

  static exportJSON() {
    const cards = StorageManager.getCards();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cards, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `ielts_vocab_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  }

  static importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) throw new Error("Dữ liệu JSON không hợp lệ");
      
      const customCards = StorageManager.getCustomCards();
      const reviewsMap = StorageManager.getReviewsMap();
      let importedCount = 0;

      parsed.forEach(item => {
        if (item.word && item.meaning) {
          const key = item.id || item.word.toLowerCase();
          if (item.isCustom) {
            customCards.push(item);
          }
          if (item.repetitions !== undefined) {
            reviewsMap[key] = {
              repetitions: item.repetitions,
              easeFactor: item.easeFactor || 2.5,
              interval: item.interval || 0,
              nextReviewDate: item.nextReviewDate || Date.now(),
              lastReviewed: item.lastReviewed || Date.now(),
              history: item.history || []
            };
          }
          importedCount++;
        }
      });

      StorageManager.saveCustomCards(customCards);
      StorageManager.saveReviewsMap(reviewsMap);
      return { success: true, count: importedCount };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static exportCSV() {
    const cards = StorageManager.getCards();
    let csv = "word,type,ipa,meaning,definition,example,exampleVi,collocations,topic,band\n";
    cards.forEach(c => {
      const row = [
        `"${(c.word || '').replace(/"/g, '""')}"`,
        `"${(c.type || '').replace(/"/g, '""')}"`,
        `"${(c.ipa || '').replace(/"/g, '""')}"`,
        `"${(c.meaning || '').replace(/"/g, '""')}"`,
        `"${(c.definition || '').replace(/"/g, '""')}"`,
        `"${(c.example || '').replace(/"/g, '""')}"`,
        `"${(c.exampleVi || '').replace(/"/g, '""')}"`,
        `"${((c.collocations || []).join('; ')).replace(/"/g, '""')}"`,
        `"${(c.topic || '').replace(/"/g, '""')}"`,
        `"${(c.band || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + "\n";
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", url);
    dlAnchorElem.setAttribute("download", `ielts_vocab_${new Date().toISOString().split('T')[0]}.csv`);
    dlAnchorElem.click();
    URL.revokeObjectURL(url);
  }

  static resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.CARDS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM);
    return StorageManager.getCards();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, STORAGE_KEYS };
}
