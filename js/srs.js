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
   * @param {number} quality 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
   * @returns {Object} updated card attributes
   */
  static calculateReview(card, quality) {
    // Map 1-4 scale to standard SM-2 1-5 scale:
    // 1 -> 1 (Again), 2 -> 3 (Hard), 3 -> 4 (Good), 4 -> 5 (Easy)
    const sm2Quality = quality === 1 ? 1 : quality === 2 ? 3 : quality === 3 ? 4 : 5;

    let { repetitions = 0, easeFactor = 2.5, interval = 0 } = card;

    if (sm2Quality < 3) {
      // Failed card - reset interval and repetitions
      repetitions = 0;
      interval = 1;
    } else {
      // Successful recall
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 4;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    }

    // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    if (easeFactor > 3.0) easeFactor = 3.0;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
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
