import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './ThemeContext';
import './index.css';

console.log('[renderer] module loaded');

const container = document.getElementById('root');
if (container) {
  console.log('[renderer] mounting React app');
  const root = createRoot(container);
  // Note: StrictMode removed intentionally — it double-fires useEffect,
  // which causes duplicate xterm.js instances and PTY sessions.
  root.render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
} else {
  console.error('[renderer] #root element not found');
}
