import React from 'react';

const AmenitiesCard = ({ amenity, onBook }) => {
  const hasStocks = amenity.slots_left !== undefined ? amenity.slots_left > 0 : true;
  
  const isAvailable = 
    (amenity.available === 'Yes' || 
    amenity.available === 'yes' || 
    amenity.available === true) && hasStocks;

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/400x600?text=No+Image'; 
  };

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden shadow-xl group border border-gray-200">
    
      <img
        src={amenity.image}
        alt={amenity.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={handleImageError}
      />

      {/* GRADIENT OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-90" />

      {/* TOP BADGES */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/20">
          {amenity.type}
        </span>
        
        <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${
          isAvailable 
            ? 'bg-green-500/90 text-white border-green-400' 
            : 'bg-red-500/90 text-white border-red-400'
        }`}>
          {isAvailable ? 'Available' : 'Unavailable'}
        </div>
      </div>

      {/* CONTENT OVERLAY */}
      <div className="absolute bottom-0 left-0 w-full p-6 text-white z-10 flex flex-col justify-end h-full">
        
        <div className="flex-grow"></div>

        <div className="transform transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <h3 className="text-2xl font-bold mb-2 leading-tight text-white drop-shadow-md">
              {amenity.name}
            </h3>
            
            <p className="text-gray-200 text-sm mb-4 line-clamp-2 opacity-90">
              {amenity.description}
            </p>

            <div className="flex items-center justify-between mb-5 border-t border-white/20 pt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>
                    {amenity.slots_left !== undefined 
                        ? `${amenity.slots_left} unit(s) left` 
                        : `Up to ${amenity.capacity} pax`}
                </span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-400 drop-shadow-sm">
                    ₱{Number(amenity.price).toLocaleString()}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => onBook(amenity)}
              disabled={!isAvailable}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                isAvailable 
                  ? 'bg-white text-orange-600 hover:bg-orange-50 active:scale-95' 
                  : 'bg-gray-600/50 text-gray-300 cursor-not-allowed border border-white/10'
              }`}
            >
              {isAvailable ? (
                  <>
                    Add to Booking
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </>
              ) : (
                  'Unavailable'
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AmenitiesCard;
