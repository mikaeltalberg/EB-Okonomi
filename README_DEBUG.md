# Debug System Documentation

## Overview

This project includes a comprehensive debug system that can be enabled for development and disabled for production/master branch.

## Architecture

### Two Versions:
- **Dev Branch**: Full debug logging enabled
- **Master Branch**: Debug code stripped (production-ready)

## Components

### 1. Debug Utility (`debug.js`)
- Client-side debug utility for JavaScript
- Provides structured logging with levels (verbose, info, warn, error)
- Specialized methods for API, network, auth, storage, and payment debugging
- Auto-detects environment (localhost = dev, production = disabled)

### 2. Debug Utility for Edge Functions (`supabase/functions/_shared/debug.ts`)
- Server-side debug utility for Deno/TypeScript Edge Functions
- Similar API to client-side debug utility
- Controlled via environment variables

### 3. Configuration (`config.js`)
- `DEBUG_CONFIG` object controls debug behavior
- Auto-detects environment based on hostname
- Can be manually overridden

### 4. Build Script (`build-strip-debug.js`)
- Strips all debug code for production builds
- Removes DEBUG.* calls from all files
- Sets `DEBUG_CONFIG.enabled = false`

## Usage

### In JavaScript Files

```javascript
// Basic logging
DEBUG.log('Message', { data });
DEBUG.info('Info message');
DEBUG.warn('Warning message');
DEBUG.error('Error message', { error });

// Specialized logging
DEBUG.api('GitHub', 'getUser', { email });
DEBUG.network('GET', '/api/endpoint', { data });
DEBUG.auth('Microsoft', 'signIn', { account });
DEBUG.storage('OneDrive', 'save', { filename, size });
DEBUG.payment('Stripe', 'checkout', { productId, amount });

// Performance timing
DEBUG.time('operation');
// ... code ...
DEBUG.timeEnd('operation');

// Grouping
DEBUG.group('API Calls');
DEBUG.log('Call 1');
DEBUG.log('Call 2');
DEBUG.groupEnd();
```

### In TypeScript Edge Functions

```typescript
import { DEBUG } from "../_shared/debug.ts";

DEBUG.request(req.method, req.url);
DEBUG.api('GitHub', 'getUser', { email });
DEBUG.network('GET', apiUrl, { data });
DEBUG.response(200, { success: true });
```

## Configuration

### Automatic Detection

Debug is automatically enabled when:
- Running on `localhost`
- Hostname contains `dev`
- URL contains `?debug=true`

### Manual Configuration

In `config.js`:

```javascript
window.DEBUG_CONFIG = {
    enabled: true,  // Set to false for production
    level: 'verbose',  // 'verbose', 'info', 'warn', 'error', 'none'
    showTimestamp: true,
    showCaller: true,
    network: true,
    api: true,
    auth: true,
    storage: true,
    payment: true
};
```

### Environment Variables (Edge Functions)

Set in Supabase Dashboard → Edge Functions → Secrets:

```
DEBUG_ENABLED=true
DEBUG_LEVEL=verbose
ENVIRONMENT=development
```

## Build Process

### For Dev Branch

No action needed - debug code is included and enabled automatically.

### For Master Branch

Run the build script to strip debug code:

```bash
# Dry run (preview changes)
node build-strip-debug.js --dry-run

# Apply changes
node build-strip-debug.js
```

This will:
1. Remove all `DEBUG.*` calls from JavaScript files
2. Remove `DEBUG` imports from TypeScript files
3. Set `DEBUG_CONFIG.enabled = false` in `config.js`
4. Clean up extra blank lines

## Debug Levels

- **verbose**: All debug messages (default for dev)
- **info**: Info, warnings, and errors only
- **warn**: Warnings and errors only
- **error**: Errors only
- **none**: No debug output

## Runtime Control

You can control debug at runtime in the browser console:

```javascript
// Enable debug
DEBUG.enable();

// Disable debug
DEBUG.disable();

// Set debug level
DEBUG.setLevel('info');
```

## Best Practices

1. **Use appropriate debug levels**: Use `log` for verbose info, `info` for important events, `warn` for warnings, `error` for errors
2. **Don't log sensitive data**: The debug system automatically redacts tokens and sensitive payment info
3. **Use specialized methods**: Use `DEBUG.api()`, `DEBUG.auth()`, etc. for better organization
4. **Group related logs**: Use `DEBUG.group()` to organize related debug output
5. **Time operations**: Use `DEBUG.time()` and `DEBUG.timeEnd()` for performance debugging

## Files Modified

### Client-Side:
- `debug.js` - Debug utility module
- `config.js` - Debug configuration
- `index.html` - Includes debug.js
- `script.js` - Debug logging throughout

### Server-Side:
- `supabase/functions/_shared/debug.ts` - Debug utility for Edge Functions
- `supabase/functions/github-user/index.ts` - Debug logging added
- `supabase/functions/stripe-webhook/index.ts` - Debug logging added
- All other Edge Functions can use the shared debug utility

## Notes

- Debug code has minimal performance impact when disabled
- Debug calls are completely removed in production builds
- The debug system is designed to be safe to include in production (disabled by default)
- All debug output includes timestamps and caller information (when enabled)

