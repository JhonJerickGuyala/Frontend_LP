import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Header.jsx";
import Footer from "../../components/Footer.jsx";
import api from "../../config/axios"; 

// Import Components
import HeroSection from "../../components/ReservationComponents/HeroSection.jsx";
import ActionButtons from "../../components/ReservationComponents/ActionButtons.jsx";
import ReservationForm from "../../components/ReservationComponents/ReservationForm.jsx";
import CartModal from "../../components/ReservationComponents/CartModal.jsx";
import ReservationsModal from "../../components/ReservationComponents/ReservationsModal.jsx";
import CancellationModal from "../../components/ReservationComponents/CancellationModal.jsx"; 

const Reservations = () => {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedAmenity = location.state?.selectedAmenity;
  const backgroundImageUrl = "/images/bg.jpg";

  // State Management
  const [cart, setCart] = useState([]);
  const [amenities, setAmenities] = useState([]); 
  const [showCartModal, setShowCartModal] = useState(false);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState(null);
  const [currentReservations, setCurrentReservations] = useState([]);
  
  // State for locally hidden history items
  const [hiddenHistoryIds, setHiddenHistoryIds] = useState([]);

  // Updated State: Included numGuest (default to 1)
  const [reservationForm, setReservationForm] = useState({
    fullName: "",
    address: "",
    contactNumber: "",
    numGuest: "1", 
    checkInDate: "",
    checkOutDate: "",
    paymentScreenshot: null,
    userId: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [reservationCount, setReservationCount] = useState(0);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  
  const [loadedUserKey, setLoadedUserKey] = useState(null);

  // Load user data from AuthContext
  useEffect(() => {
    if (user) {
      setReservationForm(prev => ({
        ...prev,
        userId: user.id || user._id || ""
      }));
    }
  }, [user]);

  // Load Cart based on User Identity
  useEffect(() => {
    const userId = user?.id || user?._id || user?.userId;
    const storageKey = userId ? `cart_${userId}` : "cart_guest";

    console.log(`🛒 Loading cart for key: ${storageKey}`);

    const storedCart = localStorage.getItem(storageKey);
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        } else {
          setCart([]);
        }
      } catch (e) {
        console.error("Error parsing cart:", e);
        setCart([]);
      }
    } else {
      setCart([]);
    }
    
    // Set kung kaninong cart ang na-load para hindi mag-save sa maling storage
    setLoadedUserKey(storageKey);
  }, [user]);


  useEffect(() => {
    const userId = user?.id || user?._id || user?.userId;
    const currentKey = userId ? `cart_${userId}` : "cart_guest";
    
    // Check muna kung ang cart na nasa screen (loadedUserKey) ay match sa user na naka-login (currentKey)
    // Para hindi ma-overwrite ang cart ng guest gamit ang cart ng user (o vice versa) habang nagpapalit
    if (loadedUserKey === currentKey) {
      console.log(`💾 Saving cart to key: ${currentKey}`, cart);
      localStorage.setItem(currentKey, JSON.stringify(cart));
    }
  }, [cart, user, loadedUserKey]);

  // ------------------------------------------------------------------
  // FETCH AVAILABILITY WITH LOCAL TIME FORMATTING
  // ------------------------------------------------------------------
  const fetchAvailability = async () => {
    try {
      // 1. Kapag wala pang Check-in, walang gagawin.
      if (!reservationForm.checkInDate) return;

      let url = '/api/transactions/check-availability';
      const params = {};

      params.checkIn = reservationForm.checkInDate;

      // 2. CRITICAL CHANGE: Manual Date Formatting (No toISOString)
      // Para hindi magbago ang oras (Timezone issue fix)
      if (reservationForm.checkOutDate) {
        params.checkOut = reservationForm.checkOutDate;
      } else {
        const startDate = new Date(reservationForm.checkInDate);
        
        // Magdagdag ng 1 minute
        startDate.setMinutes(startDate.getMinutes() + 1);

        // Manual formatting: YYYY-MM-DDTHH:mm
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const hours = String(startDate.getHours()).padStart(2, '0');
        const minutes = String(startDate.getMinutes()).padStart(2, '0');
        
        const formattedCheckOut = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        params.checkOut = formattedCheckOut;
      }

      console.log("🔍 Checking Availability params:", params); // Debug log

      const res = await api.get(url, { params });
      
      if (res.data.success) {
        setAmenities(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (e) {
      console.error("Failed to fetch amenities availability:", e);
    }
  };

  // Trigger agad kapag nagbago ang Check-in (kahit wala pang check-out)
  useEffect(() => {
    fetchAvailability();
  }, [reservationForm.checkInDate, reservationForm.checkOutDate]);


  // Automatically fetch reservations when user is logged in
  useEffect(() => {
    if (user && isAuthenticated) {
      loadReservationsOnPageLoad();
    } else {
      setReservationCount(0);
    }
  }, [user, isAuthenticated]);

  // Function to load reservations on page load
  const loadReservationsOnPageLoad = async () => {
    if (!user || isLoadingReservations) return;
    
    try {
      setIsLoadingReservations(true);
      const userId = user.id || user._id || user.userId;
      
      if (!userId) {
        console.log('❌ No user ID found for auto-load');
        return;
      }

      const response = await api.get(
        `/api/transactions/user/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const result = response.data;
      
      if (result.success && result.data && result.data.length > 0) {
        const transformedReservations = result.data.map(transaction => {
            let extensions = transaction.extensions || [];
            
            if (extensions.length === 0 && transaction.extension_history) {
                if (typeof transaction.extension_history === 'string') {
                    try {
                        extensions = JSON.parse(transaction.extension_history);
                    } catch (e) {
                        console.log(e);
                        extensions = [];
                    }
                } else if (Array.isArray(transaction.extension_history)) {
                    extensions = transaction.extension_history;
                }
            }

            return {
                id: transaction.id || transaction.transaction_id,
                transactionId: transaction.id || transaction.transaction_id,
                reservationNumber: transaction.transaction_ref || `TXN-${transaction.id}`,
                amenities: transaction.reservations?.map(r => r.amenity_name) || [],
                checkInDate: transaction.reservations?.[0]?.check_in_date || transaction.check_in_date,
                checkOutDate: transaction.reservations?.[0]?.check_out_date || transaction.check_out_date,
                totalAmount: parseFloat(transaction.total_amount) || 0,
                downpayment: parseFloat(transaction.downpayment) || 0,
                balance: parseFloat(transaction.balance) || 0,
                status: transaction.booking_status || 'Pending',
                paymentStatus: transaction.payment_status || 'Partial',
                dateBooked: transaction.created_at ? transaction.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                rawTransaction: {
                    ...transaction,
                    extension_history: extensions 
                }
            };
        });
        
        setCurrentReservations(transformedReservations);
      } else {
        setReservationCount(0);
      }
    } catch (error) {
      console.log('📱 Auto-load reservations error:', error);
    } finally {
      setIsLoadingReservations(false);
    }
  };

  // Update reservation count (Active Only)
  useEffect(() => {
    const activeStatuses = ['Pending', 'Confirmed', 'Paid', 'Check-in', 'Checked-In'];
    const activeCount = currentReservations.filter(r => activeStatuses.includes(r.status)).length;
    setReservationCount(activeCount);
  }, [currentReservations]);

  // Function to handle local deletion (Hide from view)
  const handleDeleteHistory = (id) => {
    if (window.confirm("Are you sure you want to remove this from your history view?")) {
      setHiddenHistoryIds(prev => [...prev, id]);
    }
  };

  const visibleReservations = currentReservations.filter(r => !hiddenHistoryIds.includes(r.id));

  // Disable body scroll on modal open
  useEffect(() => {
    if (showCartModal || showReservationsModal || reservationToCancel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = ''; 
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '';
    };
  }, [showCartModal, showReservationsModal, reservationToCancel]);

  // Validation functions
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const errors = {};

    if (!reservationForm.fullName.trim()) {
      errors.fullName = "Full name is required";
    }

    if (!reservationForm.address.trim()) {
      errors.address = "Address is required";
    }
    
    // Validate Number of Guests
    if (!reservationForm.numGuest || parseInt(reservationForm.numGuest) <= 0) {
      errors.numGuest = "Please enter a valid number of guests (minimum 1)";
    }

    if (!reservationForm.contactNumber) {
      errors.contactNumber = "Contact number is required";
    } else if (!validatePhoneNumber(reservationForm.contactNumber)) {
      errors.contactNumber = "Contact number must be 11 digits starting with 09";
    }

    if (!reservationForm.checkInDate) {
      errors.checkInDate = "Check-in date and time is required";
    }

    if (!reservationForm.checkOutDate) {
      errors.checkOutDate = "Check-out date and time is required";
    } else if (reservationForm.checkInDate && new Date(reservationForm.checkOutDate) <= new Date(reservationForm.checkInDate)) {
      errors.checkOutDate = "Check-out must be after check-in time";
    }

    if (!reservationForm.paymentScreenshot) {
      errors.paymentScreenshot = "Payment screenshot is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleReservationInputChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === "paymentScreenshot") {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
        
        setReservationForm(prev => ({
          ...prev,
          paymentScreenshot: file
        }));
        
        if (formErrors.paymentScreenshot) {
          setFormErrors(prev => ({ ...prev, paymentScreenshot: "" }));
        }
      }
    } else if (name === "contactNumber") {
      const numbersOnly = value.replace(/\D/g, '').slice(0, 11);
      setReservationForm(prev => ({
        ...prev,
        [name]: numbersOnly
      }));

      if (formErrors.contactNumber) {
        setFormErrors(prev => ({ ...prev, contactNumber: "" }));
      }
    } else if (name === "numGuest") {
        setReservationForm(prev => ({
            ...prev,
            [name]: value
        }));
        if (formErrors.numGuest) {
            setFormErrors(prev => ({ ...prev, numGuest: "" }));
        }
    } else {
      setReservationForm(prev => {
        const updatedForm = {
          ...prev,
          [name]: value
        };

        if (name === 'checkInDate' || name === 'checkOutDate') {
          const checkIn = name === 'checkInDate' ? value : prev.checkInDate;
          const checkOut = name === 'checkOutDate' ? value : prev.checkOutDate;

          if (checkIn && checkOut) {
            const d1 = new Date(checkIn);
            const d2 = new Date(checkOut);

            if (d2 <= d1) {
              setFormErrors(currentErrors => ({
                ...currentErrors,
                checkOutDate: "Check-out time cannot be the same or before check-in time."
              }));
            } else {
              setFormErrors(currentErrors => {
                const newErrors = { ...currentErrors };
                delete newErrors.checkOutDate;
                return newErrors;
              });
            }
          }
        }

        return updatedForm;
      });

      if (formErrors[name] && name !== 'checkInDate' && name !== 'checkOutDate') {
        setFormErrors(prev => ({
          ...prev,
          [name]: ""
        }));
      }
    }
  };

  const calculateTotal = () => {
    // 1. Calculate number of days
    let days = 1;
    if (reservationForm.checkInDate && reservationForm.checkOutDate) {
      const start = new Date(reservationForm.checkInDate);
      const end = new Date(reservationForm.checkOutDate);
      if (end > start) {
        const diffTime = Math.abs(end - start);
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }
    }
    days = days > 0 ? days : 1;

    // 2. Calculate Entrance Fees
    const guestCount = parseInt(reservationForm.numGuest) || 0;
    const entranceFeePerHead = 50;
    const totalEntranceFee = guestCount * entranceFeePerHead;

    // 3. Calculate Amenities Total
    const cartTotal = cart.reduce((total, item) => total + (item.amenity_price * item.quantity), 0);

    // 4. Final Calculation: (Amenities + Entrance) * Days
    const grandTotal = (cartTotal + totalEntranceFee) * days;

    return grandTotal;
  };

  const calculateDownpayment = () => calculateTotal() * 0.2;

  // Handle form submission
  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert("Please fix the form errors before submitting.");
      return;
    }

    if (cart.length === 0) {
      alert("Please add at least one amenity to your cart");
      return;
    }

    // ------------------------------------------------------------------
    // CONFLICT CHECKING GUARD (The "Pulis")
    // ------------------------------------------------------------------
    const hasConflict = cart.some(item => {
        // Find availability for this item
        const amenityStatus = amenities.find(a => a.id === item.amenity_id);
        if (!amenityStatus) return false; // If not found, assume safe or handle differently
        
        // If qty in cart > slots_left, it's a conflict
        return item.quantity > amenityStatus.slots_left;
    });

    if (hasConflict) {
        alert("Some items in your cart are fully booked or exceed available slots for the selected dates. Please check your cart and update quantities.");
        // Optional: Open cart modal automatically so they can see which item is red
        setShowCartModal(true); 
        return;
    }
    // ------------------------------------------------------------------

    try {
      const formData = new FormData();
      formData.append('fullName', reservationForm.fullName);
      formData.append('contactNumber', reservationForm.contactNumber);
      formData.append('address', reservationForm.address);
      formData.append('numGuest', reservationForm.numGuest); 
      formData.append('checkInDate', reservationForm.checkInDate);
      formData.append('checkOutDate', reservationForm.checkOutDate);
      formData.append('cart', JSON.stringify(cart));
      
      const userId = user?.id || user?._id || user?.userId;
      if (userId) {
        formData.append('userId', userId);
      }
      
      if (reservationForm.paymentScreenshot) {
        formData.append('proof_of_payment', reservationForm.paymentScreenshot);
      }

      const response = await api.post('/api/transactions', formData);
      const result = response.data;
      
      if (result.success) {
        alert("Reservation submitted successfully!");
        
        setReservationForm({
          fullName: "",
          address: "",
          contactNumber: "",
          numGuest: "1", 
          checkInDate: "",
          checkOutDate: "",
          paymentScreenshot: null,
          userId: user?.id || user?._id || ""
        });
        
        setCart([]);
        const storageKey = userId ? `cart_${userId}` : "cart_guest";
        localStorage.removeItem(storageKey);

        setImagePreview(null);
        
        const fileInput = document.querySelector('input[name="paymentScreenshot"]');
        if (fileInput) fileInput.value = '';
        
        setFormErrors({});
        
        if (user && isAuthenticated) {
          setTimeout(() => {
            loadReservationsOnPageLoad();
          }, 1000);
        }
        
      } else {
        alert("Failed to submit reservation: " + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Reservation submission error:', error);
      alert("Failed to submit reservation. Please try again.");
    }
  };

  // Cart Functions
  const handleAddToCart = (amenity) => {
    const exists = cart.find((item) => item.amenity_id === amenity.id);

    if (exists) {
      alert(`${amenity.name} is already in your cart. Please add the quantity in the cart instead.`);
      return;
    }

    if (cart.length >= 10) {
      alert("You can only add up to 10 different amenities in the cart.");
      return;
    }

    setCart((prev) => {
      if (prev.find((item) => item.amenity_id === amenity.id)) return prev;

      return [
        ...prev,
        {
          id: Date.now(),
          amenity_id: amenity.id,
          amenity_name: amenity.name,
          amenity_type: amenity.type,
          amenity_price: amenity.price,
          capacity: amenity.capacity,
          description: amenity.description,
          image: amenity.image,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const adjustQuantity = (index, delta) => {
    setCart((prev) => {
      const updatedCart = [...prev];
      const newQuantity = updatedCart[index].quantity + delta;
      if (newQuantity >= 1) {
        updatedCart[index].quantity = newQuantity;
      }
      return updatedCart;
    });
  };

  // Auto-add selected amenity with cleanup
  useEffect(() => {
    if (selectedAmenity && loadedUserKey) { 
      handleAddToCart(selectedAmenity);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAmenity, loadedUserKey]); 

  // Logout
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Fetch reservations based on USER ID
  const fetchReservations = async () => {
    try {
      if (!user) {
        alert("Please log in to view your reservations.");
        setReservationCount(0);
        return;
      }

      const userId = user.id || user._id || user.userId;
      
      if (!userId) {
        alert("User ID not found. Please log in again.");
        setReservationCount(0);
        return;
      }

      try {
        const response = await api.get(
          `/api/transactions/user/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        const result = response.data;
        
        if (result.success) {
          if (result.data && result.data.length > 0) {
            
            const transformedReservations = result.data.map(transaction => {
                let extensions = transaction.extensions || [];
                
                if (extensions.length === 0 && transaction.extension_history) {
                    if (typeof transaction.extension_history === 'string') {
                        try {
                            extensions = JSON.parse(transaction.extension_history);
                        } catch (e) {
                            console.log(e);
                            extensions = [];
                        }
                    } else if (Array.isArray(transaction.extension_history)) {
                        extensions = transaction.extension_history;
                    }
                }

                return {
                    id: transaction.id || transaction.transaction_id,
                    transactionId: transaction.id || transaction.transaction_id,
                    reservationNumber: transaction.transaction_ref || `TXN-${transaction.id}`,
                    amenities: transaction.reservations?.map(r => r.amenity_name) || [],
                    checkInDate: transaction.reservations?.[0]?.check_in_date || transaction.check_in_date,
                    checkOutDate: transaction.reservations?.[0]?.check_out_date || transaction.check_out_date,
                    totalAmount: parseFloat(transaction.total_amount) || 0,
                    downpayment: parseFloat(transaction.downpayment) || 0,
                    balance: parseFloat(transaction.balance) || 0,
                    status: transaction.booking_status || 'Pending',
                    paymentStatus: transaction.payment_status || 'Partial',
                    dateBooked: transaction.created_at ? transaction.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                    rawTransaction: {
                        ...transaction,
                        extension_history: extensions
                    }
                };
            });
            
            setCurrentReservations(transformedReservations);
            setShowReservationsModal(true);
          } else {
            setReservationCount(0);
            alert("You don't have any reservations yet. Make your first reservation!");
          }
        } else {
          setReservationCount(0);
          alert("Failed to load reservations: " + (result.message || 'Unknown error'));
        }
        
      } catch (apiError) {
        console.error('API call failed, trying fallback:', apiError);
        setReservationCount(0);
        await fetchReservationsFallback();
      }
      
    } catch (error) {
      console.error('Fetch reservations error:', error);
      setReservationCount(0);
      alert("Cannot load reservations. Please try again later.");
    }
  };

  // Fallback method
  const fetchReservationsFallback = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userReservations') || '{}');
      const customerName = user?.fullName || user?.name || user?.username || userData.fullName;
      const contactNumber = user?.contactNumber || user?.phone || userData.contactNumber;
      
      if (!customerName || !contactNumber) {
        alert("Unable to find your reservation details. Please make sure your profile is complete.");
        setReservationCount(0);
        return;
      }
      
      const response = await api.get(
        `/api/transactions/customer`,
        {
          params: {
            customer_name: customerName,
            contact_number: contactNumber
          }
        }
      );
      
      const result = response.data;
      
      if (result.success && result.data.length > 0) {
        const transformed = result.data.map(transaction => {
             let extensions = transaction.extensions || [];
             
             if (extensions.length === 0 && transaction.extension_history) {
                 if (typeof transaction.extension_history === 'string') {
                     try {
                         extensions = JSON.parse(transaction.extension_history);
                     } catch (e) {
                         console.log(e);
                          extensions = [];
                     }
                 } else if (Array.isArray(transaction.extension_history)) {
                     extensions = transaction.extension_history;
                 }
             }

            return {
                id: transaction.id,
                transactionId: transaction.id,
                reservationNumber: transaction.transaction_ref,
                amenities: transaction.reservations?.map(r => r.amenity_name) || [],
                checkInDate: transaction.reservations?.[0]?.check_in_date || transaction.check_in_date,
                checkOutDate: transaction.reservations?.[0]?.check_out_date || transaction.check_out_date,
                totalAmount: parseFloat(transaction.total_amount) || 0,
                downpayment: parseFloat(transaction.downpayment) || 0,
                balance: parseFloat(transaction.balance) || 0,
                status: transaction.booking_status || 'Pending',
                paymentStatus: transaction.payment_status || 'Partial',
                dateBooked: transaction.created_at ? transaction.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                rawTransaction: {
                    ...transaction,
                    extension_history: extensions
                }
            };
        });
        
        setCurrentReservations(transformed);
        setShowReservationsModal(true);
        
        localStorage.setItem('userReservations', JSON.stringify({
          fullName: customerName,
          contactNumber: contactNumber
        }));
      } else {
        setReservationCount(0);
        alert("No reservations found. Make your first reservation!");
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      setReservationCount(0);
      alert("Cannot load reservations. Please try again later.");
    }
  };

  const handleCancelReservation = async (reservation) => {
    setReservationToCancel(reservation);
  };

  const confirmCancelReservation = async () => {
    if (reservationToCancel) {
      try {
        const response = await api.put(`/api/transactions/${reservationToCancel.transactionId}/cancel`);
        const result = response.data;

        if (result.success) {
          // Update the list locally to reflect status change immediately
          setCurrentReservations(prev => prev.map(r => {
             if (r.id === reservationToCancel.id) {
               return { ...r, status: 'Cancelled' };
             }
             return r;
          }));

          alert(`Reservation ${reservationToCancel.reservationNumber} has been cancelled.`);
        } else {
          alert("Failed to cancel reservation: " + result.message);
        }
      } catch (error) {
        console.error('Cancel reservation error:', error);
        alert("Failed to cancel reservation. Please try again.");
      }
      setReservationToCancel(null);
    }
  };

  const cancelCancelReservation = () => {
    setReservationToCancel(null);
  };

  const removeImagePreview = () => {
    setImagePreview(null);
    setReservationForm(prev => ({
      ...prev,
      paymentScreenshot: null
    }));
    const fileInput = document.querySelector('input[name="paymentScreenshot"]');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col font-body">
      <Header user={user} onLogout={handleLogout} />

      <HeroSection
        title="Your Reservations"
        description="Manage your bookings and create new reservations at La Piscina Resort."
        backgroundImageUrl={backgroundImageUrl}
      />

      <ActionButtons
        onViewReservations={fetchReservations}
        onOpenCart={() => setShowCartModal(true)}
        cartCount={cart.length}
        reservationCount={reservationCount}
      />

      <main className="flex-1 w-full bg-lp-light-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          {!isAuthenticated && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Note:</strong> You are not logged in. Your cart items will be saved as a guest. Log in to save them to your account.
              </p>
            </div>
          )}
          
          <ReservationForm
            reservationForm={reservationForm}
            formErrors={formErrors}
            imagePreview={imagePreview}
            cart={cart}
            amenities={amenities}
            calculateTotal={calculateTotal}
            calculateDownpayment={calculateDownpayment}
            handleReservationInputChange={handleReservationInputChange}
            handleReservationSubmit={handleReservationSubmit}
            removeImagePreview={removeImagePreview}
          />
        </div>
      </main>

      <ReservationsModal
        isOpen={showReservationsModal}
        onClose={() => setShowReservationsModal(false)}
        reservations={visibleReservations}
        onCancelReservation={handleCancelReservation}
        onDeleteHistory={handleDeleteHistory}
      />

      <CartModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        cart={cart}
        amenities={amenities}
        removeFromCart={removeFromCart}
        adjustQuantity={adjustQuantity}
        calculateTotal={calculateTotal}
        calculateDownpayment={calculateDownpayment}
        setCart={setCart}
      />

      <CancellationModal
        reservation={reservationToCancel}
        onConfirm={confirmCancelReservation}
        onCancel={cancelCancelReservation}
      />

      <Footer />
    </div>
  );
};

export default Reservations;
