import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Loader2 } from "lucide-react";
// Import your existing components
import { Carpet3D } from "./Carpet3D";
import { RoomMask } from "./RoomMask";

const Visualizer3D = ({ roomUrl, maskUrl, carpets }) => {
  const [dimensions, setDimensions] = useState({ w: 1920, h: 1080 });
  const [activeCarpet, setActiveCarpet] = useState(null);
  
  // Default points (Trapazoid) if AI hasn't sent corners yet
  const [points, setPoints] = useState([
     { x: 400, y: 600 }, { x: 1400, y: 600 },
     { x: 1800, y: 1000 }, { x: 100, y: 1000 }
  ]);

  // Set the latest carpet as active whenever the array changes
  useEffect(() => {
    if (carpets.length > 0) {
      setActiveCarpet(carpets[carpets.length - 1]);
    }
  }, [carpets]);

  return (
    <div className="w-full h-full bg-black relative">
      
      {/* 1. Background Room Image */}
      <img 
        src={roomUrl} 
        alt="Room" 
        className="absolute inset-0 w-full h-full object-contain z-0" 
      />

      {/* 2. 3D Layer */}
      {activeCarpet && (
        <div className="absolute inset-0 z-10">
          <Canvas orthographic camera={{ zoom: 1, position: [0, 0, 100] }}>
             <Carpet3D 
               imgUrl={activeCarpet} 
               points={points} 
               // Default values for display
               pos={{ u: 0.5, v: 0.5 }} 
               rotation={0} 
               scale={0.5} 
               canvasSize={dimensions} 
             />
          </Canvas>
        </div>
      )}

      {/* 3. Mask Layer (Hides carpet behind furniture) */}
      {maskUrl && (
         <div className="absolute inset-0 z-20 pointer-events-none mix-blend-multiply opacity-90">
             <img src={maskUrl} className="w-full h-full object-contain" />
         </div>
      )}

      {/* 4. Loading State (If mask isn't ready) */}
      {!maskUrl && (
         <div className="absolute bottom-10 right-10 bg-slate-900/80 backdrop-blur px-6 py-3 rounded-full flex items-center gap-3 border border-blue-500/50 z-50">
             <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
             <span className="text-white text-sm font-medium">Processing Room Depth...</span>
         </div>
      )}
    </div>
  );
};

export default Visualizer3D;