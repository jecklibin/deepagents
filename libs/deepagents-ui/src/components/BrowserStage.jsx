import React from 'react';
import VncViewer from './VncViewer';

const BrowserStage = () => {
  return (
    <section className="flex-1 flex flex-col bg-slate-100 min-w-0">
      <div className="px-6 py-4 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-emerald-600 tracking-wide uppercase">
            You are in control
          </div>
          <button className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg shadow-sm">
            Share
          </button>
        </div>
      </div>
      <div className="flex-1 p-6 min-h-0">
        <VncViewer
          title="Remote Browser"
          autoConnect
          frameHeightClass="flex-1 min-h-0"
          containerClassName="h-full flex flex-col"
          compact
          showControls={false}
          showOpenInTab={false}
        />
      </div>
    </section>
  );
};

export default BrowserStage;
