import React, { useState, useEffect } from 'react';
import useRecordingStore from '../store/recordingStore';
import useSkillsStore from '../store/skillsStore';
import useAppStore from '../store/appStore';

// Icons
const CloseIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z" fill="currentColor"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 19V5l11 7z" fill="currentColor"/>
  </svg>
);

const StopIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18V6h12v12z" fill="currentColor"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" fill="currentColor"/>
  </svg>
);

const RecordingModal = () => {
  const { showCreateSkillModal, createSkillMode, closeCreateSkillModal } = useAppStore();
  const {
    isRecording,
    isConnected,
    actions,
    browserProfiles,
    selectedProfileId,
    fetchBrowserProfiles,
    selectProfile,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    removeAction,
    clearActions,
  } = useRecordingStore();
  const { createSkillFromRecording, createSkillFromNL, createSkill } = useSkillsStore();

  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [startUrl, setStartUrl] = useState('https://');
  const [nlDescription, setNlDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (showCreateSkillModal && createSkillMode === 'recording') {
      fetchBrowserProfiles();
      connect();
    }
    return () => {
      if (createSkillMode === 'recording') {
        disconnect();
      }
    };
  }, [showCreateSkillModal, createSkillMode]);

  if (!showCreateSkillModal) return null;

  const handleStartRecording = () => {
    if (!startUrl || startUrl === 'https://') {
      alert('请输入起始URL');
      return;
    }
    startRecording(startUrl);
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleSaveRecording = async () => {
    if (!skillName.trim()) {
      alert('请输入技能名称');
      return;
    }
    if (actions.length === 0) {
      alert('请先录制一些操作');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSkillFromRecording({
        name: skillName.trim(),
        description: skillDescription.trim(),
        actions: actions,
        profile_id: selectedProfileId,
      });
      closeCreateSkillModal();
      clearActions();
      setSkillName('');
      setSkillDescription('');
    } catch (error) {
      alert(`创建技能失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNL = async () => {
    if (!skillName.trim()) {
      alert('请输入技能名称');
      return;
    }
    if (!nlDescription.trim()) {
      alert('请输入技能描述');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSkillFromNL({
        name: skillName.trim(),
        description: nlDescription.trim(),
      });
      closeCreateSkillModal();
      setSkillName('');
      setNlDescription('');
    } catch (error) {
      alert(`创建技能失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveManual = async () => {
    if (!skillName.trim()) {
      alert('请输入技能名称');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSkill({
        name: skillName.trim(),
        description: skillDescription.trim(),
        type: 'manual',
      });
      closeCreateSkillModal();
      setSkillName('');
      setSkillDescription('');
    } catch (error) {
      alert(`创建技能失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionLabel = (action) => {
    switch (action.action_type) {
      case 'navigate': return `导航到 ${action.url}`;
      case 'click': return `点击 ${action.selector || action.text || '元素'}`;
      case 'fill': return `填写 "${action.value}" 到 ${action.selector || '输入框'}`;
      case 'select': return `选择 "${action.value}"`;
      case 'extract': return `提取数据`;
      case 'scroll': return `滚动页面`;
      default: return action.action_type;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[600px] max-h-[80vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-lg">
            {createSkillMode === 'recording' && '录制浏览器操作'}
            {createSkillMode === 'nl' && '自然语言创建技能'}
            {createSkillMode === 'manual' && '手动创建技能'}
          </h2>
          <button
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={closeCreateSkillModal}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Common fields */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">技能名称</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入技能名称"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
            />
          </div>

          {/* Recording mode */}
          {createSkillMode === 'recording' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">技能描述</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="描述这个技能的功能"
                  rows={2}
                  value={skillDescription}
                  onChange={(e) => setSkillDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">起始URL</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                  value={startUrl}
                  onChange={(e) => setStartUrl(e.target.value)}
                  disabled={isRecording}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">浏览器配置</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedProfileId || ''}
                  onChange={(e) => selectProfile(e.target.value || null)}
                  disabled={isRecording}
                >
                  <option value="">默认配置</option>
                  {browserProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recording controls */}
              <div className="flex gap-2">
                {!isRecording ? (
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
                    onClick={handleStartRecording}
                    disabled={!isConnected}
                  >
                    <PlayIcon />
                    开始录制
                  </button>
                ) : (
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
                    onClick={handleStopRecording}
                  >
                    <StopIcon />
                    停止录制
                  </button>
                )}
              </div>

              {/* Recorded actions */}
              {actions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">
                      已录制操作 ({actions.length})
                    </label>
                    <button
                      className="text-xs text-red-500 hover:text-red-600"
                      onClick={clearActions}
                    >
                      清空
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                    {actions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <span className="text-sm text-slate-600 truncate flex-1">
                          {index + 1}. {getActionLabel(action)}
                        </span>
                        <button
                          className="p-1 text-slate-400 hover:text-red-500"
                          onClick={() => removeAction(index)}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* NL mode */}
          {createSkillMode === 'nl' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                用自然语言描述技能功能
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：打开百度搜索，输入关键词，获取前10条搜索结果的标题和链接"
                rows={6}
                value={nlDescription}
                onChange={(e) => setNlDescription(e.target.value)}
              />
            </div>
          )}

          {/* Manual mode */}
          {createSkillMode === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">技能描述</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="描述这个技能的功能和使用方法"
                rows={4}
                value={skillDescription}
                onChange={(e) => setSkillDescription(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2">
                手动技能创建后，您可以在技能目录中编辑 SKILL.md 文件来定义技能内容
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={closeCreateSkillModal}
          >
            取消
          </button>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            onClick={
              createSkillMode === 'recording' ? handleSaveRecording :
              createSkillMode === 'nl' ? handleSaveNL :
              handleSaveManual
            }
            disabled={isSubmitting || (createSkillMode === 'recording' && isRecording)}
          >
            {isSubmitting ? '保存中...' : '保存技能'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingModal;
