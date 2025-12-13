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
import ReviewModal from "../../components/customerdashboardcomponents/ReviewModal";

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoadingReviews(true);
                setIsLoadingData(true);

                try {
                    const response = await api.get('/api/amenities/featured');
                    if (response.data && response.data.length > 0) {
                        setFeaturedAmenities(response.data);
                    } else { throw new Error("No data"); }
                } catch (err) {
                    console.log(err);
                    setFeaturedAmenities([
                        { id: 1, name: "Refreshing Pool", description: "Dive into relaxation.", image: "pool.png" },
                        { id: 2, name: "Grand Event Hall", description: "Perfect venue for celebrations.", image: "eventhall.png" },
                        { id: 3, name: "Relaxing Cottage", description: "Comfort in native style.", image: "cottage.png" },
                    ]);
                }

                try {

                    const reviewsRes = await api.get('/api/feedbacks');
                    const formattedReviews = reviewsRes.data.map(review => ({
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
                    setReviews(formattedReviews.filter(r => parseFloat(r.average) >= 4.0));
                } catch (error) { 
                    console.log(error);
                    setReviews([]); 
                }

            } catch (error) { console.error(error); }
            finally { setIsLoadingReviews(false); setIsLoadingData(false); }
        };
        fetchData();
    }, []);

    const handleReviewSubmit = async (payload) => {
        setIsSubmitting(true);
        try {
            const response = await api.post('/api/feedbacks', payload);
            if (response.data.success) {
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
                setIsReviewModalOpen(false);
                setShowFeedbackSuccess(true);
                setTimeout(() => setShowFeedbackSuccess(false), 3000);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to submit review.");
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-white w-full overflow-x-hidden relative">
            
            <div className="sticky top-0 z-50 bg-white w-full">
                <Header user={user} onLogout={logout} />
            </div>

            {/* Main Content Sections */}
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
                    onOpenModal={() => setIsReviewModalOpen(true)} 
                />
                <ContactSection />
                <MapSection />
            </main>

            <Footer />

            {/* Modals & Toasts */}
            {isReviewModalOpen && (
                <ReviewModal 
                    onClose={() => setIsReviewModalOpen(false)} 
                    onSubmit={handleReviewSubmit}
                    isSubmitting={isSubmitting}
                />
            )}

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
