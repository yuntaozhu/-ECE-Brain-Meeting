import { logger } from "./logger";

export type ConnectionTarget = 'wsMeeting' | 'wsAudioStream' | 'trtcState' | 'socketIoState';
export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'JOINING';

export interface LatencyRecord {
  id: string;
  msgType: string;
  sentAt: number;
  receivedAt: number;
  latencyMs: number;
  status: 'SUCCESS' | 'TIMEOUT' | 'FAILED';
}

export interface TelemetryMetrics {
  connectionStates: Record<ConnectionTarget, {
    status: ConnectionStatus;
    endpoint?: string;
    lastChangedAt: string;
    reconnectCount: number;
    lastError?: string;
  }>;
  audioBuffer: {
    queueLength: number;
    currentRms: number;
    peakRms: number;
    sampleRate: number;
    chunksSent: number;
    chunksReceived: number;
    underruns: number;
    overflows: number;
    lastUpdated: string;
  };
  latency: {
    lastRttMs: number;
    avgRttMs: number;
    minRttMs: number;
    maxRttMs: number;
    totalSent: number;
    totalReceived: number;
    records: LatencyRecord[];
  };
}

type TelemetryListener = (metrics: TelemetryMetrics) => void;

class CentralizedTelemetryInterceptor {
  private metrics: TelemetryMetrics = {
    connectionStates: {
      wsMeeting: { status: 'DISCONNECTED', lastChangedAt: new Date().toISOString(), reconnectCount: 0 },
      wsAudioStream: { status: 'DISCONNECTED', lastChangedAt: new Date().toISOString(), reconnectCount: 0 },
      trtcState: { status: 'DISCONNECTED', lastChangedAt: new Date().toISOString(), reconnectCount: 0 },
      socketIoState: { status: 'DISCONNECTED', lastChangedAt: new Date().toISOString(), reconnectCount: 0 }
    },
    audioBuffer: {
      queueLength: 0,
      currentRms: 0,
      peakRms: 0,
      sampleRate: 16000,
      chunksSent: 0,
      chunksReceived: 0,
      underruns: 0,
      overflows: 0,
      lastUpdated: new Date().toISOString()
    },
    latency: {
      lastRttMs: 0,
      avgRttMs: 0,
      minRttMs: 0,
      maxRttMs: 0,
      totalSent: 0,
      totalReceived: 0,
      records: []
    }
  };

  private pendingLatencies: Map<string, { sentAt: number; msgType: string }> = new Map();
  private listeners: Set<TelemetryListener> = new Set();

  constructor() {
    logger.log('TELEMETRY', 'InterceptorInit', 'Communication Layer Telemetry Interceptor online');
  }

  /**
   * Intercept and record connection state changes across all communication channels
   */
  recordConnectionState(
    target: ConnectionTarget, 
    status: ConnectionStatus, 
    details?: { endpoint?: string; error?: string }
  ) {
    const prev = this.metrics.connectionStates[target];
    const isReconnect = status === 'CONNECTING' && prev.status === 'ERROR';
    const reconnectCount = isReconnect ? prev.reconnectCount + 1 : prev.reconnectCount;

    this.metrics.connectionStates[target] = {
      status,
      endpoint: details?.endpoint || prev.endpoint,
      lastChangedAt: new Date().toISOString(),
      reconnectCount,
      lastError: details?.error
    };

    logger.log(
      status === 'ERROR' ? 'ERROR' : 'TELEMETRY',
      `Conn:${target}`,
      `Connection state transition: ${prev.status} ➔ ${status}${details?.endpoint ? ` (${details.endpoint})` : ''}`,
      { target, previousState: prev.status, newState: status, details }
    );

    this.notify();
  }

  /**
   * Intercept and record real-time audio buffer status
   */
  recordAudioBuffer(stats: {
    queueLength?: number;
    rms?: number;
    sampleRate?: number;
    chunksSentDelta?: number;
    chunksReceivedDelta?: number;
    isUnderrun?: boolean;
    isOverflow?: boolean;
  }) {
    const ab = this.metrics.audioBuffer;
    if (stats.queueLength !== undefined) ab.queueLength = stats.queueLength;
    if (stats.rms !== undefined) {
      ab.currentRms = Math.round(stats.rms * 1000) / 1000;
      if (ab.currentRms > ab.peakRms) ab.peakRms = ab.currentRms;
    }
    if (stats.sampleRate !== undefined) ab.sampleRate = stats.sampleRate;
    if (stats.chunksSentDelta) ab.chunksSent += stats.chunksSentDelta;
    if (stats.chunksReceivedDelta) ab.chunksReceived += stats.chunksReceivedDelta;
    if (stats.isUnderrun) {
      ab.underruns += 1;
      logger.log('WARN', 'AudioBuffer', `Audio buffer underrun detected! Total: ${ab.underruns}`, { ab });
    }
    if (stats.isOverflow) {
      ab.overflows += 1;
      logger.log('WARN', 'AudioBuffer', `Audio buffer overflow detected! Total: ${ab.overflows}`, { ab });
    }

    ab.lastUpdated = new Date().toISOString();
    this.notify();
  }

  /**
   * Start timing a message transmission latency
   */
  startLatencyTimer(msgId: string, msgType: string = 'CHAT'): number {
    const sentAt = Date.now();
    this.pendingLatencies.set(msgId, { sentAt, msgType });
    this.metrics.latency.totalSent += 1;
    
    logger.log('TELEMETRY', 'LatencyOut', `[${msgType}] Outgoing packet #${msgId} dispatched`, { msgId, msgType, sentAt });
    this.notify();
    return sentAt;
  }

  /**
   * Complete timing a message transmission latency upon echo/ack arrival
   */
  endLatencyTimer(msgId: string, status: 'SUCCESS' | 'TIMEOUT' | 'FAILED' = 'SUCCESS') {
    const pending = this.pendingLatencies.get(msgId);
    const receivedAt = Date.now();
    
    let latencyMs = 0;
    if (pending) {
      latencyMs = receivedAt - pending.sentAt;
      this.pendingLatencies.delete(msgId);
    } else {
      // Direct RTT ping
      latencyMs = 0;
    }

    const msgType = pending?.msgType || 'CHAT';
    this.metrics.latency.totalReceived += 1;
    this.metrics.latency.lastRttMs = latencyMs;

    // Calculate latency metrics
    const records = this.metrics.latency.records;
    const newRecord: LatencyRecord = {
      id: msgId,
      msgType,
      sentAt: pending?.sentAt || receivedAt,
      receivedAt,
      latencyMs,
      status
    };

    records.unshift(newRecord);
    if (records.length > 50) records.pop();

    const validLatencies = records.filter(r => r.status === 'SUCCESS').map(r => r.latencyMs);
    if (validLatencies.length > 0) {
      const sum = validLatencies.reduce((a, b) => a + b, 0);
      this.metrics.latency.avgRttMs = Math.round(sum / validLatencies.length);
      this.metrics.latency.minRttMs = Math.min(...validLatencies);
      this.metrics.latency.maxRttMs = Math.max(...validLatencies);
    }

    logger.log('TELEMETRY', 'LatencyAck', `[${msgType}] ACK packet #${msgId} received in ${latencyMs}ms (Avg: ${this.metrics.latency.avgRttMs}ms)`, newRecord);
    this.notify();
    return latencyMs;
  }

  getMetrics(): TelemetryMetrics {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getMetrics();
    this.listeners.forEach(fn => {
      try {
        fn(current);
      } catch (e) {
        console.error('Telemetry listener error:', e);
      }
    });
  }

  resetStats() {
    this.metrics.audioBuffer.underruns = 0;
    this.metrics.audioBuffer.overflows = 0;
    this.metrics.audioBuffer.chunksSent = 0;
    this.metrics.audioBuffer.chunksReceived = 0;
    this.metrics.audioBuffer.peakRms = 0;
    this.metrics.latency.records = [];
    this.metrics.latency.totalSent = 0;
    this.metrics.latency.totalReceived = 0;
    this.metrics.latency.avgRttMs = 0;
    this.notify();
    logger.log('TELEMETRY', 'ResetStats', 'Telemetry metrics counters reset');
  }
}

export const telemetry = new CentralizedTelemetryInterceptor();
