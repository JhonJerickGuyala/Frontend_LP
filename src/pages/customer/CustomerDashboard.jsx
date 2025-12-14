import React, { useState, useEffect } from "react";
import api from "../../config/axios";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../AuthContext";

// Components
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// Customer Sections
import HeroSection from "../../components/customerdashboardcomponents/HeroSection";
import WelcomeSection from "../../components/customerdashboardcomponents/WelcomeSection";
import FeaturedAmenities from "../../components/customerdashboardcomponents/FeaturedAmenities";
import GallerySection from "../../components/customerdashboardcomponents/GallerySection";
import FeedbackSection from "../../components/customerdashboardcomponents/FeedbackSection";
import ContactSection from "../../components/customerdashboardcomponents/ContactSection";
import MapSection from "../../components/customerdashboardcomponents/MapSection";

// Import FeedbackModal
import FeedbackModal from "../../components/FeedbackModal";

const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomerDashboard = () => {
    const { user, logout } = useAuth();
    
    // --- STATE MANAGEMENT ---
    const [reviews, setReviews] = useState([]);
    const [featuredAmenities, setFeaturedAmenities] = useState([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    // Modal & Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    
    // Transaction Ref para sa Review (Galing sa Auto-Check o Button Click)
    const [transactionRef, setTransactionRef] = useState(null); 

    // --- 1. FETCH PUBLIC DATA (Reviews & Amenities) ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoadingReviews(true);
                setIsLoadingData(true);

                // A. Featured Amenities
                try {
                    const response = await api.get('/api/amenities/featured');
                    if (response.data && response.data.length > 0) {
                        setFeaturedAmenities(response.data);
                    } else { throw new Error("No data"); }
                } catch (err) {
                    console.log("Featured amenities error (using fallback):", err);
                    setFeaturedAmenities([
                        { id: 1, name: "Refreshing Pool", description: "Dive into relaxation.", image: "pool.png" },
                        { id: 2, name: "Grand Event Hall", description: "Perfect venue for celebrations.", image: "eventhall.png" },
                        { id: 3, name: "Relaxing Cottage", description: "Comfort in native style.", image: "cottage.png" },
                    ]);
                }

                // B. Public Reviews
                try {
                    const reviewsRes = await api.get('/api/feedbacks');
                    const rawReviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
                    
                    const formattedReviews = rawReviews.map(review => ({
                        id: review.id,
                        name: review.customer_name || review.name || "Guest",
                        average: review.average,
                        comment: review.comment,
                        date: review.date ? new Date(review.date).toLocaleDateString() : new Date().toLocaleDateString(),
                        ratings: {
                            service: review.service || 5,
                            cleanliness: review.cleanliness || 5,
                            amenities: review.amenities || 5
                        }
                    }));
                    // Show only high ratings (4.0+)
                    setReviews(formattedReviews.filter(r => parseFloat(r.average) >= 4.0));
                } catch (error) { 
                    console.log("Error fetching reviews:", error);
                    setReviews([]); 
                }

            } catch (error) { console.error(error); }
            finally { setIsLoadingReviews(false); setIsLoadingData(false); }
        };
        fetchData();
    }, []);

    // --- 2. AUTO-CHECK ELIGIBILITY (Auto-Popup Logic) ---
    useEffect(() => {
        const checkEligibility = async () => {
            if (!user || !user.id || isReviewModalOpen) return;

            try {
                const res = await api.get(`/api/reservations/user/${user.id}`);
                
                // Safety Check: Ensure array
                let bookings = [];
                if (Array.isArray(res.data)) bookings = res.data;
                else if (res.data && Array.isArray(res.data.reservations)) bookings = res.data.reservations;
                else if (res.data && Array.isArray(res.data.data)) bookings = res.data.data;

                // Filter Active & Newest
                const activeBookings = bookings
                    .filter(b => ['checked-in', 'completed'].includes(b.status?.toLowerCase()))
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                for (const booking of activeBookings) {
                    if (!booking.transaction_ref) continue;
                    try {
                        const checkRes = await api.get(`/api/feedbacks/check-status/${booking.transaction_ref}`);
                        if (checkRes.data.hasFeedback === false) {
                            console.log("Eligible booking found (Auto):", booking.transaction_ref);
                            setTransactionRef(booking.transaction_ref); 
                            setIsReviewModalOpen(true); 
                            break; 
                        }
                    } catch (err) {
                        console.error("Skipping check for ref:", booking.transaction_ref , err);
                    }
                }
            } catch (error) {
                console.error("Error checking eligibility:", error);
            }
        };

        if (user) {
            checkEligibility();
        }
    }, [user]); 

    // --- 3. HANDLE SUBMIT ---
    const handleReviewSubmit = async (payload) => {
        setIsSubmitting(true);
        try {
            // Include transaction_ref
            const finalPayload = {
                ...payload,
                transaction_ref: transactionRef 
            };

            const response = await api.post('/api/feedbacks', finalPayload);
            
            // SUCCESS: Update UI & Close
            console.log("Review Submitted:", response.data);

            if (payload.rating >= 4) {
                const newReview = {
                    id: Date.now(),
                    name: payload.name,
                    average: payload.rating,
                    comment: payload.comment,
                    date: new Date().toLocaleDateString(),
                    ratings: payload.ratings
                };
                setReviews(prev => [newReview, ...prev]);
            }
            
            // IMPORTANT: Close modal immediately
            setIsReviewModalOpen(false);
            setTransactionRef(null); 
            setShowFeedbackSuccess(true);
            setTimeout(() => setShowFeedbackSuccess(false), 3000);

        } catch (error) {
            console.error("Submission error:", error);
            const msg = error.response?.data?.error || "Failed to submit review.";
            alert(msg);
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-white w-full overflow-x-hidden relative">
            
            <div className="sticky top-0 z-50 bg-white w-full">
                <Header user={user} onLogout={logout} />
            </div>

            <main className="flex-1 w-full">
                <HeroSection />
                <WelcomeSection />
                
                <FeaturedAmenities 
                    isLoading={isLoadingData} 
                    amenities={featuredAmenities} 
                    apiUrl={backendUrl} 
                />
                
                <GallerySection apiUrl={backendUrl} />
                
                {/* --- FEEDBACK SECTION --- */}
                <FeedbackSection 
                    reviews={reviews} 
                    isLoading={isLoadingReviews} 
                    // UPDATED: Tanggapin ang REF mula sa button click
                    onOpenModal={(ref) => {
                        console.log("Opening modal manually for ref:", ref);
                        setTransactionRef(ref); 
                        setIsReviewModalOpen(true);
                    }} 
                />
                
                <ContactSection />
                <MapSection />
            </main>

            <Footer />

            {/* --- MODAL --- */}
            {isReviewModalOpen && (
                <FeedbackModal 
                    onClose={() => setIsReviewModalOpen(false)} 
                    onSubmit={handleReviewSubmit}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* --- TOAST --- */}
            {showFeedbackSuccess && (
                <div className="fixed bottom-8 right-8 z-[60] bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
                    <CheckCircle2 size={24} />
                    <div>
                        <h4 className="font-bold text-sm">Thank You!</h4>
                        <p className="text-xs text-green-100">Review submitted successfully.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
