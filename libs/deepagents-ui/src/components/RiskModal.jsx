import React from 'react';

const RiskModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl w-[400px] shadow-2xl overflow-hidden transform transition-transform duration-300 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-amber-50 p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4 animate-bounce">
            <svg className="text-3xl" width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.725 21q-.275 0-.5-.137t-.35-.363t-.137-.488t.137-.512l9.25-16q.15-.25.388-.375T12 3t.488.125t.387.375l9.25 16q.15.25.138.513t-.138.487t-.35.363t-.5.137zM12 18q.425 0 .713-.288T13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18m0-3q.425 0 .713-.288T13 14v-3q0-.425-.288-.712T12 10t-.712.288T11 11v3q0 .425.288.713T12 15" fill="currentColor"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-amber-900 mb-1">风险操作二次确认</h3>
          <p className="text-sm text-amber-700/80">
            检测到该操作涉及大规模跨系统写入权限，是否继续执行？
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed italic">
            "该操作将修改财务系统的 API 调用频次限制，如非必要，建议由人工审核后再继续。"
          </div>
          <div className="flex gap-3">
            <button
              className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={onClose}
            >
              暂不执行
            </button>
            <button
              className="flex-1 py-3 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-200"
              onClick={onConfirm}
            >
              授权并继续
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskModal;
