import React from 'react';

const ConnectedScreen = ({ onBack }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center animate-in fade-in zoom-in duration-500">
      
      {/* 1. Animated Success Icon */}
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <svg 
          className="w-12 h-12 text-green-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* 2. Success Text */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        تم توصيلك بالشاشة
      </h2>
      
      <p className="text-gray-500 mb-10 max-w-xs mx-auto leading-relaxed">
        يتم الآن عرض غرفتك والسجاد المختار على الشاشة الكبيرة أمامك.
      </p>

      {/* 3. Action Button */}
      <div className="w-full space-y-3">
        <button 
          onClick={onBack}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors shadow-lg"
        >
          اختيار صور أخرى
        </button>
      </div>

    </div>
  );
};

export default ConnectedScreen;