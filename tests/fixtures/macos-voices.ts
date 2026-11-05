// Representative macOS inventory from Review §1.8, with compact/enhanced/premium variants.
export const macosVoices: SpeechSynthesisVoice[] = [
  ['Bahh', 'en-US', 'com.apple.speech.synthesis.voice.Bahh', true, true],
  ['Bells', 'en-US', 'com.apple.speech.synthesis.voice.Bells', true, false],
  ['İyi Haber', 'en-US', 'com.apple.speech.synthesis.voice.GoodNews', true, false],
  ['Kötü Haber', 'en-US', 'com.apple.speech.synthesis.voice.BadNews', true, false],
  ['Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha', true, false],
  ['Samantha (Enhanced)', 'en-US', 'com.apple.voice.enhanced.en-US.Samantha', true, false],
  ['Daniel (Premium)', 'en_GB', 'com.apple.voice.premium.en-GB.Daniel', true, false],
  ['Karen', 'en-AU', 'com.apple.voice.compact.en-AU.Karen', true, false],
  ['Google US English', 'en-US', 'Google US English', false, true],
  ['Yelda', 'tr-TR', 'com.apple.voice.compact.tr-TR.Yelda', true, false],
].map(([name, lang, voiceURI, localService, isDefault]) => ({
  name: String(name),
  lang: String(lang),
  voiceURI: String(voiceURI),
  localService: Boolean(localService),
  default: Boolean(isDefault),
}));
