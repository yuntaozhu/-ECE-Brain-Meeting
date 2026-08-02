import { logger } from "./logger";
import { telemetry } from "./telemetry";

let audioCtx: AudioContext | null = null;

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

// Global user interaction unblock listener for Web Audio API & SpeechSynthesis
if (typeof window !== "undefined") {
  const unblockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {}
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
    logger.log('WARN', 'AudioSpeech', `Web Audio oscillator chime fallback error: ${err?.message}`);
  }
}

/**
 * Universal robust Text-to-Speech function for AI Chairperson & Assistants
 */
export async function speakText(text: string, options?: { rate?: number; pitch?: number; onEnd?: () => void }) {
  if (!text || !text.trim()) return;
  const cleanText = text.replace(/[*#_`]/g, '').trim();

  logger.log('INFO', 'AudioSpeech', `正在进行语音朗读: "${cleanText.slice(0, 30)}..."`);
  
  // 1. Acoustic chime cue
  playAudioChime(587.33, 0.2);

  // 2. Try HTML5 SpeechSynthesis
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      const synth = window.speechSynthesis;
      
      // Mandatory Chrome/Safari unblock resume
      if (synth.paused) {
        synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "zh-CN";
      utterance.rate = options?.rate || 1.08;
      utterance.pitch = options?.pitch || 1.0;

      const setVoiceAndSpeak = () => {
        try {
          const voices = synth.getVoices();
          const zhVoice = voices.find(v => v.lang.includes("zh") || v.lang.includes("ZH") || v.name.includes("Chinese") || v.name.includes("Mandarin"));
          if (zhVoice) {
            utterance.voice = zhVoice;
          }

          utterance.onstart = () => {
            logger.log('INFO', 'AudioSpeech', 'SpeechSynthesis 朗读已启动');
            telemetry.recordAudioBuffer({ sampleRate: 16000, rms: 0.25, queueLength: 1 });
          };

          utterance.onend = () => {
            logger.log('INFO', 'AudioSpeech', 'SpeechSynthesis 朗读正常完成');
            if (options?.onEnd) options.onEnd();
          };

          utterance.onerror = (e) => {
            logger.log('WARN', 'AudioSpeech', `SpeechSynthesis notice [${e.error || 'notice'}]`, e);
            if (options?.onEnd) options.onEnd();
          };

          if (synth.speaking || synth.pending) {
            synth.cancel();
          }
          synth.speak(utterance);
        } catch (err: any) {
          logger.log('WARN', 'AudioSpeech', `SpeechSynthesis speak notice: ${err?.message}`);
        }
      };

      if (synth.getVoices().length > 0) {
        setVoiceAndSpeak();
      } else {
        synth.onvoiceschanged = () => {
          setVoiceAndSpeak();
          synth.onvoiceschanged = null;
        };
        setTimeout(setVoiceAndSpeak, 100);
      }
    } catch (err: any) {
      logger.log('WARN', 'AudioSpeech', `SpeechSynthesis 初始化 Notice: ${err?.message}`);
    }
  }
}
