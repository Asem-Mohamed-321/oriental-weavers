import React, { useState } from 'react';
import FileUploadCard from './FileUploadCard';
import step1Icon from "../assets/step1-cp.png"
import step2Icon from "../assets/step2-cp.png"

const UploadScreen = ({ onStartProcessing }) => {
  const [roomImage, setRoomImage] = useState(null);
  const [carpetImages, setCarpetImages] = useState([]);

  // Handler for Room (Single File)
  const handleRoomSelect = (files) => {
    setRoomImage(files[0]); // We only need the first file
    console.log("Room Selected:", files[0].name);
  };

  // Handler for Carpets (Multiple Files)
  const handleCarpetSelect = (files) => {
    setCarpetImages([...files]); // Convert FileList to Array
    console.log("Carpets Selected:", files.length);
  };

  const canProceed = roomImage && carpetImages.length > 0;

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col" dir="rtl">
      
      {/* Header (Optional) */}
      {/* <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">جهز غرفتك</h1>
        <p className="text-gray-500">ارفع الصور لنبدأ المعاينة</p>
      </div> */}

      <div className="flex-1 overflow-y-auto">
        {/* CARD 1: Room Upload */}
        <FileUploadCard 
          icon = {step1Icon}
          title="أرفع صورة غرفتك"
          buttonText="اختار الملف"
          onFileSelect={handleRoomSelect}
          isMultiple={false}
          selectedFiles={roomImage}
        />

        {/* Feedback: Show selected room name if any */}
        {/* {roomImage && (
          <p className="text-green-600 text-sm text-center mb-6 -mt-2">
            تم اختيار: {roomImage.name}
          </p>
        )} */}

        {/* CARD 2: Carpet Upload */}
        <FileUploadCard 
          icon={step2Icon}
          title="قم بتصوير سجادة أو اختاره من جهازك"
          buttonText="اختار الملف"
          onFileSelect={handleCarpetSelect}
          isMultiple={true} 
          selectedFiles={carpetImages}
        />

        {/* Feedback: Show count of carpets */}
        {carpetImages.length > 0 && (
          <p className="text-green-600 text-sm text-center mb-6 -mt-2">
            تم اختيار {carpetImages.length} سجاد
          </p>
        )}
      </div>

      {/* Footer Action Button */}
      <div className="pt-4 mt-auto">
        <button 
          onClick={() => onStartProcessing(roomImage, carpetImages)}
          disabled={!canProceed}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-colors
            ${canProceed 
              ? 'bg-[#2A2A2A] text-white hover:bg-black' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
          `}
        >
          جربها الآن
        </button>
      </div>

    </div>
  );
};

export default UploadScreen;