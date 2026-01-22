import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useHybridStore, STEP_TYPES } from '../store/hybridStore';
import { useSkillsStore } from '../store/skillsStore';
import { useRecordingStore } from '../store/recordingStore';
import { useRPAStore } from '../store/rpaStore';

// Icons
const CloseIcon = () => (
  <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z" fill="currentColor"/>
  </svg>
);

const AddIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 13H6q-.425 0-.712-.288T5 12t.288-.712T6 11h5V6q0-.425.288-.712T12 5t.713.288T13 6v5h5q.425 0 .713.288T19 12t-.288.713T18 13h-5v5q0 .425-.288.713T12 19t-.712-.288T11 18z" fill="currentColor"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" fill="currentColor"/>
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6l-6 6z" fill="currentColor"/>
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6l-6-6z" fill="currentColor"/>
  </svg>
);

// Step type icons
const RecordIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" fill="currentColor"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z" fill="currentColor"/>
  </svg>
);

const WorkflowIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z" fill="currentColor"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1M8 13h8v-2H8zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5" fill="currentColor"/>
  </svg>
);

const VariableIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.41 3c1.39 2.71 1.94 5.84 1.59 9c-.2 1.88-.75 3.72-1.59 5.41l-1.6-1.22c.59-1.31.98-2.71 1.15-4.15c.29-2.57-.09-5.13-1.15-7.45zM5.18 6.59L3.59 5.41A17.5 17.5 0 0 0 2 14.41l1.6 1.22c-.59-1.31-.98-2.71-1.15-4.15c-.29-2.57.09-5.13 1.15-7.45zm4.49 5.56L8.38 15H6.5L10 5h2l3.5 10h-1.88l-1.29-2.85zm1.33-3.3l-1.25 2.8h2.5z" fill="currentColor"/>
  </svg>
);

// Step type configuration
const STEP_TYPE_CONFIG = {
  [STEP_TYPES.RECORDING]: {
    name: '录制',
    description: '执行浏览器录制的操作',
    icon: RecordIcon,
    color: 'red',
  },
  [STEP_TYPES.NL]: {
    name: '自然语言',
    description: '使用自然语言描述执行任务',
    icon: ChatIcon,
    color: 'blue',
  },
  [STEP_TYPES.RPA]: {
    name: 'RPA工作流',
    description: '执行RPA自动化工作流',
    icon: WorkflowIcon,
    color: 'purple',
  },
  [STEP_TYPES.SKILL_REF]: {
    name: '引用技能',
    description: '调用已有的技能',
    icon: LinkIcon,
    color: 'green',
  },
};

// Step Type Selector Component
const StepTypeSelector = ({ onAddStep }) => {
  return (
    <div className="space-y-2">
      {Object.entries(STEP_TYPE_CONFIG).map(([type, config]) => {
        const Icon = config.icon;
        return (
          <button
            key={type}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:shadow-md bg-${config.color}-50 hover:bg-${config.color}-100 border border-${config.color}-200`}
            onClick={() => onAddStep(type)}
          >
            <div className={`w-10 h-10 rounded-lg bg-${config.color}-100 text-${config.color}-600 flex items-center justify-center`}>
              <Icon />
            </div>
            <div className="flex-1">
              <div className={`font-medium text-${config.color}-700`}>{config.name}</div>
              <div className="text-xs text-slate-500">{config.description}</div>
            </div>
            <AddIcon />
          </button>
        );
      })}
    </div>
  );
};

// Steps List Component
const StepsList = ({ steps, selectedIndex, onSelect, onMove, onRemove }) => {
  if (steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-2">🔗</div>
          <div className="text-lg font-medium">暂无步骤</div>
          <div className="text-sm">从左侧面板选择步骤类型添加</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const config = STEP_TYPE_CONFIG[step.type] || STEP_TYPE_CONFIG[STEP_TYPES.NL];
        const Icon = config.icon;
        const isSelected = selectedIndex === index;

        return (
          <div
            key={step.id}
            className={`flex items-center gap-2 p-3 rounded-lg bg-white shadow-sm cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'
            }`}
            onClick={() => onSelect(index)}
          >
            <div className={`w-8 h-8 rounded-lg bg-${config.color}-100 text-${config.color}-600 flex items-center justify-center`}>
              <Icon />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-700 truncate">{step.name}</div>
              <div className="text-xs text-slate-400 truncate">
                {config.name} {step.outputVar && `→ ${step.outputVar}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}
                disabled={index === 0}
              >
                <ArrowUpIcon />
              </button>
              <button
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}
                disabled={index === steps.length - 1}
              >
                <ArrowDownIcon />
              </button>
              <button
                className="p-1 text-slate-400 hover:text-red-500"
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Variable Mapping Editor Component
const VariableMappingEditor = ({ mappings, availableVariables, onChange, onAdd, onRemove }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">输入变量映射</label>
        <button
          className="text-xs text-blue-600 hover:text-blue-700"
          onClick={onAdd}
        >
          + 添加映射
        </button>
      </div>
      {mappings.length === 0 ? (
        <div className="text-xs text-slate-400 py-2">暂无变量映射</div>
      ) : (
        mappings.map((mapping, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
              value={mapping.sourceVar || ''}
              onChange={(e) => onChange(index, { ...mapping, sourceVar: e.target.value })}
            >
              <option value="">选择变量</option>
              {availableVariables.map(v => (
                <option key={v.name} value={v.name}>{v.name} ({v.source})</option>
              ))}
            </select>
            <span className="text-slate-400">→</span>
            <input
              type="text"
              className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
              placeholder="参数名"
              value={mapping.targetParam || ''}
              onChange={(e) => onChange(index, { ...mapping, targetParam: e.target.value })}
            />
            <button
              className="p-1 text-slate-400 hover:text-red-500"
              onClick={() => onRemove(index)}
            >
              <DeleteIcon />
            </button>
          </div>
        ))
      )}
    </div>
  );
};

// Step Properties Panel Component
const StepPropertiesPanel = ({ step, stepIndex, availableVariables, availableSkills, onUpdate, onStartRecording, onConfigureRPA }) => {
  if (!step) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        选择一个步骤以配置属性
      </div>
    );
  }

  const config = STEP_TYPE_CONFIG[step.type] || STEP_TYPE_CONFIG[STEP_TYPES.NL];

  const handleDataChange = (key, value) => {
    onUpdate({ data: { ...step.data, [key]: value } });
  };

  const handleMappingChange = (index, mapping) => {
    const newMappings = [...(step.inputMappings || [])];
    newMappings[index] = mapping;
    onUpdate({ inputMappings: newMappings });
  };

  const handleAddMapping = () => {
    onUpdate({ inputMappings: [...(step.inputMappings || []), { sourceVar: '', targetParam: '' }] });
  };

  const handleRemoveMapping = (index) => {
    const newMappings = (step.inputMappings || []).filter((_, i) => i !== index);
    onUpdate({ inputMappings: newMappings });
  };

  return (
    <div className="space-y-4">
      {/* Step Type */}
      <div>
        <div className="text-sm font-medium text-slate-700 mb-1">步骤类型</div>
        <div className={`px-3 py-2 bg-${config.color}-50 rounded-lg text-sm text-${config.color}-700 flex items-center gap-2`}>
          <config.icon />
          {config.name}
        </div>
      </div>

      {/* Step Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">步骤名称 *</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={step.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>

      {/* Step Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={step.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
        />
      </div>

      {/* Type-specific fields */}
      {step.type === STEP_TYPES.NL && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">自然语言指令 *</label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            placeholder="描述你希望执行的任务..."
            value={step.data?.instructions || ''}
            onChange={(e) => handleDataChange('instructions', e.target.value)}
          />
        </div>
      )}

      {step.type === STEP_TYPES.SKILL_REF && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">选择技能 *</label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={step.data?.skillName || ''}
            onChange={(e) => handleDataChange('skillName', e.target.value)}
          >
            <option value="">选择一个技能</option>
            {availableSkills.map(skill => (
              <option key={skill.name} value={skill.name}>{skill.name} - {skill.description || '无描述'}</option>
            ))}
          </select>
        </div>
      )}

      {step.type === STEP_TYPES.RECORDING && (
        <div className="space-y-3">
          {step.data?.sessionId ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" fill="currentColor"/>
                </svg>
                <span className="font-medium">已录制</span>
              </div>
              <div className="text-sm text-green-600 mt-1">
                会话ID: {step.data.sessionId}
              </div>
              <button
                className="mt-2 text-sm text-green-700 hover:text-green-800 underline"
                onClick={() => onStartRecording(stepIndex)}
              >
                重新录制
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                点击下方按钮开始录制浏览器操作
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">起始URL</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                  value={step.data?.startUrl || ''}
                  onChange={(e) => handleDataChange('startUrl', e.target.value)}
                />
              </div>
              <button
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                onClick={() => onStartRecording(stepIndex)}
              >
                <RecordIcon />
                开始录制
              </button>
            </div>
          )}
        </div>
      )}

      {step.type === STEP_TYPES.RPA && (
        <div className="space-y-3">
          {step.data?.workflow && step.data.workflow.actions?.length > 0 ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-700">
                <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" fill="currentColor"/>
                </svg>
                <span className="font-medium">已配置工作流</span>
              </div>
              <div className="text-sm text-purple-600 mt-1">
                包含 {step.data.workflow.actions.length} 个操作
              </div>
              <button
                className="mt-2 text-sm text-purple-700 hover:text-purple-800 underline"
                onClick={() => onConfigureRPA(stepIndex)}
              >
                编辑工作流
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                点击下方按钮配置RPA工作流
              </div>
              <button
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                onClick={() => onConfigureRPA(stepIndex)}
              >
                <WorkflowIcon />
                配置工作流
              </button>
            </div>
          )}
        </div>
      )}

      {/* Variable Mappings */}
      <VariableMappingEditor
        mappings={step.inputMappings || []}
        availableVariables={availableVariables}
        onChange={handleMappingChange}
        onAdd={handleAddMapping}
        onRemove={handleRemoveMapping}
      />

      {/* Output Variable */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">输出变量名</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="存储结果的变量名"
          value={step.outputVar || ''}
          onChange={(e) => onUpdate({ outputVar: e.target.value })}
        />
      </div>

      {/* Execution Options */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-700">执行选项</div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={step.skipOnError || false}
            onChange={(e) => onUpdate({ skipOnError: e.target.checked })}
          />
          <span>失败时跳过</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">重试次数:</label>
          <input
            type="number"
            className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
            min="0"
            max="10"
            value={step.retryCount || 0}
            onChange={(e) => onUpdate({ retryCount: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </div>
    </div>
  );
};

// Inline Recording Panel Component
const InlineRecordingPanel = ({
  isConnected,
  isRecording,
  recordedActions,
  startUrl,
  onStartUrlChange,
  onBeginRecording,
  onStopRecording,
  onCancel,
  onSave
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-w-[90vw] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-500 to-red-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">录制浏览器操作</h3>
              <p className="text-red-100 text-sm">
                {isRecording ? '正在录制中...' : '输入起始URL并开始录制'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isRecording && (
                <span className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-white text-sm">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  录制中
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* URL Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">起始URL *</label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100"
              placeholder="https://example.com"
              value={startUrl}
              onChange={(e) => onStartUrlChange(e.target.value)}
              disabled={isRecording}
            />
          </div>

          {/* Connection Status */}
          <div className="mb-4 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-300'}`}></span>
            <span className="text-sm text-slate-600">
              {isConnected ? '已连接到录制服务' : '正在连接录制服务...'}
            </span>
          </div>

          {/* Recorded Actions */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">已录制的操作</label>
              <span className="text-xs text-slate-500">{recordedActions.length} 个操作</span>
            </div>
            <div className="border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto">
              {recordedActions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="text-3xl mb-2">🎬</div>
                  <div>暂无录制的操作</div>
                  <div className="text-xs mt-1">开始录制后，操作将显示在这里</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recordedActions.map((action, index) => (
                    <div key={index} className="px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-700 text-sm">{action.type}</div>
                          <div className="text-xs text-slate-400 truncate">
                            {action.selector || action.value || action.xpath || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            onClick={onCancel}
          >
            取消
          </button>
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                onClick={onBeginRecording}
                disabled={!isConnected || !startUrl || startUrl === 'https://'}
              >
                <RecordIcon />
                开始录制
              </button>
            ) : (
              <button
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                onClick={onStopRecording}
              >
                <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
                </svg>
                停止录制
              </button>
            )}
            {!isRecording && recordedActions.length > 0 && (
              <button
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                onClick={onSave}
              >
                保存录制
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Action category icons for InlineRPAEditor
const BrowserIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm0-2h16V8H4zm0 0V8z" fill="currentColor"/>
  </svg>
);

const FileIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm7 7V3.5L18.5 9z" fill="currentColor"/>
  </svg>
);

const SystemIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64z" fill="currentColor"/>
  </svg>
);

const KeyboardIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m-9 3h2v2h-2zm0 3h2v2h-2zM8 8h2v2H8zm0 3h2v2H8zm-1 2H5v-2h2zm0-3H5V8h2zm9 7H8v-2h8zm0-4h-2v-2h2zm0-3h-2V8h2zm3 3h-2v-2h2zm0-3h-2V8h2z" fill="currentColor"/>
  </svg>
);

const RPAVariableIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.41 3c1.39 2.71 1.94 5.84 1.59 9c-.2 1.88-.75 3.72-1.59 5.41l-1.6-1.22c.59-1.31.98-2.71 1.15-4.15c.29-2.57-.09-5.13-1.15-7.45zM5.18 6.59L3.59 5.41A17.5 17.5 0 0 0 2 14.41l1.6 1.22c-.59-1.31-.98-2.71-1.15-4.15c-.29-2.57.09-5.13 1.15-7.45zm4.49 5.56L8.38 15H6.5L10 5h2l3.5 10h-1.88l-1.29-2.85zm1.33-3.3l-1.25 2.8h2.5z" fill="currentColor"/>
  </svg>
);

const ControlIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8z" fill="currentColor"/>
  </svg>
);

// Action category mapping for InlineRPAEditor
const RPA_ACTION_CATEGORIES = {
  browser: { name: '浏览器操作', icon: BrowserIcon, color: 'blue' },
  file: { name: '文件操作', icon: FileIcon, color: 'green' },
  system: { name: '系统操作', icon: SystemIcon, color: 'purple' },
  keyboard: { name: '键盘鼠标', icon: KeyboardIcon, color: 'orange' },
  variable: { name: '变量操作', icon: RPAVariableIcon, color: 'cyan' },
  control: { name: '流程控制', icon: ControlIcon, color: 'pink' },
};

// Get category from action type
const getActionCategory = (action) => {
  if (action.category) {
    return action.category;
  }
  const actionType = action.type || action;
  if (actionType.startsWith('browser_') || actionType.startsWith('navigate') || actionType.startsWith('click') || actionType.startsWith('input') || actionType.startsWith('screenshot') || actionType.startsWith('wait') || actionType.startsWith('extract') || actionType.startsWith('scroll')) {
    return 'browser';
  }
  if (actionType.startsWith('file_') || actionType.startsWith('read_') || actionType.startsWith('write_') || actionType.startsWith('copy_') || actionType.startsWith('move_') || actionType.startsWith('delete_') || actionType.startsWith('list_')) {
    return 'file';
  }
  if (actionType.startsWith('system_') || actionType.startsWith('run_') || actionType.startsWith('get_env') || actionType.startsWith('set_env') || actionType.startsWith('shell_')) {
    return 'system';
  }
  if (actionType.startsWith('keyboard_') || actionType.startsWith('mouse_') || actionType.startsWith('key_') || actionType.startsWith('type_') || actionType.startsWith('hotkey')) {
    return 'keyboard';
  }
  if (actionType.startsWith('var_') || actionType.startsWith('set_var') || actionType.startsWith('get_var') || actionType.startsWith('eval_')) {
    return 'variable';
  }
  if (actionType.startsWith('flow_') || actionType.startsWith('if') || actionType.startsWith('loop') || actionType.startsWith('try') || actionType.startsWith('break') || actionType.startsWith('continue')) {
    return 'control';
  }
  return 'browser';
};

// Inline RPA Workflow Editor Component - matches RPAWorkflowBuilder layout
const InlineRPAEditor = ({
  workflow,
  onWorkflowChange,
  onClose,
  onSave
}) => {
  const { availableActions, actionsLoading, fetchActions } = useRPAStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedActionIndex, setSelectedActionIndex] = useState(null);

  // Fetch actions when component mounts
  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Group actions by category
  const groupedActions = React.useMemo(() => {
    const groups = {};
    availableActions.forEach(action => {
      const category = getActionCategory(action);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(action);
    });
    return groups;
  }, [availableActions]);

  // Filter actions by search term
  const filteredGroups = React.useMemo(() => {
    if (!searchTerm) return groupedActions;
    const filtered = {};
    Object.entries(groupedActions).forEach(([category, actions]) => {
      const matchedActions = actions.filter(action =>
        action.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (action.description && action.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (matchedActions.length > 0) {
        filtered[category] = matchedActions;
      }
    });
    return filtered;
  }, [groupedActions, searchTerm]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleAddAction = (actionType) => {
    const actionDef = availableActions.find(a => a.type === actionType);
    if (!actionDef) return;

    const newAction = {
      id: `action_${Date.now()}`,
      type: actionType,
      params: {},
    };

    // Initialize default params from action definition
    if (actionDef.params) {
      actionDef.params.forEach(param => {
        const paramName = param.key || param.name;
        if (param.default !== undefined) {
          newAction.params[paramName] = param.default;
        } else if (param.required) {
          newAction.params[paramName] = '';
        }
      });
    }

    const updatedWorkflow = {
      ...workflow,
      actions: [...(workflow.actions || []), newAction],
    };
    onWorkflowChange(updatedWorkflow);
    setSelectedActionIndex((workflow.actions || []).length);
  };

  const handleRemoveAction = (index) => {
    const updatedWorkflow = {
      ...workflow,
      actions: workflow.actions.filter((_, i) => i !== index),
    };
    onWorkflowChange(updatedWorkflow);
    if (selectedActionIndex === index) {
      setSelectedActionIndex(null);
    } else if (selectedActionIndex > index) {
      setSelectedActionIndex(selectedActionIndex - 1);
    }
  };

  const handleMoveAction = (index, direction) => {
    const actions = [...workflow.actions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;
    [actions[index], actions[newIndex]] = [actions[newIndex], actions[index]];
    onWorkflowChange({ ...workflow, actions });
    if (selectedActionIndex === index) {
      setSelectedActionIndex(newIndex);
    }
  };

  const handleUpdateActionParams = (index, params) => {
    const actions = [...workflow.actions];
    actions[index] = { ...actions[index], params: { ...actions[index].params, ...params } };
    onWorkflowChange({ ...workflow, actions });
  };

  const selectedAction = selectedActionIndex !== null ? workflow.actions?.[selectedActionIndex] : null;
  const selectedActionDef = selectedAction ? availableActions.find(a => a.type === selectedAction.type) : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-[1200px] max-w-[95vw] h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
          <div>
            <h2 className="text-xl font-bold text-white">配置RPA工作流</h2>
            <p className="text-blue-100 text-sm">拖拽操作构建自动化工作流</p>
          </div>
          <button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Action Palette */}
          <div className="w-[280px] border-r border-slate-200 flex flex-col bg-slate-50">
            <div className="p-3 border-b border-slate-200">
              <input
                type="text"
                placeholder="搜索操作..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {actionsLoading ? (
                <div className="text-center text-slate-400 py-4">加载操作中...</div>
              ) : Object.entries(filteredGroups).length === 0 ? (
                <div className="text-center text-slate-400 py-4">无匹配操作</div>
              ) : (
                Object.entries(filteredGroups).map(([category, actions]) => {
                  const categoryInfo = RPA_ACTION_CATEGORIES[category] || { name: category, icon: BrowserIcon, color: 'gray' };
                  const CategoryIcon = categoryInfo.icon;
                  const isExpanded = expandedCategories[category] !== false;

                  return (
                    <div key={category} className="mb-2">
                      <button
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-${categoryInfo.color}-50 text-${categoryInfo.color}-700 hover:bg-${categoryInfo.color}-100`}
                        onClick={() => toggleCategory(category)}
                      >
                        <CategoryIcon />
                        <span className="flex-1 text-left">{categoryInfo.name}</span>
                        <span className="text-xs text-slate-400">({actions.length})</span>
                        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <ArrowDownIcon />
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="mt-1 space-y-1 pl-2">
                          {actions.map(action => (
                            <button
                              key={action.type}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white hover:shadow-sm transition-all text-left"
                              onClick={() => handleAddAction(action.type)}
                              title={action.description}
                            >
                              <AddIcon />
                              <span className="truncate">{action.type}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Center Panel - Workflow Canvas */}
          <div className="flex-1 flex flex-col">
            {/* Workflow Steps */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              {!workflow.actions || workflow.actions.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <div className="text-4xl mb-2">📋</div>
                    <div className="text-lg font-medium">工作流为空</div>
                    <div className="text-sm">从左侧面板选择操作添加到工作流</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflow.actions.map((action, index) => {
                    const actionDef = availableActions.find(a => a.type === action.type);
                    const category = getActionCategory(action.type);
                    const categoryInfo = RPA_ACTION_CATEGORIES[category] || { color: 'gray' };
                    const isSelected = selectedActionIndex === index;

                    return (
                      <div
                        key={action.id}
                        className={`flex items-center gap-2 p-3 rounded-lg bg-white shadow-sm cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedActionIndex(index)}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-${categoryInfo.color}-100 text-${categoryInfo.color}-600 flex items-center justify-center font-bold text-sm`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-700 truncate">{action.type}</div>
                          <div className="text-xs text-slate-400 truncate">
                            {actionDef?.description || '无描述'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            onClick={(e) => { e.stopPropagation(); handleMoveAction(index, 'up'); }}
                            disabled={index === 0}
                          >
                            <ArrowUpIcon />
                          </button>
                          <button
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            onClick={(e) => { e.stopPropagation(); handleMoveAction(index, 'down'); }}
                            disabled={index === workflow.actions.length - 1}
                          >
                            <ArrowDownIcon />
                          </button>
                          <button
                            className="p-1 text-slate-400 hover:text-red-500"
                            onClick={(e) => { e.stopPropagation(); handleRemoveAction(index); }}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Properties */}
          <div className="w-[320px] border-l border-slate-200 flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-700">属性配置</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedAction && selectedActionDef ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-1">操作类型</div>
                    <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
                      {selectedAction.type}
                    </div>
                  </div>
                  {selectedActionDef.description && (
                    <div>
                      <div className="text-sm font-medium text-slate-700 mb-1">描述</div>
                      <div className="text-sm text-slate-500">{selectedActionDef.description}</div>
                    </div>
                  )}
                  {selectedActionDef.params && selectedActionDef.params.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-700">参数</div>
                      {selectedActionDef.params.map(param => {
                        const paramName = param.key || param.name;
                        return (
                          <div key={paramName}>
                            <label className="block text-sm text-slate-600 mb-1">
                              {paramName}
                              {param.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {param.type === 'bool' || param.type === 'boolean' ? (
                              <select
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedAction.params[paramName] === true ? 'true' : 'false'}
                                onChange={(e) => handleUpdateActionParams(selectedActionIndex, { [paramName]: e.target.value === 'true' })}
                              >
                                <option value="true">是</option>
                                <option value="false">否</option>
                              </select>
                            ) : param.type === 'int' || param.type === 'number' ? (
                              <input
                                type="number"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={param.description || paramName}
                                value={selectedAction.params[paramName] ?? ''}
                                onChange={(e) => handleUpdateActionParams(selectedActionIndex, { [paramName]: parseInt(e.target.value, 10) || 0 })}
                              />
                            ) : (
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={param.description || paramName}
                                value={selectedAction.params[paramName] ?? ''}
                                onChange={(e) => handleUpdateActionParams(selectedActionIndex, { [paramName]: e.target.value })}
                              />
                            )}
                            {param.description && (
                              <div className="text-xs text-slate-400 mt-1">{param.description}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  选择一个操作以配置参数
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            共 {workflow.actions?.length || 0} 个操作
          </span>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              onClick={onClose}
            >
              取消
            </button>
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onSave}
              disabled={!workflow.actions || workflow.actions.length === 0}
            >
              保存工作流
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main HybridSkillBuilder Component
const HybridSkillBuilder = () => {
  const { showHybridBuilderModal, hybridBuilderMode, editingHybridSkillName, closeHybridBuilderModal, openCreateSkillModal } = useAppStore();
  const { fetchSkills, skills } = useSkillsStore();
  const {
    isRecording,
    isConnected,
    sessionId,
    actions: recordedActions,
    connect: connectRecording,
    disconnect: disconnectRecording,
    startRecording,
    stopRecording,
    clearActions,
  } = useRecordingStore();
  const {
    currentSkill,
    selectedStepIndex,
    validationErrors,
    availableSkills,
    setSkillName,
    setSkillDescription,
    addStep,
    removeStep,
    updateStep,
    moveStep,
    selectStep,
    resetSkill,
    loadSkill,
    saveSkill,
    fetchAvailableSkills,
    getAvailableVariables,
  } = useHybridStore();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordingStepIndex, setRecordingStepIndex] = useState(null);
  const [rpaStepIndex, setRPAStepIndex] = useState(null);
  const [showInlineRecording, setShowInlineRecording] = useState(false);
  const [showInlineRPA, setShowInlineRPA] = useState(false);
  const [rpaWorkflow, setRpaWorkflow] = useState({ name: '', actions: [] });
  const [recordingStartUrl, setRecordingStartUrl] = useState('https://');

  useEffect(() => {
    if (showHybridBuilderModal) {
      fetchAvailableSkills();
      if (hybridBuilderMode === 'edit' && editingHybridSkillName) {
        setLoading(true);
        loadSkill(editingHybridSkillName)
          .catch(err => setSaveError(err.message))
          .finally(() => setLoading(false));
      } else {
        resetSkill();
      }
    }
  }, [showHybridBuilderModal, hybridBuilderMode, editingHybridSkillName]);

  // Connect to recording service when inline recording is shown
  useEffect(() => {
    if (showInlineRecording) {
      connectRecording();
    }
    return () => {
      if (showInlineRecording) {
        disconnectRecording();
      }
    };
  }, [showInlineRecording]);

  // When recording stops, save the actions to the step
  useEffect(() => {
    if (recordingStepIndex !== null && !isRecording && sessionId && recordedActions.length > 0) {
      const step = currentSkill.steps[recordingStepIndex];
      updateStep(recordingStepIndex, {
        data: {
          ...step.data,
          sessionId,
          actions: recordedActions.map(a => ({
            type: a.type,
            selector: a.selector,
            xpath: a.xpath,
            value: a.value,
            timestamp: a.timestamp,
            robust_selector: a.robust_selector,
            tag_name: a.tag_name,
            text: a.text,
          })),
          startUrl: recordingStartUrl,
        }
      });
      setShowInlineRecording(false);
      setRecordingStepIndex(null);
      clearActions();
    }
  }, [isRecording, sessionId, recordedActions]);

  const handleAddStep = (stepType) => {
    const stepNumber = currentSkill.steps.length + 1;
    addStep(stepType, {
      name: `步骤 ${stepNumber}`,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveSkill();
      await fetchSkills();
      closeHybridBuilderModal();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (showInlineRecording) {
      disconnectRecording();
      setShowInlineRecording(false);
    }
    resetSkill();
    closeHybridBuilderModal();
  };

  // Handle starting recording for a step
  const handleStartRecording = (stepIndex) => {
    const step = currentSkill.steps[stepIndex];
    setRecordingStepIndex(stepIndex);
    setRecordingStartUrl(step.data?.startUrl || 'https://');
    setShowInlineRecording(true);
  };

  // Handle actually starting the recording
  const handleBeginRecording = () => {
    if (!recordingStartUrl || recordingStartUrl === 'https://') {
      alert('请输入起始URL');
      return;
    }
    clearActions();
    startRecording(recordingStartUrl);
  };

  // Handle stopping the recording
  const handleStopRecording = () => {
    stopRecording();
  };

  // Handle canceling the recording
  const handleCancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    disconnectRecording();
    setShowInlineRecording(false);
    setRecordingStepIndex(null);
    clearActions();
  };

  // Handle configuring RPA workflow for a step - use inline editor
  const handleConfigureRPA = (stepIndex) => {
    const step = currentSkill.steps[stepIndex];
    const currentWorkflow = step.data?.workflow || { name: step.name, actions: [] };
    setRPAStepIndex(stepIndex);
    setRpaWorkflow(currentWorkflow);
    setShowInlineRPA(true);
  };

  // Handle saving RPA workflow
  const handleSaveRPAWorkflow = () => {
    if (rpaStepIndex !== null) {
      const step = currentSkill.steps[rpaStepIndex];
      updateStep(rpaStepIndex, {
        data: {
          ...step.data,
          workflow: rpaWorkflow,
        }
      });
    }
    setShowInlineRPA(false);
    setRPAStepIndex(null);
    setRpaWorkflow({ name: '', actions: [] });
  };

  // Handle canceling RPA workflow edit
  const handleCancelRPA = () => {
    setShowInlineRPA(false);
    setRPAStepIndex(null);
    setRpaWorkflow({ name: '', actions: [] });
  };

  // Handle saving recording
  const handleSaveRecording = () => {
    if (recordingStepIndex !== null && recordedActions.length > 0) {
      const step = currentSkill.steps[recordingStepIndex];
      updateStep(recordingStepIndex, {
        data: {
          ...step.data,
          sessionId: sessionId || `manual_${Date.now()}`,
          actions: recordedActions.map(a => ({
            type: a.type,
            selector: a.selector,
            xpath: a.xpath,
            value: a.value,
            timestamp: a.timestamp,
            robust_selector: a.robust_selector,
            tag_name: a.tag_name,
            text: a.text,
          })),
          startUrl: recordingStartUrl,
        }
      });
    }
    disconnectRecording();
    setShowInlineRecording(false);
    setRecordingStepIndex(null);
    clearActions();
  };

  const selectedStep = selectedStepIndex !== null ? currentSkill.steps[selectedStepIndex] : null;
  const availableVars = selectedStepIndex !== null ? getAvailableVariables(selectedStepIndex) : [];

  if (!showHybridBuilderModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[1200px] max-w-[95vw] h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600">
          <div>
            <h2 className="text-xl font-bold text-white">
              {hybridBuilderMode === 'edit' ? '编辑混合技能' : '创建混合技能'}
            </h2>
            <p className="text-indigo-100 text-sm">组合多种自动化方式创建复杂工作流</p>
          </div>
          <button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            onClick={handleClose}
          >
            <CloseIcon />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-400">加载中...</div>
          </div>
        ) : (
          <>
            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Step Type Selector */}
              <div className="w-[280px] border-r border-slate-200 flex flex-col bg-slate-50">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-700">步骤类型</h3>
                  <p className="text-xs text-slate-500">点击添加步骤到工作流</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <StepTypeSelector onAddStep={handleAddStep} />
                </div>
              </div>

              {/* Center Panel - Workflow Canvas */}
              <div className="flex-1 flex flex-col">
                {/* Skill Info */}
                <div className="p-4 border-b border-slate-200 bg-white">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">技能名称 *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="输入技能名称 (小写字母、数字、连字符)"
                        value={currentSkill.name}
                        onChange={(e) => setSkillName(e.target.value)}
                        disabled={hybridBuilderMode === 'edit'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="输入技能描述"
                        value={currentSkill.description}
                        onChange={(e) => setSkillDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Steps List */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
                  <StepsList
                    steps={currentSkill.steps}
                    selectedIndex={selectedStepIndex}
                    onSelect={selectStep}
                    onMove={moveStep}
                    onRemove={removeStep}
                  />
                </div>
              </div>

              {/* Right Panel - Properties */}
              <div className="w-[320px] border-l border-slate-200 flex flex-col bg-white">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-700">步骤属性</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <StepPropertiesPanel
                    step={selectedStep}
                    stepIndex={selectedStepIndex}
                    availableVariables={availableVars}
                    availableSkills={availableSkills}
                    onUpdate={(updates) => updateStep(selectedStepIndex, updates)}
                    onStartRecording={handleStartRecording}
                    onConfigureRPA={handleConfigureRPA}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">
                  共 {currentSkill.steps.length} 个步骤
                </span>
                {validationErrors.length > 0 && (
                  <span className="text-sm text-red-500">
                    {validationErrors[0].message}
                  </span>
                )}
                {saveError && (
                  <span className="text-sm text-red-500">{saveError}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  onClick={handleClose}
                >
                  取消
                </button>
                <button
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={saving || currentSkill.steps.length === 0 || !currentSkill.name.trim()}
                >
                  {saving ? '保存中...' : '保存技能'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Inline Recording Panel */}
      {showInlineRecording && (
        <InlineRecordingPanel
          isConnected={isConnected}
          isRecording={isRecording}
          recordedActions={recordedActions}
          startUrl={recordingStartUrl}
          onStartUrlChange={setRecordingStartUrl}
          onBeginRecording={handleBeginRecording}
          onStopRecording={handleStopRecording}
          onCancel={handleCancelRecording}
          onSave={handleSaveRecording}
        />
      )}

      {/* Inline RPA Editor */}
      {showInlineRPA && (
        <InlineRPAEditor
          workflow={rpaWorkflow}
          onWorkflowChange={setRpaWorkflow}
          onClose={handleCancelRPA}
          onSave={handleSaveRPAWorkflow}
        />
      )}
    </div>
  );
};

export default HybridSkillBuilder;
