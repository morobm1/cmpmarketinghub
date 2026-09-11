import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Mount into #mplr-root if present (embedded in mplr.html),
// otherwise fall back to #root (standalone dev mode)
const rootEl = document.getElementById('mplr-root') || document.getElementById('root');

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
