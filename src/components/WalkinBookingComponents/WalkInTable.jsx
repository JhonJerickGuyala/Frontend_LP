import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../config/axios';
import { Eye, Clock, Plus, Info, LogIn, Ban, LogOut, ChevronRight, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

import { 
  WalkInModal, 
  CheckInModal, 
  ExtendModal, 
  ProofModal, 
  DetailModal, 
  ActionModal 
} from './WalkInModal';

const ToastAlert = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-5 right-5 z-[2000] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-slideIn ${type === 'success' ? 'bg-white border-orange-500 text-orange-700' : 'bg-white border-red-500 text-red-700'}`}>
      {type === 'success' ? <CheckCircle size={20} className="text-orange-500" /> : <AlertCircle size={20} className="text-red-500" />}
      <div><h4 className="font-bold text-sm">{type === 'success' ? 'Success' : 'Error'}</h4><p className="text-xs">{message}</p></div>
      <button onClick={onClose}><X size={16} className="opacity-50 hover:opacity-100"/></button>
    </div>
  );
};

const WalkinTable = ({ searchQuery = '', viewMode = 'active', statusFilter = 'All' }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processLoading, setProcessLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modals, setModals] = useState({ details: false, checkIn: false, extend: false, proof: false, detailView: false, action: false });
  const [detailType, setDetailType] = useState('amenities'); 
  const [actionType, setActionType] = useState(''); 

  const showAlert = (type, message) => setAlert({ type, message });
  const closeAlert = () => setAlert(null);
  const closeAllModals = () => { setModals({ details: false, checkIn: false, extend: false, proof: false, detailView: false, action: false }); setSelectedTransaction(null); };
  const closeDetailOnly = () => { setModals(prev => ({ ...prev, detailView: false })); };

  const getCostBreakdown = (transaction) => {
      const extensions = transaction.extensions || [];
      const currentTotal = parseFloat(transaction.total_amount || 0);
      let extensionCost = 0;
      if (extensions.length > 0) {
          extensionCost = extensions.reduce((sum, ext) => sum + parseFloat(ext.additional_cost || 0), 0);
      }
      const oldTotal = currentTotal - extensionCost;
      return { currentTotal, oldTotal, hasExtension: extensionCost > 0 };
  };

  const fetchTransactions = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.get('/api/transactions');
      const validData = Array.isArray(res.data) ? res.data : (res.data.data || res.data.transactions || []);
      setTransactions(validData);
    } catch (error) { console.error("Error fetching transactions:", error); } finally { if (!isBackground) setLoading(false); }
  }, []);

  useEffect(() => { fetchTransactions(false); const intervalId = setInterval(() => fetchTransactions(true), 3000); return () => clearInterval(intervalId); }, [fetchTransactions]);

  const handleStatusUpdate = async (id, newStatus) => {
    setProcessLoading(true);
    try {
      await api.put(`/api/transactions/${id}/status`, { booking_status: newStatus });
      showAlert('success', `Status updated to ${newStatus}`);
      await fetchTransactions(true); closeAllModals();
    } catch (error) { showAlert(error, "Failed to update status."); } finally { setProcessLoading(false); }
  };

  const processCheckIn = async () => {
    if (!selectedTransaction) return;
    setProcessLoading(true);
    try {
      await api.put(`/api/transactions/${selectedTransaction.id}/status`, { booking_status: 'Checked-In', balance: 0, payment_status: 'Fully Paid' });
      showAlert('success', `Check-in successful!`); await fetchTransactions(true); closeAllModals();
    } catch (error) { showAlert(error, 'Failed to check-in customer.'); } finally { setProcessLoading(false); }
  };

  const processExtend = async (extensionData) => {
    if (!selectedTransaction) return;
    setProcessLoading(true);
    try {
      await api.put(`/api/reservations/${selectedTransaction.reservations[0].id}/extend`, {
        new_check_out_date: extensionData.newCheckoutDate, 
        additional_cost: extensionData.additionalAmount, additional_hours: extensionData.extensionValue, extension_type: 'Hourly', extended_items: extensionData.extended_items
      });
      showAlert('success', `Extended successfully! Fee: ₱${extensionData.additionalAmount}`); await fetchTransactions(true); closeAllModals();
    } catch (error) { showAlert(error, 'Error extending booking.'); } finally { setProcessLoading(false); }
  };

  const processPaymentAction = async (action) => { if (!selectedTransaction) return; await handleStatusUpdate(selectedTransaction.id, action); };

  const openCheckInModal = (t) => { setSelectedTransaction(t); setModals(prev => ({ ...prev, checkIn: true })); };
  const openExtendModal = (t) => { setSelectedTransaction(t); setModals(prev => ({ ...prev, extend: true })); };
  const openProofModal = (t) => { setSelectedTransaction(t); setModals(prev => ({ ...prev, proof: true })); };
  const openDetailModal = (t, type) => { setSelectedTransaction(t); setDetailType(type); setModals(prev => ({ ...prev, detailView: true })); };
  const openActionModal = (type, t) => { setSelectedTransaction(t); setActionType(type); setModals(prev => ({ ...prev, action: true })); };
  const openDetailsModal = (t) => { setSelectedTransaction(t); setModals(prev => ({ ...prev, details: true })); };

  const filteredTransactions = useMemo(() => {
    const activeStatuses = ['Pending', 'Confirmed', 'Checked-In'];
    const historyStatuses = ['Completed', 'Cancelled', 'Rejected'];
    let result = transactions.filter(t => {
      if (t.booking_type !== 'Walk-in') return false; 
      const q = searchQuery.toLowerCase();
      const matchesSearch = (t.customer_name || '').toLowerCase().includes(q) || (t.transaction_ref || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      const status = t.booking_status;
      if (viewMode === 'active' && !activeStatuses.includes(status)) return false;
      if (viewMode === 'history' && !historyStatuses.includes(status)) return false;
      if (statusFilter !== 'All' && status !== statusFilter) return false;
      return true;
    });
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return result;
  }, [transactions, searchQuery, viewMode, statusFilter]);

  const formatDateTime = (dateStr) => { if (!dateStr) return { date: '-', time: '' }; const date = new Date(dateStr); return { date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }), time: date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }) }; };
  const getAmenitySummary = (transaction) => { if (!transaction.reservations || transaction.reservations.length === 0) return 'No amenities'; const amenities = transaction.reservations.map(res => `${res.amenity_name} x${res.quantity}`); if (amenities.length <= 2) return amenities.join(', '); return `${amenities.slice(0, 2).join(', ')} +${amenities.length - 2} more`; };

  if (loading && transactions.length === 0) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;
  const isActionDisabled = loading || processLoading;

  return (
    <>
      {alert && <ToastAlert message={alert.message} type={alert.type} onClose={closeAlert} />}
      
      {/* DESKTOP TABLE */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl shadow-sm mt-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-700">Walk-In Transactions</h3><div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-100"><Clock size={14}/> Count: {filteredTransactions.length}</div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-4 border-b border-gray-200 text-left">Ref ID</th>
                <th className="px-4 py-4 border-b border-gray-200 text-left">Customer</th>
                <th className="px-4 py-4 border-b border-gray-200 text-left">Amenities</th>
                <th className="px-4 py-4 border-b border-gray-200 text-left">Extensions</th>
                <th className="px-4 py-4 border-b border-gray-200 text-center">Time In/Out</th>
                <th className="px-4 py-4 border-b border-gray-200 text-center">Payment</th>
                <th className="px-4 py-4 border-b border-gray-200 text-center">Status</th>
                <th className="px-4 py-4 border-b border-gray-200 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredTransactions.length === 0 ? <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-400 italic">No walk-in transactions found.</td></tr> : filteredTransactions.map(t => {
                  const sched = t.reservations?.[0];
                  const inDT = formatDateTime(sched?.check_in_date);
                  const outDT = formatDateTime(sched?.check_out_date);
                  const amenities = getAmenitySummary(t);
                  const { currentTotal, oldTotal, hasExtension } = getCostBreakdown(t);

                  const isPaid = ['Confirmed', 'Checked-In', 'Completed'].includes(t.booking_status);

                  return (
                    <tr key={t.id} className="hover:bg-orange-50/50 transition-colors">
                      <td className="px-4 py-4 font-mono text-xs font-bold text-gray-600">{t.transaction_ref}</td>
                      <td className="px-4 py-4"><div className="font-bold text-gray-800">{t.customer_name}</div><div className="text-xs text-gray-500">{t.contact_number}</div></td>
                      <td className="px-4 py-4"><div className="text-gray-700 font-medium text-xs truncate max-w-[150px]" title={amenities}>{amenities}</div><button onClick={() => openDetailModal(t, 'amenities')} className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 font-semibold" type="button"><Info size={12} /> View details</button></td>
                      <td className="px-4 py-4">{(t.extensions || []).length > 0 ? <div className="flex flex-col items-start"><span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{t.extensions.length} added</span><button onClick={() => openDetailModal(t, 'extensions')} className="text-[11px] text-purple-500 hover:text-purple-700 flex items-center gap-1 mt-1 font-semibold" type="button"><Plus size={10} /> See breakdown</button></div> : <span className="text-gray-300 text-xs">-</span>}</td>
                      <td className="px-4 py-4 text-center"><div className="flex flex-col items-center text-xs"><span className="text-gray-500">{inDT.date} <b className="text-green-700">{inDT.time}</b></span><span className="text-gray-300 my-0.5">↓</span><span className="text-gray-500">{outDT.date} <b className="text-orange-700">{outDT.time}</b></span></div></td>
                      <td className="px-4 py-4 text-center align-middle"><div className="flex flex-col items-center justify-center"><div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{isPaid ? 'Fully Paid' : 'Partial'}</div>{hasExtension ? (<div className="flex flex-col leading-tight"><span className="text-xs text-gray-400 line-through decoration-gray-400">₱{oldTotal.toLocaleString()}</span><span className="font-bold text-orange-600 text-sm">₱{currentTotal.toLocaleString()}</span></div>) : (<span className="font-bold text-gray-900 text-sm">₱{currentTotal.toLocaleString()}</span>)}<button onClick={() => openDetailModal(t, 'payment')} className="mt-1 text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1" type="button"><Info size={10} /> View Breakdown</button></div></td>
                      <td className="px-4 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${t.booking_status === 'Checked-In' ? 'bg-blue-50 text-blue-700 border-blue-200' : t.booking_status === 'Completed' ? 'bg-gray-50 text-gray-600 border-gray-200' : t.booking_status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' : t.booking_status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{t.booking_status}</span></td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {t.proof_of_payment && <button onClick={() => openProofModal(t)} className="flex items-center gap-1 pl-1.5 pr-2 py-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors shadow-sm" title="Check Payment" type="button"><Eye size={14}/><span className="text-[11px] font-bold uppercase">Proof</span></button>}
                          {t.booking_status === 'Confirmed' && (<><button onClick={() => openCheckInModal(t)} disabled={isActionDisabled} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50" title="Check In" type="button"><LogIn size={16}/></button><button onClick={() => openActionModal('Cancelled', t)} disabled={isActionDisabled} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50" title="Cancel" type="button"><Ban size={16}/></button></>)}
                          {t.booking_status === 'Checked-In' && (<><button onClick={() => openExtendModal(t)} disabled={isActionDisabled} className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50" title="Extend" type="button"><Clock size={16}/></button><button onClick={() => openActionModal('Completed', t)} disabled={isActionDisabled} className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50" title="Check Out" type="button"><LogOut size={16}/></button></>)}
                          {t.booking_status === 'Pending' && !t.proof_of_payment && (<button onClick={() => openActionModal('Cancelled', t)} disabled={isActionDisabled} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50" title="Reject" type="button"><Ban size={16}/></button>)}
                        </div>
                      </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="lg:hidden bg-white border border-gray-200 rounded-xl shadow-sm mt-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50"><div className="text-sm text-gray-600 mb-2">Showing {filteredTransactions.length} results</div></div>
        <div className="divide-y divide-gray-100">
          {filteredTransactions.length === 0 ? <div className="px-6 py-12 text-center text-gray-400 italic">No walk-in transactions found.</div> : filteredTransactions.map(t => (
                <div key={t.id} onClick={() => openDetailsModal(t)} className="p-4 hover:bg-orange-50 cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div><div className="font-mono text-xs font-bold text-gray-600 mb-1">{t.transaction_ref}</div><h3 className="font-bold text-gray-800 text-lg">{t.customer_name}</h3></div>
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${t.booking_status === 'Checked-In' ? 'bg-blue-50 text-blue-700 border-blue-200' : t.booking_status === 'Completed' ? 'bg-gray-50 text-gray-600 border-gray-200' : t.booking_status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' : t.booking_status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{t.booking_status}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500"><span>₱{parseFloat(t.total_amount).toLocaleString()}</span><ChevronRight size={16} /></div>
                </div>
            ))}
        </div>
      </div>

      <WalkInModal 
        transaction={selectedTransaction} 
        isOpen={modals.details} 
        loading={isActionDisabled} 
        onClose={closeAllModals} 
        onViewProof={() => openProofModal(selectedTransaction)} 
        onViewDetails={(t, type) => openDetailModal(t, type)} 
        onStatusUpdate={(id, status) => { if(status === 'Checked-In') openCheckInModal(selectedTransaction); else openActionModal(status, selectedTransaction); }} 
        onExtendBooking={() => openExtendModal(selectedTransaction)} 
      />
      
      <CheckInModal isOpen={modals.checkIn} transaction={selectedTransaction} loading={processLoading} onClose={closeAllModals} onConfirm={processCheckIn} />
      <ExtendModal isOpen={modals.extend} transaction={selectedTransaction} loading={processLoading} onClose={closeAllModals} onExtend={processExtend} />
      <ProofModal isOpen={modals.proof} transaction={selectedTransaction} loading={processLoading} onClose={closeAllModals} onAction={processPaymentAction} />
      <DetailModal isOpen={modals.detailView} transaction={selectedTransaction} viewType={detailType} onClose={closeDetailOnly} />
      <ActionModal isOpen={modals.action} type={actionType} transaction={selectedTransaction} loading={processLoading} onClose={closeAllModals} onConfirm={() => processPaymentAction(actionType)} />
    </>
  );
};

WalkinTable.propTypes = { searchQuery: PropTypes.string, viewMode: PropTypes.string, statusFilter: PropTypes.string };

export default WalkinTable;
