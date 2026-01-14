// ===========================
// DEBUG UTILITY MODULE
// ===========================
// 
// This module provides comprehensive debugging capabilities for the EB-Okonomi project.
// Debug code is automatically stripped in production/master branch builds.
//
// Usage:
//   DEBUG.log('message', data);
//   DEBUG.warn('warning', data);
//   DEBUG.error('error', data);
//   DEBUG.group('group name');
//   DEBUG.groupEnd();
//   DEBUG.time('label');
//   DEBUG.timeEnd('label');
//   DEBUG.trace('function name');
//   DEBUG.assert(condition, 'message');
//   DEBUG.table(data);
//   DEBUG.memory();
//   DEBUG.network('GET', '/api/endpoint', { data });
//   DEBUG.api('GitHub', 'getUser', { email });
//   DEBUG.auth('Microsoft', 'signIn', { account });
//   DEBUG.storage('OneDrive', 'save', { filename, size });
//   DEBUG.payment('Stripe', 'checkout', { productId, amount });
//
// Configuration:
//   Set DEBUG_CONFIG.enabled = true for dev branch
//   Set DEBUG_CONFIG.enabled = false for master branch (or use build script to strip)

// Debug configuration - will be set by config.js or build process
const DEBUG_CONFIG = window.DEBUG_CONFIG || {
    enabled: true,  // Set to false in master branch
    level: 'verbose',  // 'verbose', 'info', 'warn', 'error', 'none'
    showTimestamp: true,
    showCaller: true,
    showMemory: false,
    colors: true,
    groups: true,
    network: true,
    api: true,
    auth: true,
    storage: true,
    payment: true,
    ui: true
};

// Debug utility object
const DEBUG = {
    // Internal state
    _enabled: DEBUG_CONFIG.enabled,
    _level: DEBUG_CONFIG.level,
    _groups: [],
    _timers: {},
    _callStack: [],
    _ui: {
        listenerAttached: false,
        lastClick: null, // { id, ts, info, timerLabel }
    },
    
    // Level priorities
    _levels: {
        'verbose': 0,
        'info': 1,
        'warn': 2,
        'error': 3,
        'none': 4
    },
    
    // Check if debug should run
    _shouldLog(level) {
        if (!this._enabled) return false;
        const currentLevel = this._levels[this._level] || 0;
        const messageLevel = this._levels[level] || 0;
        return messageLevel >= currentLevel;
    },
    
    // Get timestamp
    _getTimestamp() {
        if (!DEBUG_CONFIG.showTimestamp) return '';
        const now = new Date();
        return `[${now.toISOString()}] `;
    },
    
    // Get caller info
    _getCaller() {
        if (!DEBUG_CONFIG.showCaller) return '';
        try {
            const stack = new Error().stack;
            const lines = stack.split('\n');
            // Find the first line that's not from debug.js
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line && !line.includes('debug.js') && !line.includes('DEBUG.')) {
                    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) || 
                                 line.match(/at\s+(.+?):(\d+):(\d+)/);
                    if (match) {
                        const func = match[1] || 'anonymous';
                        const file = match[2] ? match[2].split('/').pop() : 'unknown';
                        const lineNum = match[3] || '?';
                        return `[${file}:${lineNum}] `;
                    }
                }
            }
        } catch (e) {
            // Ignore errors in caller detection
        }
        return '';
    },
    
    // Format message with context
    _formatMessage(level, message, data) {
        const timestamp = this._getTimestamp();
        const caller = this._getCaller();
        const prefix = `${timestamp}${caller}[DEBUG ${level.toUpperCase()}]`;
        
        if (data !== undefined) {
            return { prefix, message, data };
        }
        return { prefix, message };
    },
    
    // Log methods
    log(message, data) {
        if (!this._shouldLog('verbose')) return;
        const formatted = this._formatMessage('log', message, data);
        if (data !== undefined) {
            console.log(`${formatted.prefix} ${formatted.message}`, formatted.data);
        } else {
            console.log(`${formatted.prefix} ${formatted.message}`);
        }
    },
    
    info(message, data) {
        if (!this._shouldLog('info')) return;
        const formatted = this._formatMessage('info', message, data);
        if (data !== undefined) {
            console.info(`${formatted.prefix} ${formatted.message}`, formatted.data);
        } else {
            console.info(`${formatted.prefix} ${formatted.message}`);
        }
    },
    
    warn(message, data) {
        if (!this._shouldLog('warn')) return;
        const formatted = this._formatMessage('warn', message, data);
        if (data !== undefined) {
            console.warn(`${formatted.prefix} ${formatted.message}`, formatted.data);
        } else {
            console.warn(`${formatted.prefix} ${formatted.message}`);
        }
    },
    
    error(message, data) {
        if (!this._shouldLog('error')) return;
        const formatted = this._formatMessage('error', message, data);
        if (data !== undefined) {
            console.error(`${formatted.prefix} ${formatted.message}`, formatted.data);
        } else {
            console.error(`${formatted.prefix} ${formatted.message}`);
        }
    },
    
    // Group methods
    group(label) {
        if (!this._shouldLog('verbose') || !DEBUG_CONFIG.groups) return;
        console.group(`[DEBUG GROUP] ${label}`);
        this._groups.push(label);
    },
    
    groupEnd() {
        if (!this._shouldLog('verbose') || !DEBUG_CONFIG.groups) return;
        if (this._groups.length > 0) {
            console.groupEnd();
            this._groups.pop();
        }
    },
    
    // Timer methods
    time(label) {
        if (!this._shouldLog('verbose')) return;
        this._timers[label] = performance.now();
        console.time(`[DEBUG TIMER] ${label}`);
    },
    
    timeEnd(label) {
        if (!this._shouldLog('verbose')) return;
        if (this._timers[label]) {
            console.timeEnd(`[DEBUG TIMER] ${label}`);
            const duration = performance.now() - this._timers[label];
            delete this._timers[label];
            return duration;
        }
        return null;
    },
    
    // Stack trace
    trace(message) {
        if (!this._shouldLog('verbose')) return;
        console.trace(`[DEBUG TRACE] ${message}`);
    },
    
    // Assert
    assert(condition, message) {
        if (!this._shouldLog('error')) return;
        if (!condition) {
            console.assert(false, `[DEBUG ASSERT] ${message}`);
        }
    },
    
    // Table
    table(data) {
        if (!this._shouldLog('verbose')) return;
        console.table(data);
    },
    
    // Memory usage
    memory() {
        if (!this._shouldLog('verbose') || !DEBUG_CONFIG.showMemory) return;
        if (performance.memory) {
            const mem = performance.memory;
            this.info('Memory Usage', {
                used: `${(mem.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                total: `${(mem.totalJSHeapSize / 1048576).toFixed(2)} MB`,
                limit: `${(mem.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
            });
        }
    },
    
    // Network debugging
    network(method, url, data) {
        if (!this._shouldLog('verbose') || !DEBUG_CONFIG.network) return;
        this.group(`🌐 Network: ${method} ${url}`);
        this.log('Request URL', url);
        this.log('Request Method', method);
        if (data) {
            this.log('Request Data', data);
        }
        this.groupEnd();
    },
    
    // API debugging
    api(service, action, data) {
        if (!this._shouldLog('verbose') || !DEBUG_CONFIG.api) return;
        this.group(`🔌 API: ${service} - ${action}`);
        this.log('Service', service);
        this.log('Action', action);
        if (data) {
            this.log('Data', data);
        }
        this.groupEnd();
    },
    
    // Authentication debugging
    auth(provider, action, data) {
        if (!this._shouldLog('verbose') || !DEBUG_CONFIG.auth) return;
        this.group(`🔐 Auth: ${provider} - ${action}`);
        this.log('Provider', provider);
        this.log('Action', action);
        if (data) {
            // Don't log sensitive data like tokens
            const safeData = { ...data };
            if (safeData.token) safeData.token = '[REDACTED]';
            if (safeData.accessToken) safeData.accessToken = '[REDACTED]';
            if (safeData.refreshToken) safeData.refreshToken = '[REDACTED]';
            this.log('Data', safeData);
        }
        this.groupEnd();
    },
    
    // Storage debugging
    storage(provider, action, data) {
        if (!this._shouldLog('verbose') || !DEBUG_CONFIG.storage) return;
        this.group(`💾 Storage: ${provider} - ${action}`);
        this.log('Provider', provider);
        this.log('Action', action);
        if (data) {
            this.log('Data', data);
        }
        this.groupEnd();
    },
    
    // Payment debugging
    payment(provider, action, data) {
        if (!this._shouldLog('verbose') || !DEBUG_CONFIG.payment) return;
        this.group(`💳 Payment: ${provider} - ${action}`);
        this.log('Provider', provider);
        this.log('Action', action);
        if (data) {
            // Don't log sensitive payment data
            const safeData = { ...data };
            if (safeData.cardNumber) safeData.cardNumber = '[REDACTED]';
            if (safeData.cvv) safeData.cvv = '[REDACTED]';
            this.log('Data', safeData);
        }
        this.groupEnd();
    },

    // ===========================
    // UI CLICK TRACKING
    // ===========================
    _uiGetElementLabel(el) {
        if (!el) return 'unknown';
        const aria = el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'));
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string'
            ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
            : '';
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
        const tag = (el.tagName || 'UNKNOWN').toLowerCase();
        const name = el.getAttribute && el.getAttribute('name');
        const type = el.getAttribute && el.getAttribute('type');
        return `${tag}${id}${cls}${aria ? ` "${aria}"` : ''}${name ? ` name="${name}"` : ''}${type ? ` type="${type}"` : ''}${text ? ` text="${text}"` : ''}`;
    },

    _uiFindClickableTarget(target) {
        if (!target || !target.closest) return null;
        return target.closest('button, a, [role="button"], input[type="button"], input[type="submit"], [onclick]');
    },

    _uiNewClickId() {
        return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    },

    _uiTimerLabel(clickId) {
        return `UI Click ${clickId}`;
    },

    attachUITracking() {
        if (!this._enabled) return;
        if (!this._shouldLog('verbose')) return;
        if (!DEBUG_CONFIG.ui) return;
        if (this._ui.listenerAttached) return;
        if (typeof document === 'undefined' || !document.addEventListener) return;

        const handler = (evt) => {
            if (!this._enabled) return;
            if (!this._shouldLog('verbose')) return;
            if (!DEBUG_CONFIG.ui) return;

            const clickable = this._uiFindClickableTarget(evt.target);
            if (!clickable) return;

            // Only log primary button clicks; ignore right-click etc.
            if (typeof evt.button === 'number' && evt.button !== 0) return;

            const clickId = this._uiNewClickId();
            const info = {
                label: this._uiGetElementLabel(clickable),
                tag: (clickable.tagName || '').toLowerCase(),
                id: clickable.id || null,
                className: (typeof clickable.className === 'string') ? clickable.className : null,
                href: clickable.getAttribute && clickable.getAttribute('href'),
                onclickAttr: clickable.getAttribute && clickable.getAttribute('onclick'),
                name: clickable.getAttribute && clickable.getAttribute('name'),
                type: clickable.getAttribute && clickable.getAttribute('type'),
                value: clickable.value !== undefined ? clickable.value : undefined,
                page: (typeof window !== 'undefined') ? window.location?.href : undefined,
                ts: new Date().toISOString(),
            };

            const timerLabel = this._uiTimerLabel(clickId);
            this._ui.lastClick = { id: clickId, ts: Date.now(), info, timerLabel };

            this.group(`🖱️ UI Click`);
            this.log('click', info);
            this.time(timerLabel);
            this.groupEnd();
        };

        // Capture phase so we log before inline onclick handlers run
        document.addEventListener('click', handler, true);
        this._ui.listenerAttached = true;
        this.info('UI click tracking attached');
    },

    consumeLastUiClick(maxAgeMs = 1500) {
        const last = this._ui.lastClick;
        if (!last) return null;
        if ((Date.now() - last.ts) > maxAgeMs) return null;
        // Consume so only the first handler correlates to this click
        this._ui.lastClick = null;
        return last;
    },
    
    // Initialize debug system
    init() {
        if (this._enabled) {
            this.info('Debug system initialized', {
                level: this._level,
                timestamp: this._getTimestamp(),
                features: {
                    network: DEBUG_CONFIG.network,
                    api: DEBUG_CONFIG.api,
                    auth: DEBUG_CONFIG.auth,
                    storage: DEBUG_CONFIG.storage,
                    payment: DEBUG_CONFIG.payment,
                    ui: DEBUG_CONFIG.ui
                }
            });
            this.attachUITracking();
        }
    },
    
    // Enable/disable debug
    enable() {
        this._enabled = true;
        this.info('Debug system enabled');
    },
    
    disable() {
        this._enabled = false;
        console.log('[DEBUG] Debug system disabled');
    },
    
    // Set debug level
    setLevel(level) {
        if (this._levels.hasOwnProperty(level)) {
            this._level = level;
            this.info(`Debug level set to: ${level}`);
        } else {
            this.warn(`Invalid debug level: ${level}. Valid levels: ${Object.keys(this._levels).join(', ')}`);
        }
    }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    // Wait for config to be loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => DEBUG.init(), 100);
        });
    } else {
        setTimeout(() => DEBUG.init(), 100);
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.DEBUG = DEBUG;
}

// For Node.js/Deno environments (Edge Functions)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEBUG;
}

