import React, { useCallback, useEffect, useState } from 'react';
import { getServices } from '../setup';

const STORAGE_KEY = 'deepagents.vnc.url';

const VncViewer = ({
  title = 'Remote Browser',
  autoConnect = false,
  frameHeightClass = 'h-56',
  compact = false,
  showUrlInput = false,
  showControls = true,
  showOpenInTab = true,
  containerClassName = '',
}) => {
  const [url, setUrl] = useState('');
  const [frameSrc, setFrameSrc] = useState('about:blank');
  const [status, setStatus] = useState('Idle');
  const [statusTone, setStatusTone] = useState('muted');
  const [viewOnly, setViewOnly] = useState(false);
  const [connected, setConnected] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const apiService = getServices()?.apiService;

  const updateStatus = (message, tone = 'muted') => {
    setStatus(message);
    setStatusTone(tone);
  };

  const connect = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      updateStatus('VNC URL is required', 'error');
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, trimmed);
    setFrameSrc(trimmed);
    setConnected(true);
    updateStatus(viewOnly ? 'Loading (view-only)...' : 'Loading...');
  }, [url, viewOnly]);

  const disconnect = useCallback(() => {
    setFrameSrc('about:blank');
    setConnected(false);
    updateStatus('Disconnected');
  }, []);

  const openInNewTab = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      updateStatus('VNC URL is required', 'error');
      return;
    }
    window.open(trimmed, '_blank', 'noopener');
  }, [url]);

  useEffect(() => {
    const loadConfig = async () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUrl(saved);
      }
      try {
        let config = null;
        if (apiService?.getVncConfig) {
          config = await apiService.getVncConfig();
        } else {
          const response = await fetch('/api/vnc/config');
          if (response.ok) {
            config = await response.json();
          }
        }
        const defaultUrl = config?.url || '/vnc/';
        if (!saved) {
          setUrl(defaultUrl);
        }
        if (typeof config?.view_only === 'boolean') {
          setViewOnly(config.view_only);
        }
      } catch (error) {
        // Ignore config failures to keep UI responsive.
        if (!saved) {
          setUrl('/vnc/');
        }
      } finally {
        setInitialized(true);
      }
    };

    loadConfig();
  }, [apiService]);

  useEffect(() => {
    if (autoConnect && initialized && url && !connected) {
      connect();
    }
  }, [autoConnect, initialized, url, connected, connect]);

  const statusClass = statusTone === 'error'
    ? 'text-red-600'
    : statusTone === 'connected'
      ? 'text-emerald-600'
      : 'text-slate-500';

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${containerClassName}`}>
      <div className={`px-3 py-2 border-b border-slate-100 flex items-center justify-between ${compact ? '' : 'bg-slate-50'}`}>
        <span className="text-xs font-semibold text-slate-700">{title}</span>
        <div className="flex items-center gap-2">
          {viewOnly && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              view-only
            </span>
          )}
          {showControls && (
            <>
              <button
                className="text-[11px] px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                onClick={connect}
              >
                Connect
              </button>
              <button
                className="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={disconnect}
                disabled={!connected}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>
      <div className="p-3 space-y-2">
        {showUrlInput && (
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="/vnc/"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                connect();
              }
            }}
          />
        )}
        <div className="flex items-center justify-between text-[11px]">
          <span className={statusClass}>{status}</span>
          {showOpenInTab && (
            <button
              className="text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
              onClick={openInNewTab}
            >
              Open in new tab
            </button>
          )}
        </div>
      </div>
      <div className={`bg-slate-900 ${frameHeightClass}`}>
        <iframe
          title="VNC Viewer"
          className="w-full h-full"
          src={frameSrc}
          onLoad={() => {
            if (connected) {
              updateStatus('Connected', 'connected');
            }
          }}
        />
      </div>
    </div>
  );
};

export default VncViewer;
