import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Bell, CheckCircle, XCircle, Clock, Calendar, AlertCircle, Trash2, CheckCheck, MessageSquare, ClipboardList, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import api from '../config/axios';

const Header = ({ user, onLogout, activeTab, setActiveTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const hasInitializedRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Safe user extraction
  const role = user?.role ? user.role.toLowerCase() : 'guest';
  const userId = user?.id || user?._id || user?.userId;

  let navItems = [];
  if (role === 'customer') {
    navItems = [
      { label: 'Home', path: '/customer' },
      { label: 'Amenities', path: '/amenities' },
      { label: 'Reservations', path: '/reservations' },
      { label: 'Feedback', path: '/feedback' },
      { label: 'Contact', path: '/contact' }
    ];
  } else if (role === 'owner') {
    navItems = [
      { label: 'Sales', id: 'sales' },
      { label: 'Feedback', id: 'feedback' },
      { label: 'Amenities', id: 'amenities' }
    ];
  } else if (role === 'receptionist') {
    navItems = [
      { label: 'Overview', id: 'overview' },
      { label: 'Online Reservations', id: 'reservations' },
      { label: 'Walk-In Booking', id: 'walk-in' }
    ];
  }

  const fetchNotifications = async () => {
   
    if ((!userId && role !== 'receptionist') || role === 'owner') return;
    
    try {
      if (!hasInitializedRef.current && notifications.length === 0) setLoadingNotifications(true);

      let transactions = [];
      
      if (role === 'receptionist') {
         const response = await api.get(`/api/transactions?_t=${Date.now()}`);
         const data = response.data;
         transactions = Array.isArray(data) ? data : (data.data || data.transactions || []);
      } else {

         const response = await api.get(`/api/transactions/user/${userId}?_t=${Date.now()}`);
         const data = response.data;
         transactions = data.data || data.reservations || [];
      }

      if (Array.isArray(transactions) && transactions.length > 0) {
        const savedStatesKey = `reservation_states_${userId}`;
        const notifsKey = `user_notifications_${userId}`;
        
        let savedStates = JSON.parse(localStorage.getItem(savedStatesKey) || '{}');
        let currentNotifications = JSON.parse(localStorage.getItem(notifsKey) || '[]');
        
        const isFirstLoad = Object.keys(savedStates).length === 0;

        let hasNewUpdates = false;

        transactions.forEach(transaction => {
          const transId = transaction.id || transaction.transaction_id;
          if (!transId) return;

          const rawStatus = transaction.booking_status || (transaction.reservations?.[0]?.status) || 'Pending';
          const currentStatus = rawStatus.toString().trim(); 
          const currentStatusLower = currentStatus.toLowerCase();
          
          const prevStatus = savedStates[transId];
          const prevStatusLower = prevStatus ? prevStatus.toLowerCase() : null;
          
          const ref = transaction.transaction_ref || `TXN-${transId}`;

          const isStatusChanged = prevStatus && prevStatusLower !== currentStatusLower;

          const isNewItem = !prevStatus; 

          let message = '';
          let type = 'info';
          let statusLabel = ''; 
          let shouldNotify = false;

          if (role === 'receptionist') {
              if (currentStatusLower === 'pending' && isNewItem && !isFirstLoad) {
                  message = `System Alert: New reservation request received.`;
                  type = 'recep_new_request';
                  statusLabel = 'NEW REQUEST';
                  shouldNotify = true;
              } 
              else if (['cancelled', 'rejected', 'declined'].includes(currentStatusLower) && isStatusChanged) {
                  message = `Cancellation Alert: Reservation ${ref} has been cancelled.`;
                  type = 'recep_cancelled';
                  statusLabel = 'CANCELLED';
                  shouldNotify = true;
              }
              else if (['confirmed', 'approved', 'paid'].includes(currentStatusLower) && isStatusChanged) {
                  message = `System Log: Reservation confirmed.`;
                  type = 'recep_log';
                  statusLabel = 'CONFIRMED';
                  shouldNotify = true;
              }
          } 
          else {
            
              if (['confirmed', 'approved', 'paid'].includes(currentStatusLower)) {
                  if (isStatusChanged || (isNewItem && !isFirstLoad)) {
                      message = `Approved: Your reservation request has been confirmed.`;
                      type = 'cust_approved';
                      statusLabel = 'APPROVED';
                      shouldNotify = true;
                  }
              } 
              else if (['cancelled', 'rejected', 'declined'].includes(currentStatusLower)) {
                   if (isStatusChanged || (isNewItem && !isFirstLoad)) {
                      message = `Cancellation Alert: Reservation ${ref} has been cancelled.`;
                      type = 'cust_cancelled';
                      statusLabel = 'CANCELLED';
                      shouldNotify = true;
                   }
              } 
              // COMPLETED
              else if (['completed', 'check-out', 'checked-out'].includes(currentStatusLower) && isStatusChanged) {
                  message = `Thank you! Your stay is marked as completed.`;
                  type = 'cust_completed';
                  statusLabel = 'COMPLETED';
                  shouldNotify = true;
              }
             
              else if (currentStatusLower === 'pending' && isNewItem && hasInitializedRef.current) {
                  message = `Request Sent: Reservation submitted successfully.`;
                  type = 'cust_pending';
                  statusLabel = 'PENDING';
                  shouldNotify = true;
              }
          }

          if (shouldNotify && message) {
            const realTimeNow = new Date().toISOString();
            
            // Generate unique ID
            const newNotif = {
              id: `notif_${transId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              type: type,
              statusLabel: statusLabel,
              message: message,
              transaction_id: transId,
              ref: ref, 
              created_at: realTimeNow, 
              isNew: true
            };
            
            currentNotifications.unshift(newNotif);
            hasNewUpdates = true;
            console.log("🔔 NOTIF ADDED:", message);
          }

          savedStates[transId] = currentStatus;
        });

        // Save to Storage
        if (hasNewUpdates) {
          if (currentNotifications.length > 50) currentNotifications = currentNotifications.slice(0, 50);
          localStorage.setItem(notifsKey, JSON.stringify(currentNotifications));
          setNotifications(currentNotifications);
        }
        
        // Always save status state
        localStorage.setItem(savedStatesKey, JSON.stringify(savedStates));
      }
      
      hasInitializedRef.current = true;

    } catch (error) {
      console.error('Notif Error:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (userId) {
      const notifsKey = `user_notifications_${userId}`;
      const cached = JSON.parse(localStorage.getItem(notifsKey) || '[]');
      if (cached.length) setNotifications(cached);

      hasInitializedRef.current = false;

      fetchNotifications(); 
      const interval = setInterval(fetchNotifications, 5000); 
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [userId, role]); 

  useEffect(() => {
    setUnreadCount(notifications.filter(n => n.isNew).length);
  }, [notifications]);

  const handleNavigation = (item) => {
    setIsMobileMenuOpen(false);
    if (item.path) navigate(item.path);
    else if (item.id && setActiveTab) setActiveTab(item.id);
  };

  const isItemActive = (item) => {
    if (item.path) return location.pathname === item.path;
    if (item.id) return activeTab === item.id;
    return false;
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout ? onLogout() : (localStorage.clear(), navigate('/'));
  };

  const markAsRead = (notificationId, e) => {
    if(e) e.stopPropagation();
    const updated = notifications.map(n => n.id === notificationId ? { ...n, isNew: false } : n);
    setNotifications(updated);
    if (userId) localStorage.setItem(`user_notifications_${userId}`, JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isNew: false }));
    setNotifications(updated);
    if (userId) localStorage.setItem(`user_notifications_${userId}`, JSON.stringify(updated));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    if (userId) localStorage.removeItem(`user_notifications_${userId}`);
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'cust_pending': return { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'cust_approved': return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'cust_cancelled': return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' };
      case 'cust_completed': return { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-50' };
      case 'recep_new_request': return { icon: ClipboardList, color: 'text-orange-600', bgColor: 'bg-orange-50' };
      case 'recep_cancelled': return { icon: ShieldAlert, color: 'text-red-600', bgColor: 'bg-red-50' };
      case 'recep_log': return { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50' };
      default: return { icon: AlertCircle, color: 'text-gray-500', bgColor: 'bg-gray-50' };
    }
  };

  const getTagStyle = (type) => {
    switch (type) {
      case 'cust_completed': return 'bg-indigo-100 text-indigo-700';
      case 'cust_approved': 
      case 'recep_log': return 'bg-green-100 text-green-700';
      case 'cust_cancelled': 
      case 'recep_cancelled': return 'bg-red-100 text-red-700';
      case 'cust_pending': return 'bg-blue-100 text-blue-700';
      case 'recep_new_request': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) { return 'recently'; }
  };

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (!event.target.closest('.notification-dropdown') && !event.target.closest('.notification-btn')) {
            setShowNotifications(false);
        }
    };
    if (showNotifications) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  return (
    <>
      <header className="bg-white shadow-sm w-full sticky top-0 z-50 font-sans">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo */}
            <div className="flex items-center gap-2 md:gap-3">
              <button className="lg:hidden text-gray-600 mr-1" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className={`flex items-center gap-3 ${role === 'customer' ? 'cursor-pointer' : ''}`} onClick={() => role === 'customer' && navigate('/customer')}>
                <img src="/images/Lp.png" alt="Logo" className="hidden md:block h-12 w-auto object-contain" />
                <h1 className="text-lg md:text-xl text-gray-800 font-bold tracking-wide leading-tight">
                  La Piscina De Concepcion Resort
                </h1>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item)}
                  className={`text-sm font-normal transition-colors duration-200 focus:outline-none ${
                    isItemActive(item) 
                      ? 'text-orange-600 border-b-2 border-orange-600 pb-1' 
                      : 'text-gray-600 hover:text-orange-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              {role !== 'owner' && (
                <div className="relative">
                  {/* Bell Button */}
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)} 
                    className={`p-2 relative outline-none transition-colors rounded-full notification-btn ${showNotifications ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">{unreadCount}</span>}
                  </button>
            
                  {showNotifications && (
                    <div className="notification-dropdown absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        
                        {/* Header */}
                        <div className="px-5 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
                           <div>
                             <h3 className="font-bold text-gray-900 text-lg">Notifications</h3>
                             <p className="text-xs text-orange-600 font-medium mt-0.5">
                               {unreadCount} unread <span className="text-gray-400 font-normal">• {notifications.length} total</span>
                             </p>
                           </div>
                           <div className="flex items-center gap-3">
                             {unreadCount > 0 && (
                               <button onClick={markAllAsRead} className="text-xs flex items-center gap-1 text-gray-500 hover:text-orange-600 transition-colors">
                                 <CheckCheck size={14} /> <span className="hidden sm:inline">Mark read</span>
                               </button>
                             )}
                             {notifications.length > 0 && (
                               <button onClick={clearAllNotifications} className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors">
                                 <Trash2 size={14} /> <span className="hidden sm:inline">Clear</span>
                               </button>
                             )}
                           </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
                          {loadingNotifications && notifications.length === 0 ? (
                             <div className="p-6 text-center">
                               <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mb-2"></div>
                               <p className="text-xs text-gray-400">Syncing updates...</p>
                             </div>
                          ) : notifications.length === 0 ? (
                             <div className="p-8 text-center flex flex-col items-center">
                               <div className="bg-gray-50 p-3 rounded-full mb-3"><Bell size={20} className="text-gray-300"/></div>
                               <p className="text-sm text-gray-500 font-medium">No new notifications</p>
                             </div>
                          ) : (
                             notifications.map((n) => {
                               const { icon: Icon, color, bgColor } = getNotificationIcon(n.type);
                               return (
                                 <div 
                                   key={n.id} 
                                   onClick={(e) => markAsRead(n.id, e)}
                                   className={`group relative flex gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${n.isNew ? 'bg-blue-50/30' : ''}`}
                                 >
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${bgColor}`}>
                                        <Icon size={18} className={color} />
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-snug mb-1 ${n.isNew ? 'text-gray-900 font-bold' : 'text-gray-600 font-medium'}`}>
                                          {n.message} <span className="text-gray-400 text-xs font-normal whitespace-nowrap ml-1">(Ref: {n.ref})</span>
                                        </p>
                                        
                                        {/* Tag & Time Row */}
                                        <div className="flex items-center justify-between mt-1.5">
                                            {/* Status Tag */}
                                            {n.statusLabel && (
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getTagStyle(n.type)}`}>
                                                {n.statusLabel}
                                              </span>
                                            )}

                                            {/* Time & Action */}
                                            <div className="flex items-center gap-2 ml-auto">
                                              {/* Action Buttons */}
                                              {role === 'receptionist' && n.type === 'recep_new_request' && (
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowNotifications(false); if(setActiveTab) setActiveTab('reservations'); }}
                                                    className="text-[10px] bg-white border border-gray-200 hover:border-orange-200 hover:text-orange-600 text-gray-500 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"
                                                  >
                                                    Review
                                                  </button>
                                              )}
                                              {role === 'customer' && n.type === 'cust_completed' && (
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowNotifications(false); navigate('/feedback'); }}
                                                    className="text-[10px] bg-white border border-gray-200 hover:border-orange-200 hover:text-orange-600 text-gray-500 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"
                                                  >
                                                    <MessageSquare size={10} /> Review
                                                  </button>
                                              )}

                                              <span className="text-xs text-gray-400">{formatTimeAgo(n.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Unread Dot */}
                                    {n.isNew && <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0"></div>}
                                 </div>
                               );
                             })
                          )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                          <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                            <button 
                              onClick={() => { 
                                setShowNotifications(false); 
                                if(role === 'customer') navigate('/reservations');
                                else if(role === 'receptionist' && setActiveTab) setActiveTab('reservations');
                              }}
                              className="text-sm font-medium text-gray-600 hover:text-orange-600 flex items-center justify-center gap-2 w-full py-1 transition-colors"
                            >
                              <Calendar size={16} /> View All {role === 'receptionist' ? 'Requests' : 'Reservations'} <ArrowRight size={14} />
                            </button>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              <div className="hidden lg:block text-right mr-2 border-l border-gray-300 pl-4">
                <p className="text-sm font-normal text-gray-800">Hello, {user?.username || 'User'}!</p>
              </div>

              <button onClick={() => setShowLogoutConfirm(true)} className="hidden lg:flex items-center gap-2 px-3 md:px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-normal shadow-sm">
                <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
           <div className="lg:hidden absolute top-full left-0 w-full bg-white border-t border-gray-100 shadow-lg z-40 p-2 flex flex-col gap-1">
              
              <div className="px-4 py-3 border-b border-gray-100 mb-1">
                <p className="text-sm font-semibold text-gray-800">Hello, {user?.username || 'User'}!</p>
              </div>

              {navItems.map((item) => (
                <button key={item.label} onClick={() => handleNavigation(item)} className="px-4 py-3 text-left text-sm font-normal rounded-md transition-colors hover:bg-gray-50 text-gray-700">
                  {item.label}
                </button>
              ))}
              <div className="h-px bg-gray-100 my-1"></div>
              <button onClick={() => setShowLogoutConfirm(true)} className="px-4 py-3 text-left text-sm font-normal text-red-600 hover:bg-red-50 rounded-md flex gap-2">
                  <LogOut size={16} /> Logout
              </button>
           </div>
        )}
      </header>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-gray-600 text-sm mb-6 font-normal">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                className="flex-1 py-2 px-4 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white font-normal"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout} 
                className="flex-1 py-2 px-4 border border-lp-orange text-lp-orange hover:bg-lp-orange hover:text-white rounded-lg font-normal"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;