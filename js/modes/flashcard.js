// Flashcard Mode Controller

class FlashcardMode {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.cards = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.onComplete = options.onComplete || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.keyboardBound = false;
  }

  start(cards) {
    this.cards = cards && cards.length > 0 ? [...cards] : [];
    this.currentIndex = 0;
    this.isFlipped = false;
    
    if (this.cards.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.bindKeyboard();
    this.renderCard();
  }

  bindKeyboard() {
    if (this.keyboardBound) return;
    this.handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.flipCard();
      } else if (this.isFlipped) {
        if (e.key === '1') this.rateCard(1);
        else if (e.key === '2') this.rateCard(2);
        else if (e.key === '3') this.rateCard(3);
        else if (e.key === '4') this.rateCard(4);
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);
    this.keyboardBound = true;
  }

  unbindKeyboard() {
    if (this.keyboardBound && this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.keyboardBound = false;
    }
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
    const cardEl = this.container.querySelector('.flashcard-inner');
    if (cardEl) {
      cardEl.classList.toggle('flipped', this.isFlipped);
    }
    const actionArea = this.container.querySelector('.rating-actions');
    if (actionArea) {
      actionArea.classList.toggle('hidden', !this.isFlipped);
    }
    const flipPrompt = this.container.querySelector('.flip-prompt');
    if (flipPrompt) {
      flipPrompt.classList.toggle('hidden', this.isFlipped);
    }
  }

  rateCard(quality) {
    const card = this.cards[this.currentIndex];
    const updatedCard = SRSManager.calculateReview(card, quality);
    StorageManager.updateCard(updatedCard);
    StorageManager.incrementReviewCount();

    if (this.onProgress) {
      this.onProgress(this.currentIndex + 1, this.cards.length);
    }

    this.currentIndex++;
    this.isFlipped = false;

    if (this.currentIndex >= this.cards.length) {
      this.unbindKeyboard();
      this.renderCompleted();
      if (this.onComplete) this.onComplete();
    } else {
      this.renderCard();
    }
  }

  renderCard() {
    const card = this.cards[this.currentIndex];
    const settings = StorageManager.getSettings();
    const progressPercent = Math.round(((this.currentIndex) / this.cards.length) * 100);

    // Play pronunciation if enabled
    if (settings.autoPlayAudio && window.speechService) {
      setTimeout(() => {
        window.speechService.speak(card.word, settings.accent);
      }, 300);
    }

    const interval1 = SRSManager.getIntervalLabel(1, card);
    const interval2 = SRSManager.getIntervalLabel(2, card);
    const interval3 = SRSManager.getIntervalLabel(3, card);
    const interval4 = SRSManager.getIntervalLabel(4, card);

    this.container.innerHTML = `
      <div class="max-w-2xl mx-auto w-full px-4">
        <!-- Progress Bar & Top Meta -->
        <div class="flex items-center justify-between text-sm text-slate-400 mb-3">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ${card.topic || 'IELTS'}
            </span>
            <span class="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Band ${card.band || '7.0+'}
            </span>
          </div>
          <span class="font-medium text-slate-300">
            Thẻ ${this.currentIndex + 1} / ${this.cards.length}
          </span>
        </div>

        <div class="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
          <div class="bg-gradient-to-r from-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
        </div>

        <!-- 3D Flashcard Container -->
        <div class="flashcard-scene w-full cursor-pointer select-none" id="flashcardScene">
          <div class="flashcard-inner relative w-full min-h-[420px] rounded-2xl">
            
            <!-- FRONT FACE -->
            <div class="flashcard-front absolute inset-0 w-full h-full p-8 flex flex-col justify-between items-center text-center bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl">
              <div class="w-full flex justify-between items-center text-xs text-slate-400">
                <span class="capitalize px-2.5 py-1 rounded-md bg-slate-700/70 text-slate-300">
                  ${card.type || 'noun'}
                </span>
                <button type="button" class="audio-btn p-2 rounded-full bg-indigo-600/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition" title="Nghe phát âm">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                </button>
              </div>

              <div class="my-auto py-6">
                <h2 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-2 font-display">
                  ${card.word}
                </h2>
                <p class="text-lg text-indigo-300 font-mono tracking-wider">
                  ${card.ipa || ''}
                </p>
              </div>

              <div class="flip-prompt text-xs text-slate-400 flex items-center justify-center gap-1.5 py-1">
                <span>Nhấp chuột hoặc bấm</span>
                <kbd class="px-2 py-0.5 bg-slate-700 rounded text-slate-200 font-semibold border border-slate-600">Space</kbd>
                <span>để xem nghĩa</span>
              </div>
            </div>

            <!-- BACK FACE -->
            <div class="flashcard-back absolute inset-0 w-full h-full p-7 flex flex-col justify-between items-stretch text-left bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl overflow-y-auto">
              <div>
                <div class="flex justify-between items-start mb-3 border-b border-slate-700/80 pb-3">
                  <div>
                    <h3 class="text-2xl font-bold text-white">${card.word}</h3>
                    <span class="text-xs text-indigo-400 font-mono">${card.ipa || ''} (${card.type})</span>
                  </div>
                  <button type="button" class="audio-btn p-1.5 rounded-full bg-slate-700 text-slate-300 hover:text-white hover:bg-indigo-600 transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                  </button>
                </div>

                <div class="mb-3">
                  <span class="text-xs uppercase font-bold tracking-wider text-emerald-400">Nghĩa tiếng Việt:</span>
                  <p class="text-xl font-semibold text-emerald-300 mt-0.5">${card.meaning}</p>
                </div>

                ${card.definition ? `
                <div class="mb-3 text-sm text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span class="text-xs text-slate-400 block font-medium mb-0.5">English Definition:</span>
                  <p class="italic text-slate-300">"${card.definition}"</p>
                </div>
                ` : ''}

                ${card.collocations && card.collocations.length > 0 ? `
                <div class="mb-3">
                  <span class="text-xs text-indigo-300 font-semibold block mb-1">Collocations hay dùng:</span>
                  <div class="flex flex-wrap gap-1.5">
                    ${card.collocations.map(col => `
                      <span class="px-2 py-0.5 text-xs rounded bg-indigo-950/70 text-indigo-200 border border-indigo-800/60">
                        ${col}
                      </span>
                    `).join('')}
                  </div>
                </div>
                ` : ''}

                ${card.example ? `
                <div class="text-sm bg-slate-900/80 p-3 rounded-lg border-l-4 border-amber-400">
                  <p class="text-slate-200 font-medium">${card.example}</p>
                  ${card.exampleVi ? `<p class="text-xs text-slate-400 mt-1">${card.exampleVi}</p>` : ''}
                </div>
                ` : ''}
              </div>

              <div class="text-center text-xs text-slate-400 pt-3 border-t border-slate-700/50">
                <span>Chọn mức độ ghi nhớ phía dưới để tiếp tục</span>
              </div>
            </div>

          </div>
        </div>

        <!-- Rating Action Buttons (When card flipped) -->
        <div class="rating-actions hidden mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button data-rate="1" class="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/70 transition shadow-lg active:scale-95 group">
            <span class="font-bold text-sm">🔴 Quên (Lại)</span>
            <span class="text-xs text-rose-400/80 mt-0.5">${interval1}</span>
            <kbd class="mt-1 px-1.5 py-0.2 bg-rose-900/50 rounded text-[10px] text-rose-300 font-mono">1</kbd>
          </button>

          <button data-rate="2" class="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/70 transition shadow-lg active:scale-95 group">
            <span class="font-bold text-sm">🟠 Khó</span>
            <span class="text-xs text-amber-400/80 mt-0.5">${interval2}</span>
            <kbd class="mt-1 px-1.5 py-0.2 bg-amber-900/50 rounded text-[10px] text-amber-300 font-mono">2</kbd>
          </button>

          <button data-rate="3" class="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/70 transition shadow-lg active:scale-95 group">
            <span class="font-bold text-sm">🟢 Tốt</span>
            <span class="text-xs text-emerald-400/80 mt-0.5">${interval3}</span>
            <kbd class="mt-1 px-1.5 py-0.2 bg-emerald-900/50 rounded text-[10px] text-emerald-300 font-mono">3</kbd>
          </button>

          <button data-rate="4" class="flex flex-col items-center justify-center p-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/70 transition shadow-lg active:scale-95 group">
            <span class="font-bold text-sm">🔵 Rất dễ</span>
            <span class="text-xs text-cyan-400/80 mt-0.5">${interval4}</span>
            <kbd class="mt-1 px-1.5 py-0.2 bg-cyan-900/50 rounded text-[10px] text-cyan-300 font-mono">4</kbd>
          </button>
        </div>

      </div>
    `;

    // Bind event listeners
    const scene = this.container.querySelector('#flashcardScene');
    if (scene) {
      scene.addEventListener('click', (e) => {
        // Prevent flip if audio button was clicked
        if (e.target.closest('.audio-btn')) return;
        this.flipCard();
      });
    }

    const audioBtns = this.container.querySelectorAll('.audio-btn');
    audioBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.speechService) {
          window.speechService.speak(card.word, settings.accent);
        }
      });
    });

    const rateButtons = this.container.querySelectorAll('[data-rate]');
    rateButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rate = parseInt(btn.getAttribute('data-rate'), 10);
        this.rateCard(rate);
      });
    });
  }

  renderCompleted() {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto text-center py-12 px-4">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-4xl border border-emerald-500/30">
          🎉
        </div>
        <h2 class="text-3xl font-extrabold text-white mb-2">Hoàn thành phiên ôn tập!</h2>
        <p class="text-slate-300 mb-6">
          Bạn vừa ôn xong <span class="font-bold text-emerald-400">${this.cards.length} từ vựng</span>. Lịch ôn tập theo thuật toán SRS đã được tự động cập nhật.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button id="btnFinishReview" class="px-6 py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">
            Về trang chủ
          </button>
          <button id="btnReviewAgain" class="px-6 py-3 rounded-xl font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition">
            Ôn lại bộ này
          </button>
        </div>
      </div>
    `;

    const btnFinish = this.container.querySelector('#btnFinishReview');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        if (window.app) window.app.switchView('dashboard');
      });
    }

    const btnAgain = this.container.querySelector('#btnReviewAgain');
    if (btnAgain) {
      btnAgain.addEventListener('click', () => {
        this.start(this.cards);
      });
    }
  }

  renderEmptyState() {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto text-center py-12 px-4">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-3xl">
          ✨
        </div>
        <h3 class="text-xl font-bold text-white mb-2">Hôm nay không còn từ nào cần ôn!</h3>
        <p class="text-slate-400 text-sm mb-6">
          Bạn đã hoàn thành tất cả các từ đến hạn ôn tập hôm nay. Bạn có thể chọn học từ mới hoặc luyện các game phản xạ khác.
        </p>
        <button id="btnBackHome" class="px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition">
          Về Dashboard
        </button>
      </div>
    `;

    const btnHome = this.container.querySelector('#btnBackHome');
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        if (window.app) window.app.switchView('dashboard');
      });
    }
  }
}

window.FlashcardMode = FlashcardMode;
