import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';

// Icons
const CycloneIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16q-1.65 0-2.825-1.175T8 12t1.175-2.825T12 8t2.825 1.175T16 12t-1.175 2.825T12 16m0-2q.825 0 1.413-.587T14 12t-.587-1.412T12 10t-1.412.588T10 12t.588 1.413T12 14m0 6q-2.85 0-5.087-.337t-3.788-.713q-.5-.125-.812-.488T2 17.6q0-.4.338-.638t.737-.112q1.05.275 1.863.438l1.312.262q-1.05-1.075-1.65-2.5T4 12q0-2.85.337-5.087t.713-3.788q.125-.5.488-.812T6.4 2q.4 0 .638.338t.112.737q-.3 1.05-.462 1.863T6.45 6.25Q7.525 5.2 8.95 4.6T12 4q2.85 0 5.088.337t3.787.713q.5.125.813.488T22 6.4q0 .4-.337.638t-.738.112q-1.05-.3-1.862-.462T17.75 6.45q1.05 1.075 1.65 2.5T20 12q0 2.85-.337 5.088t-.713 3.787q-.125.5-.488.813T17.6 22q-.4 0-.638-.337t-.112-.738q.275-1.05.438-1.862l.262-1.313q-1.075 1.05-2.5 1.65T12 20m0-2q2.5 0 4.25-1.75T18 12t-1.75-4.25T12 6T7.75 7.75T6 12t1.75 4.25T12 18" fill="currentColor"/>
  </svg>
);

const MAX_VISIBLE_TODOS = 5;
const MAX_VISIBLE_TOOLS = 6;
const COLLAPSE_CHAR_LIMIT = 800;
const COLLAPSE_LINE_LIMIT = 10;
const PREVIEW_LIMIT = 120;

const formatPayload = (payload) => {
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

const shouldCollapseText = (text) => {
  if (!text) return false;
  if (text.length > COLLAPSE_CHAR_LIMIT) return true;
  return text.split(/\r?\n/).length > COLLAPSE_LINE_LIMIT;
};

const buildPreview = (text, maxLength = PREVIEW_LIMIT) => {
  if (!text) return '';
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength)}...`;
};

const ExecutionPanel = () => {
  const { todos, toolCalls, isStreaming } = useChatStore();
  const [showAllTodos, setShowAllTodos] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);

  const visibleTodos = showAllTodos ? todos : todos.slice(0, MAX_VISIBLE_TODOS);
  const visibleTools = showAllTools ? toolCalls : toolCalls.slice(0, MAX_VISIBLE_TOOLS);
  const hasMoreTodos = todos.length > MAX_VISIBLE_TODOS;
  const hasMoreTools = toolCalls.length > MAX_VISIBLE_TOOLS;
  const hasData = todos.length > 0 || toolCalls.length > 0;

  const renderStatusPill = (status) => {
    if (status === 'running') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-600 border-blue-100">
          执行中
        </span>
      );
    }
    if (status === 'error') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-rose-50 text-rose-600 border-rose-100">
          失败
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-100">
          已完成
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-50 text-slate-500 border-slate-100">
        等待
      </span>
    );
  };

  const renderPayloadDetails = (label, payload, tone = 'default') => {
    const text = formatPayload(payload);
    if (!text) return null;
    const shouldCollapse = shouldCollapseText(text);
    const preview = shouldCollapse ? buildPreview(text) : '';
    const summaryColor = tone === 'error' ? 'text-rose-500' : 'text-slate-500';
    const bodyColor = tone === 'error' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-slate-600 bg-slate-50 border-slate-100';

    return (
      <details className="mt-2" open={!shouldCollapse}>
        <summary className={`cursor-pointer text-[10px] ${summaryColor}`}>
          {label}{preview ? ` · ${preview}` : ''}
        </summary>
        <pre className={`mt-2 text-[11px] ${bodyColor} rounded p-2 border overflow-x-auto whitespace-pre-wrap`}>
          {text}
        </pre>
      </details>
    );
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
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
        {!hasData ? (
          <div className="text-center text-slate-400 py-8">
            <CycloneIcon className="text-3xl mx-auto mb-2 text-slate-300" />
            <p className="text-sm">暂无执行任务</p>
            <p className="text-xs mt-1">开始对话后将显示执行过程</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  思考过程
                </h4>
                {hasMoreTodos && (
                  <button
                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowAllTodos((prev) => !prev)}
                  >
                    {showAllTodos ? '收起' : `展开 ${todos.length - MAX_VISIBLE_TODOS} 项`}
                  </button>
                )}
              </div>
              {visibleTodos.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  {isStreaming ? '思考步骤生成中...' : '未生成计划'}
                </p>
              ) : (
                <div className="space-y-2">
                  {visibleTodos.map((todo, index) => (
                    <div key={`${todo.content}-${index}`} className="flex items-start gap-2 text-xs">
                      <span className={`mt-1 w-2 h-2 rounded-full ${
                        todo.status === 'completed' ? 'bg-emerald-500' :
                        todo.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                        'bg-slate-300'
                      }`} />
                      <div>
                        <p className={todo.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}>
                          {todo.content}
                        </p>
                        {todo.activeForm && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{todo.activeForm}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  执行结果
                </h4>
                {hasMoreTools && (
                  <button
                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowAllTools((prev) => !prev)}
                  >
                    {showAllTools ? '收起' : `展开 ${toolCalls.length - MAX_VISIBLE_TOOLS} 项`}
                  </button>
                )}
              </div>
              {visibleTools.length === 0 ? (
                <p className="text-[11px] text-slate-400">暂无执行结果</p>
              ) : (
                <div className="space-y-3">
                  {visibleTools.map((tool, index) => {
                    const hasResult = tool.result !== undefined && tool.result !== null;
                    return (
                      <div key={tool.id || `${tool.name}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700">{tool.name || 'tool'}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {tool.status === 'running'
                                ? '执行中...'
                                : tool.status === 'error'
                                  ? '执行失败'
                                  : tool.status === 'completed'
                                    ? '执行完成'
                                    : '等待执行'}
                            </p>
                          </div>
                          {renderStatusPill(tool.status)}
                        </div>
                        {renderPayloadDetails('输入', tool.input)}
                        {hasResult
                          ? renderPayloadDetails('结果', tool.result, tool.status === 'error' ? 'error' : 'default')
                          : (
                            <p className="text-[10px] text-slate-400 mt-2">
                              {tool.status === 'running' ? '等待结果...' : '暂无结果'}
                            </p>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
              <span className="font-mono text-blue-600">{todos.length} 项</span>
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
