// ===========================
// DEBUG UTILITY FOR DENO/EDGE FUNCTIONS
// ===========================
// 
// Debug utility for Supabase Edge Functions (Deno runtime).
// Debug code is automatically stripped in production/master branch builds.
//
// Usage:
//   DEBUG.log('message', data);
//   DEBUG.warn('warning', data);
//   DEBUG.error('error', data);
//   DEBUG.api('GitHub', 'getUser', { email });
//   DEBUG.network('GET', '/api/endpoint', { data });
//
// Configuration:
//   Set DEBUG_ENABLED = true for dev branch
//   Set DEBUG_ENABLED = false for master branch (or use build script to strip)

// Debug configuration - can be set via environment variable
const DEBUG_ENABLED = Deno.env.get('DEBUG_ENABLED') === 'true' || 
                      Deno.env.get('ENVIRONMENT') === 'development' ||
                      Deno.env.get('ENV') === 'dev';

const DEBUG_LEVEL = Deno.env.get('DEBUG_LEVEL') || 'verbose';

// Debug utility object
export const DEBUG = {
  _enabled: DEBUG_ENABLED,
  _level: DEBUG_LEVEL,
  
  _levels: {
    'verbose': 0,
    'info': 1,
    'warn': 2,
    'error': 3,
    'none': 4
  },
  
  _shouldLog(level: string): boolean {
    if (!this._enabled) return false;
    const currentLevel = this._levels[this._level as keyof typeof this._levels] || 0;
    const messageLevel = this._levels[level as keyof typeof this._levels] || 0;
    return messageLevel >= currentLevel;
  },
  
  _getTimestamp(): string {
    return `[${new Date().toISOString()}]`;
  },
  
  log(message: string, data?: any): void {
    if (!this._shouldLog('verbose')) return;
    const timestamp = this._getTimestamp();
    if (data !== undefined) {
      console.log(`${timestamp} [DEBUG LOG] ${message}`, data);
    } else {
      console.log(`${timestamp} [DEBUG LOG] ${message}`);
    }
  },
  
  info(message: string, data?: any): void {
    if (!this._shouldLog('info')) return;
    const timestamp = this._getTimestamp();
    if (data !== undefined) {
      console.info(`${timestamp} [DEBUG INFO] ${message}`, data);
    } else {
      console.info(`${timestamp} [DEBUG INFO] ${message}`);
    }
  },
  
  warn(message: string, data?: any): void {
    if (!this._shouldLog('warn')) return;
    const timestamp = this._getTimestamp();
    if (data !== undefined) {
      console.warn(`${timestamp} [DEBUG WARN] ${message}`, data);
    } else {
      console.warn(`${timestamp} [DEBUG WARN] ${message}`);
    }
  },
  
  error(message: string, data?: any): void {
    if (!this._shouldLog('error')) return;
    const timestamp = this._getTimestamp();
    if (data !== undefined) {
      console.error(`${timestamp} [DEBUG ERROR] ${message}`, data);
    } else {
      console.error(`${timestamp} [DEBUG ERROR] ${message}`);
    }
  },
  
  // API debugging
  api(service: string, action: string, data?: any): void {
    if (!this._shouldLog('verbose')) return;
    const timestamp = this._getTimestamp();
    console.log(`${timestamp} [DEBUG API] ${service} - ${action}`, data || '');
  },
  
  // Network debugging
  network(method: string, url: string, data?: any): void {
    if (!this._shouldLog('verbose')) return;
    const timestamp = this._getTimestamp();
    console.log(`${timestamp} [DEBUG NETWORK] ${method} ${url}`, data || '');
  },
  
  // Request debugging
  request(method: string, path: string, data?: any): void {
    if (!this._shouldLog('verbose')) return;
    const timestamp = this._getTimestamp();
    console.log(`${timestamp} [DEBUG REQUEST] ${method} ${path}`, data || '');
  },
  
  // Response debugging
  response(status: number, data?: any): void {
    if (!this._shouldLog('verbose')) return;
    const timestamp = this._getTimestamp();
    console.log(`${timestamp} [DEBUG RESPONSE] Status: ${status}`, data || '');
  }
};

