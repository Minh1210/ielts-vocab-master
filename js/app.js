// Main Application Orchestrator

class IELTSApp {
  constructor() {
    this.currentView = 'dashboard';
    this.selectedTopic = 'all';
    this.selectedBand = 'all';
    this.searchQuery = '';

    // Initialize study mode controllers
    this.flashcardMode = new FlashcardMode('modeContainer', {
      onComplete: () => this.updateDashboard(),
      onProgress: () => {}
    });

    this.quizMode = new QuizMode('modeContainer', {
      onComplete: () => this.updateDashboard()
    });

    this.spellingMode = new SpellingMode('modeContainer', {
      onComplete: () => this.updateDashboard()
    });

    this.matchingMode = new MatchingMode('modeContainer', {
      onComplete: () => this.updateDashboard()
    });

    this.fillBlankMode = new FillBlankMode('modeContainer', {
      onComplete: () => this.updateDashboard()
    });

    this.init();
  }

  init() {
    this.bindNavigation();
    this.bindModals();
    this.renderTopicsFilter();
    this.updateDashboard();
  }

  bindNavigation() {
    const navItems = document.querySelectorAll('[data-nav]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-nav');
        this.switchView(targetView);
      });
    });

    // Logo click goes home
    const brandLogo = document.getElementById('brandLogo');
    if (brandLogo) {
      brandLogo.addEventListener('click', () => this.switchView('dashboard'));
    }
  }

  bindModals() {
    // Add Word Modal
    const btnOpenAddWord = document.getElementById('btnOpenAddWord');
    const modalAddWord = document.getElementById('modalAddWord');
    const btnCloseAddWord = document.getElementById('btnCloseAddWord');
    const formAddWord = document.getElementById('formAddWord');

    if (btnOpenAddWord && modalAddWord) {
      btnOpenAddWord.addEventListener('click', () => {
        modalAddWord.classList.remove('hidden');
      });
    }

    if (btnCloseAddWord && modalAddWord) {
      btnCloseAddWord.addEventListener('click', () => {
        modalAddWord.classList.add('hidden');
      });
    }

    if (formAddWord) {
      formAddWord.addEventListener('submit', (e) => {
        e.preventDefault();
        const word = document.getElementById('inputWord').value;
        const type = document.getElementById('inputType').value;
        const ipa = document.getElementById('inputIpa').value;
        const meaning = document.getElementById('inputMeaning').value;
        const definition = document.getElementById('inputDefinition').value;
        const collocations = document.getElementById('inputCollocations').value;
        const example = document.getElementById('inputExample').value;
        const exampleVi = document.getElementById('inputExampleVi').value;
        const topic = document.getElementById('inputTopic').value;
        const band = document.getElementById('inputBand').value;

        if (!word || !meaning) {
          alert('Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt!');
          return;
        }

        StorageManager.addCard({
          word, type, ipa, meaning, definition, collocations, example, exampleVi, topic, band
        });

        formAddWord.reset();
        modalAddWord.classList.add('hidden');
        this.updateDashboard();
        if (this.currentView === 'wordlist') {
          this.renderWordList();
        }
        alert('Đã thêm từ mới vào kho từ vựng thành công!');
      });
    }

    // Settings Modal
    const btnOpenSettings = document.getElementById('btnOpenSettings');
    const modalSettings = document.getElementById('modalSettings');
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    const formSettings = document.getElementById('formSettings');

    if (btnOpenSettings && modalSettings) {
      btnOpenSettings.addEventListener('click', () => {
        this.loadSettingsForm();
        modalSettings.classList.remove('hidden');
      });
    }

    if (btnCloseSettings && modalSettings) {
      btnCloseSettings.addEventListener('click', () => {
        modalSettings.classList.add('hidden');
      });
    }

    if (formSettings) {
      formSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        const accent = document.getElementById('settingAccent').value;
        const speechRate = parseFloat(document.getElementById('settingSpeechRate').value);
        const autoPlayAudio = document.getElementById('settingAutoPlay').checked;
        const dailyGoal = parseInt(document.getElementById('settingDailyGoal').value, 10);

        StorageManager.saveSettings({ accent, speechRate, autoPlayAudio, dailyGoal });
        modalSettings.classList.add('hidden');
        this.updateDashboard();
      });
    }

    // Backup & Restore
    const btnExportJSON = document.getElementById('btnExportJSON');
    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', () => StorageManager.exportJSON());
    }

    const btnExportCSV = document.getElementById('btnExportCSV');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => StorageManager.exportCSV());
    }

    const inputImportJSON = document.getElementById('inputImportJSON');
    if (inputImportJSON) {
      inputImportJSON.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const res = StorageManager.importJSON(evt.target.result);
            if (res.success) {
              alert(`Nhập thành công ${res.count} từ vựng!`);
              this.updateDashboard();
              if (this.currentView === 'wordlist') this.renderWordList();
            } else {
              alert('Nhập dữ liệu thất bại: ' + res.error);
            }
          };
          reader.readAsText(file);
        }
      });
    }

    const btnResetDefault = document.getElementById('btnResetDefault');
    if (btnResetDefault) {
      btnResetDefault.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn khôi phục kho từ vựng IELTS gốc? Các chỉnh sửa cá nhân có thể bị thiết lập lại.')) {
          StorageManager.resetToDefault();
          this.updateDashboard();
          if (this.currentView === 'wordlist') this.renderWordList();
          alert('Đã khôi phục kho từ mặc định thành công!');
        }
      });
    }
  }

  loadSettingsForm() {
    const settings = StorageManager.getSettings();
    const accentEl = document.getElementById('settingAccent');
    const speechRateEl = document.getElementById('settingSpeechRate');
    const autoPlayEl = document.getElementById('settingAutoPlay');
    const dailyGoalEl = document.getElementById('settingDailyGoal');

    if (accentEl) accentEl.value = settings.accent || 'en-US';
    if (speechRateEl) speechRateEl.value = settings.speechRate || 0.9;
    if (autoPlayEl) autoPlayEl.checked = settings.autoPlayAudio !== undefined ? settings.autoPlayAudio : true;
    if (dailyGoalEl) dailyGoalEl.value = settings.dailyGoal || 20;
  }

  switchView(viewName, filterTopic = null, filterBand = null) {
    this.currentView = viewName;
    if (filterTopic !== null) this.selectedTopic = filterTopic;
    if (filterBand !== null) this.selectedBand = filterBand;

    // Unbind any flashcard keyboard listeners
    if (this.flashcardMode) this.flashcardMode.unbindKeyboard();

    // Toggle main sections
    const dashboardSec = document.getElementById('dashboardSection');
    const modeSec = document.getElementById('modeSection');
    const wordListSec = document.getElementById('wordListSection');

    if (dashboardSec) dashboardSec.classList.toggle('hidden', viewName !== 'dashboard');
    if (modeSec) modeSec.classList.toggle('hidden', !['flashcard', 'quiz', 'spelling', 'matching', 'fillblank'].includes(viewName));
    if (wordListSec) wordListSec.classList.toggle('hidden', viewName !== 'wordlist');

    // Update active nav button styling
    const navItems = document.querySelectorAll('[data-nav]');
    navItems.forEach(item => {
      const isCurrent = item.getAttribute('data-nav') === viewName;
      item.classList.toggle('text-indigo-400', isCurrent);
      item.classList.toggle('bg-slate-800', isCurrent);
    });

    if (viewName === 'dashboard') {
      this.updateDashboard();
    } else if (viewName === 'wordlist') {
      if (filterBand !== null) {
        const bandSelect = document.getElementById('filterBandSelect');
        if (bandSelect) bandSelect.value = filterBand;
      }
      if (filterTopic !== null) {
        const topicSelect = document.getElementById('filterTopicSelect');
        if (topicSelect) topicSelect.value = filterTopic;
      }
      this.wordListDisplayLimit = 60;
      this.renderWordList();
    } else {
      this.launchStudyMode(viewName);
    }
  }

  launchStudyMode(modeName) {
    const allCards = StorageManager.getCards();
    let cardsToStudy = allCards;

    if (this.selectedTopic && this.selectedTopic !== 'all') {
      cardsToStudy = cardsToStudy.filter(c => c.topic === this.selectedTopic);
    }
    if (this.selectedBand && this.selectedBand !== 'all') {
      cardsToStudy = cardsToStudy.filter(c => c.band && c.band.startsWith(this.selectedBand));
    }

    if (cardsToStudy.length === 0) {
      cardsToStudy = allCards;
    }

    // For flashcards, prioritize due cards first; if none due, study all cards in topic/band
    if (modeName === 'flashcard') {
      const dueCards = cardsToStudy.filter(c => SRSManager.isCardDue(c));
      const studyPool = dueCards.length > 0 ? dueCards : cardsToStudy;
      this.flashcardMode.start(studyPool);
    } else if (modeName === 'quiz') {
      this.quizMode.start(cardsToStudy, allCards);
    } else if (modeName === 'spelling') {
      this.spellingMode.start(cardsToStudy);
    } else if (modeName === 'matching') {
      this.matchingMode.start(cardsToStudy);
    } else if (modeName === 'fillblank') {
      this.fillBlankMode.start(cardsToStudy, allCards);
    }
  }

  updateDashboard() {
    const stats = StorageManager.getStatistics();
    const settings = StorageManager.getSettings();

    // Streak and header stats
    const streakEl = document.getElementById('dashStreak');
    if (streakEl) streakEl.textContent = `${stats.streak} ngày`;

    const dueCountEl = document.getElementById('dashDueCount');
    if (dueCountEl) dueCountEl.textContent = stats.dueCount;

    const totalWordsEl = document.getElementById('dashTotalWords');
    if (totalWordsEl) totalWordsEl.textContent = stats.totalWords;

    const masteredEl = document.getElementById('dashMastered');
    if (masteredEl) masteredEl.textContent = stats.masteredCount;

    const learningEl = document.getElementById('dashLearning');
    if (learningEl) learningEl.textContent = stats.learningCount + stats.reviewCount;

    // Daily progress bar
    const reviewsToday = stats.reviewsToday;
    const dailyGoal = settings.dailyGoal || 20;
    const goalPercent = Math.min(100, Math.round((reviewsToday / dailyGoal) * 100));

    const dailyProgressText = document.getElementById('dashDailyProgressText');
    if (dailyProgressText) dailyProgressText.textContent = `${reviewsToday} / ${dailyGoal} từ`;

    const dailyProgressBar = document.getElementById('dashDailyProgressBar');
    if (dailyProgressBar) dailyProgressBar.style.width = `${goalPercent}%`;

    // Render Band Pills & topic cards
    this.renderBandPills();
    this.renderTopicCards();
  }

  renderBandPills() {
    const container = document.getElementById('dashBandPills');
    if (!container) return;

    const allCards = StorageManager.getCards();
    const bands = typeof getAllBands === 'function' ? getAllBands() : ['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];

    const bandCounts = {};
    allCards.forEach(c => {
      const b = c.band || '7.0';
      bandCounts[b] = (bandCounts[b] || 0) + 1;
    });

    container.innerHTML = bands.map(band => {
      const count = bandCounts[band] || 0;
      const isHigh = parseFloat(band) >= 7.5;
      const isMid = parseFloat(band) >= 6.0 && parseFloat(band) < 7.5;

      const badgeColor = isHigh 
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
        : isMid 
        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30' 
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';

      return `
        <button onclick="window.app.switchView('flashcard', 'all', '${band}')" class="px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 shadow-sm ${badgeColor} active:scale-95">
          <span>Band ${band}</span>
          <span class="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px] font-semibold">${count} từ</span>
        </button>
      `;
    }).join('');
  }

  renderTopicsFilter() {
    const topics = typeof getAllTopics === 'function' ? getAllTopics() : ['Environment', 'Education', 'Technology', 'Health', 'Society', 'Crime', 'Economy', 'Culture', 'AWL', 'Science'];
    const select = document.getElementById('filterTopicSelect');
    if (select) {
      select.innerHTML = '<option value="all">Tất cả 33 chủ đề</option>' + 
        topics.map(t => `<option value="${t}">${t}</option>`).join('');
    }
  }

  renderTopicCards() {
    const container = document.getElementById('dashTopicsGrid');
    if (!container) return;

    const allCards = StorageManager.getCards();
    const topics = typeof getAllTopics === 'function' ? getAllTopics() : ['Environment', 'Education', 'Technology', 'Health', 'Society', 'Crime', 'Economy', 'Culture', 'AWL', 'Science'];

    const topicIcons = {
      'Environment': '🌱',
      'Education': '🎓',
      'Technology': '💻',
      'Health': '🩺',
      'Society': '🏙️',
      'Crime': '⚖️',
      'Economy': '📈',
      'Culture': '🎨',
      'AWL': '📖',
      'Science': '🔬',
      'Employment': '💼',
      'Advertising': '📢',
      'Globalization': '🌐',
      'Food': '🍲',
      'Family and Relationships': '👨‍👩‍👧',
      'Countryside': '🌾',
      'City': '🏢',
      'Accident': '🚑',
      'Appearance': '✨',
      'Entertainment and media': '🎬',
      'Travel': '✈️',
      'Sports': '⚽',
      'Weather': '⛅',
      'ZIM 7.0 Master': '⭐'
    };

    container.innerHTML = topics.map(topic => {
      const topicCards = allCards.filter(c => c.topic === topic);
      const dueCards = topicCards.filter(c => SRSManager.isCardDue(c));
      const mastered = topicCards.filter(c => SRSManager.getCardStage(c) === 'mastered').length;

      return `
        <div class="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 rounded-2xl p-5 transition shadow-lg flex flex-col justify-between group">
          <div>
            <div class="flex items-start justify-between mb-3">
              <span class="text-3xl">${topicIcons[topic] || '📚'}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/80 text-slate-300">
                ${topicCards.length} từ
              </span>
            </div>
            <h4 class="font-bold text-lg text-white group-hover:text-indigo-300 transition">${topic}</h4>
            <div class="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <span>Đã thuộc: <b class="text-emerald-400">${mastered}</b></span>
              <span>•</span>
              <span>Cần ôn: <b class="${dueCards.length > 0 ? 'text-amber-400' : 'text-slate-500'}">${dueCards.length}</b></span>
            </div>
          </div>

          <div class="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <button onclick="window.app.switchView('flashcard', '${topic}', 'all')" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Ôn Flashcard →
            </button>
            <button onclick="window.app.switchView('quiz', '${topic}', 'all')" class="text-xs font-semibold text-slate-400 hover:text-white">
              Quiz
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderWordList() {
    const container = document.getElementById('wordListContainer');
    if (!container) return;

    let cards = StorageManager.getCards();

    // Filters
    const topicFilter = document.getElementById('filterTopicSelect')?.value || 'all';
    const bandFilter = document.getElementById('filterBandSelect')?.value || 'all';
    const stageFilter = document.getElementById('filterStageSelect')?.value || 'all';
    const searchVal = (document.getElementById('inputSearchWord')?.value || '').trim().toLowerCase();

    if (topicFilter !== 'all') {
      cards = cards.filter(c => c.topic === topicFilter);
    }
    if (bandFilter !== 'all') {
      cards = cards.filter(c => (c.band || '').startsWith(bandFilter));
    }
    if (stageFilter !== 'all') {
      cards = cards.filter(c => SRSManager.getCardStage(c) === stageFilter);
    }
    if (searchVal) {
      cards = cards.filter(c => 
        c.word.toLowerCase().includes(searchVal) || 
        c.meaning.toLowerCase().includes(searchVal) ||
        (c.definition && c.definition.toLowerCase().includes(searchVal))
      );
    }

    const countEl = document.getElementById('wordListFilteredCount');
    if (countEl) countEl.textContent = `${cards.length} từ vựng`;

    if (cards.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-400">
          Không tìm thấy từ vựng nào phù hợp với bộ lọc.
        </div>
      `;
      return;
    }

    const stageColors = {
      'new': 'bg-slate-700 text-slate-300',
      'learning': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      'review': 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      'mastered': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    };

    const stageNames = {
      'new': 'Mới',
      'learning': 'Đang học',
      'review': 'Ôn tập',
      'mastered': 'Đã thuộc'
    };

    this.wordListDisplayLimit = this.wordListDisplayLimit || 60;
    const displayCards = cards.slice(0, this.wordListDisplayLimit);

    let html = displayCards.map(card => {
      const stage = SRSManager.getCardStage(card);
      return `
        <div class="bg-slate-800/90 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-bold text-lg text-white">${card.word}</h4>
                  <button type="button" onclick="window.speechService.speak('${card.word.replace(/'/g, "\\'")}', StorageManager.getSettings().accent)" class="text-indigo-400 hover:text-indigo-300 transition" title="Phát âm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                  </button>
                </div>
                <span class="text-xs text-slate-400 font-mono">${card.ipa || ''} • <span class="capitalize">${card.type || 'noun'}</span></span>
              </div>
              <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${stageColors[stage]}">
                ${stageNames[stage]}
              </span>
            </div>

            <p class="text-sm font-semibold text-emerald-400 mb-1">${card.meaning}</p>
            ${card.definition ? `<p class="text-xs text-slate-300 italic mb-2 line-clamp-2">"${card.definition}"</p>` : ''}
            
            ${card.collocations && card.collocations.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-2">
                ${card.collocations.slice(0, 2).map(c => `
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-700">
                    ${c}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <div class="mt-4 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span class="font-medium text-indigo-300">${card.topic} (Band ${card.band || '7.0'})</span>
            <div class="flex items-center gap-1.5">
              ${card.isCustom ? `
                <button type="button" onclick="window.app.deleteCustomWord('${card.id}')" class="text-rose-400 hover:text-rose-300" title="Xóa từ">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (cards.length > this.wordListDisplayLimit) {
      html += `
        <div class="col-span-full py-6 text-center">
          <button id="btnLoadMoreWords" class="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30">
            Tải thêm 60 từ vựng tiếp theo (Hiện đang hiển thị ${displayCards.length}/${cards.length} từ)
          </button>
        </div>
      `;
    }

    container.innerHTML = html;

    const btnLoadMore = document.getElementById('btnLoadMoreWords');
    if (btnLoadMore) {
      btnLoadMore.addEventListener('click', () => {
        this.wordListDisplayLimit += 60;
        this.renderWordList();
      });
    }
  }

  deleteCustomWord(id) {
    if (confirm('Bạn có chắc chắn muốn xóa từ vựng này không?')) {
      StorageManager.deleteCard(id);
      this.renderWordList();
      this.updateDashboard();
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new IELTSApp();
});
