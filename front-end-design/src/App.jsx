import { useEffect, useState } from 'react'
import SplashHeader from './components/SplashHeader'
import Onboarding from './components/Onboarding'
import UploadScreen from './components/UploadScreen'
import SelectionScreen from './components/SelectionScreen'

function App() {
  // One state to rule them all: 'loading' | 'onboarding' | 'upload' | 'selection' | 'app'
  const [currentView, setCurrentView] = useState('loading');
  
  // Optional: Store uploaded data here so it doesn't vanish when screens change
  const [appData, setAppData] = useState({ room: null, carpets: [] });

  // 1. Initial Loading Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentView('onboarding');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // 2. Navigation Handlers
  const handleUploadFinish = (room, carpets) => {
    // Save data and move to next screen
    setAppData({ room, carpets });
    setCurrentView('selection');
  };

  // 3. Content Switcher - Keeps the return statement clean
  const renderContent = () => {
    switch (currentView) {
      case 'onboarding':
        return <Onboarding onFinish={() => setCurrentView('upload')} />;
      
      case 'upload':
        return <UploadScreen onStartProcessing={handleUploadFinish} />;
      
      case 'selection':
        return <SelectionScreen onNavigateToApp={() => alert("Go to AR App...")} />;
      
      case 'app':
        return <div>Main App Component Goes Here</div>;
        
      default:
        return null; // Content is hidden during 'loading' anyway
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      
      {/* HEADER: Animated based on loading state */}
      <SplashHeader isLoading={currentView === 'loading'} />

      {/* MAIN CONTENT: Fades in after loading */}
      <div 
        className={`
          flex-1 flex flex-col transition-opacity duration-1000 delay-500
          ${currentView === 'loading' ? 'opacity-0 hidden' : 'opacity-100 block'}
        `}
      >
        {renderContent()}
      </div>

    </div>
  );
}

export default App