import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import Header from "../../components/Header.jsx";
import Footer from "../../components/Footer.jsx";
import { Star, Send, CheckCircle2, BarChart3, Quote, Loader2, ShieldCheck, Lock, CalendarCheck } from "lucide-react";
import api from "../../config/axios.js"; 

const Feedback = () => {
  const { user } = useAuth();
  const backgroundImageUrl = "/images/bg.jpg"; 

  // --- STATE MANAGEMENT ---
  const [reviews, setReviews] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // ADDED: Loading state specifically for eligibility check
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeFilter, setActiveFilter] = useState('recent');
  const [filteredReviews, setFilteredReviews] = useState([]);

  // --- ELIGIBILITY STATE ---
  const [eligibility, setEligibility] = useState({
    canReview: false,
    message: "Checking eligibility...",
    transactionRef: null 
  });

  // Form State
  const [formData, setFormData] = useState({ 
    name: user?.name || '', 
    ratings: { service: 0, cleanliness: 0, amenities: 0 }, 
    comment: '' 
  });

  // --- AUTO SCROLL TO TOP ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --- 1. FETCH REVIEWS (Public Display) ---
  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      // Added timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/api/feedbacks?t=${timestamp}`);
      
      const formattedReviews = response.data.map(review => ({
        id: review.id,
        name: review.customer_name || "Anonymous",
        ratings: { 
          service: review.service, 
          cleanliness: review.cleanliness, 
          amenities: review.amenities 
        }, 
        average: review.average,
        comment: review.comment,
        date: new Date(review.date),
        // Use created_at if available for better sorting accuracy
        rawDate: review.created_at || review.date || new Date().toISOString()
      }));

      formattedReviews.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

      setReviews(formattedReviews);
      setFilteredReviews(formattedReviews.slice(0, 6)); 
      
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. CHECK ELIGIBILITY ---
  const checkEligibility = async () => {
    // Start loading
    setIsCheckingEligibility(true);

    if (!user || !user.id) {
        setEligibility({ canReview: false, message: "Please login to leave a review.", transactionRef: null });
        setIsCheckingEligibility(false); // Stop loading
        return;
    }

    try {
        const res = await api.get(`/api/reservations/user/${user.id}`); 
        
        let bookingsList = [];
        if (Array.isArray(res.data)) bookingsList = res.data;
        else if (res.data.reservations) bookingsList = res.data.reservations;
        else if (res.data.data) bookingsList = res.data.data;

        if (bookingsList.length > 0) {
            
            const activeBookings = bookingsList
                .filter(booking => {
                    const status = booking.status ? booking.status.toLowerCase() : '';
                    return status === 'checked-in' || status === 'completed';
                })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            let foundEligible = false;

            for (const booking of activeBookings) {
                const ref = booking.transaction_ref;
                
                if (ref) {
                    try {
                        const checkRes = await api.get(`/api/feedbacks/check-status/${ref}`);
                        
                        // Kapag FALSE, ibig sabihin wala pang feedback -> ELIGIBLE
                        if (checkRes.data.hasFeedback === false) {
                            setEligibility({ 
                                canReview: true, 
                                message: "", 
                                transactionRef: ref 
                            });
                            foundEligible = true;
                            break; 
                        }
                    } catch (err) {
                        console.error("Skipping booking check:", ref, err);
                    }
                }
            }

            if (!foundEligible) {
                const hasPending = bookingsList.some(b => ['pending', 'confirmed'].includes(b.status?.toLowerCase()));
                if (hasPending) {
                      setEligibility({ 
                        canReview: false, 
                        message: "Reviews are available once you have Checked-In.",
                        transactionRef: null
                    });
                } else {
                      setEligibility({ 
                        canReview: false, 
                        message: "You have already submitted feedback for your recent stays.",
                        transactionRef: null
                    });
                }
            }

        } else {
            setEligibility({ canReview: false, message: "No bookings found.", transactionRef: null });
        }
    } catch (error) {
        console.error("Eligibility check error:", error);
        setEligibility({ canReview: false, message: "Unable to verify booking status.", transactionRef: null });
    } finally {
        // Stop loading regardless of result
        setIsCheckingEligibility(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    if(user) {
        checkEligibility();
    } else {
        // If no user, stop loading immediately
        setIsCheckingEligibility(false);
    }
  }, [user]);

  // Apply filter logic
  useEffect(() => {
    let filtered = [...reviews];
    switch (activeFilter) {
      case 'recent': 
        filtered.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate)); 
        break;
      case 'highest': 
        filtered.sort((a, b) => parseFloat(b.average) - parseFloat(a.average)); 
        break;
      case 'featured': 
        // Example featured logic: High rating + long comment
        filtered.sort((a, b) => (parseFloat(b.average) + (b.comment.length/100)) - (parseFloat(a.average) + (a.comment.length/100))); 
        break;
      default: break;
    }
    setFilteredReviews(filtered.slice(0, 6));
  }, [activeFilter, reviews]);

  const getCurrentFormAverage = () => {
    const values = Object.values(formData.ratings);
    const total = values.reduce((acc, curr) => acc + curr, 0);
    return values.length > 0 ? (total / values.length).toFixed(1) : 0;
  };

  const getOverallAverage = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((acc, review) => acc + parseFloat(review.average), 0);
    return (total / reviews.length).toFixed(1);
  };

  const getCategoryAverage = (category) => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((acc, review) => acc + review.ratings[category], 0);
    return (total / reviews.length).toFixed(1);
  };

  const handleRatingChange = (category, value) => {
    setFormData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [category]: value }
    }));
  };

  // --- 3. SUBMIT LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const unrated = Object.values(formData.ratings).some(r => r === 0);
    if (unrated) { alert("Please rate all categories first."); return; }

    setIsSubmitting(true);

    try {
      const values = Object.values(formData.ratings);
      const avgRating = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);

      const payload = {
        transaction_ref: eligibility.transactionRef, 
        name: formData.name || "Anonymous Guest",
        rating: avgRating, 
        comment: formData.comment,
        ratings: formData.ratings
      };

      const response = await api.post('/api/feedbacks', payload);

      if (response.data.success) {
        // Add new review directly to state without filtering for rating
        const newReview = {
          id: Date.now(),
          name: payload.name,
          ratings: formData.ratings,
          average: avgRating,
          comment: payload.comment,
          date: new Date(),
          rawDate: new Date().toISOString()
        };
        
        // Add to top
        setReviews(prev => [newReview, ...prev]);
        
        setFormData({ name: user?.name || '', ratings: { service: 0, cleanliness: 0, amenities: 0 }, comment: '' });
        
        // Lock form immediately
        setEligibility({ 
            canReview: false, 
            message: "Thank you for your feedback!", 
            transactionRef: null 
        });
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Submission error:", error);
      if (error.response && error.response.status === 400) {
          alert("Feedback already submitted for this booking.");
          checkEligibility();
      } else {
          alert("Failed to submit feedback. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'service', label: 'Service' },
    { id: 'cleanliness', label: 'Cleanliness' },
    { id: 'amenities', label: 'Amenities' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} />

      {/* HERO SECTION */}
      <section className="bg-cover bg-center text-white py-12 sm:py-16 lg:py-20 w-full" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${backgroundImageUrl})` }}>
        <div className="text-center px-4">
          <h2 className="text-3xl md:text-6xl font-bold text-white font-header mb-4">Guest Feedback</h2>
          <p className="text-sm md:text-lg text-gray-200 mx-auto mb-8">Your opinion matters. Help us improve your experience at La Piscina Resort.</p>
        </div>
      </section>

      <div className="flex-grow w-full px-4 sm:px-6 py-8 lg:py-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full">
          
          {/* --- COLUMN 1 (LEFT): GUEST RATINGS (SMALL) & FORM (5/12) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* UPPER LEFT: GUEST RATINGS (Compact/Small) */}
            <div className="bg-white p-5 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-[#ea580c]" />Guest Ratings</h3>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" stroke="#f3f4f6" strokeWidth="6" fill="transparent" />
                    <circle cx="50%" cy="50%" r="45%" stroke="#ea580c" strokeWidth="6" fill="transparent" strokeDasharray={282.7} strokeDashoffset={282.7 - (282.7 * getOverallAverage()) / 5} className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-[#ea580c]">{getOverallAverage()}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">out of 5</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {categories.map((cat) => {
                    const avg = getCategoryAverage(cat.id);
                    return (
                      <div key={cat.id}>
                        <div className="flex justify-between text-xs mb-0.5"><span className="font-medium text-gray-700">{cat.label}</span><span className="font-bold text-gray-900">{avg}/5</span></div>
                        <div className="h-1.5 w-full bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316]" style={{ width: `${(avg / 5) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LOWER LEFT: FORM OR LOCKED MESSAGE (Sticky) */}
            <div className="bg-white shadow-lg border border-gray-100 lg:sticky lg:top-6 min-h-[300px]">
              
              {/* HEADER */}
              <div className="bg-[#ea580c] p-5 lg:p-6 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl">Share Your Experience</h3>
                    <p className="text-white/80 text-xs mt-1">We value your feedback</p>
                  </div>
                  {!isCheckingEligibility && eligibility.canReview && getCurrentFormAverage() > 0 && (
                    <div className="bg-white text-[#ea580c] px-3 py-1 font-bold text-sm">
                      {getCurrentFormAverage()}<span className="text-xs ml-1">/5</span>
                    </div>
                  )}
                </div>
              </div>

              {/* --- LOGIC: LOADING -> FORM -> LOCKED --- */}
              {isCheckingEligibility ? (
                 <div className="p-8 lg:p-10 flex flex-col items-center justify-center text-center h-[300px]">
                     <Loader2 size={32} className="text-[#ea580c] animate-spin mb-3" />
                     <p className="text-gray-500 text-sm">Checking your booking details...</p>
                 </div>
              ) : eligibility.canReview ? (
                  <div className="p-5 lg:p-6 relative">
                    {showSuccess && (
                      <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
                        <CheckCircle2 size={48} className="text-green-500 mb-4" />
                        <h4 className="text-2xl font-bold text-gray-800">Thank You!</h4>
                        <p className="text-gray-500 mt-2">Your feedback has been submitted.</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">Rate Your Experience</label>
                        <div className="space-y-4">
                          {categories.map((cat) => (
                            <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 mb-1 sm:mb-0">{cat.label}</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button key={star} type="button" onClick={() => handleRatingChange(cat.id, star)} className="focus:outline-none hover:scale-110 transition-transform">
                                    <Star size={22} fill={star <= formData.ratings[cat.id] ? "#f59e0b" : "#e5e7eb"} className={star <= formData.ratings[cat.id] ? "text-[#f59e0b]" : "text-gray-200"} strokeWidth={0} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <hr className="border-gray-100" />
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">Your Details</label>
                        <div className="space-y-4">
                          <input type="text" placeholder="Your Name" className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-[#ea580c] outline-none text-sm transition-colors" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                          <textarea rows="4" placeholder="What did you love about your stay? How can we improve?" className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-[#ea580c] outline-none text-sm resize-none transition-colors" value={formData.comment} onChange={(e) => setFormData({...formData, comment: e.target.value})} required />
                        </div>
                      </div>
                      <div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold py-3 px-6 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
                          {isSubmitting ? <><Loader2 size={18} className="animate-spin" /><span>Processing...</span></> : <><span className="text-sm uppercase tracking-wide">Submit Review</span><Send size={18} /></>}
                        </button>
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                          <ShieldCheck size={12} /><span>Verified Guest Feedback</span>
                        </div>
                      </div>
                    </form>
                  </div>
              ) : (
                  <div className="p-8 lg:p-10 flex flex-col items-center justify-center text-center h-[400px]">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Lock className="text-gray-400" size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-gray-800 mb-2">Feedback is Locked</h4>
                      <p className="text-sm text-gray-500 max-w-[250px] leading-relaxed mb-6">
                          {eligibility.message}
                      </p>
                      
                      {!user && (
                          <a href="/login" className="px-6 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-900 transition-colors">
                              Login to Account
                          </a>
                      )}
                      
                      {user && (
                          <div className="flex items-center gap-2 text-xs text-[#ea580c] font-medium bg-orange-50 px-3 py-2 rounded-full">
                              <CalendarCheck size={14}/>
                              <span>Waiting for your stay...</span>
                          </div>
                      )}
                  </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            
            {/* REVIEWS LIST & FILTERS */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div><h3 className="text-xl font-bold text-gray-800 mb-1">Guest Reviews</h3><p className="text-sm text-gray-500">What other guests are saying</p></div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-gray-100 p-1">
                    {[{ id: 'recent', label: 'Recent', icon: '🕒' }, { id: 'highest', label: 'Highest', icon: '⭐' }, { id: 'featured', label: 'Featured', icon: '✨' }].map((filter) => (
                      <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`px-3 py-2 flex items-center gap-1 text-sm transition-all ${activeFilter === filter.id ? 'bg-white text-[#ea580c] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                        <span>{filter.icon}</span><span>{filter.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-400"><Loader2 size={32} className="animate-spin text-[#ea580c] mb-2" /><p>Loading reviews...</p></div>
                ) : filteredReviews.length > 0 ? (
                  filteredReviews.map((review) => (
                    <div key={review.id} className="bg-white p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#ea580c]/10 text-[#ea580c] flex items-center justify-center font-bold">{review.name.charAt(0).toUpperCase()}</div>
                          <div><p className="font-bold text-gray-800 text-sm">{review.name}</p><p className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                        </div>
                        <div className="flex items-center bg-gray-50 px-2 py-1"><Star size={12} className="text-[#ea580c] fill-[#ea580c] mr-1" /><span className="font-bold text-gray-800 text-sm">{review.average}</span></div>
                      </div>
                      <div className="mb-4"><div className="relative"><Quote className="absolute -top-2 -left-2 text-gray-200 w-6 h-6" /><p className="text-gray-600 text-sm line-clamp-3 relative z-10 pl-3">"{review.comment}"</p></div></div>
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2">
                           {Object.entries(review.ratings).map(([key, value]) => (
                             <div key={key} className="flex items-center gap-1 bg-gray-50 px-2 py-1 text-xs"><span className="text-gray-600 capitalize">{key}:</span><span className="font-bold text-gray-800">{value}/5</span></div>
                           ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12 bg-white border border-dashed border-gray-300"><div className="flex flex-col items-center justify-center"><Star size={48} className="text-gray-300 mb-4" /><p className="text-gray-500 font-medium mb-2">No reviews yet</p><p className="text-sm text-gray-400">Be the first to share your experience!</p></div></div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Feedback;