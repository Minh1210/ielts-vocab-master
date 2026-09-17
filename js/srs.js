// Spaced Repetition System (SRS) - SuperMemo SM-2 Algorithm Implementation

class SRSManager {
  /**
   * Initialize or normalize card SRS metadata
   * @param {Object} card 
   * @returns {Object} card with SRS attributes
   */
  static initCardSRS(card) {
    const now = Date.now();
    return {
      ...card,
      repetitions: card.repetitions !== undefined ? card.repetitions : 0,
      easeFactor: card.easeFactor !== undefined ? card.easeFactor : 2.5,
      interval: card.interval !== undefined ? card.interval : 0,
      nextReviewDate: card.nextReviewDate !== undefined ? card.nextReviewDate : now,
      lastReviewed: card.lastReviewed !== undefined ? card.lastReviewed : null,
      history: card.history || []
    };
  }

  /**
   * Calculate next review interval using SM-2
   * @param {Object} card 
   * @param {number|string} quality 'reset' | 1, 'review' | 2 | 3, 'master' | 4 | 5
   * @returns {Object} updated card attributes
   */
  static calculateReview(card, quality) {
    let { repetitions = 0, easeFactor = 2.5, interval = 0 } = card;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const isReset = (quality === 1 || quality === 'reset' || quality === 'again');
    const isMaster = (quality === 'master' || quality === 4 || quality === 5);

    if (isReset) {
      // RESET: Card forgotten or reset to beginning
      repetitions = 0;
      interval = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    } else if (isMaster) {
      // MASTER: Card completely mastered, immediately advanced to mastered stage & long interval
      repetitions = Math.max(repetitions + 3, 6);
      interval = Math.max(Math.round((interval || 2) * easeFactor * 1.6), 14);
      easeFactor = Math.min(3.0, easeFactor + 0.15);
    } else {
      // REVIEW: Card remembered, standard spaced repetition progression
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 3;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
      easeFactor = Math.min(3.0, easeFactor + 0.05);
    }

    const nextReviewDate = now + interval * oneDayMs;

    const updatedCard = {
      ...card,
      repetitions,
      easeFactor: Number(easeFactor.toFixed(2)),
      interval,
      nextReviewDate,
      lastReviewed: now,
      history: [
        ...(card.history || []).slice(-19), // keep last 20 records
        { timestamp: now, quality, interval }
      ]
    };

    return updatedCard;
  }

  /**
   * Determine whether a card is due for review today
   * @param {Object} card 
   * @returns {boolean}
   */
  static isCardDue(card) {
    if (!card.nextReviewDate) return true;
    const now = new Date();
    // Normalize to end of day today
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return card.nextReviewDate <= endOfToday;
  }

  /**
   * Get card learning stage
   * @param {Object} card 
   * @returns {'new' | 'learning' | 'review' | 'mastered'}
   */
  static getCardStage(card) {
    if (!card.repetitions || card.repetitions === 0) return 'new';
    if (card.repetitions < 3) return 'learning';
    if (card.repetitions < 6) return 'review';
    return 'mastered';
  }

  /**
   * Human readable description of next interval
   * @param {number} interval 
   * @returns {string}
   */
  static getIntervalLabel(quality, currentCard) {
    const testCard = SRSManager.calculateReview({ ...currentCard }, quality);
    const interval = testCard.interval;
    if (quality === 1) return '< 10 phút';
    if (interval <= 1) return '1 ngày';
    if (interval < 30) return `${interval} ngày`;
    const months = Math.round(interval / 30);
    return `${months} tháng`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SRSManager };
}
