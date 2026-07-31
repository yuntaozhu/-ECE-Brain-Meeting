export interface NetworkLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  requestBody?: any;
  status?: number;
  responseBody?: any;
  durationMs?: number;
  error?: string;
}

class NetworkLogger {
  private listeners: ((logs: NetworkLogEntry[]) => void)[] = [];
  private logs: NetworkLogEntry[] = [];

  logRequest(method: string, url: string, headers?: any, body?: any): string {
    const id = Math.random().toString(36).substring(2, 9);
    const entry: NetworkLogEntry = {
      id,
      timestamp: new Date().toLocaleTimeString(),
      method,
      url,
      headers,
      requestBody: body
    };
    this.logs = [entry, ...this.logs].slice(0, 50);
    this.notify();
    return id;
  }

  logResponse(id: string, status: number, responseBody: any, durationMs: number, error?: string) {
    const entry = this.logs.find(l => l.id === id);
    if (entry) {
      entry.status = status;
      entry.responseBody = responseBody;
      entry.durationMs = durationMs;
      entry.error = error;
      this.notify();
    }
  }

  getLogs() {
    return this.logs;
  }

  subscribe(listener: (logs: NetworkLogEntry[]) => void) {
    this.listeners.push(listener);
    listener(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }
}

export const networkLogger = new NetworkLogger();
