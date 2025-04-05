// Polyfill for global which is used by simple-peer and other Node.js libraries
if (typeof global === "undefined") {
  window.global = window;
}

// Polyfill for process.nextTick which is used by some Node.js libraries
if (typeof process === "undefined") {
  window.process = {
    env: { DEBUG: undefined },
    nextTick: function (cb) {
      setTimeout(cb, 0);
    },
  };
}

// Polyfill for Buffer which is used by some Node.js crypto libraries
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = {
    isBuffer: function () {
      return false;
    },
  };
}
