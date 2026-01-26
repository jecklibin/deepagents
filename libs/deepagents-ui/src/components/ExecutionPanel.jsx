import React from 'react';
import VncViewer from './VncViewer';
import { useChatStore } from '../store/chatStore';

// Icons
const CycloneIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16q-1.65 0-2.825-1.175T8 12t1.175-2.825T12 8t2.825 1.175T16 12t-1.175 2.825T12 16m0-2q.825 0 1.413-.587T14 12t-.587-1.412T12 10t-1.412.588T10 12t.588 1.413T12 14m0 6q-2.85 0-5.087-.337t-3.788-.713q-.5-.125-.812-.488T2 17.6q0-.4.338-.638t.737-.112q1.05.275 1.863.438l1.312.262q-1.05-1.075-1.65-2.5T4 12q0-2.85.337-5.087t.713-3.788q.125-.5.488-.812T6.4 2q.4 0 .638.338t.112.737q-.3 1.05-.462 1.863T6.45 6.25Q7.525 5.2 8.95 4.6T12 4q2.85 0 5.088.337t3.787.713q.5.125.813.488T22 6.4q0 .4-.337.638t-.738.112q-1.05-.3-1.862-.462T17.75 6.45q1.05 1.075 1.65 2.5T20 12q0 2.85-.337 5.088t-.713 3.787q-.125.5-.488.813T17.6 22q-.4 0-.638-.337t-.112-.738q.275-1.05.438-1.862l.262-1.313q-1.075 1.05-2.5 1.65T12 20m0-2q2.5 0 4.25-1.75T18 12t-1.75-4.25T12 6T7.75 7.75T6 12t1.75 4.25T12 18" fill="currentColor"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="m10 16.4l-4-4L7.4 11l2.6 2.6L16.6 7L18 8.4z" fill="currentColor"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 23v-4.2q-.875-.3-1.437-1.062T1 16v-2h6v2q0 .975-.562 1.738T5 18.8V23zm8 0v-4.2q-.875-.3-1.437-1.062T9 16v-2h6v2q0 .975-.562 1.738T13 18.8V23zm8 0v-4.2q-.875-.3-1.437-1.062T17 16v-2h6v2q0 .975-.562 1.738T21 18.8V23zM1 12V6h2V2q0-.425.288-.712T4 1t.713.288T5 2v4h2v6zm8 0V6h2V2q0-.425.288-.712T12 1t.713.288T13 2v4h2v6zm8 0V6h2V2q0-.425.288-.712T20 1t.713.288T21 2v4h2v6z" fill="currentColor"/>
  </svg>
);

const CleaningIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 23v-7q0-2.075 1.463-3.537T8 11h1V3q0-.825.588-1.412T11 1h2q.825 0 1.413.588T15 3v8h1q2.075 0 3.538 1.463T21 16v7zm2-2h2v-3q0-.425.288-.712T8 17t.713.288T9 18v3h2v-3q0-.425.288-.712T12 17t.713.288T13 18v3h2v-3q0-.425.288-.712T16 17t.713.288T17 18v3h2v-5q0-1.25-.875-2.125T16 13H8q-1.25 0-2.125.875T5 16zm8-10V3h-2v8zm0 0h-2z" fill="currentColor"/>
  </svg>
);

const ExecutionPanel = () => {
  const { todos, toolCalls, isStreaming } = useChatStore();

  // Build execution steps from todos and tool calls
  const executionSteps = todos.map((todo, index) => ({
    id: index,
    title: todo.content,
    desc: todo.activeForm || '',
    status: todo.status,
    progress: todo.status === 'in_progress' ? 50 : todo.status === 'completed' ? 100 : 0,
  }));

  // Add tool calls as steps
  const toolSteps = toolCalls.map((tool, index) => ({
    id: `tool-${index}`,
    title: `调用工具: ${tool.name}`,
    desc: tool.result
      ? (typeof tool.result === 'string' ? tool.result.slice(0, 100) : JSON.stringify(tool.result).slice(0, 100))
      : (typeof tool.input === 'string' ? tool.input.slice(0, 50) : JSON.stringify(tool.input).slice(0, 50)),
    status: tool.status || 'running',
  }));

  const allSteps = [...executionSteps, ...toolSteps];

  const renderStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <div className="absolute left-0 top-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-4 ring-emerald-50 z-10">
            <CheckIcon className="text-sm" />
          </div>
        );
      case 'in_progress':
      case 'running':
        return (
          <div className="absolute left-0 top-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white ring-4 ring-blue-50 z-10 animate-pulse-soft">
            <SettingsIcon className="text-sm" />
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="absolute left-0 top-1 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 z-10">
            <CleaningIcon className="text-sm" />
          </div>
        );
    }
  };

  return (
    <aside className="w-[420px] bg-white border-l border-slate-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <span className="font-bold text-sm flex items-center gap-2">
          <CycloneIcon className="text-blue-600" />
          当前任务执行链
        </span>
        {isStreaming && (
          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100 animate-pulse">
            执行中...
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
        <VncViewer title="Remote Browser" autoConnect frameHeightClass="h-52" compact />
        {allSteps.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <CycloneIcon className="text-3xl mx-auto mb-2 text-slate-300" />
            <p className="text-sm">暂无执行任务</p>
            <p className="text-xs mt-1">开始对话后将显示任务执行链</p>
          </div>
        ) : (
          <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
            {allSteps.map((step) => (
              <div
                key={step.id}
                className={`relative flex gap-4 pl-8 group ${step.status === 'pending' ? 'opacity-40' : ''}`}
              >
                {renderStepIcon(step.status)}
                <div className="flex-1">
                  {step.status === 'in_progress' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-blue-600">{step.title}</h4>
                        <span className="text-[10px] text-blue-500">{step.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                      {step.desc && (
                        <p className="text-[10px] text-slate-500 mt-2 font-mono bg-slate-50 p-1.5 rounded border border-slate-100 truncate">
                          {step.desc}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h4 className="text-xs font-bold text-slate-700">{step.title}</h4>
                      {step.desc && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{step.desc}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* System Resources */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
            系统资源
          </h4>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">连接状态</span>
              <span className={`font-mono ${isStreaming ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isStreaming ? '活跃' : '空闲'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">任务数量</span>
              <span className="font-mono text-blue-600">{todos.length} 个</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">工具调用</span>
              <span className="font-mono text-blue-600">{toolCalls.length} 次</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ExecutionPanel;
