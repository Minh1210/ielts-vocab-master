// Multiple Choice Quiz Mode Controller

class QuizMode {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.allCards = [];
    this.quizCards = [];
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.answered = false;
    this.wrongAnswers = [];
    this.onComplete = options.onComplete || (() => {});
  }

  start(cards, allCardsPool) {
    this.quizCards = cards && cards.length > 0 ? [...cards].sort(() => Math.random() - 0.5) : [];
    this.allCards = allCardsPool && allCardsPool.length > 0 ? allCardsPool : this.quizCards;
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.answered = false;
    this.wrongAnswers = [];

    if (this.quizCards.length === 0) {
      this.renderEmpty();
      return;
    }

    this.renderQuestion();
  }

  generateOptions(currentCard, isEnglishPrompt) {
    // Generate 1 correct + 3 distractor choices
    const distractors = this.allCards
      .filter(c => c.id !== currentCard.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [currentCard, ...distractors].sort(() => Math.random() - 0.5);

    return options.map(opt => ({
      id: opt.id,
      text: isEnglishPrompt ? opt.meaning : opt.word,
      isCorrect: opt.id === currentCard.id,
      card: opt
    }));
  }

  handleAnswer(selectedOption, optionsList, isEnglishPrompt) {
    if (this.answered) return;
    this.answered = true;

    const currentCard = this.quizCards[this.currentIndex];
    const isCorrect = selectedOption.isCorrect;

    const optionButtons = this.container.querySelectorAll('.quiz-option-btn');
    optionButtons.forEach(btn => {
      const optId = btn.getAttribute('data-opt-id');
      if (optId === currentCard.id) {
        btn.classList.remove('bg-slate-800', 'hover:bg-slate-700', 'border-slate-700');
        btn.classList.add('bg-emerald-900/80', 'border-emerald-500', 'text-white');
      } else if (optId === selectedOption.id && !isCorrect) {
        btn.classList.remove('bg-slate-800', 'hover:bg-slate-700', 'border-slate-700');
        btn.classList.add('bg-rose-900/80', 'border-rose-500', 'text-white');
      }
    });

    if (isCorrect) {
      this.score += 10 + (this.streak * 2);
      this.streak++;
      if (this.streak > this.maxStreak) this.maxStreak = this.streak;
      // Record SRS progress: Good (3)
      StorageManager.updateCard(SRSManager.calculateReview(currentCard, 3));
      StorageManager.incrementReviewCount();
    } else {
      this.streak = 0;
      this.wrongAnswers.push(currentCard);
      // Record SRS progress: Again (1)
      StorageManager.updateCard(SRSManager.calculateReview(currentCard, 1));
      StorageManager.incrementReviewCount();
    }

    // Update streak UI
    const streakEl = this.container.querySelector('#quizStreak');
    if (streakEl) {
      streakEl.innerHTML = `🔥 Combo: ${this.streak}`;
    }

    // Show next button or explanation
    const nextArea = this.container.querySelector('#quizNextArea');
    if (nextArea) {
      nextArea.classList.remove('hidden');
    }

    // Pronounce word
    const settings = StorageManager.getSettings();
    if (window.speechService) {
      window.speechService.speak(currentCard.word, settings.accent);
    }
  }

  nextQuestion() {
    this.currentIndex++;
    this.answered = false;

    if (this.currentIndex >= this.quizCards.length) {
      this.renderCompleted();
      if (this.onComplete) this.onComplete();
    } else {
      this.renderQuestion();
    }
  }

  renderQuestion() {
    const card = this.quizCards[this.currentIndex];
    const isEnglishPrompt = Math.random() > 0.3; // 70% word -> meaning, 30% meaning -> word
    const options = this.generateOptions(card, isEnglishPrompt);
    const progressPercent = Math.round((this.currentIndex / this.quizCards.length) * 100);

    this.container.innerHTML = `
      <div class="max-w-2xl mx-auto w-full px-4">
        <!-- Top status bar -->
        <div class="flex items-center justify-between text-sm text-slate-400 mb-3">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ${card.topic || 'IELTS'}
            </span>
            <span id="quizStreak" class="px-2 py-0.5 rounded text-xs font-bold ${this.streak >= 3 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' : 'bg-slate-800 text-slate-300'}">
              🔥 Combo: ${this.streak}
            </span>
          </div>
          <span class="font-medium text-slate-300">
            Câu ${this.currentIndex + 1} / ${this.quizCards.length}
          </span>
        </div>

        <div class="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
          <div class="bg-gradient-to-r from-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
        </div>

        <!-- Question Card -->
        <div class="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl text-center mb-6">
          <span class="text-xs font-semibold text-indigo-400 tracking-wider uppercase mb-2 block">
            ${isEnglishPrompt ? 'Chọn nghĩa tiếng Việt chính xác:' : 'Chọn từ vựng tiếng Anh tương ứng:'}
          </span>

          <div class="flex items-center justify-center gap-3 my-4">
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              ${isEnglishPrompt ? card.word : card.meaning}
            </h2>
            ${isEnglishPrompt ? `
            <button type="button" id="quizAudioBtn" class="p-2 rounded-full bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition" title="Nghe phát âm">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
            </button>
            ` : ''}
          </div>

          ${isEnglishPrompt && card.ipa ? `
            <p class="text-indigo-300 font-mono text-sm">${card.ipa} • <span class="capitalize">${card.type}</span></p>
          ` : ''}
        </div>

        <!-- 4 Options -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6" id="quizOptionsGrid">
          ${options.map((opt, i) => `
            <button type="button" data-opt-id="${opt.id}" class="quiz-option-btn flex items-center p-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-left text-slate-200 font-medium transition shadow-md active:scale-[0.99] group">
              <span class="w-7 h-7 rounded-lg bg-slate-700/80 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                ${['A', 'B', 'C', 'D'][i]}
              </span>
              <span class="text-sm sm:text-base leading-snug">${opt.text}</span>
            </button>
          `).join('')}
        </div>

        <!-- Next / Feedback Button -->
        <div id="quizNextArea" class="hidden text-center">
          ${card.example ? `
          <div class="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 text-left mb-4 text-xs text-slate-300">
            <span class="font-bold text-indigo-400 block mb-1">Ví dụ ngữ cảnh:</span>
            <p class="font-medium text-slate-200">"${card.example}"</p>
            ${card.exampleVi ? `<p class="text-slate-400 mt-1">${card.exampleVi}</p>` : ''}
          </div>
          ` : ''}
          <button id="btnQuizNext" class="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">
            Câu tiếp theo →
          </button>
        </div>

      </div>
    `;

    // Listeners
    const audioBtn = this.container.querySelector('#quizAudioBtn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const settings = StorageManager.getSettings();
        if (window.speechService) {
          window.speechService.speak(card.word, settings.accent);
        }
      });
    }

    const optionButtons = this.container.querySelectorAll('.quiz-option-btn');
    optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const optId = btn.getAttribute('data-opt-id');
        const selected = options.find(o => o.id === optId);
        if (selected) {
          this.handleAnswer(selected, options, isEnglishPrompt);
        }
      });
    });

    const nextBtn = this.container.querySelector('#btnQuizNext');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.nextQuestion();
      });
    }
  }

  renderCompleted() {
    const accuracy = Math.round(((this.quizCards.length - this.wrongAnswers.length) / this.quizCards.length) * 100);

    this.container.innerHTML = `
      <div class="max-w-md mx-auto text-center py-10 px-4">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl border border-indigo-500/30">
          🏆
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-white mb-2">Kết thúc bài Trắc nghiệm!</h2>
        
        <div class="grid grid-cols-3 gap-3 my-6">
          <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span class="text-xs text-slate-400 block">Độ chính xác</span>
            <span class="text-2xl font-bold ${accuracy >= 80 ? 'text-emerald-400' : accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'}">${accuracy}%</span>
          </div>
          <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span class="text-xs text-slate-400 block">Điểm số</span>
            <span class="text-2xl font-bold text-indigo-400">${this.score}</span>
          </div>
          <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span class="text-xs text-slate-400 block">Chuỗi cao nhất</span>
            <span class="text-2xl font-bold text-amber-400">🔥 ${this.maxStreak}</span>
          </div>
        </div>

        ${this.wrongAnswers.length > 0 ? `
          <div class="text-left bg-slate-800/60 p-4 rounded-xl border border-slate-700 mb-6 max-h-48 overflow-y-auto">
            <span class="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">
              Các từ cần ôn lại (${this.wrongAnswers.length}):
            </span>
            <ul class="space-y-1.5 text-xs text-slate-300">
              ${this.wrongAnswers.map(w => `
                <li class="flex justify-between items-center py-1 border-b border-slate-700/50">
                  <span class="font-bold text-white">${w.word}</span>
                  <span class="text-slate-400">${w.meaning}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : `
          <p class="text-emerald-400 font-semibold mb-6">Xuất sắc! Bạn đã trả lời đúng tất cả các câu hỏi.</p>
        `}

        <div class="flex gap-3 justify-center">
          <button id="btnQuizBack" class="px-6 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition">
            Về Dashboard
          </button>
          <button id="btnQuizRetry" class="px-6 py-2.5 rounded-xl font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition">
            Chơi lại
          </button>
        </div>
      </div>
    `;

    const btnBack = this.container.querySelector('#btnQuizBack');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (window.app) window.app.switchView('dashboard');
      });
    }

    const btnRetry = this.container.querySelector('#btnQuizRetry');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        this.start(this.quizCards, this.allCards);
      });
    }
  }

  renderEmpty() {
    this.container.innerHTML = `
      <div class="text-center py-12">
        <p class="text-slate-400">Không có đủ từ vựng để tạo bài kiểm tra trắc nghiệm.</p>
      </div>
    `;
  }
}

window.QuizMode = QuizMode;
