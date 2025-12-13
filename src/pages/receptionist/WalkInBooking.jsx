import React, { useState, useEffect } from 'react';
import api from '../../config/axios';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { WalkInConfirmationModal, WalkInSuccessModal } from '../../components/WalkinBookingComponents/WalkInModal.jsx';
import WalkInForm from '../../components/WalkinBookingComponents/WalkInForm.jsx';
import WalkInCart from '../../components/WalkinBookingComponents/WalkInCart.jsx';
import WalkInAmenities from '../../components/WalkinBookingComponents/WalkInAmenities.jsx';
import WalkInTable from '../../components/WalkinBookingComponents/WalkInTable.jsx';

const ToastNotification = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[2000] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border-l-4 animate-slideIn bg-white ${type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
      <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
      </div>
      <div><h4 className={`font-bold ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{type === 'success' ? 'Success!' : 'Error'}</h4><p className="text-sm text-gray-600 font-medium">{message}</p></div>
      <button onClick={onClose} className="ml-4 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"><X size={18} /></button>
    </div>
  );
};

const WalkInBooking = () => {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [formData, setFormData] = useState({ fullName: '', contactNumber: '', address: '', checkInDate: '', checkOutDate: '', numGuest: '' }); 
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [toast, setToast] = useState(null); 
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [dateError, setDateError] = useState('');
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchAmenities = async () => { 
      try { 
        let url = '/api/amenities';
        const params = {};

        if (formData.checkInDate) {
            url = '/api/transactions/check-availability';
            params.checkIn = formData.checkInDate;

            if (formData.checkOutDate) {
                params.checkOut = formData.checkOutDate;
            } else {
                const startDate = new Date(formData.checkInDate);
                startDate.setMinutes(startDate.getMinutes() + 1);
                const year = startDate.getFullYear();
                const month = String(startDate.getMonth() + 1).padStart(2, '0');
                const day = String(startDate.getDate()).padStart(2, '0');
                const hours = String(startDate.getHours()).padStart(2, '0');
                const minutes = String(startDate.getMinutes()).padStart(2, '0');
                params.checkOut = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
        }
        const res = await api.get(url, { params }); 
        if (res.data.success) {
            setAmenities(Array.isArray(res.data.data) ? res.data.data : []);
        }
      } catch (e) { 
          console.error("Failed to fetch amenities:", e); 
      } 
  };
  
  useEffect(() => { fetchAmenities(); }, [formData.checkInDate, formData.checkOutDate]);

  useEffect(() => {
    if (formData.checkInDate && formData.checkOutDate) {
      if (new Date(formData.checkOutDate) <= new Date(formData.checkInDate)) setDateError('Check-out must be after Check-in.');
      else setDateError('');
    }
  }, [formData.checkInDate, formData.checkOutDate]);

  const calculateTotal = () => {
    let days = 1;
    if (formData.checkInDate && formData.checkOutDate) {
        const start = new Date(formData.checkInDate);
        const end = new Date(formData.checkOutDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        days = diffDays > 0 ? diffDays : 1;
    }

    const amenitiesCost = cart.reduce((sum, i) => sum + (i.amenity_price * i.quantity), 0) * days;
    const guests = parseInt(formData.numGuest) || 0;
    const entranceFee = guests * 50 * days;

    return amenitiesCost + entranceFee;
  };

  const handleFinalConfirm = async () => {
    setLoading(true); 
    try {
      const fd = new FormData();
      
      fd.append('numGuest', formData.numGuest || 0); 
      
      Object.keys(formData).forEach(k => {
          if (k !== 'numGuest') fd.append(k, formData[k]); 
      });

      const finalTotal = calculateTotal();

      fd.append('booking_type', 'Walk-in'); 
      fd.append('bookingStatus', 'Confirmed'); 
      fd.append('paymentStatus', 'Fully Paid');
      fd.append('totalAmount', finalTotal); 
      fd.append('downpayment', finalTotal);
      fd.append('balance', 0);
      fd.append('cart', JSON.stringify(cart));
      
      const res = await api.post('/api/transactions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      if (res.data.success) { 
          setTransactionRef(res.data.transaction_ref); 
          setShowConfirmModal(false); 
          setShowSuccess(true); 
          showToast("Booking created successfully!", 'success');
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to create booking.";
      showToast(msg, 'error'); 
    } 
    finally { setLoading(false); }
  };

  const handleCloseSuccess = () => { 
      setShowSuccess(false); 
      setFormData({ fullName: '', contactNumber: '', address: '', checkInDate: '', checkOutDate: '', numGuest: '' }); 
      setCart([]); 
      setTableRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6 max-w-9xl mx-auto pb-12 relative">
        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <WalkInConfirmationModal 
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={handleFinalConfirm}
            formData={formData}
            cart={cart}
            total={calculateTotal()}
            loading={loading}
        />

        <WalkInSuccessModal
            isOpen={showSuccess}
            onClose={handleCloseSuccess}
            transactionRef={transactionRef}
        />

        <div className="flex justify-between items-center mb-2">
          <div><h1 className="text-2xl font-bold text-gray-900">Walk-in Booking</h1><p className="text-sm text-gray-500">Create instant bookings.</p></div>
        </div>
        
        <div className="flex flex-col gap-6">
            <WalkInForm formData={formData} setFormData={setFormData} dateError={dateError} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                <div className="xl:col-span-2">
                    <WalkInAmenities amenities={amenities} cart={cart} setCart={setCart} searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
                </div>
                <div className="xl:col-span-1">
                    <WalkInCart 
                        cart={cart} 
                        setCart={setCart} 
                        total={calculateTotal()} 
                        dateError={dateError} 
                        setShowConfirmModal={setShowConfirmModal} 
                        formData={formData}
                        amenities={amenities} 
                    />
                </div>
            </div>
        </div>
        
        <div className="pt-4">
            <WalkInTable refreshTrigger={tableRefreshTrigger} />
        </div>
    </div>
  );
};

export default WalkInBooking;
