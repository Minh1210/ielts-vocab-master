// Spelling & Dictation Mode Controller

class SpellingMode {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.cards = [];
    this.currentIndex = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.revealed = false;
    this.onComplete = options.onComplete || (() => {});
  }

  start(cards) {
    this.cards = cards && cards.length > 0 ? [...cards].sort(() => Math.random() - 0.5) : [];
    this.currentIndex = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.revealed = false;

    if (this.cards.length === 0) {
      this.renderEmpty();
      return;
    }

    this.renderQuestion();
  }

  renderQuestion() {
    const card = this.cards[this.currentIndex];
    const settings = StorageManager.getSettings();
    const progressPercent = Math.round((this.currentIndex / this.cards.length) * 100);

    // Auto play audio
    if (window.speechService) {
      setTimeout(() => {
        window.speechService.speak(card.word, settings.accent);
      }, 200);
    }

    // Mask word with hints (e.g. length indicator)
    const wordLength = card.word.length;
    const placeholderHint = card.word.split('').map((char, i) => {
      if (char === ' ' || char === '-') return char;
      if (i === 0) return char; // show first letter
      return '_';
    }).join(' ');

    this.container.innerHTML = `
      <div class="max-w-xl mx-auto w-full px-4">
        <!-- Progress bar & meta -->
        <div class="flex items-center justify-between text-sm text-slate-400 mb-3">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ${card.topic || 'IELTS'}
            </span>
            <span class="text-xs text-slate-400">Độ dài: <b class="text-white">${wordLength} chữ cái</b></span>
          </div>
          <span class="font-medium text-slate-300">
            Từ ${this.currentIndex + 1} / ${this.cards.length}
          </span>
        </div>

        <div class="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
          <div class="bg-gradient-to-r from-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
        </div>

        <!-- Question Card -->
        <div class="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl text-center mb-6">
          <div class="flex justify-center mb-4">
            <button type="button" id="btnSpellingAudio" class="w-16 h-16 rounded-full bg-indigo-600/30 hover:bg-indigo-600 text-indigo-400 hover:text-white flex items-center justify-center transition shadow-lg active:scale-95 group">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
            </button>
          </div>

          <span class="text-xs text-slate-400 block mb-1">Nghĩa tiếng Việt:</span>
          <h3 class="text-2xl font-bold text-emerald-300 mb-2">${card.meaning}</h3>
          <p class="text-sm text-slate-400 mb-4">${card.ipa || ''} • <span class="capitalize">${card.type}</span></p>

          <div class="font-mono text-xl sm:text-2xl text-indigo-400 tracking-widest bg-slate-900/80 py-3 px-4 rounded-xl border border-slate-800 mb-6">
            ${placeholderHint}
          </div>

          <!-- Typing input form -->
          <form id="spellingForm" class="space-y-4">
            <div>
              <input type="text" id="spellingInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ vựng tiếng Anh vào đây..." class="w-full px-5 py-3.5 rounded-xl bg-slate-900 text-white font-medium text-lg border-2 border-slate-700 focus:border-indigo-500 focus:outline-none text-center transition" />
            </div>
            <div id="spellingFeedback" class="hidden text-sm font-semibold py-2"></div>

            <div class="flex gap-2.5 justify-center">
              <button type="submit" id="btnSubmitSpelling" class="flex-1 py-3 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">
                Kiểm tra (Enter)
              </button>
              <button type="button" id="btnRevealWord" class="py-3 px-4 rounded-xl font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition text-sm">
                Xem đáp án
              </button>
            </div>
          </form>
        </div>

        <!-- Example sentence context -->
        ${card.example ? `
        <div class="bg-slate-800/60 p-4 rounded-xl border border-slate-700 text-xs text-slate-300">
          <span class="font-bold text-indigo-400 block mb-1">Gợi ý ngữ cảnh IELTS:</span>
          <p class="italic text-slate-200">${card.example.replace(new RegExp(card.word, 'gi'), '_____')}</p>
        </div>
        ` : ''}

      </div>
    `;

    const input = this.container.querySelector('#spellingInput');
    if (input) {
      setTimeout(() => input.focus(), 100);
    }

    const audioBtn = this.container.querySelector('#btnSpellingAudio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        if (window.speechService) {
          window.speechService.speak(card.word, settings.accent);
        }
      });
    }

    const form = this.container.querySelector('#spellingForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.checkAnswer();
      });
    }

    const revealBtn = this.container.querySelector('#btnRevealWord');
    if (revealBtn) {
      revealBtn.addEventListener('click', () => {
        this.revealAnswer();
      });
    }
  }

  checkAnswer() {
    const card = this.cards[this.currentIndex];
    const input = this.container.querySelector('#spellingInput');
    const feedback = this.container.querySelector('#spellingFeedback');
    const submitBtn = this.container.querySelector('#btnSubmitSpelling');
    if (!input) return;

    const userVal = input.value.trim().toLowerCase();
    const correctVal = card.word.trim().toLowerCase();

    if (userVal === '') return;

    if (userVal === correctVal) {
      // Correct
      this.correctCount++;
      feedback.className = "text-sm font-semibold py-2 text-emerald-400 block";
      feedback.innerHTML = `✓ Chính xác! <b>${card.word}</b>`;
      input.classList.remove('border-slate-700', 'border-rose-500');
      input.classList.add('border-emerald-500', 'bg-emerald-950/20');
      input.disabled = true;

      // SRS Good
      StorageManager.updateCard(SRSManager.calculateReview(card, 3));
      StorageManager.incrementReviewCount();

      submitBtn.textContent = "Từ tiếp theo →";
      submitBtn.onclick = () => this.nextWord();
      submitBtn.focus();

      setTimeout(() => {
        this.nextWord();
      }, 1200);
    } else {
      // Incorrect
      this.wrongCount++;
      feedback.className = "text-sm font-semibold py-2 text-rose-400 block";
      feedback.innerHTML = `✗ Chưa chính xác. Hãy thử lại hoặc nhấn "Xem đáp án".`;
      input.classList.remove('border-slate-700');
      input.classList.add('border-rose-500');
      input.focus();
      input.select();
    }
  }

  revealAnswer() {
    const card = this.cards[this.currentIndex];
    const input = this.container.querySelector('#spellingInput');
    const feedback = this.container.querySelector('#spellingFeedback');
    const submitBtn = this.container.querySelector('#btnSubmitSpelling');

    this.wrongCount++;
    // SRS Again
    StorageManager.updateCard(SRSManager.calculateReview(card, 1));
    StorageManager.incrementReviewCount();

    if (feedback) {
      feedback.className = "text-sm font-semibold py-2 text-amber-400 block";
      feedback.innerHTML = `Đáp án đúng là: <b class="text-white text-base">${card.word}</b>`;
    }

    if (input) {
      input.value = card.word;
      input.disabled = true;
      input.classList.add('border-amber-500');
    }

    const settings = StorageManager.getSettings();
    if (window.speechService) {
      window.speechService.speak(card.word, settings.accent);
    }

    if (submitBtn) {
      submitBtn.textContent = "Đã hiểu, sang từ tiếp theo →";
      submitBtn.onclick = () => this.nextWord();
      submitBtn.focus();
    }
  }

  nextWord() {
    this.currentIndex++;
    if (this.currentIndex >= this.cards.length) {
      this.renderCompleted();
      if (this.onComplete) this.onComplete();
    } else {
      this.renderQuestion();
    }
  }

  renderCompleted() {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto text-center py-10 px-4">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl border border-emerald-500/30">
          ✍️
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-white mb-2">Hoàn thành bài luyện chính tả!</h2>
        <p class="text-slate-300 mb-6">
          Bạn đã hoàn tất luyện gõ và nghe viết cho <span class="text-emerald-400 font-bold">${this.cards.length} từ vựng</span>. Kỹ năng nhớ mặt chữ rất quan trọng để không bị trừ điểm chính tả trong IELTS!
        </p>
        <div class="flex gap-3 justify-center">
          <button id="btnSpellingHome" class="px-6 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition">
            Về Dashboard
          </button>
          <button id="btnSpellingRetry" class="px-6 py-2.5 rounded-xl font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition">
            Luyện lại
          </button>
        </div>
      </div>
    `;

    const btnHome = this.container.querySelector('#btnSpellingHome');
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        if (window.app) window.app.switchView('dashboard');
      });
    }

    const btnRetry = this.container.querySelector('#btnSpellingRetry');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        this.start(this.cards);
      });
    }
  }

  renderEmpty() {
    this.container.innerHTML = `
      <div class="text-center py-12">
        <p class="text-slate-400">Không có đủ từ vựng để luyện chính tả.</p>
      </div>
    `;
  }
}

window.SpellingMode = SpellingMode;
