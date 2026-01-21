import React from 'react';
import ReactDOM from 'react-dom/client';
import { initDeepAgentsUI, DeepAgentsApp, getServices } from 'deepagents-ui';
import 'deepagents-ui/src/styles.css';
import './index.css';

// Get API base URL from current location (same origin)
const apiBaseUrl = window.location.origin;
const wsBaseUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

// Initialize the shared UI package
initDeepAgentsUI({
  apiBaseUrl,
  wsBaseUrl,
});

const App = () => {
  const services = getServices();
  return (
    <DeepAgentsApp
      apiService={services?.apiService}
      title="DeepAgents Web"
      version="v1.0.0"
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
