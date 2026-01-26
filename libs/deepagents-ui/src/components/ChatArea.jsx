import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import ReactMarkdown from 'react-markdown';

// Icons
const AddTaskIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2q1.625 0 3.075.475T17.75 3.8L16.3 5.275q-.95-.6-2.025-.937T12 4Q8.675 4 6.337 6.338T4 12t2.338 5.663T12 20q.8 0 1.55-.15t1.45-.425l1.5 1.525q-1.025.5-2.15.775T12 22m7-2v-3h-3v-2h3v-3h2v3h3v2h-3v3zm-8.4-3.4l-4.25-4.25l1.4-1.4l2.85 2.85l10-10.025l1.4 1.4z" fill="currentColor"/>
  </svg>
);

const AttachIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 15.75q0 2.6-1.825 4.425T11.75 22t-4.425-1.825T5.5 15.75V6.5q0-1.875 1.313-3.187T10 2t3.188 1.313T14.5 6.5v8.75q0 1.15-.8 1.95t-1.95.8t-1.95-.8t-.8-1.95V6h2v9.25q0 .325.213.538t.537.212t.538-.213t.212-.537V6.5q-.025-1.05-.737-1.775T10 4t-1.775.725T7.5 6.5v9.25q-.025 1.775 1.225 3.013T11.75 20q1.75 0 2.975-1.237T16 15.75V6h2z" fill="currentColor"/>
  </svg>
);

const SendIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path clipRule="evenodd" d="M3.402 6.673c-.26-2.334 2.143-4.048 4.266-3.042l11.944 5.658c2.288 1.083 2.288 4.339 0 5.422L7.668 20.37c-2.123 1.006-4.525-.708-4.266-3.042L3.882 13H12a1 1 0 1 0 0-2H3.883z" fill="currentColor" fillRule="evenodd"/>
  </svg>
);

const StopIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18V6h12v12z" fill="currentColor"/>
  </svg>
);

const RobotIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 15q-1.25 0-2.125-.875T1 12t.875-2.125T4 9V7q0-.825.588-1.412T6 5h3q0-1.25.875-2.125T12 2t2.125.875T15 5h3q.825 0 1.413.588T20 7v2q1.25 0 2.125.875T23 12t-.875 2.125T20 15v4q0 .825-.587 1.413T18 21H6q-.825 0-1.412-.587T4 19zm5-2q.625 0 1.063-.437T10.5 11.5t-.437-1.062T9 10t-1.062.438T7.5 11.5t.438 1.063T9 13m6 0q.625 0 1.063-.437T16.5 11.5t-.437-1.062T15 10t-1.062.438T13.5 11.5t.438 1.063T15 13m-7 4h8v-2H8z" fill="currentColor"/>
  </svg>
);

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

const CloseIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z" fill="currentColor"/>
  </svg>
);

const ChatArea = () => {
  const [inputValue, setInputValue] = useState('');
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  const {
    sessions,
    currentSessionId,
    messages,
    isConnected,
    isStreaming,
    pendingInterrupt,
    todos,
    toolCalls,
    setCurrentSession,
    addSession,
    removeSession,
    connect,
    disconnect,
    sendMessage,
    stopStreaming,
    respondToInterrupt,
  } = useChatStore();

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Create new session
  const handleNewSession = () => {
    const sessionId = `session-${Date.now()}`;
    const session = {
      id: sessionId,
      name: `新任务会话`,
      date: new Date().toLocaleDateString('zh-CN'),
    };
    addSession(session);
    setCurrentSession(sessionId);
    connect(sessionId);
  };

  // Select session
  const handleSelectSession = (sessionId) => {
    setCurrentSession(sessionId);
    connect(sessionId);
  };

  // Close session
  const handleCloseSession = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('确定要关闭此会话吗？')) {
      if (currentSessionId === sessionId) {
        disconnect();
      }
      removeSession(sessionId);
    }
  };

  // Send message
  const handleSend = () => {
    if (!inputValue.trim() || !isConnected) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const executionSteps = todos.map((todo, index) => ({
    id: index,
    title: todo.content,
    desc: todo.activeForm || '',
    status: todo.status,
    progress: todo.status === 'in_progress' ? 50 : todo.status === 'completed' ? 100 : 0,
  }));

  const toolSteps = toolCalls.map((tool, index) => ({
    id: `tool-${index}`,
    title: `Tool: ${tool.name}`,
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
    <section className="w-[420px] bg-white border-l border-slate-200 flex flex-col shrink-0">
      {/* Task Session Management */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="p-4 flex items-center gap-3">
          <button
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all font-medium text-sm shrink-0 shadow-sm"
            onClick={handleNewSession}
          >
            <AddTaskIcon />
            新建任务会话
          </button>
          <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 cursor-pointer transition-colors group ${
                  currentSessionId === session.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
                onClick={() => handleSelectSession(session.id)}
              >
                <span className={`text-xs font-bold ${currentSessionId === session.id ? 'text-blue-700' : 'text-slate-600'}`}>
                  {session.name}
                </span>
                <span className={`text-[10px] ${currentSessionId === session.id ? 'text-blue-400' : 'text-slate-400'}`}>
                  {session.date}
                </span>
                <button
                  className={`p-0.5 rounded transition-all ${
                    currentSessionId === session.id
                      ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-100'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleCloseSession(e, session.id)}
                  title="关闭会话"
                >
                  <CloseIcon className="text-sm" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-sm text-slate-400">点击"新建任务会话"开始</div>
            )}
          </div>
        </div>
      </div>

      {/* Task Execution */}
      <div className="border-b border-slate-200 bg-slate-50/70 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CycloneIcon className="text-blue-600" />
            Task Execution
          </div>
          {isStreaming && (
            <span className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 font-semibold animate-pulse">
              Running
            </span>
          )}
        </div>
        <div className="px-4 pb-4">
          {allSteps.length === 0 ? (
            <div className="text-xs text-slate-400">No active steps yet.</div>
          ) : (
            <div className="relative space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {allSteps.map((step) => (
                <div
                  key={step.id}
                  className={`relative flex gap-4 pl-8 ${step.status === 'pending' ? 'opacity-40' : ''}`}
                >
                  {renderStepIcon(step.status)}
                  <div className="flex-1">
                    {step.status === 'in_progress' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-blue-600">{step.title}</h4>
                          <span className="text-[10px] text-blue-500">{step.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                        {step.desc && (
                          <p className="text-[10px] text-slate-500 mt-2 font-mono bg-white/70 p-1.5 rounded border border-slate-100 truncate">
                            {step.desc}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <h4 className="text-xs font-semibold text-slate-700">{step.title}</h4>
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
        </div>
      </div>

      {/* Chat History */}

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
        {messages.length === 0 && currentSessionId && (
          <div className="text-center text-slate-400 py-8">
            <RobotIcon className="text-4xl mx-auto mb-2 text-slate-300" />
            <p>开始与 AI 助手对话</p>
            <p className="text-xs mt-1">输入您的任务需求，AI 将协助您完成</p>
          </div>
        )}

        {messages.map((message) => {
          if (message.type === 'user') {
            return (
              <div key={message.id} className="flex justify-end pr-2">
                <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-none p-4 shadow-md">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <span className="text-[10px] opacity-70 mt-2 block text-right">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            );
          }

          if (message.type === 'assistant') {
            return (
              <div key={message.id} className="flex gap-4">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                  <RobotIcon className="text-lg" />
                </div>
                <div className="max-w-[85%] space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
                    <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                    )}
                    <span className="text-[10px] text-slate-400 mt-2 block">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Pending Interrupt */}
        {pendingInterrupt && (
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
              <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 17q.425 0 .713-.288T13 16t-.288-.712T12 15t-.712.288T11 16t.288.713T12 17m-1-4h2V7h-2zm1 9q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22" fill="currentColor"/>
              </svg>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-none p-4 shadow-sm max-w-[85%]">
              <p className="text-sm text-amber-800 font-medium mb-2">需要您的确认</p>
              <p className="text-sm text-amber-700 font-medium">{pendingInterrupt.tool_name}</p>
              {pendingInterrupt.description && (
                <p className="text-xs text-amber-600 mt-1">{pendingInterrupt.description}</p>
              )}
              {pendingInterrupt.args && (
                <pre className="text-xs text-amber-600 mt-2 bg-amber-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(pendingInterrupt.args, null, 2)}
                </pre>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors"
                  onClick={() => respondToInterrupt('approve')}
                >
                  批准
                </button>
                <button
                  className="px-4 py-1.5 bg-white border border-amber-300 rounded-lg text-sm text-amber-700 hover:bg-amber-100 transition-colors"
                  onClick={() => respondToInterrupt('reject')}
                >
                  拒绝
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-none relative">
          <div className="flex items-end gap-3 p-2 bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <AttachIcon className="text-xl" />
            </button>
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent border-none outline-none py-2 px-1 text-sm resize-none hide-scrollbar placeholder:text-slate-400"
              placeholder={currentSessionId ? "在此输入指令，如：'帮我优化当前工作流'..." : "请先创建任务会话"}
              rows="1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!currentSessionId || !isConnected}
            />
            {isStreaming ? (
              <button
                className="bg-red-500 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-600 transition-all shadow-lg active:scale-95"
                onClick={stopStreaming}
              >
                <StopIcon className="text-xl" />
              </button>
            ) : (
              <button
                className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSend}
                disabled={!inputValue.trim() || !isConnected}
              >
                <SendIcon className="text-xl" />
              </button>
            )}
          </div>
          <div className="flex gap-4 mt-3 px-2">
            <button className="text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors">
              💡 建议：优化抓取规则
            </button>
            <button className="text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors">
              ⚙️ 获取当前日志
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChatArea;
