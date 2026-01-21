import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useSkillsStore } from '../store/skillsStore';

// Icons
const CloseIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z" fill="currentColor"/>
  </svg>
);

const EditIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM19 6.4L17.6 5zm-3.525 2.125l-.7-.725L16.2 9.225z" fill="currentColor"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 7v12q0 .825-.587 1.413T19 21H5q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h12zm-9 11q1.25 0 2.125-.875T15 15t-.875-2.125T12 12t-2.125.875T9 15t.875 2.125T12 18m-6-8h9V6H6z" fill="currentColor"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 19V5l11 7z" fill="currentColor"/>
  </svg>
);

const BrowserIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm0-2h16V8H4zm0 0V8z" fill="currentColor"/>
  </svg>
);

const CodeIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="m8 18l-6-6l6-6l1.425 1.425l-4.6 4.6L9.4 16.6zm8 0l-1.425-1.425l4.6-4.6L14.6 7.4L16 6l6 6z" fill="currentColor"/>
  </svg>
);

const DescriptionIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 18h8v-2H8zm0-4h8v-2H8zm-2 8q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v12q0 .825-.587 1.413T18 22zm7-13V4H6v16h12V9zM6 4v5zv16z" fill="currentColor"/>
  </svg>
);

const SkillDetailModal = () => {
  const { showSkillDetailModal, skillDetailMode, closeSkillDetailModal, openSkillDetailModal } = useAppStore();
  const { selectedSkill, updateSkill, testSkill, loading } = useSkillsStore();

  const [editedSkill, setEditedSkill] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (selectedSkill) {
      setEditedSkill({ ...selectedSkill });
      setTestResult(null);
    }
  }, [selectedSkill]);

  if (!showSkillDetailModal || !selectedSkill) return null;

  const isEditing = skillDetailMode === 'edit';

  const getSkillIcon = () => {
    if (selectedSkill.type === 'browser') return <BrowserIcon className="text-2xl" />;
    if (selectedSkill.type === 'code') return <CodeIcon className="text-2xl" />;
    return <DescriptionIcon className="text-2xl" />;
  };

  const getSkillTypeName = () => {
    if (selectedSkill.type === 'browser') return '浏览器技能';
    if (selectedSkill.type === 'code') return '代码技能';
    if (selectedSkill.type === 'manual') return '手动技能';
    return '技能';
  };

  const handleSave = async () => {
    if (!editedSkill) return;
    setSaving(true);
    try {
      await updateSkill(selectedSkill.name, editedSkill);
      openSkillDetailModal('view');
    } catch (error) {
      console.error('Failed to save skill:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedSkill((prev) => ({ ...prev, [field]: value }));
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testSkill(selectedSkill.name);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              {getSkillIcon()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isEditing ? '编辑技能' : '技能详情'}
              </h2>
              <p className="text-xs text-slate-500">{getSkillTypeName()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                    testing
                      ? 'bg-green-100 text-green-600'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                  onClick={handleTest}
                  disabled={testing}
                >
                  <PlayIcon />
                  {testing ? '测试中...' : '测试'}
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  onClick={() => openSkillDetailModal('edit')}
                >
                  <EditIcon />
                  编辑
                </button>
              </>
            )}
            <button
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={closeSkillDetailModal}
            >
              <CloseIcon className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">技能名称</label>
            {isEditing ? (
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={editedSkill?.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled
              />
            ) : (
              <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-800">{selectedSkill.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
            {isEditing ? (
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                value={editedSkill?.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="输入技能描述..."
              />
            ) : (
              <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-800 min-h-[60px]">
                {selectedSkill.description || '暂无描述'}
              </p>
            )}
          </div>

          {/* Parameters */}
          {selectedSkill.parameters && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">参数</label>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                {Object.entries(selectedSkill.parameters).map(([key, param]) => (
                  <div key={key} className="flex items-start gap-3 text-sm">
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{key}</span>
                    <span className="text-slate-500">{param.type || 'string'}</span>
                    {param.description && (
                      <span className="text-slate-600 flex-1">{param.description}</span>
                    )}
                  </div>
                ))}
                {Object.keys(selectedSkill.parameters).length === 0 && (
                  <p className="text-slate-400 text-sm">无参数</p>
                )}
              </div>
            </div>
          )}

          {/* Actions (for browser skills) */}
          {selectedSkill.type === 'browser' && selectedSkill.actions && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                操作步骤 ({selectedSkill.actions.length})
              </label>
              <div className="bg-slate-50 rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                {selectedSkill.actions.map((action, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <span className="font-medium text-slate-700">{action.type}</span>
                      {action.selector && (
                        <span className="ml-2 text-slate-500 font-mono text-xs">{action.selector}</span>
                      )}
                      {action.value && (
                        <span className="ml-2 text-emerald-600">"{action.value}"</span>
                      )}
                      {action.url && (
                        <span className="ml-2 text-blue-500 text-xs truncate block">{action.url}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code (for code skills) */}
          {selectedSkill.code && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">代码</label>
              {isEditing ? (
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                  rows={10}
                  value={editedSkill?.code || ''}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                />
              ) : (
                <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm">
                  <code>{selectedSkill.code}</code>
                </pre>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {selectedSkill.created_at && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">创建时间</label>
                <p className="text-sm text-slate-700">
                  {new Date(selectedSkill.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            )}
            {selectedSkill.updated_at && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">更新时间</label>
                <p className="text-sm text-slate-700">
                  {new Date(selectedSkill.updated_at).toLocaleString('zh-CN')}
                </p>
              </div>
            )}
          </div>

          {/* Full Content (SKILL.md) */}
          {selectedSkill.content && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">技能内容 (SKILL.md)</label>
              {isEditing ? (
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                  rows={15}
                  value={editedSkill?.content || ''}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                />
              ) : (
                <pre className="bg-slate-50 rounded-lg p-4 overflow-x-auto text-sm text-slate-700 whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-slate-200">
                  {selectedSkill.content}
                </pre>
              )}
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-lg p-4 ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${testResult.success ? 'bg-green-500' : 'bg-red-500'}`}>
                  {testResult.success ? '✓' : '✕'}
                </div>
                <span className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  测试{testResult.success ? '成功' : '失败'}
                </span>
                {testResult.duration_ms !== undefined && (
                  <span className="text-sm text-slate-500 ml-2">
                    耗时: {testResult.duration_ms.toFixed(2)} ms
                  </span>
                )}
              </div>
              {testResult.output && (
                <div className="mb-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">输出</label>
                  <pre className="bg-white rounded p-2 text-sm text-slate-700 overflow-x-auto whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                    {typeof testResult.output === 'string' ? testResult.output : JSON.stringify(testResult.output, null, 2)}
                  </pre>
                </div>
              )}
              {testResult.error && (
                <div>
                  <label className="block text-xs font-medium text-red-600 mb-1">错误</label>
                  <pre className="bg-white rounded p-2 text-sm text-red-700 overflow-x-auto whitespace-pre-wrap">
                    {testResult.error}
                  </pre>
                </div>
              )}
              {testResult.screenshots && testResult.screenshots.length > 0 && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">截图</label>
                  <div className="space-y-2">
                    {testResult.screenshots.map((screenshot, index) => (
                      <img
                        key={index}
                        src={`data:image/png;base64,${screenshot}`}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full rounded border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200">
            <button
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => {
                setEditedSkill({ ...selectedSkill });
                openSkillDetailModal('view');
              }}
            >
              取消
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              onClick={handleSave}
              disabled={saving || loading}
            >
              <SaveIcon />
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillDetailModal;
