import { LogBox } from 'react-native';
import { Platform } from 'react-native';

// Ignore specific warnings that are noisy but not problematic
LogBox.ignoreLogs([
    'AsyncStorage has been extracted',
    'Sending `onAnimatedValueUpdate`',
    'Non-serializable values were found in the navigation state',
    'VirtualizedLists should never be nested',
    '[react-native-gesture-handler]',
    'Warning: Cannot update a component',
    'Setting a timer',
    'Warning: Failed prop type',
    'EventEmitter.removeListener',
    'Animated: `useNativeDriver`',
    // Socket.IO related warnings
    'WebSocket connection',
    'socket.io-client:manager',
    'socket.io-client:url',
    'socket disconnected',
    'socket.io-parser',
    // Add more patterns here as needed
    'Slider has been removed from react-native core'
]);

// Keep socket.io events for debugging calls
console.log = (function (originalLog) {
    return function (...args) {
        // Don't filter call-related logs
        if (args.length > 0 &&
            (typeof args[0] === 'string') &&
            (args[0].includes('call') || args[0].includes('Call'))) {
            originalLog.apply(console, args);
        } else {
            // Filter other logs
            // Only log in development, or if explicitly forced
            if (__DEV__ || (args.length > 0 && args[0] === 'FORCE_LOG')) {
                originalLog.apply(console, args);
            }
        }
    };
})(console.log);

// Completely disable LogBox in production
if (!__DEV__) {
    LogBox.ignoreAllLogs();
}

// Create a custom logger to replace console.log
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Patterns to filter out from logs
const filterPatterns = [
    'socket.io-client',
    'WebSocket connection',
    '[socket.io]',
    'socket disconnected',
    'socket connected',
    'socket reconnecting'
];

// Only log in DEV mode and filter out noisy messages
if (Platform.OS !== 'web') {
    console.log = (...args) => {
        if (__DEV__) {
            const message = args.join(' ');
            if (!filterPatterns.some(pattern => message.includes(pattern))) {
                originalConsoleLog(...args);
            }
        }
    };

    console.warn = (...args) => {
        if (__DEV__) {
            const message = args.join(' ');
            if (!filterPatterns.some(pattern => message.includes(pattern))) {
                originalConsoleWarn(...args);
            }
        }
    };

    console.error = (...args) => {
        if (__DEV__) {
            const message = args.join(' ');
            if (!filterPatterns.some(pattern => message.includes(pattern))) {
                originalConsoleError(...args);
            }
        }
    };
}

// Add safe window event handling
export const addSafeWindowListener = (event, handler) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener(event, handler);
        return true;
    }
    return false;
};

export const removeSafeWindowListener = (event, handler) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener(event, handler);
        return true;
    }
    return false;
};

export default {
    setup: () => {
        // This function exists to ensure the file is imported and executed
        console.log('Log configuration initialized');
    }
};
