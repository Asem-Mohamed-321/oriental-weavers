import React, { useRef } from 'react';

const FileUploadCard = ({ 
  icon, 
  title, 
  buttonText, 
  onFileSelect, 
  isMultiple = false,
  selectedFiles
}) => {
  const fileInputRef = useRef(null);

  // Trigger the hidden file input when the button is clicked
  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // Pass the files back to the parent
      onFileSelect(e.target.files);
    }
  };

  // --- Helper: Truncate Function ---
  const formatFileName = (name) => {
    if (name.length > 20) {
      return name.substring(0, 20) + '...';
    }
    return name;
  };

  // --- Helper: Convert prop to array for easy mapping ---
  // This handles both single file (Room) and arrays (Carpets)
  const filesArray = selectedFiles 
    ? (selectedFiles instanceof FileList || Array.isArray(selectedFiles) ? Array.from(selectedFiles) : [selectedFiles])
    : [];

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl py-8 px-2 flex flex-col items-center justify-center bg-[#FDFBF7] mb-4">
      
      {/* Import image */}
      <img src={icon} className="w-10 h-10 object-contain mb-4"></img>
      

      {/* Title */}
      <h3 className="text-md font-medium text-gray-800 mb-6 text-center">
        {title}
      </h3>

      {/* Button */}
      <button 
        onClick={handleButtonClick}
        className="bg-[#2A2A2A] text-white text-sm px-8 py-3 rounded-lg font-medium hover:bg-black transition-colors"
      >
        {buttonText}
      </button>

      {/* Hidden Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple={isMultiple}
        accept="image/*" // Only accept images
      />

      {/* --- NEW: Display File Names Inside the Card --- */}
      {filesArray.length > 0 && (
        <div className="mt-2 text-center w-full">
          {filesArray.map((file, index) => (
            <p key={index} className="text-green-600 text-sm font-medium dir-ltr">
              {/* Checkmark Icon + Truncated Name */}
              ✓ {formatFileName(file.name)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadCard;