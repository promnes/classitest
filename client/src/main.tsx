import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";

// Environment-based API base (set VITE_API_BASE to override, defaults to relative)
const API_BASE = (import.meta.env as any).VITE_API_BASE ?? "";

// Monkey-patch fetch to prepend API_BASE for requests starting with /api
const _originalFetch = window.fetch.bind(window);
(window as any).fetch = (input: any, init?: any) => {
  try {
    if (typeof input === "string") {
      if (input.startsWith("/api") && API_BASE) {
        input = API_BASE.replace(/\/$/, "") + input;
      }
    } else if (input instanceof Request) {
      const url = new URL(input.url);
      if (url.pathname.startsWith("/api") && API_BASE) {
        const newUrl = API_BASE.replace(/\/$/, "") + url.pathname + url.search;
        input = new Request(newUrl, input);
      }
    }
  } catch (e) {
    // ignore and continue with original input
  }
  return _originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
