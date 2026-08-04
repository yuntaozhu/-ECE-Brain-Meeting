import { logger } from "./logger";
import { telemetry } from "./telemetry";

let audioCtx: AudioContext | null = null;
const activeUtterances = new Set<SpeechSynthesisUtterance>();

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Universal User Interaction Unblocker for Web Audio API & SpeechSynthesis
 */
export function resumeAudioContextAndSpeech(): boolean {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      if (synth.paused) {
        synth.resume();
      }
      // Silent dummy utterance to unlock iOS Safari & Mobile Chrome TTS
      const dummy = new SpeechSynthesisUtterance("");
      dummy.volume = 0;
      synth.speak(dummy);
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Register global user interaction listeners
if (typeof window !== "undefined") {
  const unblockAudio = () => {
    resumeAudioContextAndSpeech();
  };
  window.addEventListener('click', unblockAudio, { passive: true });
  window.addEventListener('touchstart', unblockAudio, { passive: true });
  window.addEventListener('keydown', unblockAudio, { passive: true });
}

/**
 * Synthesizes an acoustic chime/tone using Web Audio API oscillator
 */
export function playAudioChime(freq = 523.25, duration = 0.25) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
    telemetry.recordAudioBuffer({ rms: 0.15, sampleRate: ctx.sampleRate, chunksSentDelta: 1 });
  } catch (err: any) {
    logger.log('WARN', 'AudioSpeech', `Web Audio oscillator chime error: ${err?.message}`);
  }
}

/**
 * Acoustic Speech Cadence Fallback (Web Audio API)
 * Plays rhythmic vocal formants when HTML5 SpeechSynthesis is unavailable/blocked on mobile/Vercel
 */
export function playAcousticSpeechFallback(text: string, onEnd?: () => void) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const cleanStr = text.replace(/[*#_`\s]/g, '');
    const charCount = Math.min(Math.max(cleanStr.length, 5), 25);
    const syllableDuration = 0.12;

    cleanStr.slice(0, charCount).split('').forEach((char, idx) => {
      const startTime = ctx.currentTime + (idx * syllableDuration);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Formant frequency based on character code
      const basePitch = 220 + (char.charCodeAt(0) % 300);
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(basePitch, startTime);
      osc.frequency.linearRampToValueAtTime(basePitch * 1.1, startTime + syllableDuration * 0.8);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + syllableDuration * 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + syllableDuration);
    });

    const totalTime = charCount * syllableDuration * 1000;
    setTimeout(() => {
      if (onEnd) onEnd();
    }, totalTime);
  } catch (err: any) {
    logger.log('WARN', 'AudioSpeech', `Acoustic speech fallback error: ${err?.message}`);
    if (onEnd) onEnd();
  }
}

/**
 * Universal robust Text-to-Speech function for AI Chairperson & Assistants
 */
export async function speakText(text: string, options?: { rate?: number; pitch?: number; onEnd?: () => void }) {
  if (!text || !text.trim()) return;
  const cleanText = text.replace(/[*#_`]/g, '').trim();

  logger.log('INFO', 'AudioSpeech', `正在进行语音朗读: "${cleanText.slice(0, 30)}..."`);
  
  resumeAudioContextAndSpeech();

  // 1. Acoustic chime cue
  playAudioChime(587.33, 0.2);

  let hasSpokenWithSynthesis = false;

  // 2. Try HTML5 SpeechSynthesis
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      const synth = window.speechSynthesis;
      if (synth.paused) {
        synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "zh-CN";
      utterance.rate = options?.rate || 1.08;
      utterance.pitch = options?.pitch || 1.0;

      // Keep strong reference to prevent Garbage Collection in Chrome/Safari
      activeUtterances.add(utterance);

      const setVoiceAndSpeak = () => {
        try {
          const voices = synth.getVoices();
          const zhVoice = voices.find(v => v.lang.includes("zh") || v.lang.includes("ZH") || v.name.includes("Chinese") || v.name.includes("Mandarin"));
          if (zhVoice) {
            utterance.voice = zhVoice;
          }

          utterance.onstart = () => {
            hasSpokenWithSynthesis = true;
            logger.log('INFO', 'AudioSpeech', 'SpeechSynthesis 朗读已启动');
            telemetry.recordAudioBuffer({ sampleRate: 16000, rms: 0.25, queueLength: 1 });
          };

          utterance.onend = () => {
            activeUtterances.delete(utterance);
            logger.log('INFO', 'AudioSpeech', 'SpeechSynthesis 朗读正常完成');
            if (options?.onEnd) options.onEnd();
          };

          utterance.onerror = (e) => {
            activeUtterances.delete(utterance);
            logger.log('WARN', 'AudioSpeech', `SpeechSynthesis error [${e.error || 'notice'}], triggering Web Audio fallback`);
            if (!hasSpokenWithSynthesis) {
              playAcousticSpeechFallback(cleanText, options?.onEnd);
            } else if (options?.onEnd) {
              options.onEnd();
            }
          };

          if (synth.speaking || synth.pending) {
            synth.cancel();
          }
          synth.speak(utterance);
        } catch (err: any) {
          activeUtterances.delete(utterance);
          logger.log('WARN', 'AudioSpeech', `SpeechSynthesis speak exception: ${err?.message}`);
          playAcousticSpeechFallback(cleanText, options?.onEnd);
        }
      };

      if (synth.getVoices().length > 0) {
        setVoiceAndSpeak();
      } else {
        synth.onvoiceschanged = () => {
          setVoiceAndSpeak();
          synth.onvoiceschanged = null;
        };
        setTimeout(setVoiceAndSpeak, 150);
      }
    } catch (err: any) {
      logger.log('WARN', 'AudioSpeech', `SpeechSynthesis Initialization Notice: ${err?.message}`);
      playAcousticSpeechFallback(cleanText, options?.onEnd);
    }
  } else {
    playAcousticSpeechFallback(cleanText, options?.onEnd);
  }
}

