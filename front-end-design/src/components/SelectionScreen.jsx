import React, { useState, useEffect, useRef } from 'react';
import jsQR from "jsqr"; // <--- Import the library

const SelectionScreen = ({ onNavigateToApp, onScanSuccess }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // Hidden canvas to process images
  const requestRef = useRef(null); // To store the animation loop ID

  // --- HANDLERS ---
  const handleStoreClick = () => setShowPopup(true);
  
  const handlePopupConfirm = () => {
    setShowPopup(false);
    setIsScanning(true);
  };

  // --- THE REAL SCANNING LOGIC ---
  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      // 1. Set canvas size to match video
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;

      // 2. Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 3. Get pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 4. Scan for QR Code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        console.log("🔥 QR Found:", code.data);
        
        // STOP SCANNING
        setIsScanning(false);
        
        // TRIGGER SUCCESS (Send the QR data back to App.js)
        if (onScanSuccess) onScanSuccess(code.data);
        return; // Exit loop
      }
    }
    
    // Loop again (keep scanning)
    requestRef.current = requestAnimationFrame(tick);
  };

  // --- CAMERA SETUP ---
  useEffect(() => {
    let stream = null;

    if (isScanning) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Provide a hint that video handles audio/video separately
            videoRef.current.setAttribute("playsinline", true); 
            videoRef.current.play();
            // Start the scanning loop
            requestRef.current = requestAnimationFrame(tick);
          }
        })
        .catch(err => {
            console.error("Camera Error:", err);
            alert("Camera failed. Make sure you are on HTTPS.");
        });
    }

    // CLEANUP
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isScanning]);

  // --- VIEW: SCANNER ---
  if (isScanning) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 relative overflow-hidden bg-black">
          
          {/* 1. The Real Video Feed */}
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover opacity-80" 
            muted // Muted needed for autoplay on some mobiles
          />

          {/* 2. Hidden Canvas (The "Brain" that reads the pixels) */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* 3. The Visual Overlay (Green Box) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
               {/* Corners */}
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
               
               {/* Scan Line Animation */}
               <div className="absolute left-0 right-0 h-0.5 bg-green-500 animate-[scan_2s_infinite]"></div>
            </div>
          </div>
          
          <div className="absolute bottom-20 w-full text-center">
            <p className="text-white/80 text-sm bg-black/50 inline-block px-4 py-1 rounded-full">
              Looking for QR Code...
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black p-6 text-center z-50">
            <button 
              onClick={() => setIsScanning(false)} 
              className="text-gray-400 text-sm underline"
            >
              إلغاء والعودة
            </button>
        </div>
        
        {/* CSS for Scan Animation */}
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

  // --- VIEW: DEFAULT BUTTONS ---
  return (
    <div className="h-[80dvh] max-h-screen bg-white p-6 flex flex-col justify-center items-center" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        <button onClick={handleStoreClick} className="w-full bg-[#2A2A2A] text-white py-5 rounded-xl font-bold text-lg shadow-lg hover:bg-black">
          المتابعة إلى شاشة المتجر
        </button>
        <button onClick={onNavigateToApp} className="w-full bg-gray-100 text-gray-800 py-5 rounded-xl font-bold text-lg border border-gray-200">
          المتابعة إلى التطبيق
        </button>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">تعليمات المسح</h3>
            <p className="text-gray-500 mb-8">افحص الـ QR Code الموجود في الشاشة</p>
            <button onClick={handlePopupConfirm} className="w-full bg-black text-white py-3 rounded-lg font-bold text-lg">حسنًا</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectionScreen;