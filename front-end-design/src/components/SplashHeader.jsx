// SplashHeader.jsx
import logo from '../assets/logo-big.png' // Import logo here or pass as prop

const SplashHeader = ({ isLoading }) => {
  return (
    // 1. OUTER HEADER: Handles positioning on the page (Fixed vs Sticky)
    // We do NOT set the logo size here.
    <div 
      className={`
        flex items-center justify-center transition-all duration-1000 ease-in-out z-50 bg-white
        ${isLoading ? 'fixed inset-0 h-screen' : 'h-16 sticky top-0 shadow-sm'}
      `}
    >
      
      {/* 2. INNER WRAPPER: This controls the SIZE. 
             We animate this box. The image inside will obey this box. */}
      <div 
        className={`
          transition-all duration-1000 ease-in-out
          
          /* LOADING STATE: Big Box */
          ${isLoading 
            ? 'w-64 h-64 md:w-96 md:h-96'  /* Mobile: 64x64, Tablet/Desktop: 96x96 */
            : 'w-32 h-14 md:w-40 md:h-14'  /* Header State: Specific small size */
          }
        `}
      >
        {/* 3. IMAGE: Just fills the wrapper */}
        <img 
          src={logo} 
          alt="Logo"
          className={`w-full h-full object-contain ${isLoading ? 'animate-float' : ''}`} 
        />
      </div>

    </div>
  );
};

export default SplashHeader;