import React, { useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';

const FeedbackModal = ({ onClose, onSubmit, isSubmitting }) => {
  // --- STATE ---
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [ratings, setRatings] = useState({
    service: 0,
    cleanliness: 0,
    amenities: 0
  });

  // --- CONFIG ---
  const categories = [
    { id: 'service', label: 'Service' },
    { id: 'cleanliness', label: 'Cleanliness' },
    { id: 'amenities', label: 'Amenities' }
  ];

  // --- LOGIC ---
  
  // Update specific rating category
  const handleRatingChange = (category, value) => {
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  // Calculate Average for display and payload
  const getAverage = () => {
    const values = Object.values(ratings);
    const total = values.reduce((acc, curr) => acc + curr, 0);
    return values.length ? (total / values.length).toFixed(1) : 0;
  };

  // Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation 1: Check if all categories are rated
    if (Object.values(ratings).some(r => r === 0)) {
      alert("Please rate all categories (Service, Cleanliness, Amenities).");
      return;
    }

    // Validation 2: Check if comment is empty
    if (!comment.trim()) {
      alert("Please leave a comment regarding your stay.");
      return;
    }

    // Payload construction matching CustomerDashboard logic
    const payload = {
      name: name || "Anonymous Guest",
      rating: getAverage(), // Pass the calculated average
      ratings: ratings,     // Pass the breakdown
      comment: comment
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop (Click to close) */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#ea580c] p-6 text-white flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold">Write a Review</h3>
            <p className="text-orange-100 text-sm mt-1">We value your feedback!</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Rating Section */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rate your experience</p>
            
            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-2 last:border-0">
                <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(cat.id, star)}
                      className="focus:outline-none transition-transform active:scale-110"
                    >
                      <Star 
                        size={24} 
                        className={`${
                          star <= ratings[cat.id] 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-gray-200 hover:text-gray-300"
                        } transition-colors`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Overall Average Display */}
          <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
            <span className="text-sm font-semibold text-gray-600">Overall Rating:</span>
            <span className="text-xl font-bold text-[#ea580c]">
              {getAverage()} <span className="text-sm font-normal text-gray-500">/ 5.0</span>
            </span>
          </div>

          <hr className="border-gray-100" />

          {/* Text Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
              <input 
                type="text" 
                placeholder="Juan Dela Cruz"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
              <textarea 
                rows="3"
                placeholder="Tell us about your stay..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent text-sm resize-none"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              "Submit Review"
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
