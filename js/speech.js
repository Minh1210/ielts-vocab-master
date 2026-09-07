// Web Speech API - High Quality English Pronunciation (UK & US)

class SpeechService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const updateVoices = () => {
      this.voices = this.synth.getVoices();
    };

    updateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
  }

  /**
   * Speak an English word or phrase
   * @param {string} text 
   * @param {string} accent 'en-US' or 'en-GB'
   * @param {number} rate 
   */
  speak(text, accent = 'en-US', rate = 0.9) {
    if (!this.synth) {
      console.warn("Web Speech API not supported in this browser.");
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    if (!text || text.trim() === '') return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.lang = accent;

    // Pick best matching voice
    if (this.voices.length > 0) {
      // Find voices matching accent
      const matchingVoices = this.voices.filter(v => v.lang === accent || v.lang.startsWith(accent.split('-')[0]));
      // Prefer Google or Natural or Microsoft voices
      const preferred = matchingVoices.find(v => 
        v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Online")
      ) || matchingVoices[0];

      if (preferred) {
        utterance.voice = preferred;
      }
    }

    this.synth.speak(utterance);
  }
}

// Global speech service singleton
window.speechService = new SpeechService();
