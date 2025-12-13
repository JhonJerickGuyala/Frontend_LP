import { useState, useEffect, useMemo } from 'react';
import api from '../../config/axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { 
  TrendingUp, DollarSign, Wallet, Users, ArrowUpRight, ArrowDownRight, 
  Filter, BarChart2, CheckCircle, XCircle, Clock, RefreshCw
} from 'lucide-react';

const OwnerAnalytics = () => { 
  const [loading, setLoading] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('vs last month');
  const [activeFilter, setActiveFilter] = useState('month'); 
  
  const [extensionModal, setExtensionModal] = useState(null); 

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
    };
  });

  const [data, setData] = useState({
    financials: { gross_sales: 0, cash_collected: 0, receivables: 0 },
    sources: [],
    operations: [], 
    trend: []
  });
  
  const [transactions, setTransactions] = useState([]);
  const [tableFilter, setTableFilter] = useState('All'); 
  const THEME = {
      primary: '#F97316',  
      secondary: '#3B82F6', 
      success: '#10B981', 
      danger: '#F43F5E',  
      warning: '#F59E0B', 
      text: '#334155',    
      subtext: '#94a3b8',   
      grid: '#f1f5f9',     
  };

  const STATUS_COLORS = {
      'Confirmed': THEME.success,
      'Completed': THEME.secondary,
      'Pending': THEME.warning,
      'Checked-In': '#8B5CF6',
      'Cancelled': THEME.danger
  };


  useEffect(() => {
    if (extensionModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden'; 
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [extensionModal]);


  useEffect(() => { 
    fetchDashboardData(false);

    const intervalId = setInterval(() => {
        fetchDashboardData(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [dateRange]); 


  const fetchDashboardData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    
    try {
      const res = await api.get('/api/owner/analytics', { params: dateRange });
      if(res.data.success) {
        setData(res.data.analytics);
        const parsedTransactions = (res.data.transactions || []).map(t => ({
            ...t,
            extensions: t.extension_history ? (typeof t.extension_history === 'string' ? JSON.parse(t.extension_history) : t.extension_history) : []
        }));
        setTransactions(parsedTransactions);
      }
    } catch (error) { 
        console.error("Dashboard Load Error:", error); 
    } finally { 
        if (!isBackground) setLoading(false);
    }
  };

  const handleQuickDate = (type) => {
    const today = new Date();
    let start = new Date();
    const end = new Date(); 

    setActiveFilter(type);

    if (type === 'today') {
        start = today;
        setPeriodLabel('vs yesterday');
    } else if (type === 'week') {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        start.setDate(diff);
        setPeriodLabel('vs last week');
    } else if (type === 'month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        setPeriodLabel('vs last month');
    } else if (type === 'year') {
        start = new Date(today.getFullYear(), 0, 1);
        setPeriodLabel('vs last year');
    }
    
    const newStart = start.toISOString().split('T')[0];
    const newEnd = end.toISOString().split('T')[0];

    if (newStart !== dateRange.startDate || newEnd !== dateRange.endDate) {
        setDateRange({ startDate: newStart, endDate: newEnd });
    }
  };

  const handleManualDateChange = (key, value) => {
      setDateRange(prev => ({ ...prev, [key]: value }));
      setActiveFilter('custom'); 
      setPeriodLabel('vs previous period');
  };

  const kpiMetrics = useMemo(() => {
    const totalBookings = data.sources.reduce((acc, curr) => acc + curr.count, 0);
    const trendData = data.trend || [];
    const lastDaySales = trendData.length > 0 ? Number(trendData[trendData.length-1].sales) : 0;
    const avgSales = trendData.length > 0 ? trendData.reduce((a,b)=>a+Number(b.sales),0)/trendData.length : 0;
    const isTrendingUp = lastDaySales >= avgSales;
    const statusData = [...data.operations].sort((a,b) => b.count - a.count);
    return { totalBookings, isTrendingUp, statusData };
  }, [data]);

  const filterCounts = useMemo(() => ({
     'All': transactions.length,
     'Online': transactions.filter(t => t.booking_type === 'Online').length,
     'Walk-in': transactions.filter(t => t.booking_type === 'Walk-in').length
  }), [transactions]);

  const sortedTableData = useMemo(() => {
    const statusPriority = {
      'Pending': 1,
      'Checked-In': 2,
      'Confirmed': 3,
      'Completed': 4,
      'Cancelled': 5
    };

    const filtered = transactions.filter(t => tableFilter === 'All' ? true : t.booking_type === tableFilter);
    return filtered.sort((a, b) => {
      const priorityA = statusPriority[a.booking_status] || 99;
      const priorityB = statusPriority[b.booking_status] || 99;
      return priorityA - priorityB;
    });
  }, [transactions, tableFilter]);

  const tooltipStyle = {
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '8px 12px', fontSize: '12px', color: THEME.text
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6 pb-12 font-sans text-slate-700">
      

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        

        <div className="w-full xl:w-auto">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="text-orange-500"/> Analytics Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">Real-time financial & operational insights</p>
        </div>
        

        <div className="flex flex-col xl:flex-row gap-4 w-full xl:w-auto bg-slate-50 p-4 rounded-xl border border-slate-100 items-start xl:items-end">
          

          <div className="w-full xl:w-auto">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block xl:hidden">Quick Select</label>
             <div className="grid grid-cols-4 xl:flex gap-1 xl:gap-2 w-full xl:w-auto bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                {['Today', 'Week', 'Month', 'Year'].map((label) => {
                    const isSelected = activeFilter === label.toLowerCase();
                    return (
                        <button 
                            key={label} 
                            type="button" 
                            onClick={() => handleQuickDate(label.toLowerCase())}
                            className={`px-3 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center xl:min-w-[60px] 
                                ${isSelected 
                                    ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-orange-600 border border-transparent'
                                }`}
                        >
                            {label}
                        </button>
                    );
                })}
             </div>
          </div>


          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-end">
             <div className="w-full sm:w-auto flex flex-col gap-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
                 <input 
                   type="date" 
                   value={dateRange.startDate} 
                   onChange={(e) => handleManualDateChange('startDate', e.target.value)} 
                   className="w-full sm:w-36 lg:w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all cursor-pointer shadow-sm"
                 />
             </div>

             <div className="w-full sm:w-auto flex flex-col gap-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
                 <input 
                   type="date" 
                   value={dateRange.endDate} 
                   onChange={(e) => handleManualDateChange('endDate', e.target.value)} 
                   className="w-full sm:w-36 lg:w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all cursor-pointer shadow-sm"
                 />
             </div>
          </div>

        </div>
      </div>

      <div className="relative min-h-[500px]">
        

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            <StatCard 
                title="Gross Sales" 
                value={data.financials.gross_sales} 
                icon={TrendingUp} 
                trendValue={kpiMetrics.isTrendingUp ? "+12.5%" : "-2.1%"} 
                periodLabel={periodLabel}
                isPositive={kpiMetrics.isTrendingUp}
                color="text-emerald-600" bg="bg-emerald-50" 
            />
            <StatCard 
                title="Cash Collected" 
                value={data.financials.cash_collected} 
                icon={DollarSign} 
                trendValue="+5.4%" 
                periodLabel={periodLabel}
                isPositive={true}
                color="text-blue-600" bg="bg-blue-50" 
            />
            <StatCard 
                title="Receivables" 
                value={data.financials.receivables} 
                icon={Wallet} 
                trendValue={data.financials.receivables > 0 ? "Pending" : "Cleared"}
                periodLabel="current status"
                isPositive={data.financials.receivables === 0}
                color={data.financials.receivables > 0 ? 'text-rose-500' : 'text-slate-500'} bg="bg-slate-50" 
                isMoney={true}
            />
            <StatCard 
                title="Total Bookings" 
                value={kpiMetrics.totalBookings} 
                icon={Users} 
                trendValue="+8.2%"
                periodLabel={periodLabel}
                isPositive={true}
                isMoney={false} 
                color="text-orange-600" bg="bg-orange-50" 
            />
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                <div>
                    <h3 className="font-bold text-slate-800">Revenue Trajectory</h3>
                    <p className="text-xs text-slate-400">Daily sales performance</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Total Sales
                </div>
            </div>
            <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trend}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={THEME.primary} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={THEME.primary} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={THEME.grid} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: THEME.subtext}} tickFormatter={(str) => { const d = new Date(str); return `${d.getMonth()+1}/${d.getDate()}`; }} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: THEME.subtext}} tickFormatter={(val)=>`₱${val/1000}k`}/>
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{color: THEME.primary, fontWeight: 'bold'}} formatter={(value) => [`₱${Number(value).toLocaleString()}`, "Sales"]} />
                        <Area type="monotone" dataKey="sales" stroke={THEME.primary} strokeWidth={3} fill="url(#colorSales)" animationDuration={1000} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <BarChart2 size={18} className="text-purple-500"/> Booking Status
                </h3>
                <p className="text-xs text-slate-400 mb-6">Booking stages distribution</p>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kpiMetrics.statusData} layout="vertical" margin={{ left: 0, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={THEME.grid}/>
                            <XAxis type="number" hide />
                            <YAxis dataKey="booking_status" type="category" width={90} tick={{fontSize: 11, fill: THEME.text, fontWeight: 500}} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={tooltipStyle} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28} animationDuration={1000}>
                                {kpiMetrics.statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.booking_status] || THEME.subtext} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                <h3 className="font-bold text-slate-800 mb-1">Source Distribution</h3>
                <p className="text-xs text-slate-400 mb-6">Online vs Walk-in</p>
                <div className="flex-1 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data.sources} dataKey="count" nameKey="booking_type" cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5}>
                                {data.sources.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.booking_type === 'Online' ? THEME.secondary : THEME.success} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center justify-center">
                            <span className="block text-3xl font-extrabold text-slate-800 whitespace-nowrap">
                                {kpiMetrics.totalBookings.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center gap-8 mt-[-20px]">
                    {data.sources.map((s) => (
                        <div key={s.booking_type} className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${s.booking_type === 'Online' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                            <div>
                                <span className="block text-sm font-bold text-slate-700">{s.booking_type}</span>
                                <span className="text-xs text-slate-400">{s.count} bookings</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* 4. TRANSACTION TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Filter size={18} className="text-orange-500"/> Transaction History
                </h3>

                <div className="flex p-1 bg-slate-200/60 rounded-lg w-full sm:w-auto overflow-x-auto">
                    {['All', 'Online', 'Walk-in'].map(tab => (
                        <button 
                            key={tab} type="button" onClick={() => setTableFilter(tab)} 
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all flex-1 sm:flex-none justify-center whitespace-nowrap ${
                                tableFilter === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <span>{tab}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                tableFilter === tab ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-slate-300 text-slate-600'
                            }`}>
                                {filterCounts[tab] || 0}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Details</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-right">Balance</th>
                        <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedTableData.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-12 text-slate-400 italic">No transactions found.</td></tr>
                    ) : (
                        sortedTableData.map(t => (
                            <tr key={t.id} className="group hover:bg-orange-50/10 transition-colors">
                            <td className="px-6 py-4 align-top">
                                <span className="font-medium text-slate-700 text-xs font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 whitespace-nowrap">{t.transaction_ref}</span>
                                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 whitespace-nowrap"><Clock size={10}/>{t.formatted_date}</p>
                            </td>
                            <td className="px-6 py-4 align-top">
                                <p className="font-bold text-slate-700 text-sm whitespace-nowrap">{t.customer_name}</p>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                                    t.booking_type === 'Online' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>{t.booking_type}</span>
                            </td>
                            
                            <td className="px-6 py-4 align-top">
                                <p className="text-xs text-slate-600 font-medium line-clamp-2 max-w-[200px]" title={t.amenities_summary}>{t.amenities_summary || "No amenities"}</p>
                                
                                {t.extensions && t.extensions.length > 0 && (
                                    <button 
                                        onClick={() => setExtensionModal({ ref: t.transaction_ref, data: t.extensions })}
                                        className="mt-2 text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded border border-purple-100 hover:bg-purple-100 hover:border-purple-200 transition-colors flex items-center gap-1 w-fit cursor-pointer"
                                    >
                                        <RefreshCw size={10}/> View {t.extensions.length} Extensions
                                    </button>
                                )}
                            </td>

                            <td className="px-6 py-4 text-right align-top"><p className="font-bold text-slate-900 text-sm whitespace-nowrap">₱{parseFloat(t.total_amount).toLocaleString()}</p></td>
                            <td className="px-6 py-4 text-right align-top">
                                {parseFloat(t.balance) > 0 ? ( <span className="text-xs font-bold text-rose-500 whitespace-nowrap">₱{parseFloat(t.balance).toLocaleString()}</span> ) : ( 
                                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">PAID</span> 
                                )}
                            </td>
                            <td className="px-6 py-4 text-center align-top">
                                <StatusBadge status={t.booking_status} />
                            </td>
                            </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* --- EXTENSION MODAL COMPONENT --- */}
      {extensionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200 overscroll-contain">
            <div className="absolute inset-0" onClick={() => setExtensionModal(null)}></div>

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 relative z-10">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Extension History</h3>
                        <p className="text-[10px] text-slate-400 font-mono">Ref: {extensionModal.ref}</p>
                    </div>
                    <button 
                        onClick={() => setExtensionModal(null)} 
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1 transition-all"
                    >
                        <XCircle size={18}/>
                    </button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {extensionModal.data.map((ext, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 mb-1 last:mb-0 bg-white hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all">
                             <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <Clock size={14} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">{ext.description}</p>
                                    <p className="text-[10px] text-slate-400">Extension Added</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <span className="block text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                    +₱{Number(ext.additional_cost).toLocaleString()}
                                </span>
                             </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <button 
                        onClick={() => setExtensionModal(null)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};


const StatCard = ({ title, value, trendValue, periodLabel, isPositive, color, bg, icon: Icon, isMoney = true }) => (
   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group h-full flex flex-col justify-between relative overflow-hidden">
      <div className="flex justify-between items-start mb-2 relative z-10">
         <div className={`p-3 rounded-xl transition-colors ${bg} ${color}`}><Icon size={24} strokeWidth={2} /></div>
      </div>
      <div className="relative z-10 mt-2">
         <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
         <h4 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight mt-1">{isMoney ? '₱' : ''}{value.toLocaleString()}</h4>
         
         <div className="flex items-center gap-2 mt-2">
             <div className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isPositive ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                <span>{trendValue}</span>
             </div>
             <span className="text-[10px] text-slate-400 font-medium">{periodLabel}</span>
         </div>
      </div>
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 ${bg}`}></div>
   </div>
);

const StatusBadge = ({ status }) => {
    let styles = "bg-slate-100 text-slate-600 border-slate-200";
    let Icon = Clock;

    switch(status) {
        case 'Confirmed': styles = "bg-emerald-50 text-emerald-700 border-emerald-100"; Icon = CheckCircle; break;
        case 'Completed': styles = "bg-blue-50 text-blue-700 border-blue-100"; Icon = CheckCircle; break;
        case 'Pending': styles = "bg-amber-50 text-amber-700 border-amber-100"; Icon = Clock; break;
        case 'Checked-In': styles = "bg-purple-50 text-purple-700 border-purple-100"; Icon = ArrowDownRight; break;
        case 'Cancelled': styles = "bg-rose-50 text-rose-700 border-rose-100"; Icon = XCircle; break;
        default: break;
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase border ${styles} whitespace-nowrap`}>
            <Icon size={10} strokeWidth={2.5}/> {status}
        </span>
    );
};

export default OwnerAnalytics;
