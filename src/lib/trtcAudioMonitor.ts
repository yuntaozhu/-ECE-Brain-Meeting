export interface AudioChannelStats {
  id: string; // 'local-mic' or 'ai-tts' or userId
  name: string;
  role: string;
  volumeLevel: number; // 0 - 100
  isTransmitting: boolean; // volumeLevel > 0 or active audio track
  audioTrackActive: boolean;
  muted: boolean;
  volumeHistory: number[]; // Last 20 volume samples for bar graph rendering
  lastActiveTime: string;
}

export interface TrtcStreamEvent {
  id: string;
  timestamp: string;
  eventType: 'volume' | 'stream-published' | 'stream-subscribed' | 'stream-removed' | 'audio-push' | 'peer-join' | 'peer-leave';
  channelId: string;
  details: string;
  volume?: number;
}

class TrtcAudioMonitorService {
  private channels: Map<string, AudioChannelStats> = new Map();
  private events: TrtcStreamEvent[] = [];
  private listeners: Set<() => void> = new Set();
  private isPushingStream: boolean = false;
  private currentRoomId: string = "10086";

  constructor() {
    // Initialize default channels
    this.updateChannel('local-mic', {
      id: 'local-mic',
      name: '本地麦克风输入 (Local Mic)',
      role: '本地发言者',
      volumeLevel: 0,
      isTransmitting: false,
      audioTrackActive: true,
      muted: false,
      volumeHistory: new Array(20).fill(0),
      lastActiveTime: new Date().toLocaleTimeString()
    });

    this.updateChannel('ai-tts', {
      id: 'ai-tts',
      name: 'AI 虚拟主席音轨 (AudioOrchestrator TRTC Stream)',
      role: 'KaibanJS AI Chair',
      volumeLevel: 0,
      isTransmitting: false,
      audioTrackActive: true,
      muted: false,
      volumeHistory: new Array(20).fill(0),
      lastActiveTime: new Date().toLocaleTimeString()
    });
  }

  setRoomId(roomId: string) {
    this.currentRoomId = roomId;
    this.notify();
  }

  getRoomId() {
    return this.currentRoomId;
  }

  setPushingState(isPushing: boolean) {
    this.isPushingStream = isPushing;
    this.notify();
  }

  getIsPushingStream() {
    return this.isPushingStream;
  }

  updateChannel(id: string, partial: Partial<AudioChannelStats>) {
    const existing = this.channels.get(id) || {
      id,
      name: id.startsWith('user_') ? `TRTC 参会者 (${id.substring(0, 8)})` : id,
      role: 'TRTC 参会者',
      volumeLevel: 0,
      isTransmitting: false,
      audioTrackActive: true,
      muted: false,
      volumeHistory: new Array(20).fill(0),
      lastActiveTime: new Date().toLocaleTimeString()
    };

    const newVolume = partial.volumeLevel !== undefined ? partial.volumeLevel : existing.volumeLevel;
    const history = [...existing.volumeHistory.slice(1), newVolume];
    const isTransmitting = newVolume > 0 || partial.isTransmitting || false;

    this.channels.set(id, {
      ...existing,
      ...partial,
      volumeLevel: newVolume,
      isTransmitting,
      volumeHistory: history,
      lastActiveTime: newVolume > 0 ? new Date().toLocaleTimeString() : existing.lastActiveTime
    });

    this.notify();
  }

  recordEvent(eventType: TrtcStreamEvent['eventType'], details: string, volume?: number, channelId?: string) {
    const evt: TrtcStreamEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      eventType,
      channelId: channelId || this.currentRoomId,
      details,
      volume
    };

    this.events = [evt, ...this.events].slice(0, 50);
    this.notify();
  }

  getChannels(): AudioChannelStats[] {
    return Array.from(this.channels.values());
  }

  getEvents(): TrtcStreamEvent[] {
    return this.events;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const trtcAudioMonitor = new TrtcAudioMonitorService();
