/**
 * Console logger that sends console output to the parent window.
 * Automatically imported in _layout.tsx for debugging support.
 */

const IGNORE_LIST = [
  /^Running application "main"/,
  /^%c/,
  /^\[Reanimated\]/,
  /^Require cycle:/,
];

function serialize(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => {
      if (v instanceof Date) {
        return { __t: 'Date', v: v.toISOString() };
      }
      if (v instanceof Error) {
        return { __t: 'Error', v: { name: v.name, message: v.message, stack: v.stack } };
      }
      if (v !== null && typeof v === 'object') {
        if ((v as any).$$typeof) return '[React Element]';
        if ((v as any).nodeType) return '[DOM Node]';
      }
      return v;
    });
  } catch {
    return String(value);
  }
}

if (typeof window !== 'undefined') {
  const levels = ['log', 'info', 'warn', 'error', 'debug', 'table', 'trace'] as const;
  
  for (const level of levels) {
    const orig = (console as any)[level]?.bind(console);
    (console as any)[level] = (...args: unknown[]) => {
      orig?.(...args);
      
      if (IGNORE_LIST.some((regex) => typeof args[0] === 'string' && regex.test(args[0]))) {
        return;
      }
      
      try {
        // Only send postMessage if window.parent and postMessage are available (not in Expo Go)
        if (window.parent && typeof window.parent.postMessage === 'function') {
          window.parent.postMessage(
            { type: 'appgen:console', level, args: args.map(serialize), timestamp: Date.now() },
            '*'
          );
        }
      } catch { /* ignore */ }
    };
  }
  
  // Capture unhandled errors
  // Only add event listeners if window.addEventListener is available (not in Expo Go)
  if (typeof window.addEventListener === 'function') {
    try {
      window.addEventListener('error', (event) => {
        try {
          if (window.parent && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage(
              {
                type: 'appgen:console',
                level: 'error',
                args: [JSON.stringify({ __t: 'Error', v: { name: 'UncaughtError', message: event.message, stack: 'at ' + event.filename + ':' + event.lineno + ':' + event.colno } })],
                timestamp: Date.now(),
              },
              '*'
            );
          }
        } catch { /* ignore */ }
      });

      window.addEventListener('unhandledrejection', (event) => {
        try {
          if (window.parent && typeof window.parent.postMessage === 'function') {
            const reason = event.reason;
            window.parent.postMessage(
              {
                type: 'appgen:console',
                level: 'error',
                args: [serialize(reason instanceof Error ? { __t: 'Error', v: { name: reason.name, message: reason.message, stack: reason.stack } } : reason)],
                timestamp: Date.now(),
              },
              '*'
            );
          }
        } catch { /* ignore */ }
      });
    } catch { /* ignore - window.addEventListener not available in this environment */ }
  }
}

export {};
