// Add these polyfills at the very top of the file
if (typeof global === "undefined") {
  window.global = window;
}
if (typeof process === "undefined") {
  window.process = { env: { DEBUG: undefined }, nextTick: (cb) => setTimeout(cb, 0) };
}
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = {
    isBuffer: () => false,
    from: () => ({}),
  };
}

// Import the polyfill before any other imports
import "./utils/browserPolyfill";

// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { RouterProvider } from "react-router-dom";
import router from "./routes";
import { store } from "./redux/store";
import { Provider } from "react-redux";

createRoot(document.getElementById("root")).render(
  // <StrictMode>
  <Provider store={store}>
    <RouterProvider router={router}>
      <App />
    </RouterProvider>
  </Provider>,
  // </StrictMode>
);
