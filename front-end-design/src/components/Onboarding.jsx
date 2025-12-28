import { useState } from 'react';
// import your images here or use placeholders
// import step1Image from '../assets/step1.png';
import pic1 from '../assets/onboarding1-copy.png'
import pic2 from '../assets/onboarding2.png'
import pic3 from '../assets/onboarding3.png'

const steps = [
  {
    id: 1,
    image: pic1, // Replace with your image
    title: "صوّر غرفتك بوضوح",
    description: "للحصول على أفضل نتيجة، وجه الكاميرا نحو الأرضية وتأكد من ظهور زوايا الغرفة والحوائط المحيطة بشكل كامل",
  },
  {
    id: 2,
    image: pic2,
    title: "حدد أركان الغرفة",
    description: "بعد رفع الصورة، يمكنك ضبط زوايا السجادة بدقة. فقط قم بسحب النقاط لتناسب أبعاد غرفتك تماماً وتظهر بشكل واقعي",
  },
  {
    id: 3,
    image: pic3,
    title: "حرك ودوّر كما تشاء",
    description: "بلمسات بسيطة، يمكنك سحب السجادة أو تدويرها بإصبعين لتناسب ترتيب أثاثك وتكتمل أناقة منزلك",
  }
];

const Onboarding = ({ onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish(); // End the onboarding
    }
  };

  return (
    // 'dir="rtl"' ensures the text and layout flow correctly for Arabic
    <div className="min-h-screen bg-white flex flex-col p-6" dir="rtl">
      
      {/* --- 1. IMAGE AREA --- */}
      <div className="flex-1 flex items-center justify-center mb-8">
           {/* The Image */}
           <img 
             src={steps[currentIndex].image} 
             alt={steps[currentIndex].title} 
             className="w-full h-full object-cover transition-opacity duration-500"
           />
      </div>

      {/* --- 2. TEXT CONTENT --- */}
      <div className="text-center mb-8 px-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {steps[currentIndex].title}
        </h2>
        <p className="text-gray-500 leading-relaxed text-sm md:text-base">
          {steps[currentIndex].description}
        </p>
      </div>

      {/* --- 3. CONTROLS (Dots & Skip) --- */}
      <div className="flex items-center justify-between mb-6">
        {/* Pagination Dots (Right side in RTL) */}
        <div className="flex gap-2">
          {steps.map((_, index) => (
            <div 
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ease-in-out ${
                index === currentIndex 
                  ? 'w-8 bg-gray-800' // Active: Long Pill
                  : 'w-2 bg-gray-300' // Inactive: Small Dot
              }`}
            />
          ))}
        </div>

        {/* Skip Button (Left side in RTL) */}
        <button 
          onClick={onFinish}
          className="text-gray-900 font-medium underline text-sm decoration-gray-400 underline-offset-4"
        >
          تخطي
        </button>
      </div>

      {/* --- 4. MAIN BUTTON --- */}
      <button 
        onClick={handleNext}
        className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors"
      >
        {currentIndex === steps.length - 1 ? "ابدأ التجربة الآن" : "التالي"}
      </button>

    </div>
  );
};

export default Onboarding;