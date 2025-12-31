import React from 'react';
import { Scan, Smartphone } from 'lucide-react';

const StandbyScreen = ({ qrCode }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-black text-white relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      <div className="z-10 flex gap-20 items-center animate-in zoom-in duration-700">
        
        {/* Left: Text Call to Action */}
        <div className="space-y-6 max-w-lg">
          <h1 className="text-6xl font-bold leading-tight">
            See it inside <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Your Room.
            </span>
          </h1>
          <p className="text-2xl text-slate-300 font-light leading-relaxed">
            Scan the code to connect your phone, upload your room photo, and visualize our carpets instantly.
          </p>
          
          <div className="flex items-center gap-4 text-emerald-400 mt-4">
            <Smartphone className="w-8 h-8" />
            <span className="text-lg font-semibold tracking-wide">No App Download Required</span>
          </div>
        </div>

        {/* Right: The QR Code Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
          <div className="relative bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            {qrCode ? (
               <img src={qrCode} alt="Scan to Connect" className="w-64 h-64 object-contain" />
            ) : (
               <div className="w-64 h-64 bg-gray-200 flex items-center justify-center animate-pulse text-gray-400">Loading QR...</div>
            )}
            
            <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-widest text-sm">
              <Scan className="w-5 h-5" /> Scan to Start
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StandbyScreen;