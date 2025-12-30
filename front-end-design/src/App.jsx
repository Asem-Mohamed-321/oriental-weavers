import { useEffect, useState } from 'react'
import { useStoreConnection } from './hooks/useStoreConnection'

import SplashHeader from './components/SplashHeader'
import Onboarding from './components/Onboarding'
import UploadScreen from './components/UploadScreen'
import SelectionScreen from './components/SelectionScreen'
import ConnectedScreen from './components/ConnectedScreen'

function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [appData, setAppData] = useState({ room: null, carpets: [] });
  
  // Use our custom hook (Logic is hidden inside here)
  const { connectAndSendFiles } = useStoreConnection();

  useEffect(() => {
    const timer = setTimeout(() => setCurrentView('onboarding'), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleUploadFinish = (room, carpets) => {
    setAppData({ room, carpets });
    setCurrentView('selection');
  };

  // --- CLEAN HANDLER ---
  const handleScanSuccess = (screenId) => {
    // 1. Update UI immediately
    setCurrentView('connected');
    
    // 2. Let the hook handle the hard work
    connectAndSendFiles(screenId, appData.room, appData.carpets);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'onboarding': return <Onboarding onFinish={() => setCurrentView('upload')} />;
      case 'upload':     return <UploadScreen onStartProcessing={handleUploadFinish} />;
      case 'selection':  return <SelectionScreen onNavigateToApp={() => alert("Local Mode")} onScanSuccess={handleScanSuccess} />;
      case 'connected':  return <ConnectedScreen onBack={() => setCurrentView('selection')} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative ">
      <SplashHeader isLoading={currentView === 'loading'} />
      <div className={`flex-1 flex flex-col transition-opacity duration-1000 delay-500 ${currentView === 'loading' ? 'opacity-0' : 'opacity-100'}`}>
        {renderContent()}
      </div>
    </div>
  );
}

export default App;