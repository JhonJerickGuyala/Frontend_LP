import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Header.jsx";
import Footer from "../../components/Footer.jsx";
import api from "../../config/axios"; 
import HeroSection from "../../components/ReservationComponents/HeroSection.jsx";
import ActionButtons from "../../components/ReservationComponents/ActionButtons.jsx";
import ReservationForm from "../../components/ReservationComponents/ReservationForm.jsx";
import CartModal from "../../components/ReservationComponents/CartModal.jsx";
import ReservationsModal from "../../components/ReservationComponents/ReservationsModal.jsx";
import CancellationModal from "../../components/ReservationComponents/CancellationModal.jsx"; 
import { AlertCircle, CheckCircle, X } from "lucide-react"; // Make sure to import icons if needed, or use text

// --- INTERNAL COMPONENTS FOR TOAST & CONFIRM ---

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />;

  return (
    <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${bgColor} animate-in slide-in-from-right duration-300`}>
      {icon}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1">
        <X size={16} />
      </button>
    </div>
  );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-5 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg leading-6 font-bold text-gray-900">{title}</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:w-auto sm:text-sm transition-colors"
            onClick={onConfirm}
          >
            Yes, Confirm
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const Reservations = () => {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedAmenity = location.state?.selectedAmenity;
  const backgroundImageUrl = "/images/bg.jpg";

  const [cart, setCart] = useState([]);
  const [amenities, setAmenities] = useState([]); 
  const [showCartModal, setShowCartModal] = useState(false);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState(null);
  const [currentReservations, setCurrentReservations] = useState([]);
  
  const [hiddenHistoryIds, setHiddenHistoryIds] = useState([]);

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Confirm Modal State
  const [confirmDialog, setConfirmDialog] = useState({ 
    show: false, 
    title: '', 
    message: '', 
    onConfirm: () => {} 
  });

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

  // Helper to show toast
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  // Helper to close toast
  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // Helper to close confirm dialog
  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, show: false }));
  };

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
    
    setLoadedUserKey(storageKey);
  }, [user]);

  // Save Cart based on User Identity
  useEffect(() => {
    const userId = user?.id || user?._id || user?.userId;
    const currentKey = userId ? `cart_${userId}` : "cart_guest";
    
    if (loadedUserKey === currentKey) {
      console.log(`💾 Saving cart to key: ${currentKey}`, cart);
      localStorage.setItem(currentKey, JSON.stringify(cart));
    }
  }, [cart, user, loadedUserKey]);

  useEffect(() => {
    if (user) {
      const userId = user.id || user._id || user.userId;
      const storageKey = `hidden_history_${userId}`;
      
      const storedHiddenIds = localStorage.getItem(storageKey);
      if (storedHiddenIds) {
        try {
          setHiddenHistoryIds(JSON.parse(storedHiddenIds));
        } catch (e) {
          console.error("Error parsing hidden history:", e);
          setHiddenHistoryIds([]);
        }
      } else {
          setHiddenHistoryIds([]);
      }
    }
  }, [user]);

  const fetchAvailability = async () => {
    try {
      if (!reservationForm.checkInDate) return;

      let url = '/api/transactions/check-availability';
      const params = {};

      params.checkIn = reservationForm.checkInDate;

      if (reservationForm.checkOutDate) {
        params.checkOut = reservationForm.checkOutDate;
      } else {
        const startDate = new Date(reservationForm.checkInDate);
        startDate.setMinutes(startDate.getMinutes() + 1);

        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const hours = String(startDate.getHours()).padStart(2, '0');
        const minutes = String(startDate.getMinutes()).padStart(2, '0');
        
        const formattedCheckOut = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        params.checkOut = formattedCheckOut;
      }

      console.log("🔍 Checking Availability params:", params); 

      const res = await api.get(url, { params });
      
      if (res.data.success) {
        setAmenities(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (e) {
      console.error("Failed to fetch amenities availability:", e);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [reservationForm.checkInDate, reservationForm.checkOutDate]);


  // 1. Modified function to accept isSilent parameter
  const loadReservationsOnPageLoad = async (isSilent = false) => {
    if (!user || (!isSilent && isLoadingReservations)) return;
    
    try {
      if (!isSilent) setIsLoadingReservations(true);
      
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
        if (!isSilent) setReservationCount(0);
      }
    } catch (error) {
      console.log('📱 Auto-load reservations error:', error);
    } finally {
      if (!isSilent) setIsLoadingReservations(false);
    }
  };

  // 2. Modified useEffect to include Polling (setInterval)
  useEffect(() => {
    let intervalId;

    if (user && isAuthenticated) {
      loadReservationsOnPageLoad(false);

      intervalId = setInterval(() => {
        loadReservationsOnPageLoad(true);
      }, 3000); 

    } else {
      setReservationCount(0);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, isAuthenticated]);

  useEffect(() => {
    const activeStatuses = ['Pending', 'Confirmed', 'Paid', 'Check-in', 'Checked-In'];
    const activeCount = currentReservations.filter(r => activeStatuses.includes(r.status)).length;
    setReservationCount(activeCount);
  }, [currentReservations]);

  // --- REPLACED WINDOW.CONFIRM WITH CUSTOM MODAL ---
  const handleDeleteHistory = (id) => {
    setConfirmDialog({
      show: true,
      title: "Remove from History",
      message: "Are you sure you want to remove this booking from your history view?",
      onConfirm: () => {
        setHiddenHistoryIds(prev => {
          const newHiddenIds = [...prev, id];
          
          if (user) {
              const userId = user.id || user._id || user.userId;
              const storageKey = `hidden_history_${userId}`;
              localStorage.setItem(storageKey, JSON.stringify(newHiddenIds));
          }
          
          return newHiddenIds;
        });
        showToast("Booking removed from history.", "success");
        closeConfirm();
      }
    });
  };

  // --- REPLACED WINDOW.CONFIRM WITH CUSTOM MODAL ---
  const handleDeleteAllHistory = () => {
    setConfirmDialog({
      show: true,
      title: "Clear All History",
      message: "Are you sure you want to clear your entire reservation history? This will hide them from your view.",
      onConfirm: () => {
        const historyStatuses = ['Cancelled', 'Declined', 'Completed', 'Checkout', 'Check-out'];
        
        const historyIdsToHide = currentReservations
            .filter(r => historyStatuses.includes(r.status) && !hiddenHistoryIds.includes(r.id))
            .map(r => r.id);

        if (historyIdsToHide.length === 0) {
            closeConfirm();
            return;
        }

        setHiddenHistoryIds(prev => {
            const newHiddenIds = [...prev, ...historyIdsToHide];
            
            if (user) {
                const userId = user.id || user._id || user.userId;
                const storageKey = `hidden_history_${userId}`;
                localStorage.setItem(storageKey, JSON.stringify(newHiddenIds));
            }
            
            return newHiddenIds;
        });
        showToast("All history cleared.", "success");
        closeConfirm();
      }
    });
  };

  const visibleReservations = currentReservations.filter(r => !hiddenHistoryIds.includes(r.id));

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

    const guestCount = parseInt(reservationForm.numGuest) || 0;
    const entranceFeePerHead = 50;
    const totalEntranceFee = guestCount * entranceFeePerHead;

    const cartTotal = cart.reduce((total, item) => total + (item.amenity_price * item.quantity), 0);

    const grandTotal = (cartTotal + totalEntranceFee) * days;

    return grandTotal;
  };

  const calculateDownpayment = () => calculateTotal() * 0.2;

  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast("Please fix the form errors before submitting.", "error"); // Replaced alert
      return;
    }

    if (cart.length === 0) {
      showToast("Please add at least one amenity to your cart", "error"); // Replaced alert
      return;
    }

    const hasConflict = cart.some(item => {
        const amenityStatus = amenities.find(a => a.id === item.amenity_id);
        if (!amenityStatus) return false;
        
        return item.quantity > amenityStatus.slots_left;
    });

    if (hasConflict) {
        showToast("Some items exceed available slots. Check your cart.", "error"); // Replaced alert
        setShowCartModal(true); 
        return;
    }

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
        showToast("Reservation submitted successfully!", "success"); // Replaced alert
        
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
            loadReservationsOnPageLoad(false);
          }, 1000);
        }
        
      } else {
        showToast("Failed to submit reservation: " + (result.message || 'Unknown error'), "error"); // Replaced alert
      }
    } catch (error) {
      console.error('Reservation submission error:', error);
      showToast("Failed to submit reservation. Please try again.", "error"); // Replaced alert
    }
  };

  const handleAddToCart = (amenity) => {
    const exists = cart.find((item) => item.amenity_id === amenity.id);

    if (exists) {
      showToast(`${amenity.name} is already in your cart.`, "error"); // Replaced alert
      return;
    }

    if (cart.length >= 10) {
      showToast("You can only add up to 10 amenities.", "error"); // Replaced alert
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
    showToast("Item added to cart", "success");
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

  useEffect(() => {
    if (selectedAmenity && loadedUserKey) { 
      handleAddToCart(selectedAmenity);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [selectedAmenity, loadedUserKey]); 

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const fetchReservations = async () => {
    try {
      if (!user) {
        showToast("Please log in to view your reservations.", "error"); // Replaced alert
        setReservationCount(0);
        return;
      }

      const userId = user.id || user._id || user.userId;
      
      if (!userId) {
        showToast("User ID not found. Please log in again.", "error"); // Replaced alert
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
            showToast("You don't have any reservations yet.", "error"); // Replaced alert
          }
        } else {
          setReservationCount(0);
          showToast("Failed to load reservations.", "error"); // Replaced alert
        }
        
      } catch (apiError) {
        console.error('API call failed, trying fallback:', apiError);
        setReservationCount(0);
        await fetchReservationsFallback();
      }
      
    } catch (error) {
      console.error('Fetch reservations error:', error);
      setReservationCount(0);
      showToast("Cannot load reservations. Please try again later.", "error"); // Replaced alert
    }
  };

  const fetchReservationsFallback = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userReservations') || '{}');
      const customerName = user?.fullName || user?.name || user?.username || userData.fullName;
      const contactNumber = user?.contactNumber || user?.phone || userData.contactNumber;
      
      if (!customerName || !contactNumber) {
        showToast("Unable to find details. Profile incomplete.", "error"); // Replaced alert
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
        showToast("No reservations found.", "error"); // Replaced alert
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      setReservationCount(0);
      showToast("Cannot load reservations.", "error"); // Replaced alert
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
          setCurrentReservations(prev => prev.map(r => {
             if (r.id === reservationToCancel.id) {
               return { ...r, status: 'Cancelled' };
             }
             return r;
          }));

          showToast(`Reservation ${reservationToCancel.reservationNumber} cancelled.`, "success"); // Replaced alert
        } else {
          showToast("Failed to cancel: " + result.message, "error"); // Replaced alert
        }
      } catch (error) {
        console.error('Cancel reservation error:', error);
        showToast("Failed to cancel reservation.", "error"); // Replaced alert
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

      {/* --- TOAST NOTIFICATION --- */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={closeToast} 
        />
      )}

      {/* --- CONFIRMATION MODAL --- */}
      <ConfirmModal 
        isOpen={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />

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
        onDeleteAllHistory={handleDeleteAllHistory} 
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
