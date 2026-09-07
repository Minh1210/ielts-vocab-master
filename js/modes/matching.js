// Speed Word Matching Game Controller

class MatchingMode {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.allCards = [];
    this.roundCards = [];
    this.tiles = [];
    this.selectedTile = null;
    this.matchedPairs = 0;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.onComplete = options.onComplete || (() => {});
  }

  start(cards) {
    this.allCards = cards && cards.length > 0 ? cards : [];
    this.selectedTile = null;
    this.matchedPairs = 0;
    this.elapsedSeconds = 0;

    if (this.timerInterval) clearInterval(this.timerInterval);

    // Pick 6-8 pairs
    const count = Math.min(6, this.allCards.length);
    if (count < 2) {
      this.renderEmpty();
      return;
    }

    this.roundCards = [...this.allCards].sort(() => Math.random() - 0.5).slice(0, count);

    // Create tiles
    const englishTiles = this.roundCards.map(c => ({
      id: `en_${c.id}`,
      cardId: c.id,
      text: c.word,
      type: 'en',
      card: c
    }));

    const vietnameseTiles = this.roundCards.map(c => ({
      id: `vi_${c.id}`,
      cardId: c.id,
      text: c.meaning,
      type: 'vi',
      card: c
    }));

    // Shuffle all tiles
    this.tiles = [...englishTiles, ...vietnameseTiles].sort(() => Math.random() - 0.5);

    this.renderGame();
    this.startTimer();
  }

  startTimer() {
    this.elapsedSeconds = 0;
    const timerEl = this.container.querySelector('#matchTimer');
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
      if (timerEl) {
        const mins = Math.floor(this.elapsedSeconds / 60);
        const secs = this.elapsedSeconds % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTileClick(tileEl, tileData) {
    if (tileEl.classList.contains('matched') || tileEl.classList.contains('selected')) return;

    if (!this.selectedTile) {
      // First tile selected
      this.selectedTile = { element: tileEl, data: tileData };
      tileEl.classList.add('selected', 'ring-2', 'ring-indigo-400', 'bg-indigo-900/60');
      if (tileData.type === 'en' && window.speechService) {
        const settings = StorageManager.getSettings();
        window.speechService.speak(tileData.text, settings.accent);
      }
    } else {
      // Second tile selected
      const first = this.selectedTile;
      
      // Prevent clicking the same tile or two tiles of same language
      if (first.element === tileEl || first.data.type === tileData.type) {
        first.element.classList.remove('selected', 'ring-2', 'ring-indigo-400', 'bg-indigo-900/60');
        this.selectedTile = { element: tileEl, data: tileData };
        tileEl.classList.add('selected', 'ring-2', 'ring-indigo-400', 'bg-indigo-900/60');
        return;
      }

      // Check if match
      if (first.data.cardId === tileData.cardId) {
        // MATCH!
        first.element.classList.remove('selected', 'ring-2', 'ring-indigo-400', 'bg-indigo-900/60');
        first.element.classList.add('matched', 'bg-emerald-900/50', 'border-emerald-500/80', 'text-emerald-300', 'opacity-60', 'pointer-events-none', 'scale-95');
        tileEl.classList.add('matched', 'bg-emerald-900/50', 'border-emerald-500/80', 'text-emerald-300', 'opacity-60', 'pointer-events-none', 'scale-95');

        // Pronounce
        const enCard = first.data.card;
        if (window.speechService) {
          const settings = StorageManager.getSettings();
          window.speechService.speak(enCard.word, settings.accent);
        }

        // Update SRS
        StorageManager.updateCard(SRSManager.calculateReview(enCard, 3));
        StorageManager.incrementReviewCount();

        this.matchedPairs++;
        this.selectedTile = null;

        const pairsCountEl = this.container.querySelector('#matchPairsCount');
        if (pairsCountEl) {
          pairsCountEl.textContent = `${this.matchedPairs} / ${this.roundCards.length}`;
        }

        if (this.matchedPairs === this.roundCards.length) {
          this.stopTimer();
          setTimeout(() => this.renderVictory(), 500);
        }
      } else {
        // MISMATCH
        tileEl.classList.add('ring-2', 'ring-rose-500', 'bg-rose-950/60');
        first.element.classList.add('ring-2', 'ring-rose-500', 'bg-rose-950/60');

        setTimeout(() => {
          tileEl.classList.remove('ring-2', 'ring-rose-500', 'bg-rose-950/60');
          first.element.classList.remove('selected', 'ring-2', 'ring-indigo-400', 'ring-rose-500', 'bg-indigo-900/60', 'bg-rose-950/60');
          this.selectedTile = null;
        }, 500);
      }
    }
  }

  renderGame() {
    this.container.innerHTML = `
      <div class="max-w-3xl mx-auto w-full px-4">
        <!-- Status bar -->
        <div class="flex items-center justify-between text-sm text-slate-400 mb-4 bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-700">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-semibold uppercase text-indigo-400">Nối cặp từ tương ứng:</span>
            <span id="matchPairsCount" class="font-bold text-white">${this.matchedPairs} / ${this.roundCards.length}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-xs text-slate-400">⏱ Thời gian:</span>
            <span id="matchTimer" class="font-mono font-bold text-emerald-400">00:00</span>
          </div>
        </div>

        <!-- Tiles Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 select-none" id="matchTilesGrid">
          ${this.tiles.map(tile => `
            <div data-tile-id="${tile.id}" class="match-tile cursor-pointer min-h-[90px] p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex flex-col justify-center items-center text-center transition duration-200 shadow-md">
              <span class="${tile.type === 'en' ? 'font-bold text-white text-base' : 'font-medium text-indigo-200 text-sm'}">
                ${tile.text}
              </span>
              ${tile.type === 'en' ? `
                <span class="text-[11px] text-slate-400 font-mono mt-0.5">${tile.card.ipa || ''}</span>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const tileElements = this.container.querySelectorAll('.match-tile');
    tileElements.forEach(el => {
      const tileId = el.getAttribute('data-tile-id');
      const tileData = this.tiles.find(t => t.id === tileId);
      el.addEventListener('click', () => {
        this.handleTileClick(el, tileData);
      });
    });
  }

  renderVictory() {
    const mins = Math.floor(this.elapsedSeconds / 60);
    const secs = this.elapsedSeconds % 60;
    const timeStr = `${mins > 0 ? mins + ' phút ' : ''}${secs} giây`;

    this.container.innerHTML = `
      <div class="max-w-md mx-auto text-center py-10 px-4">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-4xl border border-emerald-500/30 animate-bounce">
          ⚡
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-white mb-2">Hoàn thành xuất sắc!</h2>
        <p class="text-slate-300 mb-6">
          Bạn đã ghép nối chính xác <span class="font-bold text-emerald-400">${this.roundCards.length} cặp từ vựng IELTS</span> trong thời gian <span class="font-bold text-indigo-400">${timeStr}</span>.
        </p>

        <div class="flex gap-3 justify-center">
          <button id="btnMatchHome" class="px-6 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition">
            Về Dashboard
          </button>
          <button id="btnMatchNextRound" class="px-6 py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition">
            Vòng tiếp theo →
          </button>
        </div>
      </div>
    `;

    const btnHome = this.container.querySelector('#btnMatchHome');
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        if (window.app) window.app.switchView('dashboard');
      });
    }

    const btnNext = this.container.querySelector('#btnMatchNextRound');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.start(this.allCards);
      });
    }
  }

  renderEmpty() {
    this.container.innerHTML = `
      <div class="text-center py-12">
        <p class="text-slate-400">Cần ít nhất 2 từ vựng để chơi game nối từ.</p>
      </div>
    `;
  }
}

window.MatchingMode = MatchingMode;
