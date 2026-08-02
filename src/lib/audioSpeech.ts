import { logger } from "./logger";
import { telemetry } from "./telemetry";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
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
      synth.cancel(); // Interrupt any prior speech immediately

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "zh-CN";
      utterance.rate = options?.rate || 1.1;
      utterance.pitch = options?.pitch || 1.0;

      const setVoiceAndSpeak = () => {
        const voices = synth.getVoices();
        const zhVoice = voices.find(v => v.lang.includes("zh") || v.lang.includes("ZH") || v.name.includes("Chinese"));
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
          logger.log('WARN', 'AudioSpeech', `SpeechSynthesis 抛出 notice [${e.error || 'notice'}]`, e);
          if (options?.onEnd) options.onEnd();
        };

        synth.speak(utterance);
      };

      if (synth.getVoices().length > 0) {
        setVoiceAndSpeak();
      } else {
        synth.onvoiceschanged = () => {
          setVoiceAndSpeak();
          synth.onvoiceschanged = null;
        };
        // Fallback immediate call if event doesn't fire
        setTimeout(setVoiceAndSpeak, 100);
      }
    } catch (err: any) {
      logger.log('WARN', 'AudioSpeech', `SpeechSynthesis 初始化失败: ${err?.message}`);
    }
  }
}
