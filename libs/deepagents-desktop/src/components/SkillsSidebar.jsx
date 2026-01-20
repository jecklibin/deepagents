import React, { useEffect } from 'react';
import useSkillsStore from '../store/skillsStore';
import useAppStore from '../store/appStore';

// Icons
const AddIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 13H6q-.425 0-.712-.288T5 12t.288-.712T6 11h5V6q0-.425.288-.712T12 5t.713.288T13 6v5h5q.425 0 .713.288T19 12t-.288.713T18 13h-5v5q0 .425-.288.713T12 19t-.712-.288T11 18z" fill="currentColor"/>
  </svg>
);

const DescriptionIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 18h8v-2H8zm0-4h8v-2H8zm-2 8q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v12q0 .825-.587 1.413T18 22zm7-13V4H6v16h12V9zM6 4v5zv16z" fill="currentColor"/>
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

const DeleteIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" fill="currentColor"/>
  </svg>
);

const SkillsSidebar = () => {
  const { activeTab, setActiveTab, openCreateSkillModal } = useAppStore();
  const { skills, selectedSkill, loading, fetchSkills, selectSkill, deleteSkill } = useSkillsStore();

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const getSkillIcon = (skill) => {
    if (skill.type === 'browser') return <BrowserIcon />;
    if (skill.type === 'code') return <CodeIcon />;
    return <DescriptionIcon />;
  };

  const handleDeleteSkill = async (e, skillName) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除技能 "${skillName}" 吗？`)) {
      try {
        await deleteSkill(skillName);
      } catch (error) {
        console.error('Failed to delete skill:', error);
      }
    }
  };

  return (
    <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-100">
        <button
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'my-skills'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('my-skills')}
        >
          我的技能
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'market'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('market')}
        >
          技能市场
        </button>
      </div>

      {/* My Skills View */}
      {activeTab === 'my-skills' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-3">
            {/* Create Skill Dropdown */}
            <div className="relative group">
              <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition-colors font-medium shadow-md">
                <AddIcon />
                新建技能
              </button>
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => openCreateSkillModal('recording')}
                >
                  <BrowserIcon />
                  录制浏览器操作
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => openCreateSkillModal('nl')}
                >
                  <DescriptionIcon />
                  自然语言描述
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => openCreateSkillModal('manual')}
                >
                  <CodeIcon />
                  手动创建
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            我的技能库 ({skills.length})
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-1 hide-scrollbar">
            {loading && skills.length === 0 ? (
              <div className="text-center text-slate-400 py-4">加载中...</div>
            ) : skills.length === 0 ? (
              <div className="text-center text-slate-400 py-4">暂无技能</div>
            ) : (
              skills.map((skill) => (
                <div
                  key={skill.name}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer group ${
                    selectedSkill?.name === skill.name
                      ? 'bg-blue-50 border border-blue-100'
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => selectSkill(skill.name)}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      selectedSkill?.name === skill.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 group-hover:bg-white text-slate-600'
                    }`}
                  >
                    {getSkillIcon(skill)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-semibold truncate ${
                        selectedSkill?.name === skill.name ? 'text-blue-900' : 'text-slate-700'
                      }`}
                    >
                      {skill.name}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        selectedSkill?.name === skill.name ? 'text-blue-600 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {skill.type === 'browser' ? '浏览器技能' : skill.type === 'manual' ? '手动技能' : '技能'}
                    </div>
                  </div>
                  <button
                    className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => handleDeleteSkill(e, skill.name)}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Market View */}
      {activeTab === 'market' && (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          技能市场即将上线...
        </div>
      )}
    </aside>
  );
};

export default SkillsSidebar;
