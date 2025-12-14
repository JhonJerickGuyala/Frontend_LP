import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../config/axios";
import { CheckCircle2 } from "lucide-react";
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


import FeedbackModal from "../../components/FeedbackModal";

const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomerDashboard = () => {
    const { user, logout } = useAuth();
    

    const [reviews, setReviews] = useState([]);
    const [featuredAmenities, setFeaturedAmenities] = useState([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    
 
    const [transactionRef, setTransactionRef] = useState(null); 

 
    const hasCheckedEligibility = useRef(false);


    const fetchPublicData = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) {
                setIsLoadingReviews(true);
                setIsLoadingData(true);
            }

            // A. Featured Amenities
            try {
                const response = await api.get(`/api/amenities/featured`);
                if (response.data && response.data.length > 0) {
                    setFeaturedAmenities(response.data);
                }
            } catch (err) {
                if (!isBackground) console.log("Amenities fallback used");
                if (featuredAmenities.length === 0) {
                    setFeaturedAmenities([
                        { id: 1, name: "Refreshing Pool", description: "Dive into relaxation.", image: "pool.png" },
                        { id: 2, name: "Grand Event Hall", description: "Perfect venue for celebrations.", image: "eventhall.png" },
                        { id: 3, name: "Relaxing Cottage", description: "Comfort in native style.", image: "cottage.png" },
                    ]);
                }
            }

         
            try {
                
                const timestamp = new Date().getTime();
                const reviewsRes = await api.get(`/api/feedbacks?t=${timestamp}`);
                
                const rawReviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
                
                const formattedReviews = rawReviews.map(review => ({
                    id: review.id,
                    name: review.customer_name || review.name || "Guest",
                    average: review.average,
                    comment: review.comment,
                    rawDate: review.created_at || review.date || new Date().toISOString(), 
                    date: review.date ? new Date(review.date).toLocaleDateString() : new Date().toLocaleDateString(),
                    ratings: {
                        service: review.service || 5,
                        cleanliness: review.cleanliness || 5,
                        amenities: review.amenities || 5
                    }
                }));

                formattedReviews.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

                setReviews(formattedReviews);

            } catch (error) { 
                console.log("Error fetching reviews:", error);
            }

        } catch (error) { 
            console.error(error); 
        } finally { 
            if (!isBackground) {
                setIsLoadingReviews(false); 
                setIsLoadingData(false); 
            }
        }
    }, []); 

    const checkEligibility = useCallback(async () => {
        if (hasCheckedEligibility.current) return;
        if (!user || !user.id) return;

        try {
            const res = await api.get(`/api/reservations/user/${user.id}`);
            
            let bookings = [];
            if (Array.isArray(res.data)) bookings = res.data;
            else if (res.data && Array.isArray(res.data.reservations)) bookings = res.data.reservations;
            else if (res.data && Array.isArray(res.data.data)) bookings = res.data.data;

            const activeBookings = bookings
                .filter(b => ['checked-in', 'completed'].includes(b.status?.toLowerCase()))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            for (const booking of activeBookings) {
                if (!booking.transaction_ref) continue;
                try {
                    const checkRes = await api.get(`/api/feedbacks/check-status/${booking.transaction_ref}`);
                    
                    if (checkRes.data.hasFeedback === false) {
                        setTransactionRef(booking.transaction_ref); 
                        setIsReviewModalOpen(true);
                        
                        hasCheckedEligibility.current = true; 
                        
                        break; 
                    }
                } catch (err) {

                }
            }
            
            hasCheckedEligibility.current = true;

        } catch (error) {
            console.error("Error checking eligibility:", error);
            hasCheckedEligibility.current = true; // Prevent retry on error
        }
    }, [user]);

    useEffect(() => {
        fetchPublicData(false);
        if (user) {
            checkEligibility();
        }
    }, [fetchPublicData, checkEligibility, user]);


 
    const handleReviewSubmit = async (payload) => {
        setIsSubmitting(true);
        try {
            const finalPayload = {
                ...payload,
                transaction_ref: transactionRef 
            };

            const response = await api.post('/api/feedbacks', finalPayload);

            const newReview = {
                id: Date.now(),
                name: payload.name,
                average: payload.rating,
                comment: payload.comment,
                rawDate: new Date().toISOString(), 
                date: new Date().toLocaleDateString(),
                ratings: payload.ratings
            };
            
           
            setReviews(prev => [newReview, ...prev]);
            
            setIsReviewModalOpen(false);
            setTransactionRef(null); 
            setShowFeedbackSuccess(true);
            setTimeout(() => setShowFeedbackSuccess(false), 3000);

            
            fetchPublicData(true);

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
                
                <FeedbackSection 
                    reviews={reviews} 
                    isLoading={isLoadingReviews} 
                    onOpenModal={(ref) => {
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