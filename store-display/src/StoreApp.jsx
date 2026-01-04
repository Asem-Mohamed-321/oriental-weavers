import React, { useState, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber"; 
import { Loader2, RotateCw, Smartphone, Check, Edit3, Lock, ImageIcon, Upload, XCircle, LayoutGrid, Image as ImageIconLucide, Download, PlusSquare } from "lucide-react";
import io from "socket.io-client";
import html2canvas from "html2canvas";

import logo from "./assets/logo-big.png"

import { Geo } from "./components/geoMath";
import { Carpet3D } from "./components/Carpet3D";
import { RoomMask } from "./components/RoomMask";


// Automatically grabs the IP you are currently using
const socket = io(`http://${window.location.hostname}:5000`);

export default function StoreApp() {
  const [step, setStep] = useState("upload"); 
  
  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState("carpets"); 

  // --- DATA ---
  const [roomImgObj, setRoomImgObj] = useState(null);   
  const [maskImgObj, setMaskImgObj] = useState(null);   
  const [carpets, setCarpets] = useState([]); 
  const [activeCarpetIdx, setActiveCarpetIdx] = useState(0); 
  const currentCarpet = carpets[activeCarpetIdx];
  const [prototypes, setPrototypes] = useState([]); 
  const [userRooms, setUserRooms] = useState([]);

  // --- GEOMETRY ---
  const [points, setPoints] = useState([]);             
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 }); 
  const [carpetPos, setCarpetPos] = useState({ u: 0.5, v: 0.5 });   
  const [rotation, setRotation] = useState(0);          
  const [scale, setScale] = useState(0.3);              

  // --- INTERACTION ---
  const [draggingCarpet, setDraggingCarpet] = useState(false);
  const [rotatingCarpet, setRotatingCarpet] = useState(false);
  const [resizingCarpet, setResizingCarpet] = useState(false);
  const [showControls, setShowControls] = useState(false);  

  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null); 
  const [draggingPointIdx, setDraggingPointIdx] = useState(null); 

  // --- SYSTEM ---
  const [qrCodeImage, setQrCodeImage] = useState(null);             
  const [deviceConnected, setDeviceConnected] = useState(false); 
  const [aiPending, setAiPending] = useState(false);
  const [processingCarpet, setProcessingCarpet] = useState(false);

  const pickCanvasRef = useRef();   
  const containerRef = useRef();    
  const carpetImgObjRef = useRef(null); 

  // --- EMAIL STATE ---
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // =========================================================
  // 1. SOCKET & INITIALIZATION
  // =========================================================
  useEffect(() => {
    fetch("http://localhost:5000/api/prototypes")
      .then(res => res.json())
      .then(data => setPrototypes(data))
      .catch(err => console.error("Proto Error:", err));

    socket.emit("screen_register");
    socket.on("screen_registered", (data) => setQrCodeImage(data.qr_data));

    socket.on("screen_status", (data) => {
        if (data.message.includes("Connected")) setDeviceConnected(true);
        if (data.message.includes("Disconnected")) setDeviceConnected(false);
    });

    // 3. Room Uploaded (CORRECTED HISTORY LOGIC)
    socket.on("room_uploaded", (data) => {
        console.log("📱 Room Received", data);
        
        // DISTINGUISH: Prototypes have fixed corners, New User Uploads do not.
        const isPrototype = Array.isArray(data.corners) && data.corners.length === 4;

        // ONLY add to User Rooms if it is a fresh upload (Not a prototype)
        if (!isPrototype) {
            setUserRooms(prev => {
                // Prevent duplicates (optional safety check)
                if (prev.some(r => r.image === data.imageUrl)) return prev;

                const newRoom = {
                    id: `غرفتك رقم ${prev.length + 1}`,
                    image: data.imageUrl,
                    corners: null, // User uploads start with no corners
                    mask: null, 
                    isUser: true 
                };
                return [newRoom, ...prev]; // Add to top of list
            });
        }

        // --- FORCE RESET (Visuals) ---
        setStep("setup"); 
        setAiPending(true);   
        setMaskImgObj(null);  
        setPoints([]); 
        
        const img = new Image();
        img.crossOrigin = "anonymous"; 
        const sep = data.imageUrl.includes('?') ? '&' : '?';
        img.src = `${data.imageUrl}${sep}t=${Date.now()}`;
        
        img.onload = () => {
            const maxW = window.innerWidth * 0.9;
            const ratio = img.height / img.width;
            const w = Math.min(img.width, maxW);
            const h = w * ratio;
            setDimensions({ w, h });
            setRoomImgObj(img);
            
            const topY = h * 0.65;
            const bottomY = h * 0.90; 
            const defaultPoints = [{ x: w * 0.25, y: topY }, { x: w * 0.75, y: topY }, { x: w, y: bottomY }, { x: 0, y: bottomY }];

            if (isPrototype) {
                // It's a prototype: Apply corners & Skip to Placing
                const fixedPoints = data.corners.map(p => ({ x: p[0] * w, y: p[1] * h }));
                setPoints(fixedPoints);
                setStep("placing"); 
            } else {
                // It's a User Upload: Manual Setup
                setPoints(defaultPoints);
            }
        };
    });

    // 4. Update Mask Listener to Save to History
    socket.on("mask_generated", (data) => {
        const mask = new Image();
        mask.crossOrigin = "anonymous";
        mask.src = data.maskUrl;
        
        mask.onload = () => {
            setMaskImgObj(mask);
            setAiPending(false); 
            
            // SAVE MASK TO CURRENT USER ROOM (The first one in the list)
            setUserRooms(prev => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[0] = { ...updated[0], mask: data.maskUrl }; // Attach mask URL
                return updated;
            });
        };
        mask.onerror = () => {
            console.error("Mask failed");
            setAiPending(false);
        };
    });

    socket.on("carpet_uploaded", (data) => {
        setProcessingCarpet(true);
        const sep = data.imageUrl.includes('?') ? '&' : '?';
        const imgUrl = `${data.imageUrl}${sep}t=${Date.now()}`;
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imgUrl;
        
        img.onload = () => {
            carpetImgObjRef.current = img;
            setCarpets(prev => {
                const cleanNew = data.imageUrl.split('?')[0];
                if (prev.some(u => u.includes(cleanNew))) return prev;
                const newGallery = [...prev, imgUrl];
                setActiveCarpetIdx(newGallery.length - 1);
                return newGallery;
            });
            setProcessingCarpet(false);
            setStep(prev => prev !== "setup" && prev !== "placing" ? "placing" : prev);
        };
    });

    socket.on("mask_generated", (data) => {
        const mask = new Image();
        mask.crossOrigin = "anonymous";
        mask.src = data.maskUrl;
        mask.onload = () => {
            setMaskImgObj(mask);
            setAiPending(false); 
        };
        mask.onerror = () => {
            console.error("Mask failed to load");
            setAiPending(false);
        };
    });

    return () => {
        socket.off("screen_registered");
        socket.off("screen_status");
        socket.off("room_uploaded");
        socket.off("carpet_uploaded");
        socket.off("mask_generated");
    };
  }, []); 

  // =========================================================
  // 2. VISUALS: SETUP CANVAS
  // =========================================================
  useEffect(() => {
    if (step !== "setup" || !pickCanvasRef.current || !roomImgObj) return;
    const canvas = pickCanvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = dimensions.w;
    canvas.height = dimensions.h;

    ctx.drawImage(roomImgObj, 0, 0, dimensions.w, dimensions.h);

    if(points && points.length === 4) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        // GOLD FILL
        ctx.fillStyle = "rgba(189, 163, 107, 0.4)"; 
        ctx.fill();
        ctx.lineWidth = 3; 
        ctx.strokeStyle = "rgb(189, 163, 107)"; 
        ctx.stroke();

        points.forEach((p) => {
            ctx.beginPath(); 
            ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = "rgb(189, 163, 107)"; 
            ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "white"; ctx.stroke();
        });
    }
  }, [points, roomImgObj, dimensions, step]);

  // =========================================================
  // 3. INTERACTION & LOGIC
  // =========================================================
  const getCarpetCenterOnScreen = () => {
    if (!points || points.length < 4) return { x: 0, y: 0 };
    return Geo.project(carpetPos.u, carpetPos.v, points);
  };

  const handleGlobalPointerMove = (e) => {
    // SETUP MODE
    if (step === "setup" && draggingPointIdx !== null && pickCanvasRef.current) {
        const r = pickCanvasRef.current.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const x = (e.clientX - r.left) * (dimensions.w / r.width);
        const y = (e.clientY - r.top) * (dimensions.h / r.height);
        setPoints(prev => {
            const next = [...prev];
            next[draggingPointIdx] = { x, y };
            return next;
        });
        return;
    }

    // PLACING MODE
    if (step === "placing" && containerRef.current && points.length === 4) {
        const r = containerRef.current.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const mx = (e.clientX - r.left) * (dimensions.w / r.width);
        const my = (e.clientY - r.top) * (dimensions.h / r.height);

        if (rotatingCarpet) {
            const center = getCarpetCenterOnScreen();
            const angleRad = Math.atan2(my - center.y, mx - center.x);
            setRotation(Math.round((angleRad * (180 / Math.PI)) + 90));
            return;
        }

        if (resizingCarpet && resizeStart) {
            const center = getCarpetCenterOnScreen();
            const currentDist = Math.hypot(mx - center.x, my - center.y);
            if (resizeStart.initialDist > 0) {
                let newScale = resizeStart.initialScale * (currentDist / resizeStart.initialDist);
                setScale(Math.max(0.1, Math.min(1.5, newScale)));
            }
            return;
        }

        if (draggingCarpet && dragStart) {
            const uv = Geo.unproject(mx, my, points);
            let nu = uv.u + dragStart.uOffset;
            let nv = uv.v + dragStart.vOffset;

            if (carpetImgObjRef.current) {
                const [tl, tr, br, bl] = points;
                const floorW = (Math.hypot(tr.x-tl.x, tr.y-tl.y) + Math.hypot(br.x-bl.x, br.y-bl.y))/2;
                const floorH = (Math.hypot(bl.x-tl.x, bl.y-tl.y) + Math.hypot(br.x-tr.x, br.y-tr.y))/2;
                const floorAspect = floorH > 0 ? (floorW / floorH) : 1;
                
                const imgW = carpetImgObjRef.current.width || 100;
                const imgH = carpetImgObjRef.current.height || 100;
                const imgAspect = imgW / imgH;

                const w = scale;
                const h = (scale * floorAspect) / imgAspect;
                const rad = (rotation * Math.PI) / 180;
                const cos = Math.cos(rad); const sin = Math.sin(rad);

                const corners = [{x:-0.5, y:-0.5}, {x:0.5, y:-0.5}, {x:0.5, y:0.5}, {x:-0.5, y:0.5}];
                let minU = 0, maxU = 0, minV = 0; 

                corners.forEach(p => {
                    let sx = p.x * w;
                    let sy = (p.y * h) / floorAspect; 
                    let rx = sx * cos - sy * sin;
                    let ru = rx;
                    let rv = (sx * sin + sy * cos) * floorAspect;
                    if (ru < minU) minU = ru;
                    if (ru > maxU) maxU = ru;
                    if (rv < minV) minV = rv;
                });

                const safeLeft = Math.abs(minU);
                const safeRight = 1.0 - maxU;
                const safeTop = Math.abs(minV);

                if (safeLeft < safeRight) nu = Math.max(safeLeft, Math.min(safeRight, nu));
                else nu = 0.5;

                nv = Math.max(safeTop, nv);
            }
            setCarpetPos({ u: nu, v: nv });
        }
    }
  };

  const handleGlobalPointerUp = () => {
    setDraggingCarpet(false); setRotatingCarpet(false); setResizingCarpet(false); setDraggingPointIdx(null);
  };

  const handleResetRoom = () => {
      setStep("upload");
      setRoomImgObj(null);
      setCarpets([])
      setPoints([]);
      setMaskImgObj(null);
      setDeviceConnected(false); 
      setAiPending(false);
  };

// StoreApp.jsx

  const handlePrototypeSelect = (room) => {
      console.log("👉 CLICKED PROTOTYPE:", room.id);
      
      // 1. Reset State
      setStep("setup");
      setMaskImgObj(null);
      setPoints([]);
      setAiPending(false);

      // 2. Load Image Directly (Instant Switch)
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = room.image; // Use the URL we already have
      
      img.onload = () => {
          const maxW = window.innerWidth * 0.9;
          const ratio = img.height / img.width;
          const w = Math.min(img.width, maxW);
          const h = w * ratio;
          setDimensions({ w, h });
          setRoomImgObj(img);

          // 3. Set Points (Corners)
          if (room.corners && room.corners.length === 4) {
              const fixedPoints = room.corners.map(p => ({ x: p[0] * w, y: p[1] * h }));
              setPoints(fixedPoints);
              setStep("placing"); // Skip setup for prototypes
          } else {
              // Fallback if no corners defined (shouldn't happen for prototypes)
              const topY = h * 0.65;
              const bottomY = h * 0.90; 
              setPoints([{ x: w * 0.25, y: topY }, { x: w * 0.75, y: topY }, { x: w, y: bottomY }, { x: 0, y: bottomY }]);
          }

          // 4. Set Mask Immediately
          if (room.mask) {
              const mask = new Image();
              mask.crossOrigin = "anonymous";
              mask.src = room.mask;
              mask.onload = () => setMaskImgObj(mask);
          }
      };

      // NOTE: We do NOT call fetch('/select-prototype') here anymore.
      // This prevents the network delay and the "wrong mask" race condition.
  };
  const handleUserRoomSelect = (room) => {
      console.log("Restoring User Room:", room.id);
      
      // 1. Reset
      setStep("setup");
      setMaskImgObj(null);
      setPoints([]);
      setAiPending(false); // No need to wait, we (likely) have the mask

      // 2. Load Image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = room.image;
      
      img.onload = () => {
          const maxW = window.innerWidth * 0.9;
          const ratio = img.height / img.width;
          const w = Math.min(img.width, maxW);
          const h = w * ratio;
          setDimensions({ w, h });
          setRoomImgObj(img);

          // 3. Restore Points
          if (room.corners && room.corners.length === 4) {
              const fixedPoints = room.corners.map(p => ({ x: p[0] * w, y: p[1] * h }));
              setPoints(fixedPoints);
              setStep("placing");
          } else {
              // Default points
              const topY = h * 0.65;
              const bottomY = h * 0.90; 
              setPoints([{ x: w * 0.25, y: topY }, { x: w * 0.75, y: topY }, { x: w, y: bottomY }, { x: 0, y: bottomY }]);
          }

          // 4. Restore Mask (If we saved it)
          if (room.mask) {
              const mask = new Image();
              mask.crossOrigin = "anonymous";
              mask.src = room.mask;
              mask.onload = () => setMaskImgObj(mask);
          }
      };
  };

  const hoverTimeoutRef = useRef(null); 
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowControls(true);
  };
  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
        if (!draggingCarpet && !rotatingCarpet && !resizingCarpet) setShowControls(false);
    }, 300);
  };
  
  const handleCaptureAndSend = async () => {
    if (!emailInput) return alert("برجاء إدخال بريدك الإلكتروني ");
    
    setIsSendingEmail(true);

    try {
        // 1. Capture the "containerRef" (The div holding Room + Carpet)
        if (!containerRef.current) return;
        
        const canvas = await html2canvas(containerRef.current, {
            useCORS: true, // Important for loading external images
            scale: 1,
            backgroundColor: null
        });

        // 2. Convert to Base64
        const base64Image = canvas.toDataURL("image/jpeg");

        // 3. Send to Backend
        const response = await fetch("http://localhost:5000/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: emailInput,
                image: base64Image
            })
        });

        if (response.ok) {
            alert("تم إرسال الصورة إلى بريدك الإلكتروني");
            setShowEmailPopup(false);
            setEmailInput("");
        } else {
            alert("تعذر إرسال البريد الإلكتروني");
        }

    } catch (err) {
        console.error("Email Error:", err);
        alert("تعذر إرسال البريد الإلكتروني");
    } finally {
        setIsSendingEmail(false);
    }
  };

  const renderControls = () => {
    if (!currentCarpet || !points || points.length < 4) return null;
    const isVisible = showControls || draggingCarpet || rotatingCarpet || resizingCarpet;
    
    const [tl, tr, br, bl] = points;
    const floorW = (Math.hypot(tr.x-tl.x, tr.y-tl.y) + Math.hypot(br.x-bl.x, br.y-bl.y))/2;
    const floorH = (Math.hypot(bl.x-tl.x, bl.y-tl.y) + Math.hypot(br.x-tr.x, br.y-tr.y))/2;
    const floorAspect = floorH > 0 ? floorW / floorH : 1;
    const w = scale;
    const imgRatio = carpetImgObjRef.current ? (carpetImgObjRef.current.width / carpetImgObjRef.current.height) : 1;
    const h = (scale * floorAspect) / imgRatio;
    
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad); 
    const sin = Math.sin(rad); // Fixed SIN
    const rDist = 60; 
    const rRad = (rotation - 90) * (Math.PI / 180);

    const uvCorners = [{x:-0.5, y:-0.5}, {x:0.5, y:-0.5}, {x:0.5, y:0.5}, {x:-0.5, y:0.5}].map(p => {
        let sx = p.x * w; let sy = (p.y * h) / floorAspect;
        return { u: carpetPos.u + sx * cos - sy * sin, v: carpetPos.v + (sx * sin + sy * cos) * floorAspect };
    });
    const screenCorners = uvCorners.map(uv => Geo.project(uv.u, uv.v, points));
    const center = getCarpetCenterOnScreen();
    const centerX_P = (center.x / dimensions.w) * 100;
    const centerY_P = (center.y / dimensions.h) * 100;
    const rHandleP = { 
        x: ((center.x + Math.cos(rRad) * rDist) / dimensions.w)*100, 
        y: ((center.y + Math.sin(rRad) * rDist) / dimensions.h)*100 
    };

    return (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 40, opacity: isVisible ? 1 : 0, transition: "opacity 0.2s", pointerEvents: "none" }}
             onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            
            <svg style={{width:"100%", height:"100%", overflow:"visible"}}>
                <line x1={`${centerX_P}%`} y1={`${centerY_P}%`} x2={`${rHandleP.x}%`} y2={`${rHandleP.y}%`} stroke="white" strokeWidth="2" strokeDasharray="5,5" className="drop-shadow-md"/>
                <circle cx={`${centerX_P}%`} cy={`${centerY_P}%`} r="4" fill="white" />
            </svg>

            {screenCorners.map((p, i) => (
                <div key={i} style={{ position: "absolute", left: `${(p.x / dimensions.w)*100}%`, top: `${(p.y / dimensions.h)*100}%`, transform: "translate(-50%, -50%)", pointerEvents: isVisible ? "auto" : "none", cursor: "nwse-resize" }}
                    onPointerDown={(e) => {
                        e.stopPropagation(); e.preventDefault(); if (!containerRef.current) return;
                        const r = containerRef.current.getBoundingClientRect();
                        const mx = (e.clientX-r.left)*(dimensions.w/r.width);
                        const my = (e.clientY-r.top)*(dimensions.h/r.height);
                        const c = getCarpetCenterOnScreen();
                        setResizeStart({ initialDist: Math.hypot(mx-c.x, my-c.y), initialScale: scale });
                        setResizingCarpet(true);
                    }}>
                    <div className="w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm hover:scale-125 transition-transform" />
                </div>
            ))}

            <div style={{ position: "absolute", left: `${rHandleP.x}%`, top: `${rHandleP.y}%`, transform: "translate(-50%, -50%)", pointerEvents: isVisible ? "auto" : "none", cursor: "grab" }}
                 onPointerDown={(e) => { e.stopPropagation(); setRotatingCarpet(true); }}>
                <div className="p-2 bg-blue-500 rounded-full shadow-lg hover:bg-blue-400 transition-colors">
                    <RotateCw className="w-4 h-4 text-white" />
                </div>
            </div>
        </div>
    );
  };

  // =========================================================
  // 4. UI RENDER (NEW DESIGN)
  // =========================================================
  return (
    <div className="h-screen w-full bg-white text-slate-800 font-sans flex flex-col overflow-hidden"
         onPointerMove={handleGlobalPointerMove} onPointerUp={handleGlobalPointerUp}>
      
      {/* === VIEW 1: STANDBY SCREEN (QR Only) === */}
      {step === "upload" ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="bg-white p-16 rounded-[2.5rem] shadow-xl border border-gray-100 text-center max-w-xl w-full mx-4">
                  {deviceConnected ? (
                      <div className="py-8">
                          <Smartphone className="w-24 h-24 text-green-500 mx-auto mb-6 drop-shadow-md" />
                          <h2 className="text-3xl font-bold text-slate-800">Device Connected</h2>
                          <p className="text-slate-500 mt-4 text-lg">Please select a room or carpet on your phone to begin.</p>
                          <div className="mt-8 flex justify-center">
                              <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 animate-[loading_1s_infinite_ease-in-out]"></div>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="py-4">
                          <div className="bg-gray-50 p-8 rounded-3xl mb-8 inline-block shadow-inner border border-gray-100">
                              {qrCodeImage ? (
                                  <img src={qrCodeImage} className="w-64 h-64 object-contain mix-blend-multiply opacity-90" alt="QR Code" />
                              ) : (
                                  <div className="w-64 h-64 flex items-center justify-center">
                                      <Loader2 className="w-12 h-12 animate-spin text-slate-300" />
                                  </div>
                              )}
                          </div>
                          <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">جرّب الآن</h2>
                          {/* <p className="text-slate-500 text-lg">Scan this QR code with your mobile camera to control the screen.</p> */}
                      </div>
                  )}
              </div>
              <p className="absolute bottom-24 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  حقوق الطبع والنشر © 2026 النساجون الشرقيون.
              </p>
          </div>

      ) : (

          // === VIEW 2: DASHBOARD (Split Layout) ===
          <div className="flex-1 flex overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 gap-6">
              
              {/* --- LEFT SIDEBAR (Rounded & Floating) --- */}
              <div className="w-72 bg-[#f5f5f5] rounded-3xl border border-gray-100 flex flex-col z-20 overflow-hidden">
                  
                  {/* Tabs */}
                  <div className="flex p-1.5 m-4 ">
                    <button onClick={() => setActiveTab("rooms")}
                              className={`flex-1 py-3 text-sm font-bold transition-all border-b-4 ${activeTab==="rooms" ? "text-slate-900  border-black" : "text-[#a5a6ae] hover:text-slate-700 border-[#a5a6ae]"}`}>
                          صور الغرف
                      </button>
                      <button onClick={() => setActiveTab("carpets")}
                              className={`flex-1 py-3 text-sm font-bold  transition-all border-b-4  ${activeTab==="carpets" ? "text-slate-900 border-black" : "text-[#a5a6ae] hover:text-slate-700 border-[#a5a6ae]"}`}>
                          صور السجاد
                      </button>
                      
                  </div>

                  {/* List Content */}
                  <div className="flex-1 overflow-y-auto pt-2 px-4 pb-4 space-y-4 custom-scrollbar">
                      {activeTab === "carpets" && (
                          <div className="grid grid-cols-1 gap-4">
                              {carpets.length === 0 && (
                                  <div className="text-center py-10 text-slate-400">
                                      <ImageIconLucide className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">Scan QR to upload carpets</p>
                                  </div>
                              )}
                              {carpets.map((url, idx) => (
                                <div 
        key={idx} 
        onClick={() => { 
            setActiveCarpetIdx(idx); 
            const i = new Image(); 
            i.src = url; 
            i.onload = () => { carpetImgObjRef.current = i } 
        }}
        // Apply the Orange Border & Ring logic to this OUTER container
        className={`bg-white p-2 w-1/2 m-auto  border-2 transition-all cursor-pointer duration-300 ${
            activeCarpetIdx === idx 
            ? 'border-[#bda36b]  scale-105' 
            : 'border-gray-100 hover:border-gray-300 hover:shadow-md'
        }`}
    >
        {/* Inner div now just handles image rounding/aspect ratio */}
        <div className="relative aspect-[3/4]  overflow-hidden">
            <img src={url} className="w-full h-full object-cover" alt="carpet" />
        </div>
    </div>
                                  
                              ))}
                          </div>
                      )}

                      {activeTab === "rooms" && (
                          <div className="grid grid-cols-1 gap-4">

                            {/* A. USER UPLOADED ROOMS */}
        {userRooms.map((room, idx) => (
            <div key={`user-${idx}`} onClick={() => handleUserRoomSelect(room)}
                 className="group relative aspect-video rounded-2xl overflow-hidden border-2 border-amber-500 cursor-pointer shadow-md hover:shadow-xl transition-all">
                <img src={room.image} className="w-full h-full object-cover" alt={room.id} />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all"></div>
                <div className="absolute top-3 left-3 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                    {room.id}
                </div>
            </div>
        ))}

        {/* Separator if both exist */}
        {userRooms.length > 0 && prototypes.length > 0 && (
            <div className="h-px bg-gray-200 my-2"></div>
        )}

        {/* B. PROTOTYPE ROOMS */}

                              {prototypes.map((room) => (
                                  <div key={room.id} onClick={() => handlePrototypeSelect(room)}
                                       className="group relative aspect-video rounded-2xl overflow-hidden border-2 border-gray-100 cursor-pointer hover:border-amber-500 transition-all shadow-sm hover:shadow-lg">
                                      <img src={room.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 shadow-sm">
                                          {room.id}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              {/* --- RIGHT AREA (Top Bar + Preview) --- */}
              <div className="flex-1 flex flex-col   overflow-hidden relative gap-3">
                  
                  {/* TOP HEADER BAR (Inside Right Panel) */}
                  <header className="h-fill flex items-center rounded-3xl justify-between px-8  bg-[#f5f5f5] z-30">
                      <div className="flex items-center gap-4">
                          {/* <img src="/logo.png" className="h-10 w-auto object-contain" alt="Logo" onError={(e) => {e.target.style.display='none'}} />  */}
                          
                          <img src={logo} className="h-24 w-auto object-contain" alt="Oriental Weavers Logo" />
                      </div>
                      
                      <div className="flex items-center gap-4">
                          <button onClick={handleResetRoom} className="px-10 py-2.5 bg-slate-900 text-white border-2 border-gray-200 rounded-md text-sm font-bold hover:border-amber-500 hover:text-amber-600 transition-all flex items-center gap-2">
                            جديد
                          </button>
                          <button onClick={() => setShowEmailPopup(true)} className="px-10 py-2.5 bg-slate-900 text-white rounded-md text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
                            استخراج
                          </button>
                      </div>
                  </header>

                  {/* PREVIEW CANVAS AREA */}
                  <div className="flex-1 relative bg-gray-50 flex items-center justify-center p-8 overflow-hidden">
                      
                      {step === "setup" && (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
        
        {/* 1. CONTAINER: Applied aspect-ratio logic matching Placing Mode */}
        <div className="relative shadow-2xl rounded-2xl overflow-hidden border-[6px] border-white bg-white ring-1 ring-black/5"
             style={{
                 width: "auto", 
                 height: "auto", 
                 maxWidth: "100%", 
                 maxHeight: "75vh", // Limits height so it fits in the view
                 aspectRatio: `${dimensions.w} / ${dimensions.h}` // Forces the box to match image shape
             }}
        >
            {/* 2. CANVAS: Now takes full width/height of the constrained parent */}
            <canvas 
                ref={pickCanvasRef} 
                className="cursor-crosshair touch-none block w-full h-full"
                onPointerDown={(e) => {
                    const r = pickCanvasRef.current.getBoundingClientRect();
                    const x = (e.clientX - r.left) * (dimensions.w / r.width);
                    const y = (e.clientY - r.top) * (dimensions.h / r.height);
                    const hitIdx = points.findIndex(p => Math.hypot(p.x - x, p.y - y) < 150);
                    if (hitIdx !== -1) setDraggingPointIdx(hitIdx);
                }} 
            />
            
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full text-white text-sm font-bold flex gap-3 shadow-lg items-center whitespace-nowrap pointer-events-none">
                <Edit3 className="w-4 h-4 text-amber-400" /> Drag the blue corners to match the floor
            </div>
        </div>

        <button onClick={() => setStep("placing")} className="mt-8 bg-amber-500 hover:bg-amber-400 text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-amber-500/20 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95">
            Confirm Area <Check className="w-6 h-6"/>
        </button>
    </div>
)}

                      {step === "placing" && (
                          <div className="relative w-full h-full flex items-center justify-center">
                              <div ref={containerRef} className="relative shadow-2xl rounded-xl overflow-hidden bg-white "
                                   style={{width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%", aspectRatio: `${dimensions.w}/${dimensions.h}`, touchAction: 'none'}}
                                   onPointerDown={(e) => {
                                       e.preventDefault(); if (!points || points.length < 4) return;
                                       setDraggingCarpet(true);
                                       const r = containerRef.current.getBoundingClientRect();
                                       const mx = (e.clientX - r.left) * (dimensions.w / r.width);
                                       const my = (e.clientY - r.top) * (dimensions.h / r.height);
                                       const uv = Geo.unproject(mx, my, points);
                                       setDragStart({ uOffset: carpetPos.u - uv.u, vOffset: carpetPos.v - uv.v });
                                   }}>
                                  
                                  {roomImgObj && <img src={roomImgObj.src} className="w-full h-full object-contain pointer-events-none" style={{maxHeight:'100%', maxWidth:'100%'}} />}
                                  
                                  {currentCarpet && !aiPending && points.length === 4 && (
                                      <div className="absolute inset-0 z-10">
                                          <Canvas orthographic camera={{zoom:1, position:[0,0,100], left:-dimensions.w/2, right:dimensions.w/2, top:dimensions.h/2, bottom:-dimensions.h/2}} gl={{preserveDrawingBuffer:true, alpha: true}}>
                                              <Carpet3D imgUrl={currentCarpet} points={points} pos={carpetPos} rotation={rotation} scale={scale} canvasSize={{ width: dimensions.w, height: dimensions.h }} 
                                              onHover={(hovering) => { if (hovering) handleMouseEnter(); else handleMouseLeave(); }} />
                                          </Canvas>
                                      </div>
                                  )}
                                  
                                  {roomImgObj && maskImgObj && (<div className="absolute inset-0 z-20 pointer-events-none"><RoomMask roomImgObj={roomImgObj} maskImgObj={maskImgObj} width={dimensions.w} height={dimensions.h} /></div>)}
                                  
                                  {aiPending && (
                                      <div className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                          <Loader2 className="w-16 h-16 text-amber-400 animate-spin mb-6" />
                                          <span className="font-bold text-2xl tracking-tight">..جاري تهيئة الصورة</span>
                                      </div>
                                  )}

                                  {!aiPending && renderControls()}
                                  
                                  {!currentCarpet && !aiPending && (
                                      <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                                          <div className="bg-slate-900/90 backdrop-blur-md px-8 py-4 rounded-full flex items-center gap-4 animate-pulse shadow-2xl border border-white/10">
                                              <ImageIcon className="w-6 h-6 text-amber-400" />
                                              <span className="text-white font-bold text-lg">Select a carpet from sidebar</span>
                                          </div>
                                      </div>
                                  )}
                              </div>
                              
                              <button onClick={() => setStep("setup")} className="absolute top-6 right-6 p-4 bg-white text-slate-700 rounded-full shadow-xl hover:bg-gray-50 hover:text-amber-600 transition-all z-50 border border-gray-100">
                                  <Edit3 className="w-6 h-6" />
                              </button>
                          </div>
                      )}
                  </div>

                  {/* BOTTOM CREDITS (Inside Right Panel) */}
                  <div className="py-3 text-center">
                      <p className="text-xs font-bold text-slate-400 tracking-wider">حقوق الطبع والنشر © 2026 النساجون الشرقيون.</p>
                  </div>
              </div>
          </div>
      )}

      {/* === EMAIL POPUP MODAL === */}
      {showEmailPopup && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-300 text-center relative">
                
                <h3 className="text-2xl font-bold text-slate-900 mb-2">شارك تصميمك</h3>
                <p className="text-slate-500 mb-6">أدخل بريدك الإلكتروني لاستلام الصورة</p>

                <input 
                    type="email" 
                    placeholder="example@mail.com" 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all mb-6 text-right"
                    dir="ltr"
                />

                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowEmailPopup(false)}
                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        disabled={isSendingEmail}
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={handleCaptureAndSend}
                        disabled={isSendingEmail}
                        className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                        {isSendingEmail ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...
                            </>
                        ) : (
                            "إرسال"
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}