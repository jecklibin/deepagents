import React, { useState, useRef, useEffect } from 'react';
import useChatStore from '../store/chatStore';
import useSkillsStore from '../store/skillsStore';
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

const ArrowIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="m14.475 12l-7.35-7.35q-.375-.375-.363-.888t.388-.887t.888-.375t.887.375l7.675 7.7q.3.3.45.675t.15.75t-.15.75t-.45.675l-7.7 7.7q-.375.375-.875.363T7.15 21.1t-.375-.888t.375-.887z" fill="currentColor"/>
  </svg>
);

const TreeIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 21v-3h-4V8H9v3H2V3h7v3h6V3h7v8h-7V8h-2v8h2v-3h7v8zM4 5v4zm13 10v4zm0-10v4zm0 4h3V5h-3zm0 10h3v-4h-3zM4 9h3V5H4z" fill="currentColor"/>
  </svg>
);

const DatabaseIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21q-3.775 0-6.387-1.162T3 17V7q0-1.65 2.638-2.825T12 3t6.363 1.175T21 7v10q0 1.675-2.613 2.838T12 21m0-11.975q2.225 0 4.475-.638T19 7.025q-.275-.725-2.512-1.375T12 5q-2.275 0-4.462.638T5 7.025q.35.75 2.538 1.375T12 9.025" fill="currentColor"/>
  </svg>
);

const DescriptionIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 18h8v-2H8zm0-4h8v-2H8zm-2 8q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v12q0 .825-.587 1.413T18 22zm7-13V4H6v16h12V9z" fill="currentColor"/>
  </svg>
);

const AddIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z" fill="currentColor"/>
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
    setCurrentSession,
    addSession,
    removeSession,
    connect,
    disconnect,
    sendMessage,
    stopStreaming,
    respondToInterrupt,
  } = useChatStore();

  const { skills, selectedSkill } = useSkillsStore();

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

  // Get skill flow items (selected skills for orchestration)
  const skillFlow = selectedSkill ? [selectedSkill] : skills.slice(0, 2);

  return (
    <section className="flex-1 flex flex-col bg-slate-50 relative">
      {/* Task Session Management */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="p-4 flex items-center gap-4">
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

      {/* Skill Orchestration Area */}
      <div className="bg-indigo-50/50 border-b border-indigo-100 p-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
            <TreeIcon />
            AI助手 - 多技能协同编排
          </div>
          <button className="text-[10px] text-indigo-600 hover:underline">管理组件库</button>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          {skillFlow.map((skill, index) => (
            <React.Fragment key={skill.name}>
              {index > 0 && <ArrowIcon className="text-slate-300" />}
              <div className="flex items-center bg-white p-2 rounded-lg border border-indigo-200 shadow-sm">
                {skill.type === 'browser' ? (
                  <DatabaseIcon className="text-indigo-600 mr-2" />
                ) : (
                  <DescriptionIcon className="text-indigo-600 mr-2" />
                )}
                <span className="text-xs font-medium">{skill.name}</span>
              </div>
            </React.Fragment>
          ))}
          <button className="flex items-center justify-center w-8 h-8 rounded-lg border-2 border-dashed border-indigo-200 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
            <AddIcon />
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
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

        {/* Todo List */}
        {todos.length > 0 && (
          <div className="bg-slate-100 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase">任务列表</h4>
            <div className="space-y-2">
              {todos.map((todo, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    todo.status === 'completed' ? 'bg-emerald-500' :
                    todo.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                    'bg-slate-300'
                  }`} />
                  <span className={todo.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}>
                    {todo.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto relative">
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
