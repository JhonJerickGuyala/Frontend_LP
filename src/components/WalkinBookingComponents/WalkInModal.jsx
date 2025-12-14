import { useState } from 'react';
import { 
  X, CheckCircle, AlertCircle, RefreshCw, User, 
  FileText, ZoomIn, ZoomOut, Clock, Layers, RotateCcw, Maximize,
  Plus, CreditCard, LogIn, Ban, LogOut, Eye, HelpCircle, ChevronRight, Calendar, Minus, Check
} from 'lucide-react';

const backendUrl = import.meta.env.VITE_API_URL;

const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x300?text=No+Image';
  if (imagePath.startsWith('http')) return imagePath;
  return `${backendUrl}/uploads/${imagePath}`;
};

// Helper to calculate days
const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start) || isNaN(end)) return 1;

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    return diffDays > 0 ? diffDays : 1;
};

// ==========================================
// 1. WALK-IN DETAILS MODAL (View Details)
// ==========================================
export const WalkInModal = ({ transaction, isOpen, onClose, onViewProof, onViewDetails, onStatusUpdate, onExtendBooking, loading }) => {
  if (!isOpen || !transaction) return null;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: '-', time: '' };
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  const getAmenitySummary = (transaction) => {
    if (!transaction.reservations || transaction.reservations.length === 0) return 'No amenities';
    return transaction.reservations.map(res => `${res.amenity_name} x${res.quantity}`).join(', ');
  };

  const getExtensionSummary = (transaction) => {
    const extensions = transaction.extensions || [];
    if (extensions.length === 0) {
      return { count: 0, cost: 0, base: parseFloat(transaction.total_amount || 0) };
    }
    const totalCost = extensions.reduce((sum, ext) => sum + parseFloat(ext.additional_cost || 0), 0);
    return {
      count: extensions.length,
      cost: totalCost,
      base: parseFloat(transaction.total_amount || 0) - totalCost
    };
  };

  const sched = transaction.reservations?.[0];
  const inDT = formatDateTime(sched?.check_in_date);
  const outDT = formatDateTime(sched?.check_out_date);
  
  // FIXED: Duration Calculation
  const duration = calculateDuration(sched?.check_in_date, sched?.check_out_date);

  const extInfo = getExtensionSummary(transaction);
  const isExtended = extInfo.cost > 0;
  
  // FIXED: Walk-in is ALWAYS Fully Paid automatically
  const paymentLabel = 'Fully Paid'; 
  
  const amenities = getAmenitySummary(transaction);

  return (
    // FIXED: Z-index adjusted and fixed inset used for full coverage
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* FIXED: Backdrop with blur covers entire screen */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-slideIn max-h-[90vh]">
        
        {/* UPDATED: Orange Header */}
        <div className="shrink-0 bg-[#F97316] px-6 py-4 border-b border-orange-600 flex items-center justify-between text-white shadow-md z-10">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText size={20} className="text-white"/> Walk-In Details
              </h3>
              <p className="text-xs text-orange-100 font-mono mt-0.5 opacity-90">{transaction.transaction_ref}</p>
            </div>
            <button onClick={onClose} disabled={loading} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white disabled:opacity-50">
              <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-gray-50/50 custom-scrollbar">
            {/* Customer Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="bg-orange-50 p-2.5 rounded-full border border-orange-100">
                  <User size={20} className="text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">{transaction.customer_name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600 font-medium">{transaction.contact_number}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Schedule</h4>
                </div>
                {/* Duration Badge */}
                <div className="bg-orange-50 border border-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    <Clock size={12}/> {duration} Night{duration > 1 ? 's' : ''}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Check In</p>
                    <p className="font-bold text-gray-800 text-sm bg-gray-100 px-2 py-1 rounded border border-gray-200 inline-block">{inDT.date} • {inDT.time}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-300" />
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Check Out</p>
                    <p className={`font-bold text-sm px-2 py-1 rounded border inline-block ${isExtended ? 'text-purple-600 bg-purple-50 border-purple-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
                      {outDT.date} • {outDT.time}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2"><Layers size={14}/> Amenities</h4>
                <button onClick={() => onViewDetails(transaction, 'amenities')} className="text-orange-600 text-xs font-bold hover:text-orange-800 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full transition-colors">
                  View <ChevronRight size={12} />
                </button>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">{amenities}</p>
            </div>

            {/* Extensions */}
            {isExtended && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-white p-1 rounded text-purple-600"><Plus size={14} /></div>
                    <h4 className="font-bold text-purple-800 text-sm uppercase tracking-wide">Extensions</h4>
                  </div>
                  <button onClick={() => onViewDetails(transaction, 'extensions')} className="text-purple-700 text-xs font-bold hover:text-purple-900 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-full transition-colors">
                    Details <ChevronRight size={12} />
                  </button>
                </div>
                <p className="text-sm text-purple-700 font-medium">
                  {extInfo.count} extension(s) added • Additional: <span className="font-bold">₱{extInfo.cost.toLocaleString()}</span>
                </p>
              </div>
            )}

            {/* Payment - AUTOMATIC FULLY PAID FOR WALKIN */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-gray-500" />
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Payment</h4>
                </div>
                <button 
                  onClick={() => onViewDetails(transaction, 'payment')} 
                  className="text-orange-600 text-xs font-bold hover:text-orange-800 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full transition-colors"
                >
                  Breakdown <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Status</span>
                  <span className="font-bold text-xs px-2 py-1 rounded border uppercase tracking-wider bg-green-100 text-green-700 border-green-200">
                    {paymentLabel}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dashed border-gray-200 mt-2">
                  <span className="font-bold text-gray-700">Total Paid</span>
                  <span className="font-extrabold text-xl text-green-600">
                    ₱{parseFloat(transaction.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Booking Status Badge (Confirmed/Checked-In etc) */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Booking Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    transaction.booking_status === 'Checked-In' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                    transaction.booking_status === 'Completed' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                    transaction.booking_status === 'Confirmed' ? 'bg-green-100 text-green-700 border-green-200' :
                    transaction.booking_status === 'Pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    'bg-red-100 text-red-600 border-red-200'
                  }`}>
                    {transaction.booking_status}
                  </span>
                </div>
                {transaction.proof_of_payment && (
                  <button onClick={() => onViewProof(transaction)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200 rounded-lg hover:shadow-md transition-all active:scale-95">
                    <Eye size={16} />
                    <span className="text-xs font-bold uppercase tracking-wide">See Proof</span>
                  </button>
                )}
            </div>
        </div>

        <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap gap-3">
              {transaction.booking_status === 'Confirmed' ? (
                <>
                  <button onClick={() => onStatusUpdate(transaction.id, 'Checked-In')} disabled={loading} className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-orange-200 disabled:opacity-50">
                    <LogIn size={18} /> Check In
                  </button>
                  <button onClick={() => onStatusUpdate(transaction.id, 'Cancelled')} disabled={loading} className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    <Ban size={18} />
                  </button>
                </>
              ) : transaction.booking_status === 'Checked-In' ? (
                <>
                  <button onClick={() => onExtendBooking(transaction)} disabled={loading} className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 hover:shadow-lg shadow-purple-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                    <Clock size={18} /> Extend
                  </button>
                  <button onClick={() => onStatusUpdate(transaction.id, 'Completed')} disabled={loading} className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 hover:shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                    <LogOut size={18} /> Check Out
                  </button>
                </>
              ) : (
                <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 border border-gray-300 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">
                  Close
                </button>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. ACTION MODAL
// ==========================================
export const ActionModal = ({ isOpen, type, transaction, onClose, onConfirm, loading }) => {
  if (!isOpen || !transaction) return null;
  const isConfirm = type === 'Confirmed';
  const isCancel = type === 'Cancelled';
  const isComplete = type === 'Completed';
  let title = 'Confirmation', message = 'Are you sure?', colorClass = 'bg-blue-600', Icon = HelpCircle, iconBg = 'bg-blue-100 text-blue-600';
  
  if (isConfirm) { title = 'Confirm Booking?'; message = `Confirm walk-in reservation for ${transaction.customer_name}.`; colorClass = 'bg-green-600'; Icon = CheckCircle; iconBg = 'bg-green-100 text-green-600'; } 
  else if (isCancel) { title = 'Cancel Booking?'; message = `Cancel booking for ${transaction.customer_name}? This cannot be undone.`; colorClass = 'bg-red-600'; Icon = Ban; iconBg = 'bg-red-100 text-red-600'; } 
  else if (isComplete) { title = 'Check Out Guest?'; message = `Complete booking for ${transaction.customer_name}? Ensure all keys are returned.`; colorClass = 'bg-orange-600'; Icon = LogOut; iconBg = 'bg-orange-100 text-orange-600'; }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full transform transition-all scale-100 border border-gray-100">
        <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${iconBg}`}><Icon size={32}/></div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{title}</h3>
        <p className="text-gray-500 text-center text-sm mb-6">{message}</p>
        <div className="flex gap-3"><button onClick={onClose} disabled={loading} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50">Cancel</button><button onClick={onConfirm} disabled={loading} className={`flex-1 py-3 text-white rounded-xl font-semibold shadow-lg ${colorClass} disabled:opacity-50`}>{loading ? 'Processing...' : 'Confirm'}</button></div>
      </div>
    </div>
  );
};

// ==========================================
// 3. PROOF MODAL
// ==========================================
export const ProofModal = ({ isOpen, transaction, onClose, imageErrors, onRetryLoad, onError }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isOpen || !transaction) return null;
  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
  const handleRotate = () => setRotation(r => r + 90);
  const handleReset = () => { setScale(1); setRotation(0); setPosition({ x: 0, y: 0 }); };
  const handleMouseDown = (e) => { if (scale > 1) { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); } };
  const handleMouseMove = (e) => { if (isDragging && scale > 1) { setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); } };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-[1400] bg-black/95 flex flex-col animate-fadeIn backdrop-blur-sm">
      <div className="flex justify-between items-center p-4 bg-black/40 absolute top-0 w-full z-50">
        <div className="text-white"><h3 className="font-bold text-lg flex items-center gap-2"><FileText size={20} className="text-orange-400"/> Proof of Payment</h3><p className="text-xs text-gray-400 font-mono">{transaction.transaction_ref}</p></div>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><X size={24} /></button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={(e) => { if(e.deltaY < 0) handleZoomIn(); else handleZoomOut(); }}>
        {imageErrors && imageErrors[transaction.id] ? (<div className="text-center"><AlertCircle className="mx-auto text-red-500 mb-2" size={48} /><p className="text-gray-300 mb-4">Image failed to load</p><button onClick={() => onRetryLoad(transaction.id)} className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 flex items-center gap-2 mx-auto"><RefreshCw size={16}/> Retry</button></div>) : (<img src={getImageUrl(transaction.proof_of_payment)} alt="Proof" className="transition-transform duration-200 ease-out max-h-[80vh] max-w-full object-contain shadow-2xl" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` }} onError={() => onError(transaction.id)} draggable={false}/>)}
      </div>
      <div className="bg-black/80 backdrop-blur-md p-4 absolute bottom-0 w-full flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full"><button onClick={handleZoomOut} className="text-white hover:text-orange-400 p-1"><ZoomOut size={20}/></button><span className="text-xs text-gray-300 w-12 text-center">{Math.round(scale * 100)}%</span><button onClick={handleZoomIn} className="text-white hover:text-orange-400 p-1"><ZoomIn size={20}/></button><div className="w-px h-4 bg-gray-600 mx-2"></div><button onClick={handleRotate} className="text-white hover:text-green-400 p-1"><RotateCcw size={18}/></button><button onClick={handleReset} className="text-white hover:text-red-400 p-1"><Maximize size={18}/></button></div>
      </div>
    </div>
  );
};

// ==========================================
// 4. CHECK-IN MODAL
// ==========================================
export const CheckInModal = ({ isOpen, transaction, onClose, onConfirm, loading }) => {
  if (!isOpen || !transaction) return null;
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Check-In Confirmation</h3>
        <div className="bg-orange-50 border border-orange-100 p-5 rounded-xl mb-6">
          <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-orange-100 rounded-full text-orange-600"><User size={20} /></div><span className="font-bold text-gray-900 text-lg">{transaction.customer_name}</span></div>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mt-3 flex items-center gap-2"><CheckCircle size={18} className="text-green-600"/><div><p className="text-green-800 font-bold text-sm">Walk-In (Paid)</p><p className="text-xs text-green-700">Payment collected at counter.</p></div></div>
        </div>
        <div className="flex gap-3"><button onClick={onClose} disabled={loading} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button><button onClick={onConfirm} disabled={loading} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 transition-colors disabled:opacity-70">{loading ? 'Processing...' : 'Confirm Check-In'}</button></div>
      </div>
    </div>
  );
};

// ==========================================
// 5. DETAIL MODAL
// ==========================================
export const DetailModal = ({ isOpen, transaction, onClose, viewType }) => {
  if (!isOpen || !transaction) return null;
  
  // Calculate Duration
  const sched = transaction.reservations?.[0];
  const duration = calculateDuration(sched?.check_in_date, sched?.check_out_date);

  const reservations = transaction.reservations || [];
  const extensions = transaction.extensions || [];
  const extensionTotal = extensions.reduce((sum, ext) => sum + parseFloat(ext.additional_cost || 0), 0);
  const totalAmount = parseFloat(transaction.total_amount || 0); 
  const baseTotal = totalAmount - extensionTotal; 
  const guestCount = parseInt(transaction.num_guest) || 0;
  const entranceFee = guestCount * 50; 
  const totalEntrance = entranceFee; 

  const isAmenityView = viewType === 'amenities';
  const isExtensionView = viewType === 'extensions';
  const isPaymentView = viewType === 'payment';
  let title = 'Details', TitleIcon = FileText, iconColor = 'text-gray-500';
  if (isAmenityView) { title = 'Amenity Details'; TitleIcon = Layers; iconColor = 'text-orange-500'; } 
  else if (isExtensionView) { title = 'Extension History'; TitleIcon = Clock; iconColor = 'text-purple-500'; } 
  else if (isPaymentView) { title = 'Payment Breakdown'; TitleIcon = CreditCard; iconColor = 'text-green-600'; }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white"><h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><TitleIcon className={iconColor} size={24}/>{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24}/></button></div>
        <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
          <div className="mb-6 border-b border-gray-50 pb-4"><h2 className="text-2xl font-bold text-slate-900">{transaction.customer_name}</h2><div className="flex justify-between items-center mt-1"><p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">REF: {transaction.transaction_ref}</p><span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-green-50 text-green-700 border-green-200">Fully Paid</span></div></div>
          
          {isAmenityView && (
            <div className="space-y-1">
              <div className="bg-blue-50 p-2 rounded mb-3 text-center border border-blue-100">
                <span className="text-xs font-bold text-blue-600 uppercase">Stay Duration: {duration} Night{duration > 1 ? 's' : ''}</span>
              </div>
              
              {reservations.map((res, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0 px-2 rounded-lg hover:bg-gray-50">
                    <div>
                        <span className="font-medium text-slate-700 text-sm block">{res.amenity_name}</span>
                        {/* CALCULATION: Price x Qty x Nights */}
                        <span className="text-[10px] text-gray-400 font-medium">
                           {res.quantity} x ₱{parseFloat(res.price).toLocaleString()} x {duration} night{duration > 1 ? 's' : ''}
                        </span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">₱{(parseFloat(res.price) * parseInt(res.quantity) * duration).toLocaleString()}</span>
                  </div>
              ))}

              {guestCount > 0 && (
                  <div className="flex justify-between items-center py-3 px-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                          <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-bold">{guestCount}</span>
                          {/* CALCULATION: Price x Pax (One time) */}
                          <span className="font-medium text-slate-700 text-sm">Entrance Fee (₱50)</span>
                      </div>
                      <span className="font-bold text-slate-900 text-sm">₱{totalEntrance.toLocaleString()}</span>
                  </div>
              )}
              <div className="mt-4 flex justify-between items-end border-t border-gray-100 pt-4"><span className="text-slate-500 font-medium text-sm">Subtotal (Base)</span><span className="text-lg font-bold text-slate-700">₱{baseTotal.toLocaleString()}</span></div>
            </div>
          )}

          {isExtensionView && (
            <div className="space-y-4">
               {extensions.length === 0 ? (
                 <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-xl">No extensions recorded.</div>
               ) : (
                 <div className="space-y-2">
                   {extensions.map((ext, idx) => (
                     <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-50 px-2">
                       <div>
                         <span className="block font-bold text-slate-700 text-sm">{ext.description || `Extension #${idx+1}`}</span>
                         {/* FIX: REMOVED 'Just Now' LOGIC. Always format date. */}
                         <span className="text-[10px] text-gray-400 uppercase">
                            {ext.created_at && !isNaN(new Date(ext.created_at).getTime()) 
                                ? new Date(ext.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute:'2-digit' }) 
                                : '-'}
                         </span>
                       </div>
                       <span className="font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded text-sm">+₱{parseFloat(ext.additional_cost).toLocaleString()}</span>
                     </div>
                   ))}
                   <div className="mt-6 flex justify-between items-end border-t border-gray-100 pt-4"><span className="text-slate-900 font-bold">Total Extension Fees</span><span className="text-2xl font-bold text-purple-600">₱{extensionTotal.toLocaleString()}</span></div>
                 </div>
               )}
            </div>
          )}
          
          {/* PAYMENT VIEW - FORCED FULLY PAID VISUALLY */}
          {isPaymentView && (
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3"><div className="p-3 bg-blue-50 rounded-xl border border-blue-100"><p className="text-xs text-blue-600 font-bold uppercase mb-1">Total Contract</p><p className="text-lg font-extrabold text-blue-900">₱{totalAmount.toLocaleString()}</p></div><div className="p-3 bg-green-50 rounded-xl border border-green-100"><p className="text-xs text-green-600 font-bold uppercase mb-1">Total Paid</p><p className="text-lg font-extrabold text-green-900">₱{totalAmount.toLocaleString()}</p></div></div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500">Booking Base Price ({duration} nights)</span><span className="font-medium text-gray-900">₱{baseTotal.toLocaleString()}</span></div>
                    {extensionTotal > 0 && (<div className="flex justify-between items-center text-sm"><span className="text-purple-600 flex items-center gap-1"><Plus size={12}/> Extensions (Paid)</span><span className="font-medium text-purple-700">₱{extensionTotal.toLocaleString()}</span></div>)}
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-800 font-bold">Grand Total</span><span className="font-bold text-gray-900">₱{totalAmount.toLocaleString()}</span></div>
                    {/* Visual force: Amount Paid equals Total */}
                    <div className="flex justify-between items-center text-sm"><span className="text-green-600 flex items-center gap-1"><Check size={12}/> Amount Paid</span><span className="font-bold text-green-600">- ₱{totalAmount.toLocaleString()}</span></div>
                </div>
                <div className="bg-green-100 border border-green-200 p-4 rounded-xl flex justify-between items-center shadow-sm"><div><p className="text-green-800 font-bold text-sm uppercase tracking-wide">Status</p><p className="text-xs text-green-700 opacity-80">Full payment received</p></div><div className="flex items-center gap-2"><CheckCircle className="text-green-600" size={24} /><span className="text-lg font-extrabold text-green-700">FULLY PAID</span></div></div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. EXTEND MODAL
// ==========================================
export const ExtendModal = ({ isOpen, transaction, onClose, onExtend, loading }) => {
  const [extendHours, setExtendHours] = useState(1);
  if (!isOpen || !transaction) return null;
  const oldTotalAmount = parseFloat(transaction.total_amount || 0); 
  const hourlyRate = oldTotalAmount / 22; 
  const rawAmount = hourlyRate * extendHours;
  const additionalAmount = Math.ceil(rawAmount / 10) * 10;
  const currentOut = transaction.reservations?.[0]?.check_out_date ? new Date(transaction.reservations[0].check_out_date) : new Date();
  const newOutDateObj = new Date(currentOut);
  newOutDateObj.setHours(newOutDateObj.getHours() + extendHours);
  const formatTime = (date) => date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const formatDate = (date) => date.toLocaleString('en-US', { month: 'short', day: 'numeric' });

  const handleSubmit = () => {
    const year = newOutDateObj.getFullYear(), month = String(newOutDateObj.getMonth() + 1).padStart(2, '0'), day = String(newOutDateObj.getDate()).padStart(2, '0');
    const hours = String(newOutDateObj.getHours()).padStart(2, '0'), minutes = String(newOutDateObj.getMinutes()).padStart(2, '0'), seconds = String(newOutDateObj.getSeconds()).padStart(2, '0');
    onExtend({ newCheckoutDate: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`, additionalAmount, extensionType: 'Hourly', extensionValue: extendHours, extended_items: [{ name: 'Room/Amenity Extension', qty: extendHours, cost: additionalAmount }] });
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden flex flex-col">
        <div className="bg-[#F97316] px-6 py-5 flex justify-between items-start text-white"><div><h3 className="text-xl font-bold flex items-center gap-2"><Clock className="opacity-90" size={22} /> Extend Stay</h3><p className="text-orange-100 text-sm mt-1 opacity-90">{transaction.customer_name}</p></div><button onClick={onClose} disabled={loading} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20} /></button></div>
        <div className="p-6 bg-[#F8FAFC]"> 
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-4"><div className="flex items-center justify-between"><div><label className="block text-slate-800 font-bold text-base">Add Hours</label><span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Late Checkout</span></div><div className="flex items-center gap-1"><button onClick={() => setExtendHours(Math.max(1, extendHours - 1))} disabled={loading} className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-gray-200"><Minus size={18} strokeWidth={3} /></button><div className="w-16 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg mx-1"><input type="number" min="1" value={extendHours} onChange={e => setExtendHours(parseInt(e.target.value) || 1)} disabled={loading} className="w-full text-center text-xl font-bold text-slate-800 outline-none bg-transparent"/></div><button onClick={() => setExtendHours(extendHours + 1)} disabled={loading} className="w-10 h-10 flex items-center justify-center rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600 transition-colors border border-orange-100"><Plus size={18} strokeWidth={3} /></button></div></div></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4"><div className="space-y-2 pb-4 border-b border-dashed border-gray-100"><div className="flex justify-between items-center text-sm"><span className="text-gray-400 font-medium">Current Check-out</span><span className="text-slate-700 font-bold">{formatDate(currentOut)}, {formatTime(currentOut)}</span></div><div className="flex justify-between items-center text-sm"><span className="text-orange-500 font-bold">New Check-out</span><span className="text-orange-600 font-bold">{formatDate(newOutDateObj)}, {formatTime(newOutDateObj)}</span></div></div><div className="flex justify-between items-center"><span className="text-slate-800 font-bold text-lg">Additional Fee (Paid Now)</span><span className="text-3xl font-extrabold text-green-500">₱{additionalAmount}</span></div></div>
        </div>
        <div className="p-6 bg-white border-t border-gray-50 flex gap-3"><button onClick={onClose} disabled={loading} className="flex-1 py-3.5 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors text-sm">Cancel</button><button onClick={handleSubmit} disabled={loading || additionalAmount <= 0} className="flex-1 py-3.5 bg-[#F97316] text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 text-sm">{loading ? 'Processing...' : `Confirm (+₱${additionalAmount})`}</button></div>
      </div>
    </div>
  );
};

// ==========================================
// 7. NEW BOOKING CONFIRMATION MODAL
// ==========================================
export const WalkInConfirmationModal = ({ isOpen, onClose, onConfirm, formData, cart, total, loading }) => {
  if (!isOpen) return null;

  const duration = calculateDuration(formData.checkInDate, formData.checkOutDate);

  return (
    // FIXED: Z-index and Fixed Inset for Full Coverage
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* FIXED: Blur covers everything */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-slideIn">
        
        {/* UPDATED: Orange Header */}
        <div className="shrink-0 bg-[#F97316] px-6 py-4 flex justify-between items-center text-white border-b border-orange-600 shadow-sm z-10">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CheckCircle className="text-white" size={20}/> Confirm Booking
          </h3>
          <button onClick={onClose} disabled={loading} className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-5">
          
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Customer Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Full Name</p>
                <p className="font-bold text-gray-800">{formData.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Contact</p>
                <p className="font-bold text-gray-800">{formData.contactNumber}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Address</p>
                <p className="font-medium text-gray-800 text-sm">{formData.address}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
             {/* UPDATED: Removed Blue accents, using Orange/Gray theme */}
             <div className="flex-1 bg-orange-50 p-3 rounded-xl border border-orange-100">
                <p className="text-xs text-orange-600 font-bold uppercase">Check In</p>
                <p className="font-bold text-gray-900 text-sm mt-1">
                  {new Date(formData.checkInDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute:'2-digit' })}
                </p>
             </div>
             <div className="flex-1 bg-orange-50 p-3 rounded-xl border border-orange-100">
                <p className="text-xs text-orange-600 font-bold uppercase">Check Out</p>
                <p className="font-bold text-gray-900 text-sm mt-1">
                  {new Date(formData.checkOutDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute:'2-digit' })}
                </p>
             </div>
          </div>

          <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex justify-between items-center">
             <span className="text-xs text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1">
               <Clock size={14}/> Total Duration
             </span>
             <span className="font-bold text-purple-900 text-sm">{duration} Night{duration > 1 ? 's' : ''}</span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Order Summary</h4>
            <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600 font-medium">
                        <tr>
                            <th className="text-left px-3 py-2">Item</th>
                            <th className="text-center px-3 py-2">Qty</th>
                            <th className="text-right px-3 py-2">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {cart.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-3 py-2 text-gray-800">
                                    {item.amenity_name}
                                    <span className="block text-[10px] text-gray-400">@ ₱{item.amenity_price} x {duration} nights</span>
                                </td>
                                <td className="px-3 py-2 text-center text-gray-500">x{item.quantity}</td>
                                <td className="px-3 py-2 text-right font-medium">₱{(item.amenity_price * item.quantity * duration).toLocaleString()}</td>
                            </tr>
                        ))}
                        
                        {formData.numGuest > 0 && (
                             <tr>
                                <td className="px-3 py-2 text-gray-800">
                                    Entrance Fee
                                    <span className="block text-[10px] text-gray-400">({formData.numGuest} pax @ ₱50)</span>
                                </td>
                                <td className="px-3 py-2 text-center text-gray-500">-</td>
                                <td className="px-3 py-2 text-right font-medium">₱{(formData.numGuest * 50).toLocaleString()}</td>
                             </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
             <span className="font-bold text-gray-600">Total Payable</span>
             <span className="text-2xl font-extrabold text-[#F97316]">₱{total.toLocaleString()}</span>
          </div>

        </div>

        <div className="shrink-0 p-4 bg-gray-50 border-t border-gray-200 flex gap-3 rounded-b-2xl">
            <button onClick={onClose} disabled={loading} className="flex-1 py-3 bg-[#F97316] text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-sm">
                Back
            </button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 py-3 bg-green-400 text-white rounded-xl font-bold hover:bg-[#7C2D12] shadow-lg transition-all flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="animate-spin" size={20}/> : <CheckCircle size={20}/>}
                {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
        </div>
      </div>
    </div>
  );
};

export const WalkInSuccessModal = ({ isOpen, onClose, transactionRef }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden">
                
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-green-600" size={40} />
                </div>
                
                <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Booking Success!</h2>
                <p className="text-gray-500 mb-6">Transaction has been recorded.</p>
                
                <div className="bg-gray-100 p-3 rounded-xl mb-6 border border-gray-200 border-dashed">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Transaction Ref</p>
                    <p className="text-lg font-mono font-bold text-gray-800 select-all">{transactionRef}</p>
                </div>
                
                <button onClick={onClose} className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95">
                    Create New Booking
                </button>
            </div>
        </div>
    );
};

export default WalkInModal;
