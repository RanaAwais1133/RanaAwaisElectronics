// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - Real-Time SSE Service
// ✅ Server-Sent Events for instant cross-user sync
// ✅ Auto-reconnect with exponential backoff
// ═══════════════════════════════════════════════════════════════

type EventCallback = (data: any) => void;

interface RealtimeConfig {
  baseUrl: string;
  reconnectDelay: number;
  maxReconnectDelay: number;
}

class RealtimeService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private config: RealtimeConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private shouldReconnect = true;

  constructor() {
    const VITE_API_URL = (window as any).__VITE_API_URL__ || '';
    
    let baseUrl = VITE_API_URL;
    if (!baseUrl) {
      const storedUrl = localStorage.getItem('api_url');
      if (storedUrl) baseUrl = storedUrl;
      if (!baseUrl) {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          baseUrl = 'https://farooqautos.onrender.com';
        } else {
          baseUrl = 'http://localhost:8080';
        }
      }
    }

    this.config = {
      baseUrl: baseUrl.replace(/\/api\/?$/, ''),
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
    };
  }

  // ✅ Connect to SSE stream
  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  private createConnection(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No auth token available for SSE connection');
      return;
    }

    const url = `${this.config.baseUrl}/api/events?token=${encodeURIComponent(token)}`;
    
    try {
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        console.log('🔌 SSE Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.dispatchEvent(data.type, data.payload);
        } catch (e) {
          console.warn('⚠️ Failed to parse SSE message:', e);
        }
      };

      this.eventSource.addEventListener('product_created', (e: any) => {
        this.dispatchEvent('product_created', JSON.parse(e.data));
      });

      this.eventSource.addEventListener('product_updated', (e: any) => {
        this.dispatchEvent('product_updated', JSON.parse(e.data));
      });

      this.eventSource.addEventListener('product_deleted', (e: any) => {
        this.dispatchEvent('product_deleted', JSON.parse(e.data));
      });

      this.eventSource.addEventListener('stock_added', (e: any) => {
        this.dispatchEvent('stock_added', JSON.parse(e.data));
      });

      this.eventSource.addEventListener('customer_created', (e: any) => {
        this.dispatchEvent('customer_created', JSON.parse(e.data));
      });

      this.eventSource.addEventListener('customer_updated', (e: any) => {
        this.dispatchEvent('customer_updated', JSON.parse(e.data));
      });

      this.eventSource.addEventListener('payment_recorded', (e: any) => {
        this.dispatchEvent('payment_recorded', JSON.parse(e.data));
      });

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.eventSource?.close();
        
        if (this.shouldReconnect) {
          const delay = Math.min(
            this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.config.maxReconnectDelay
          );
          this.reconnectAttempts++;
          
          console.log(`🔄 SSE Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          this.reconnectTimer = setTimeout(() => this.createConnection(), delay);
        }
      };
    } catch (e) {
      console.error('❌ Failed to create SSE connection:', e);
    }
  }

  // ✅ Subscribe to events
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // ✅ Dispatch event to all listeners
  private dispatchEvent(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`❌ Error in SSE listener for ${event}:`, e);
        }
      });
    }

    // Also dispatch to wildcard listeners
    const wildcardCallbacks = this.listeners.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach(cb => {
        try {
          cb({ event, data });
        } catch (e) {
          console.error(`❌ Error in wildcard SSE listener:`, e);
        }
      });
    }
  }

  // ✅ Disconnect SSE
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    console.log('🔌 SSE Disconnected');
  }

  // ✅ Check connection status
  get connected(): boolean {
    return this.isConnected;
  }
}

// ✅ Singleton instance
export const realtime = new RealtimeService();

export default realtime;
