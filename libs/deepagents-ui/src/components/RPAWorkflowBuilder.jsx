import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useRPAStore } from '../store/rpaStore';
import { useSkillsStore } from '../store/skillsStore';

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

// Action category icons
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

const VariableIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.41 3c1.39 2.71 1.94 5.84 1.59 9c-.2 1.88-.75 3.72-1.59 5.41l-1.6-1.22c.59-1.31.98-2.71 1.15-4.15c.29-2.57-.09-5.13-1.15-7.45zM5.18 6.59L3.59 5.41A17.5 17.5 0 0 0 2 14.41l1.6 1.22c-.59-1.31-.98-2.71-1.15-4.15c-.29-2.57.09-5.13 1.15-7.45zm4.49 5.56L8.38 15H6.5L10 5h2l3.5 10h-1.88l-1.29-2.85zm1.33-3.3l-1.25 2.8h2.5z" fill="currentColor"/>
  </svg>
);

const ControlIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8z" fill="currentColor"/>
  </svg>
);

// Action category mapping
const ACTION_CATEGORIES = {
  browser: { name: '浏览器操作', icon: BrowserIcon, color: 'blue' },
  file: { name: '文件操作', icon: FileIcon, color: 'green' },
  system: { name: '系统操作', icon: SystemIcon, color: 'purple' },
  keyboard: { name: '键盘鼠标', icon: KeyboardIcon, color: 'orange' },
  variable: { name: '变量操作', icon: VariableIcon, color: 'cyan' },
  control: { name: '流程控制', icon: ControlIcon, color: 'pink' },
};

// Get category from action (use backend category or infer from type)
const getActionCategory = (action) => {
  // If action has category from backend, use it
  if (action.category) {
    return action.category;
  }
  // Fallback: infer from action type
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
  return 'browser'; // default
};

const RPAWorkflowBuilder = () => {
  const { showRPABuilderModal, closeRPABuilderModal } = useAppStore();
  const { fetchSkills } = useSkillsStore();
  const {
    availableActions,
    actionsLoading,
    workflow,
    selectedActionIndex,
    validationErrors,
    fetchActions,
    setWorkflowName,
    setWorkflowDescription,
    addAction,
    removeAction,
    moveAction,
    updateActionParams,
    selectAction,
    resetWorkflow,
    saveWorkflow,
  } = useRPAStore();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    if (showRPABuilderModal) {
      fetchActions();
      resetWorkflow();
    }
  }, [showRPABuilderModal, fetchActions, resetWorkflow]);

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

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveWorkflow();
      await fetchSkills();
      closeRPABuilderModal();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetWorkflow();
    closeRPABuilderModal();
  };

  const selectedAction = selectedActionIndex !== null ? workflow.actions[selectedActionIndex] : null;
  const selectedActionDef = selectedAction ? availableActions.find(a => a.type === selectedAction.type) : null;

  if (!showRPABuilderModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[1200px] max-w-[95vw] h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
          <div>
            <h2 className="text-xl font-bold text-white">RPA工作流构建器</h2>
            <p className="text-blue-100 text-sm">拖拽操作构建自动化工作流</p>
          </div>
          <button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            onClick={handleClose}
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
                  const categoryInfo = ACTION_CATEGORIES[category] || { name: category, icon: BrowserIcon, color: 'gray' };
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
                              onClick={() => addAction(action.type)}
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
            {/* Workflow Info */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">技能名称 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入技能名称"
                    value={workflow.name}
                    onChange={(e) => setWorkflowName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入技能描述"
                    value={workflow.description}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Workflow Steps */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              {workflow.actions.length === 0 ? (
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
                    const categoryInfo = ACTION_CATEGORIES[category] || { color: 'gray' };
                    const isSelected = selectedActionIndex === index;

                    return (
                      <div
                        key={action.id}
                        className={`flex items-center gap-2 p-3 rounded-lg bg-white shadow-sm cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'
                        }`}
                        onClick={() => selectAction(index)}
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
                            onClick={(e) => { e.stopPropagation(); moveAction(index, 'up'); }}
                            disabled={index === 0}
                          >
                            <ArrowUpIcon />
                          </button>
                          <button
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            onClick={(e) => { e.stopPropagation(); moveAction(index, 'down'); }}
                            disabled={index === workflow.actions.length - 1}
                          >
                            <ArrowDownIcon />
                          </button>
                          <button
                            className="p-1 text-slate-400 hover:text-red-500"
                            onClick={(e) => { e.stopPropagation(); removeAction(index); }}
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
                              onChange={(e) => updateActionParams(selectedActionIndex, { [paramName]: e.target.value === 'true' })}
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
                              onChange={(e) => updateActionParams(selectedActionIndex, { [paramName]: parseInt(e.target.value, 10) || 0 })}
                            />
                          ) : (
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={param.description || paramName}
                              value={selectedAction.params[paramName] ?? ''}
                              onChange={(e) => updateActionParams(selectedActionIndex, { [paramName]: e.target.value })}
                            />
                          )}
                          {param.description && (
                            <div className="text-xs text-slate-400 mt-1">{param.description}</div>
                          )}
                        </div>
                      )})}
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              共 {workflow.actions.length} 个操作
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={saving || workflow.actions.length === 0 || !workflow.name.trim()}
            >
              {saving ? '保存中...' : '保存技能'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RPAWorkflowBuilder;
