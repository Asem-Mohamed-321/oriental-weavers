import React from 'react'

export const logoLoader = ({ size = 'large', isFullScreen = true }) => {
    // Toggle classes based on where you use it
    const wrapperClass = isFullScreen ? 'logo-loader-overlay' : 'logo-loader-inline';


    return (
    <div className={wrapperClass}>
      <div className={`logo-container ${size}`}>
        
      </div>
      
      {/* Optional: Loading text underneath */}
      {isFullScreen && <p className="fade-in-text">Initializing...</p>}
    </div>
  )
}
