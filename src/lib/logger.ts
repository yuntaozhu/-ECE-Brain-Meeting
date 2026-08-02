export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'API' | 'TENCENT' | 'SIGNATURE' | 'LLM' | 'TELEMETRY';
  category: string;
  message: string;
  data?: any;
}

class CentralizedLogger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private maxLogs = 500;

  constructor() {
    this.log('INFO', 'System', 'CentralizedLogger initialized successfully.');
  }

  log(level: LogEntry['level'], category: string, message: string, data?: any) {
    let serializedData: any = undefined;
    if (data !== undefined) {
      try {
        const seen = new WeakSet();
        serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
          if (value instanceof Error) {
            return { message: value.message, stack: value.stack };
          }
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        }));
      } catch (e) {
        serializedData = { serializationError: String(e) };
      }
    }

    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: serializedData
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.category}]:`;
    if (level === 'ERROR') {
      console.error(prefix, message, data || '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, data || '');
    } else {
      console.log(prefix, message, data || '');
    }

    this.notifyListeners();
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.log('INFO', 'System', 'Logs cleared.');
    this.notifyListeners();
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.logs));
  }

  exportJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new CentralizedLogger();
