import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Clock, History, XCircle, Eye, CreditCard, User, MapPin, Phone, ChevronRight } from 'lucide-react';

// Added onDeleteAllHistory to props
const ReservationsModal = ({ isOpen, onClose, reservations, onCancelReservation, onDeleteHistory, onDeleteAllHistory }) => {
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
      case 'Confirmed': case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'Check-in': case 'Checked-In': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelled': case 'Declined': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    return <span className="text-gray-400 text-xs">-</span>;
  };

  const ReceiptModal = ({ reservation, onClose }) => {
    if (!reservation) return null;
    const tx = reservation.rawTransaction || {};
    const cartItems = tx.reservations || []; 
    
    const start = new Date(reservation.checkInDate);
    const end = new Date(reservation.checkOutDate);
    let days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) || 1;
    if (days < 1) days = 1;


    const amenitiesTotal = cartItems.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    const entranceFeeTotal = tx.num_guest > 0 ? (tx.num_guest * 50) : 0;
    const dailyTotal = amenitiesTotal + entranceFeeTotal;

    const extensions = getExtensionData(reservation);

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]">
          <div className="bg-lp-orange p-4 flex justify-between items-start flex-shrink-0">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-white" />
                Reservation Summary
              </h3>
              <p className="text-white/80 text-[10px] mt-0.5">{reservation.reservationNumber}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-4 flex-1 custom-scrollbar overscroll-contain">
            <div className="flex justify-center mb-4">
               <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(reservation.status)}`}>
                 {reservation.status}
               </span>
            </div>

            <div className="space-y-2 mb-4 pb-4 border-b border-dashed border-gray-200 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold">{tx.customer_name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{tx.contact_number}</span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                <span>{tx.customer_address}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs space-y-1.5 border border-gray-100">
               <div className="flex justify-between">
                 <span className="text-gray-500">Check-in:</span>
                 <span className="font-medium text-gray-900">{formatDateTime(reservation.checkInDate)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-500">Check-out:</span>
                 <span className="font-medium text-gray-900">{formatDateTime(reservation.checkOutDate)}</span>
               </div>
            </div>

            <div className="space-y-3 mb-4">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Breakdown</h4>
              
              {/* Amenities List */}
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 w-5 h-5 flex items-center justify-center rounded-[4px] text-[10px] font-bold">
                      {item.quantity}
                    </span>
                    <span className="text-gray-700 font-medium truncate max-w-[140px]">{item.amenity_name}</span>
                  </div>
                  <span className="text-gray-900 font-semibold">₱{(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString()}</span>
                </div>
              ))}

              {/* Entrance Fee */}
              {tx.num_guest > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-50 text-blue-600 w-5 h-5 flex items-center justify-center rounded-[4px] text-[10px] font-bold">
                      {tx.num_guest}
                    </span>
                    <span className="text-gray-700 font-medium">Entrance Fee (₱50)</span>
                  </div>
                  <span className="text-gray-900 font-semibold">₱{(tx.num_guest * 50).toLocaleString()}</span>
                </div>
              )}

              {/* --- ADDED: DAILY TOTAL --- */}
              <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-600 font-bold uppercase tracking-tight">Total (Per Night)</span>
                  <span className="text-gray-900 font-bold">₱{dailyTotal.toLocaleString()}</span>
              </div>

              {/* --- DURATION MULTIPLIER --- */}
              <div className="flex justify-between items-center text-xs bg-orange-50/50 p-1.5 rounded border border-orange-100 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-600 w-5 h-5 flex items-center justify-center rounded-[4px] text-[10px] font-bold">
                      {days}
                    </span>
                    <span className="text-gray-700 font-medium">Duration of Stay</span>
                  </div>
                  <span className="text-orange-600 font-bold italic">x {days} Day{days > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 pt-3 space-y-2 text-sm">
              {extensions.map((ext, i) => (
                <div key={i} className="flex justify-between text-purple-700 text-xs bg-purple-50 p-1.5 rounded">
                  <span>Ext (+{ext.hours}hrs)</span>
                  <span>+₱{parseFloat(ext.additional_cost).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-gray-900 font-bold text-base pt-1">
                <span>Grand Total</span>
                <span>₱{reservation.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-orange-50 p-2.5 rounded-lg border border-orange-100 mt-3">
                <div className="flex flex-col">
                   <span className="text-orange-800 font-bold text-xs">Downpayment (20%)</span>
                </div>
                <span className="text-base font-extrabold text-lp-orange">₱{reservation.downpayment.toLocaleString()}</span>
              </div>
               <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200 mt-1">
                <span className="text-gray-600 font-bold text-xs">Balance</span>
                <span className="text-sm font-bold text-gray-800">₱{reservation.balance.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-lp-orange text-white rounded-lg hover:bg-lp-orange-hover text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-3 md:p-4 font-body animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
          
          <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-white flex-shrink-0">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">My Reservations</h3>
              <p className="text-gray-500 text-sm hidden sm:block">Manage bookings and view history</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl font-bold hover:bg-gray-100 w-9 h-9 rounded-full flex items-center justify-center transition-colors">×</button>
          </div>

          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button onClick={() => setActiveTab('active')} className={`flex-1 py-3 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 ${activeTab === 'active' ? 'text-lp-orange border-b-2 border-lp-orange bg-orange-50/50' : 'text-gray-500 hover:bg-gray-50 transition-colors'}`}>
              <Clock className="w-4 h-4" /> Active <span className="hidden sm:inline">Bookings</span> <span className="bg-gray-100 text-xs rounded-full px-2 py-0.5">{activeReservations.length}</span>
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 ${activeTab === 'history' ? 'text-lp-orange border-b-2 border-lp-orange bg-orange-50/50' : 'text-gray-500 hover:bg-gray-50 transition-colors'}`}>
              <History className="w-4 h-4" /> History <span className="bg-gray-100 text-xs rounded-full px-2 py-0.5">{historyReservations.length}</span>
            </button>
          </div>

          <div className="flex-1 bg-gray-50 overflow-y-auto custom-scrollbar p-2 sm:p-4 overscroll-contain">
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 min-h-[300px]">
                <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                    {activeTab === 'active' ? <Clock className="w-8 h-8 text-gray-300" /> : <History className="w-8 h-8 text-gray-300" />}
                </div>
                <p className="text-gray-900 font-medium text-lg">No {activeTab} bookings</p>
                <p className="text-gray-500 text-sm">You don't have any records in this tab yet.</p>
              </div>
            ) : (
              <>
                {/* --- ADDED: CLEAR HISTORY BUTTON (Shows on Desktop & Mobile) --- */}
                {activeTab === 'history' && (
                    <div className="flex justify-end mb-3">
                        <button
                            onClick={onDeleteAllHistory}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm hover:bg-red-50 hover:border-red-300 transition-all"
                        >
                            <Trash2 size={14} /> Clear All History
                        </button>
                    </div>
                )}

                {/* --- DESKTOP VIEW (Table) --- */}
                <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ref</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Extensions</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {currentList.map((res) => (
                        <tr key={res.id} className="hover:bg-orange-50/30 transition-colors group">
                          <td className="px-4 py-4 whitespace-nowrap text-xs font-mono font-bold text-gray-600">{res.reservationNumber}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                            <div className="flex flex-col">
                                <span>{res.amenities[0]}</span>
                                {res.amenities.length > 1 && <span className="text-xs text-gray-500">+{res.amenities.length - 1} more</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs">
                            <div className="flex flex-col gap-1">
                                <span className="text-green-700 font-medium bg-green-50 px-1.5 rounded w-fit">In: {formatDateTime(res.checkInDate)}</span>
                                <span className="text-orange-700 font-medium bg-orange-50 px-1.5 rounded w-fit">Out: {formatDateTime(res.checkOutDate)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {renderExtensionDetails(res)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-800">₱{res.totalAmount.toLocaleString()}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wide ${getStatusColor(res.status)}`}>{res.status}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-1">
                               <button 
                                  onClick={() => setSelectedReceipt(res)} 
                                  className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors"
                                  title="View Summary"
                               >
                                  <Eye className="w-4 h-4" />
                               </button>

                              {activeTab === 'active' && res.status === 'Pending' && (
                                <button onClick={() => onCancelReservation(res)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Cancel Reservation">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                              {activeTab === 'history' && (
                                <button onClick={() => onDeleteHistory(res.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Remove from history">
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

                {/* --- MOBILE/TABLET VIEW (Cards) --- */}
                <div className="lg:hidden space-y-3">
                  {currentList.map((res) => (
                    <div key={res.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:border-orange-200 transition-colors">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                               <span className="font-mono text-xs font-bold text-gray-500">{res.reservationNumber}</span>
                           </div>
                           <h4 className="font-bold text-gray-800 text-sm">
                                {res.amenities[0]} {res.amenities.length > 1 && <span className="text-gray-400 font-normal">+{res.amenities.length - 1} more</span>}
                           </h4>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wide ${getStatusColor(res.status)}`}>
                            {res.status}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-3">
                          <div className="col-span-2 sm:col-span-1">
                              <p className="text-gray-400 mb-0.5">Check-in</p>
                              <p className="font-medium text-gray-700">{formatDateTime(res.checkInDate)}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                              <p className="text-gray-400 mb-0.5">Check-out</p>
                              <p className="font-medium text-gray-700">{formatDateTime(res.checkOutDate)}</p>
                          </div>
                          {getExtensionData(res).length > 0 && (
                             <div className="col-span-2 bg-purple-50 p-2 rounded-lg border border-purple-100 flex items-center justify-between">
                                  <span className="text-purple-700 font-bold">Extension Added</span>
                                  {renderExtensionDetails(res)}
                             </div>
                          )}
                      </div>

                      {/* Footer / Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex flex-col">
                             <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Total Amount</span>
                             <span className="text-base font-bold text-gray-900">₱{res.totalAmount.toLocaleString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                              {activeTab === 'active' && res.status === 'Pending' && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onCancelReservation(res); }} 
                                    className="p-2 text-red-600 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100"
                                    title="Cancel"
                                >
                                    <XCircle size={16} />
                                </button>
                              )}
                              
                              {activeTab === 'history' && (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteHistory(res.id); }} 
                                    className="p-2 text-gray-400 bg-gray-50 rounded-lg border border-gray-200 hover:text-red-600 hover:border-red-200"
                                    title="Delete"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              )}

                              <button 
                                  onClick={() => setSelectedReceipt(res)}
                                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:border-blue-300 hover:text-blue-600 text-xs font-bold transition-all"
                              >
                                  View Details <ChevronRight size={14} />
                              </button>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-3 sm:p-4 border-t border-gray-200 bg-white flex justify-end flex-shrink-0">
            <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-bold transition-colors">Close Window</button>
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