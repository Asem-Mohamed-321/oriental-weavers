import React, { useState, useEffect, useRef } from 'react';

const SelectionScreen = ({ onNavigateToApp }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);

  // --- HANDLERS ---

  // 1. User clicks "Store Screen"
  const handleStoreClick = () => {
    setShowPopup(true);
  };

  // 2. User clicks "Okay" in Popup
  const handlePopupConfirm = () => {
    setShowPopup(false);
    setIsScanning(true); // This switches the UI to the camera
  };

  // 3. User clicks "App Screen" (Placeholder for your other logic)
  const handleAppClick = () => {
    if (onNavigateToApp) onNavigateToApp();
  };

  // --- CAMERA LOGIC (Runs when isScanning becomes true) ---
  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      if (isScanning && videoRef.current) {
        try {
          // Request camera access
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } // Prefer back camera
          });
          videoRef.current.srcObject = stream;
        } catch (err) {
          console.error("Error accessing camera:", err);
          alert("Could not access camera. Ensure you are on HTTPS or localhost.");
        }
      }
    };

    startCamera();

    // Cleanup: Turn off camera when component unmounts or scanning stops
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);


  // --- VIEW 1: THE SCANNER (Camera) ---
  if (isScanning) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Camera View */}
        <div className="flex-1 relative overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          
          {/* Overlay: Scanning Box */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
               
               {/* Scanning Line Animation */}
               <div className="absolute left-0 right-0 h-0.5 bg-green-500 animate-[scan_2s_infinite]"></div>
            </div>
          </div>
        </div>

        {/* Footer: Cancel Button */}
        <div className="bg-black p-6 text-center">
            <p className="text-white mb-4 text-sm">جاري البحث عن رمز QR...</p>
            <button 
              onClick={() => setIsScanning(false)}
              className="text-gray-400 text-sm underline"
            >
              إلغاء والعودة
            </button>
        </div>
        
        {/* Add custom CSS for scan animation inline for simplicity */}
        <style>{`
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // --- VIEW 2: SELECTION BUTTONS (Default) ---
  return (
    <div className="min-h-screen bg-white p-6 flex flex-col justify-center items-center" dir="rtl">
      
      {/* 1. BUTTONS */}
      <div className="w-full max-w-md space-y-4">
        
        {/* Button 1: Store Screen (Triggers Popup) */}
        <button 
          onClick={handleStoreClick}
          className="w-full bg-[#2A2A2A] text-white py-5 rounded-xl font-bold text-lg shadow-lg hover:bg-black transition-transform transform active:scale-95"
        >
          المتابعة إلى شاشة المتجر
        </button>

        {/* Button 2: App Screen */}
        <button 
          onClick={handleAppClick}
          className="w-full bg-gray-100 text-gray-800 py-5 rounded-xl font-bold text-lg border border-gray-200 hover:bg-gray-200 transition-transform transform active:scale-95"
        >
          المتابعة إلى التطبيق
        </button>
      </div>

      {/* 2. THE POPUP MODAL */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          {/* Modal Content */}
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            
            {/* Icon */}
            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 17h.01M8 11h.01M12 17v-4m-6 0h-4m4 6h.01M12 17H6" />
               </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              تعليمات المسح
            </h3>
            
            <p className="text-gray-500 mb-8 leading-relaxed">
              افحص الـ QR Code الموجود في أقرب شاشة لك لربط هاتفك بالمتجر
            </p>

            <button 
              onClick={handlePopupConfirm}
              className="w-full bg-black text-white py-3 rounded-lg font-bold text-lg"
            >
              حسنًا
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SelectionScreen;