import React, { useEffect } from 'react';
import Header from './components/Header';
import SkillsSidebar from './components/SkillsSidebar';
import ChatArea from './components/ChatArea';
import ExecutionPanel from './components/ExecutionPanel';
import RiskModal from './components/RiskModal';
import RecordingModal from './components/RecordingModal';
import SkillDetailModal from './components/SkillDetailModal';
import { useAppStore } from './store/appStore';
import { useSkillsStore } from './store/skillsStore';

const DeepAgentsApp = ({ apiService, title = 'DeepAgents', version = 'v1.0.0' }) => {
  const { showRiskModal, riskModalData, hideRiskConfirmation, setApiConnected } = useAppStore();
  const { fetchSkills } = useSkillsStore();

  // Check API connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (apiService) {
          await apiService.getSkills();
          setApiConnected(true);
        }
      } catch (error) {
        console.error('API connection failed:', error);
        setApiConnected(false);
      }
    };

    checkConnection();
    fetchSkills();
  }, [apiService]);

  const handleRiskConfirm = () => {
    if (riskModalData?.onConfirm) {
      riskModalData.onConfirm();
    }
    hideRiskConfirmation();
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden h-screen flex flex-col">
      <Header title={title} version={version} />
      <main className="flex-1 flex overflow-hidden">
        <SkillsSidebar />
        <ChatArea />
        <ExecutionPanel />
      </main>
      <RiskModal
        isOpen={showRiskModal}
        onClose={hideRiskConfirmation}
        onConfirm={handleRiskConfirm}
      />
      <RecordingModal />
      <SkillDetailModal />
    </div>
  );
};

export default DeepAgentsApp;
