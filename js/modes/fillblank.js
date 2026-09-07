// Fill In The Blank IELTS Context Sentence Controller

class FillBlankMode {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.allCards = [];
    this.cards = [];
    this.currentIndex = 0;
    this.score = 0;
    this.answered = false;
    this.onComplete = options.onComplete || (() => {});
  }

  start(cards, allCardsPool) {
    this.allCards = allCardsPool && allCardsPool.length > 0 ? allCardsPool : cards;
    // Filter only cards that have examples
    this.cards = (cards || []).filter(c => c.example && c.example.trim().length > 0).sort(() => Math.random() - 0.5);
    this.currentIndex = 0;
    this.score = 0;
    this.answered = false;

    if (this.cards.length === 0) {
      this.renderEmpty();
      return;
    }

    this.renderQuestion();
  }

  renderQuestion() {
    const card = this.cards[this.currentIndex];
    const progressPercent = Math.round((this.currentIndex / this.cards.length) * 100);

    // Mask the target word in the example sentence
    const regex = new RegExp(`\\b${card.word}\\b`, 'gi');
    const maskedSentence = card.example.replace(regex, '<span class="px-3 py-1 bg-indigo-500/20 border-b-2 border-indigo-400 text-indigo-300 font-bold rounded">______</span>');

    // Distractor choices
    const distractors = this.allCards
      .filter(c => c.id !== card.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const options = [card, ...distractors].sort(() => Math.random() - 0.5);

    this.container.innerHTML = `
      <div class="max-w-2xl mx-auto w-full px-4">
        <!-- Progress bar & meta -->
        <div class="flex items-center justify-between text-sm text-slate-400 mb-3">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ${card.topic || 'IELTS'}
            </span>
            <span class="text-xs text-slate-400">Điểm: <b class="text-white">${this.score}</b></span>
          </div>
          <span class="font-medium text-slate-300">
            Câu ${this.currentIndex + 1} / ${this.cards.length}
          </span>
        </div>

        <div class="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
          <div class="bg-gradient-to-r from-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
        </div>

        <!-- Sentence Card -->
        <div class="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl mb-6">
          <span class="text-xs font-semibold uppercase text-indigo-400 tracking-wider block mb-4">
            Đọc câu ngữ cảnh IELTS và chọn từ thích hợp vào chỗ trống:
          </span>

          <p class="text-lg sm:text-xl text-slate-100 font-medium leading-relaxed mb-4">
            "${maskedSentence}"
          </p>

          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/70 text-xs text-slate-400">
            <span class="font-semibold text-slate-300 block mb-0.5">Gợi ý nghĩa từ cần điền:</span>
            <span class="text-emerald-300 font-semibold text-sm">${card.meaning}</span> (${card.type})
          </div>
        </div>

        <!-- 4 Choices -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6" id="fillBlankChoices">
          ${options.map((opt, i) => `
            <button type="button" data-card-id="${opt.id}" class="fill-option-btn flex items-center p-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-left text-slate-200 font-semibold transition shadow-md active:scale-[0.99] group">
              <span class="w-7 h-7 rounded-lg bg-slate-700/80 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                ${['A', 'B', 'C', 'D'][i]}
              </span>
              <div>
                <span class="text-base text-white block">${opt.word}</span>
                <span class="text-xs text-slate-400 font-normal font-mono">${opt.ipa || ''}</span>
              </div>
            </button>
          `).join('')}
        </div>

        <!-- Feedback & Next Button -->
        <div id="fillBlankNextArea" class="hidden text-center">
          ${card.exampleVi ? `
          <div class="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 text-left mb-4 text-xs text-slate-300">
            <span class="font-bold text-emerald-400 block mb-1">Dịch nghĩa câu ví dụ:</span>
            <p class="text-slate-200 font-medium">"${card.exampleVi}"</p>
          </div>
          ` : ''}
          <button id="btnFillNext" class="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">
            Câu tiếp theo →
          </button>
        </div>

      </div>
    `;

    const choiceButtons = this.container.querySelectorAll('.fill-option-btn');
    choiceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        this.answered = true;

        const optId = btn.getAttribute('data-card-id');
        const isCorrect = optId === card.id;

        choiceButtons.forEach(b => {
          const bId = b.getAttribute('data-card-id');
          if (bId === card.id) {
            b.classList.add('bg-emerald-900/80', 'border-emerald-500', 'text-white');
          } else if (bId === optId && !isCorrect) {
            b.classList.add('bg-rose-900/80', 'border-rose-500', 'text-white');
          }
        });

        if (isCorrect) {
          this.score += 10;
          StorageManager.updateCard(SRSManager.calculateReview(card, 3));
          StorageManager.incrementReviewCount();
        } else {
          StorageManager.updateCard(SRSManager.calculateReview(card, 1));
          StorageManager.incrementReviewCount();
        }

        const settings = StorageManager.getSettings();
        if (window.speechService) {
          window.speechService.speak(card.word, settings.accent);
        }

        const nextArea = this.container.querySelector('#fillBlankNextArea');
        if (nextArea) nextArea.classList.remove('hidden');
      });
    });

    const nextBtn = this.container.querySelector('#btnFillNext');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.nextQuestion();
      });
    }
  }

  nextQuestion() {
    this.currentIndex++;
    this.answered = false;

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
          🎯
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-white mb-2">Hoàn thành bài điền từ!</h2>
        <p class="text-slate-300 mb-6">
          Bạn đã hoàn thành bài luyện áp dụng từ vựng vào ngữ cảnh câu học thuật IELTS. Tổng điểm: <span class="font-bold text-emerald-400">${this.score} điểm</span>.
        </p>
        <div class="flex gap-3 justify-center">
          <button id="btnFillHome" class="px-6 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition">
            Về Dashboard
          </button>
          <button id="btnFillRetry" class="px-6 py-2.5 rounded-xl font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition">
            Luyện lại
          </button>
        </div>
      </div>
    `;

    const btnHome = this.container.querySelector('#btnFillHome');
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        if (window.app) window.app.switchView('dashboard');
      });
    }

    const btnRetry = this.container.querySelector('#btnFillRetry');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        this.start(this.cards, this.allCards);
      });
    }
  }

  renderEmpty() {
    this.container.innerHTML = `
      <div class="text-center py-12">
        <p class="text-slate-400">Không có từ vựng nào có câu ví dụ để điền từ.</p>
      </div>
    `;
  }
}

window.FillBlankMode = FillBlankMode;
