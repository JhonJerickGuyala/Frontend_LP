import React, { useState, useEffect } from 'react';
import { User, Calendar, AlertCircle, Clock } from 'lucide-react';

const WalkInForm = ({ formData, setFormData, errors = {} }) => {
    const [durationHours, setDurationHours] = useState('');

    // Check immediately if In and Out are exactly the same
    const isSameDateTime = formData.checkInDate && formData.checkOutDate && formData.checkInDate === formData.checkOutDate;

    useEffect(() => {
        if (formData.checkInDate && durationHours) {
            const checkIn = new Date(formData.checkInDate);
            const hoursToAdd = parseInt(durationHours, 10);

            if (!isNaN(checkIn.getTime()) && !isNaN(hoursToAdd) && hoursToAdd > 0) {
                checkIn.setHours(checkIn.getHours() + hoursToAdd);
                
                const year = checkIn.getFullYear();
                const month = String(checkIn.getMonth() + 1).padStart(2, '0');
                const day = String(checkIn.getDate()).padStart(2, '0');
                const hours = String(checkIn.getHours()).padStart(2, '0');
                const minutes = String(checkIn.getMinutes()).padStart(2, '0');
                
                const computedCheckOut = `${year}-${month}-${day}T${hours}:${minutes}`;
                
                setFormData(prev => ({ ...prev, checkOutDate: computedCheckOut }));
            }
        }
    }, [formData.checkInDate, durationHours, setFormData]);

    const handleCheckInChange = (e) => {
        setFormData({ ...formData, checkInDate: e.target.value });
    };

    const handleCheckOutChange = (e) => {
        setFormData({ ...formData, checkOutDate: e.target.value });
        setDurationHours('');
    };

    const handleDurationChange = (e) => {
        const val = e.target.value;
        if (val === '' || /^[0-9]+$/.test(val)) {
            setDurationHours(val);
        }
    };

    const handleGuestChange = (e) => {
        const val = e.target.value;
        if (val === '' || /^[0-9]+$/.test(val)) {
            setFormData({ ...formData, numGuest: val });
        }
    };

    const getInputClass = (fieldName) => {
        // Validation: Error from props OR (if field is checkOutDate and logic detects same date)
        const hasError = errors[fieldName] || (fieldName === 'checkOutDate' && isSameDateTime);

        return `block w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all sm:text-sm ${
            hasError ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'border-gray-200'
        }`;
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start font-sans">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <User className="w-5 h-5 text-orange-500"/> 
                    Customer Details
                </h3>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input type="text" placeholder="Juan Dela Cruz" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className={getInputClass('fullName')} />
                        {errors.fullName && <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.fullName}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                        <input type="tel" placeholder="09XXXXXXXXX" value={formData.contactNumber} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 11); setFormData({...formData, contactNumber: val}); }} className={getInputClass('contactNumber')} />
                        {errors.contactNumber && <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.contactNumber}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                        <textarea placeholder="Barangay, City, Province" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={`${getInputClass('address')} resize-none`} rows="2" />
                        {errors.address && <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.address}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests * <span className='text-xs text-gray-400 font-normal ml-1'>(₱50/head/day)</span></label>
                        <input type="text" inputMode="numeric" placeholder="Total Pax" value={formData.numGuest || ''} onChange={handleGuestChange} className={getInputClass('numGuest')} />
                        {errors.numGuest && <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.numGuest}</p>}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <Calendar className="w-5 h-5 text-orange-500"/> 
                    Schedule
                </h3>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date *</label>
                        <input type="datetime-local" value={formData.checkInDate} onChange={handleCheckInChange} className={getInputClass('checkInDate')} />
                        {errors.checkInDate && <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.checkInDate}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <Clock size={16} className="text-orange-500"/> Duration (Hours) 
                            <span className="text-xs text-gray-400 font-normal">(Auto-computes Check-out)</span>
                        </label>
                        <input type="text" inputMode="numeric" placeholder="e.g. 22" value={durationHours} onChange={handleDurationChange} disabled={!formData.checkInDate} className={`block w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all sm:text-sm border-gray-200 ${!formData.checkInDate ? 'bg-gray-50 cursor-not-allowed' : ''}`} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date *</label>
                        <input type="datetime-local" value={formData.checkOutDate} onChange={handleCheckOutChange} className={getInputClass('checkOutDate')} min={formData.checkInDate} />
                        
                        {/* Display existing errors from parent OR immediate logic error */}
                        {(errors.checkOutDate || isSameDateTime) && (
                            <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                                <AlertCircle size={12}/> 
                                {errors.checkOutDate ? errors.checkOutDate : "Check-out cannot be the same as Check-in."}
                            </p>
                        )}
                    </div>
                </div>

                {errors.dateLogic && (
                    <div className="flex items-center gap-2 mt-4 text-red-600 bg-red-50 p-3 rounded-lg text-xs font-semibold border border-red-100">
                        <AlertCircle size={16} /> {errors.dateLogic}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WalkInForm;
