// Custom logger utility to control logging across the app

const DEBUG_MODE = false; // Set to false in production

const logger = {
    log: (...args) => {
        if (DEBUG_MODE && __DEV__) {
            console.log(...args);
        }
    },

    info: (...args) => {
        if (DEBUG_MODE && __DEV__) {
            console.info(...args);
        }
    },

    warn: (...args) => {
        if (__DEV__) { // Always show warnings in dev
            console.warn(...args);
        }
    },

    error: (...args) => {
        // Always show errors
        console.error(...args);
    },

    debug: (...args) => {
        if (DEBUG_MODE && __DEV__) {
            console.debug(...args);
        }
    },

    // Group related logs together
    group: (name, fn) => {
        if (DEBUG_MODE && __DEV__) {
            console.group(name);
            fn();
            console.groupEnd();
        }
    }
};

export default logger;
