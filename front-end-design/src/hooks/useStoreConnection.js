import { useEffect, useRef } from 'react';
import io from "socket.io-client";

// Automatically grabs the IP you are currently using
const SERVER_URL = `http://${window.location.hostname}:5000`;

export const useStoreConnection = () => {
  const socketRef = useRef(null);

  // Initialize socket connection once
  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    return () => socketRef.current.disconnect();
  }, []);

  // THE MAIN FUNCTION: Connects to screen & uploads files

  const connectAndSendFiles = async (screenId, roomFile, carpetFiles) => {
    const socket = socketRef.current;
    console.log("📡 Connecting to Screen:", screenId);
    socket.emit("mobile_join_room", { roomId: screenId });

    // HELPER: Upload a single file
    // Added 'isCarpet' parameter
    const uploadSingle = async (file, isRoom = false, isCarpet = false) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // --- IMPORTANT FLAGS ---
      if (isRoom) {
        formData.append('isRoom', 'true');
        formData.append('screenId', screenId);
      }
      if (isCarpet) {
        formData.append('isCarpet', 'true'); // <--- ADD THIS
      }
      // -----------------------

      try {
        const res = await fetch(`${SERVER_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.url;
      } catch (err) {
        console.error("Upload failed:", err);
        return null;
      }
    };

    // 1. Upload Room
    if (roomFile) {
      const roomUrl = await uploadSingle(roomFile, true, false); // isRoom=true
      if (roomUrl) {
        socket.emit("notify_screen", { screenId, type: 'room', url: roomUrl });
      }
    }

    // 2. Upload Carpets
    if (carpetFiles && carpetFiles.length > 0) {
      const carpetsArray = Array.from(carpetFiles);
      for (const carpet of carpetsArray) {
        // Pass isCarpet=true here
        const carpetUrl = await uploadSingle(carpet, false, true); 
        if (carpetUrl) {
          socket.emit("notify_screen", { screenId, type: 'carpet', url: carpetUrl });
        }
      }
    }
  };

  return { connectAndSendFiles };
};