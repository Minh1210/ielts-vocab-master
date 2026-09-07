// Local Storage & Data Persistence Manager - High Performance Delta Storage

const STORAGE_KEYS = {
  CARDS: 'ielts_vocab_cards_v1', // Legacy key
  REVIEWS: 'ielts_vocab_reviews_v2', // id/word -> SRS review metadata
  CUSTOM: 'ielts_vocab_custom_v2',   // user custom words array
  STATS: 'ielts_vocab_stats_v1',
  SETTINGS: 'ielts_vocab_settings_v1'
};

// Local date formatting & manipulation helpers
function getLocalDateString(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getDaysDifference(dateStr1, dateStr2) {
  const d1 = parseLocalDate(dateStr1);
  const d2 = parseLocalDate(dateStr2);
  if (!d1 || !d2) return 999;
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

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
      const todayStr = getLocalDateString();
      let stats = data ? JSON.parse(data) : null;

      if (!stats) {
        stats = {
          streak: 0,
          longestStreak: 0,
          lastStudyDate: '',
          studyDates: [],
          reviewsToday: 0,
          totalReviews: 0,
          studiedToday: false
        };
      } else {
        if (!Array.isArray(stats.studyDates)) stats.studyDates = [];
        if (typeof stats.streak !== 'number') stats.streak = 0;
        if (typeof stats.longestStreak !== 'number') stats.longestStreak = stats.streak;
        if (typeof stats.totalReviews !== 'number') stats.totalReviews = 0;

        const lastDate = stats.lastStudyDate || '';
        const diff = lastDate ? getDaysDifference(todayStr, lastDate) : 999;

        if (diff === 0) {
          // Last studied today
          stats.studiedToday = (stats.reviewsToday || 0) > 0 || stats.studyDates.includes(todayStr);
        } else if (diff === 1) {
          // Last studied yesterday: streak is maintained and pending today's study!
          stats.reviewsToday = 0;
          stats.studiedToday = false;
        } else {
          // Missed yesterday (> 1 day): streak lost
          stats.streak = 0;
          stats.reviewsToday = 0;
          stats.studiedToday = false;
        }
      }
      return stats;
    } catch (e) {
      return {
        streak: 0,
        longestStreak: 0,
        lastStudyDate: '',
        studyDates: [],
        reviewsToday: 0,
        totalReviews: 0,
        studiedToday: false
      };
    }
  }

  static saveStats(stats) {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }

  static incrementReviewCount() {
    const stats = StorageManager.getStats();
    const todayStr = getLocalDateString();

    const lastDate = stats.lastStudyDate || '';
    const diff = lastDate ? getDaysDifference(todayStr, lastDate) : 999;

    if (diff === 0) {
      // Already studied today earlier or continuing today
      if (!stats.studyDates.includes(todayStr)) {
        stats.studyDates.push(todayStr);
      }
      if (stats.streak === 0) {
        stats.streak = 1;
      }
    } else if (diff === 1) {
      // Studied yesterday: consecutive streak increment!
      stats.streak = (stats.streak || 0) + 1;
      stats.lastStudyDate = todayStr;
      stats.reviewsToday = 0;
      if (!stats.studyDates.includes(todayStr)) {
        stats.studyDates.push(todayStr);
      }
    } else {
      // First time or missed days: new streak starts at 1
      stats.streak = 1;
      stats.lastStudyDate = todayStr;
      stats.reviewsToday = 0;
      if (!stats.studyDates.includes(todayStr)) {
        stats.studyDates.push(todayStr);
      }
    }

    stats.lastStudyDate = todayStr;
    stats.reviewsToday = (stats.reviewsToday || 0) + 1;
    stats.totalReviews = (stats.totalReviews || 0) + 1;
    stats.studiedToday = true;
    stats.longestStreak = Math.max(stats.longestStreak || 0, stats.streak);

    StorageManager.saveStats(stats);

    // Notify listening components across the app
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ielts:streak-updated', { detail: stats }));
    }

    return stats;
  }

  static getWeeklyStreak() {
    const stats = StorageManager.getStats();
    const todayStr = getLocalDateString();
    const todayDate = parseLocalDate(todayStr) || new Date();

    const dayOfWeek = todayDate.getDay(); // 0 is Sun, 1 is Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + mondayOffset);

    const weekLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const fullWeekNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i);
      const dateStr = getLocalDateString(d);
      const isToday = (dateStr === todayStr);
      const isPast = (dateStr < todayStr);
      const isFuture = (dateStr > todayStr);
      const studied = stats.studyDates.includes(dateStr);

      days.push({
        label: weekLabels[i],
        fullName: fullWeekNames[i],
        dayNumber: d.getDate(),
        dateStr,
        isToday,
        isPast,
        isFuture,
        studied
      });
    }

    return days;
  }

  static getMilestones() {
    const stats = StorageManager.getStats();
    const streak = stats.streak || 0;
    const longest = Math.max(stats.longestStreak || 0, streak);

    const milestoneDefs = [
      { id: 'm3', target: 3, title: 'Tân binh kiên trì', desc: 'Học 3 ngày liên tục', icon: '🥉' },
      { id: 'm7', target: 7, title: 'Chiến binh 1 tuần', desc: 'Duy trì chuỗi 7 ngày liên tục', icon: '🥈' },
      { id: 'm14', target: 14, title: 'Bứt phá 2 tuần', desc: 'Duy trì chuỗi 14 ngày liên tục', icon: '🥇' },
      { id: 'm30', target: 30, title: 'Cao thủ 1 tháng', desc: 'Chạm mốc 30 ngày bền bỉ', icon: '💎' },
      { id: 'm60', target: 60, title: 'Bậc thầy phản xạ', desc: '60 ngày biến từ vựng thành bản năng', icon: '⚡' },
      { id: 'm100', target: 100, title: 'Huyền thoại IELTS', desc: '100 ngày làm chủ trọn bộ 3,800+ từ', icon: '👑' }
    ];

    const badges = milestoneDefs.map(m => {
      const unlocked = longest >= m.target;
      const current = Math.min(m.target, streak);
      const percent = Math.min(100, Math.round((current / m.target) * 100));
      return {
        ...m,
        unlocked,
        current,
        percent,
        daysLeft: Math.max(0, m.target - streak)
      };
    });

    const nextMilestone = badges.find(b => streak < b.target) || {
      id: 'm_max',
      target: longest + 10,
      title: 'Đỉnh cao kiên trì',
      desc: 'Tiếp tục chuỗi kỷ lục của bạn',
      icon: '🔥',
      unlocked: false,
      percent: 100,
      daysLeft: 0
    };

    return {
      badges,
      nextMilestone
    };
  }

  static getPastActivityMap(daysCount = 28) {
    const stats = StorageManager.getStats();
    const todayStr = getLocalDateString();
    const todayDate = parseLocalDate(todayStr) || new Date();
    const result = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - i);
      const dateStr = getLocalDateString(d);
      const isToday = (dateStr === todayStr);
      const studied = stats.studyDates.includes(dateStr);
      result.push({
        dateStr,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        isToday,
        studied
      });
    }

    return result;
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
      longestStreak: stats.longestStreak || stats.streak,
      studiedToday: stats.studiedToday || false,
      totalStudyDays: (stats.studyDates || []).length,
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
