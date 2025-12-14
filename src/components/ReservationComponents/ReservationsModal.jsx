import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Clock, History, XCircle, Eye, CreditCard, User, MapPin, Phone } from 'lucide-react';

const ReservationsModal = ({ isOpen, onClose, reservations, onCancelReservation, onDeleteHistory }) => {
  const [activeTab, setActiveTab] = useState('active'); 
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeStatuses = ['Pending', 'Confirmed', 'Paid', 'Check-in', 'Checked-In'];
  const historyStatuses = ['Cancelled', 'Declined', 'Completed', 'Checkout', 'Check-out'];

  const activeReservations = reservations.filter(r => activeStatuses.includes(r.status));
  const historyReservations = reservations.filter(r => historyStatuses.includes(r.status));

  const currentList = activeTab === 'active' ? activeReservations : historyReservations;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': case 'Paid': return 'bg-green-100 text-green-800';
      case 'Check-in': case 'Checked-In': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': case 'Declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: true
    });
  };

  const getExtensionData = (reservation) => {
    const history = reservation.rawTransaction?.extension_history;
    if (!history) return [];
    
    let items = history;
    if (typeof history === 'string') {
      try { items = JSON.parse(history); } catch (e) { return []; }
    }
    return Array.isArray(items) ? items : [];
  };

  const renderExtensionDetails = (reservation) => {
    const items = getExtensionData(reservation);

    if (items.length > 0) {
      let totalHours = 0;
      let totalFees = 0;

      items.forEach(ext => {
        const hours = parseInt(ext.hours || ext.extended_hours || ext.duration || ext.extension_hours || 0);
        const price = parseFloat(ext.additional_cost || ext.price || ext.total_price || ext.amount || 0);
        totalHours += hours;
        totalFees += price;
      });

      if (totalHours === 0 && totalFees === 0) return <span className="text-gray-400">-</span>;

      return (
        <div className="flex flex-col items-start gap-1">
          {totalHours > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap">
              <Clock className="w-3 h-3 mr-1" />
              +{totalHours} hr{totalHours !== 1 ? 's' : ''}
            </span>
          )}
          {totalFees > 0 && (
             <span className="text-xs text-gray-600 font-medium ml-1">
               Added: <span className="text-gray-900 font-bold">+₱{totalFees.toLocaleString()}</span>
             </span>
          )}
        </div>
      );
    }
    return <span className="text-gray-400">-</span>;
  };

  const ReceiptModal = ({ reservation, onClose }) => {

    if (!reservation) return null;

    const tx = reservation.rawTransaction || {};
    const cartItems = tx.reservations || []; 
    
    const start = new Date(reservation.checkInDate);
    const end = new Date(reservation.checkOutDate);
    let days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) || 1;
    if (days < 1) days = 1;

    const extensions = getExtensionData(reservation);

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="bg-lp-orange p-5 flex justify-between items-start flex-shrink-0">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-white" />
                Reservation Summary
              </h3>
              <p className="text-white/80 text-xs mt-1">{reservation.reservationNumber}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
            <div className="flex justify-center mb-6">
               <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${getStatusColor(reservation.status)}`}>
                 {reservation.status}
               </span>
            </div>

            <div className="space-y-3 mb-6 pb-6 border-b border-dashed border-gray-200">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{tx.customer_name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{tx.contact_number}</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span>{tx.customer_address}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-2 border border-gray-100">
               <div className="flex justify-between">
                 <span className="text-gray-500">Check-in:</span>
                 <span className="font-medium text-gray-900">{formatDateTime(reservation.checkInDate)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-500">Check-out:</span>
                 <span className="font-medium text-gray-900">{formatDateTime(reservation.checkOutDate)}</span>
               </div>
               <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                 <span className="text-gray-500">Duration:</span>
                 <span className="font-bold text-lp-orange">{days} Day{days > 1 ? 's' : ''}</span>
               </div>
            </div>

            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Breakdown</h4>
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded text-xs font-bold">
                      {item.quantity}
                    </span>
                    <span className="text-gray-700 font-medium">{item.amenity_name}</span>
                  </div>
                  <span className="text-gray-900 font-semibold">₱{(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString()}</span>
                </div>
              ))}
              {tx.num_guest > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-50 text-blue-600 w-6 h-6 flex items-center justify-center rounded text-xs font-bold">
                      {tx.num_guest}
                    </span>
                    <span className="text-gray-700 font-medium">Entrance Fee (₱50)</span>
                  </div>
                  <span className="text-gray-900 font-semibold">₱{(tx.num_guest * 50).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
              {extensions.map((ext, i) => (
                <div key={i} className="flex justify-between text-purple-700 text-sm bg-purple-50 p-2 rounded">
                  <span>Extension (+{ext.hours}hrs)</span>
                  <span>+₱{parseFloat(ext.additional_cost).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-gray-900 font-bold text-lg pt-2">
                <span>Grand Total</span>
                <span>₱{reservation.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-orange-50 p-3 rounded-lg border border-orange-100 mt-4">
                <div className="flex flex-col">
                   <span className="text-orange-800 font-bold text-sm">Downpayment (20%)</span>
                   <span className="text-xs text-orange-600/70">Required to confirm</span>
                </div>
                <span className="text-xl font-extrabold text-lp-orange">₱{reservation.downpayment.toLocaleString()}</span>
              </div>
               <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                <span className="text-gray-600 font-bold text-sm">Remaining Balance</span>
                <span className="text-lg font-bold text-gray-800">₱{reservation.balance.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-lp-orange text-white rounded-lg hover:bg-lp-orange-hover font-medium transition-colors"
            >
              Close Summary
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-3 md:p-4 font-body">
        {/* Main Modal Container - Fixed Height */}
        <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-[85vh] max-h-[85vh] flex flex-col">
          
          {/* Header (Fixed) */}
          <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg flex-shrink-0">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">My Reservations</h3>
              <p className="text-gray-500 text-sm">Manage bookings and view history</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl font-bold hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center">×</button>
          </div>

          {/* Tabs (Fixed) */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button onClick={() => setActiveTab('active')} className={`flex-1 py-3 font-semibold flex items-center justify-center gap-2 ${activeTab === 'active' ? 'text-lp-orange border-b-2 border-lp-orange bg-orange-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Clock className="w-4 h-4" /> Active Bookings <span className="bg-gray-100 text-xs rounded-full px-2">{activeReservations.length}</span>
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 font-semibold flex items-center justify-center gap-2 ${activeTab === 'history' ? 'text-lp-orange border-b-2 border-lp-orange bg-orange-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
              <History className="w-4 h-4" /> Booking History <span className="bg-gray-100 text-xs rounded-full px-2">{historyReservations.length}</span>
            </button>
          </div>

          {/* Body (Scrollable) - Updated Class */}
          <div className={`flex-1 bg-gray-50 ${selectedReceipt ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 min-h-[300px]">
                <p className="text-gray-900 font-medium text-lg">No {activeTab} reservations found</p>
              </div>
            ) : (
              // REMOVED 'inline-block' to fix width issues
              <div className="min-w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-purple-50">Extensions</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentList.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{res.reservationNumber}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{res.amenities[0]} {res.amenities.length > 1 && `+${res.amenities.length - 1} more`}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div>In: {formatDateTime(res.checkInDate)}</div>
                          <div className="text-gray-500">Out: {formatDateTime(res.checkOutDate)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap bg-purple-50/30">
                          {renderExtensionDetails(res)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold">₱{res.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(res.status)}`}>{res.status}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                                onClick={() => setSelectedReceipt(res)} 
                                className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                title="View Summary"
                             >
                                <Eye className="w-4 h-4" />
                             </button>

                            {activeTab === 'active' && res.status === 'Pending' && (
                              <button onClick={() => onCancelReservation(res)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded" title="Cancel Reservation">
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            {activeTab === 'history' && (
                              <button onClick={() => onDeleteHistory(res.id)} className="text-gray-400 hover:text-red-600 px-2 py-1 rounded" title="Remove from history">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer (Fixed) */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg flex justify-end flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Close</button>
          </div>
        </div>
      </div>

      {selectedReceipt && (
        <ReceiptModal 
          reservation={selectedReceipt} 
          onClose={() => setSelectedReceipt(null)} 
        />
      )}
    </>
  );
};

export default ReservationsModal;
