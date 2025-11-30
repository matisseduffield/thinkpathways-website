// --- UTILITY COMPONENTS ---
const TurnstileWidget = ({ onVerify }) => {
    const containerRef = useRef(null);
    useEffect(() => {
        if (window.turnstile && window.__turnstile_site_key) {
            if (containerRef.current) containerRef.current.innerHTML = '';
            window.turnstile.render(containerRef.current, {
                sitekey: window.__turnstile_site_key,
                callback: (token) => onVerify(token),
            });
        }
    }, []);
    return <div ref={containerRef} className="my-4 flex justify-center"></div>;
};

const ThemeToggle = () => {
    const { darkMode, setDarkMode } = useContext(ThemeContext);
    return (
        <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 rounded-full bg-slate-800 text-yellow-400 hover:bg-slate-700 transition-all shadow-md flex items-center justify-center">
            <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
    );
};

// --- NEW: SMART TIME SELECT COMPONENT ---
const TimeSelect = ({ label, value, onChange, minTime }) => {
    const times = useMemo(() => {
        const t = [];
        for (let i = 6; i < 24; i++) { 
            for (let j = 0; j < 60; j += 15) {
                const hour = i.toString().padStart(2, '0');
                const minute = j.toString().padStart(2, '0');
                t.push(`${hour}:${minute}`);
            }
        }
        return t;
    }, []);
    const filteredTimes = minTime ? times.filter(t => t > minTime) : times;
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{label}</label>
            <div className="relative">
                <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white appearance-none cursor-pointer font-mono" value={value} onChange={(e) => onChange(e.target.value)}>
                    <option value="" disabled>Select...</option>
                    {filteredTimes.map(t => {
                        const [h, m] = t.split(':');
                        const ampm = parseInt(h) >= 12 ? 'PM' : 'AM';
                        const displayHour = parseInt(h) % 12 || 12;
                        return <option key={t} value={t}>{`${displayHour}:${m} ${ampm}`}</option>;
                    })}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500"><i className="fa-regular fa-clock"></i></div>
            </div>
        </div>
    );
};

// --- HELPER: COMPLIANCE BADGE ---
const ComplianceBadge = ({ date, label }) => {
    if (!date) return <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">Missing {label}</span>;
    const isExpired = new Date(date) < new Date();
    return (
        <span className={`text-[10px] px-2 py-1 rounded border ${isExpired ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
            {label}: {isExpired ? 'Expired' : 'Valid'}
        </span>
    );
};

// --- DOCUMENT MANAGER ---
const DocumentManager = ({ folder, id, documents, onUpload, onDelete }) => {
    const [file, setFile] = useState(null);
    const [docName, setDocName] = useState('');
    const [uploading, setUploading] = useState(false);
    const handleUpload = async (e) => { e.preventDefault(); if(!file) return; setUploading(true); await onUpload(folder, id, file, docName || file.name); setUploading(false); setFile(null); setDocName(''); };
    return (
        <div className="mt-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">Documents & Plans</h4>
            <div className="space-y-2 mb-4">
                {(!documents || documents.length === 0) ? <p className="text-xs text-slate-400 italic">No documents uploaded.</p> : documents.map((doc, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="flex items-center overflow-hidden"><i className="fa-regular fa-file-pdf text-red-500 mr-2"></i><div className="truncate text-sm text-slate-700 dark:text-slate-200" title={doc.name}>{doc.name}</div></div>
                        <div className="flex gap-2 flex-shrink-0 ml-2"><a href={doc.url} target="_blank" className="text-blue-500 hover:text-blue-700 p-1"><i className="fa-solid fa-external-link-alt"></i></a><button onClick={() => onDelete(folder, id, doc)} className="text-slate-400 hover:text-red-500 p-1"><i className="fa-solid fa-trash"></i></button></div>
                    </div>
                ))}
            </div>
            <form onSubmit={handleUpload} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <input type="text" placeholder="Document Name" className="w-full p-2 mb-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={docName} onChange={e => setDocName(e.target.value)} />
                <div className="flex gap-2"><input type="file" className="text-xs text-slate-500" onChange={e => setFile(e.target.files[0])} /><button disabled={!file || uploading} className="bg-brand-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-brand-700 disabled:opacity-50">{uploading ? '...' : 'Upload'}</button></div>
            </form>
        </div>
    );
};

// --- CALENDAR VIEW ---
const CalendarView = ({ shifts, onDateClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Optimized: Memoize calendar calculations to prevent re-calc on every render
    const { daysInMonth, firstDay } = useMemo(() => ({
        daysInMonth: getDaysInMonth(year, month),
        firstDay: getFirstDayOfMonth(year, month)
    }), [year, month]);

    const shiftsByDate = useMemo(() => { const map = {}; shifts.forEach(s => { if (!s.date) return; if (s.status === 'Cancelled' || s.status === 'Declined') return; if (!map[s.date]) map[s.date] = []; map[s.date].push(s); }); return map; }, [shifts]);
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const renderDays = () => {
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-28 bg-slate-50/50 border-r border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-700"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const monthStr = (month + 1).toString().padStart(2, '0');
            const dayStr = d.toString().padStart(2, '0');
            const dateKey = `${year}-${monthStr}-${dayStr}`;
            const dayShifts = shiftsByDate[dateKey] || [];
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
            days.push(
                <div key={d} onClick={() => dayShifts.length > 0 && onDateClick(dayShifts)} className={`h-28 border-r border-b border-slate-100 dark:border-slate-700 p-2 relative transition-all group ${dayShifts.length > 0 ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700' : ''} ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-slate-800'}`}>
                    <div className={`text-xs font-bold mb-2 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 group-hover:text-slate-600'}`}>{d}</div>
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                        {dayShifts.map(s => (<div key={s.id} className={`text-[10px] px-2 py-1 rounded-md truncate font-medium border-l-2 ${s.status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-500' : s.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-500' : 'bg-slate-100 text-slate-600 border-slate-400'}`}>{s.userName || 'Shift'}</div>))}
                    </div>
                </div>
            );
        }
        return days;
    };
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
            <div className="p-6 flex justify-between items-center bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700"><h3 className="text-lg font-bold text-slate-800 dark:text-white capitalize">{currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</h3><div className="flex gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg"><button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-slate-600 text-slate-500 hover:shadow-sm transition-all"><i className="fa-solid fa-chevron-left text-xs"></i></button><button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-slate-600 text-slate-500 hover:shadow-sm transition-all"><i className="fa-solid fa-chevron-right text-xs"></i></button></div></div>
            <div className="grid grid-cols-7 text-center bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 py-3 border-b border-slate-100 dark:border-slate-700"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>
            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800 border-l border-t border-slate-100 dark:border-slate-700">{renderDays()}</div>
        </div>
    );
};

// --- MODALS ---

const ProfileModal = ({ user, onClose, onUpdate }) => {
    const { isWorker, workerProfile, uploadDocument, deleteDocument } = useContext(AuthContext);
    const [name, setName] = useState(user.displayName || '');
    const [screening, setScreening] = useState(workerProfile?.screeningExpiry || '');
    const [firstAid, setFirstAid] = useState(workerProfile?.firstAidExpiry || '');
    const [cpr, setCpr] = useState(workerProfile?.cprExpiry || '');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const complianceData = isWorker ? { screeningExpiry: screening, firstAidExpiry: firstAid, cprExpiry: cpr } : null;
        const res = await onUpdate(name, complianceData);
        if (res.success) { setMsg('Updated!'); setTimeout(onClose, 1000); } else { setMsg('Error.'); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-pop-in relative border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]"><button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-xl"></i></button><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">My Profile</h3>{msg && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg mb-4 flex items-center"><i className="fa-solid fa-check-circle mr-2"></i>{msg}</div>}<div className="overflow-y-auto pr-2"><form id="profileForm" onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Full Name</label><input required className="w-full p-3 bg-slate-50 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:text-white transition-all" value={name} onChange={e=>setName(e.target.value)} /></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Email</label><input disabled className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-600/50 dark:text-slate-400" value={user.email} /></div>
        {isWorker && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-600">
                <h4 className="text-sm font-bold text-brand-600 mb-3">Compliance & Documents</h4>
                {workerProfile ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Screening Check</label><input type="date" className="w-full p-2 border rounded text-sm dark:bg-slate-700 dark:text-white" value={screening} onChange={e => setScreening(e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-400 uppercase">First Aid</label><input type="date" className="w-full p-2 border rounded text-sm dark:bg-slate-700 dark:text-white" value={firstAid} onChange={e => setFirstAid(e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-400 uppercase">CPR</label><input type="date" className="w-full p-2 border rounded text-sm dark:bg-slate-700 dark:text-white" value={cpr} onChange={e => setCpr(e.target.value)} /></div>
                        </div>
                        {/* WORKER DOC UPLOAD - NOW ENABLED */}
                        <DocumentManager folder="workers" id={workerProfile.id} documents={workerProfile.documents} onUpload={uploadDocument} onDelete={deleteDocument} />
                    </>
                ) : (
                    <div className="p-3 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800">
                        <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                        <strong>Profile Syncing:</strong> Your worker documents panel will appear shortly. If this persists, please contact an admin to verify your profile setup.
                    </div>
                )}
            </div>
        )}</form></div><button form="profileForm" disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 mt-4 shadow-lg">{loading ? 'Saving...' : 'Save Changes'}</button></div></div>
    );
};

const WorkerDetailsModal = ({ worker, onClose }) => {
    const { uploadDocument, deleteDocument } = useContext(AuthContext); 
    if (!worker) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-sm animate-pop-in relative border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]"><button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-xl"></i></button><div className="text-center mb-6"><div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-3xl font-bold mx-auto mb-4 shadow-inner">{worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}</div><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{worker.name}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{worker.email}</p><div className="flex gap-2 justify-center mt-2 flex-wrap"><ComplianceBadge date={worker.screeningExpiry} label="Screening" /><ComplianceBadge date={worker.firstAidExpiry} label="First Aid" /></div></div><div className="overflow-y-auto pr-2"><div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-xl p-4 text-left mb-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p><p className="text-sm text-slate-600 dark:text-slate-300">{worker.notes || 'No notes available.'}</p></div><DocumentManager folder="workers" id={worker.id} documents={worker.documents} onUpload={uploadDocument} onDelete={deleteDocument} /></div><button onClick={onClose} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 mt-4">Close</button></div></div>
    );
};

const ClientDocsModal = ({ client, onClose }) => {
    const { uploadDocument, deleteDocument } = useContext(AuthContext);
    if (!client) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md animate-pop-in relative border border-slate-100 dark:border-slate-700"><button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-xl"></i></button><div className="mb-6 border-b border-slate-100 dark:border-slate-700 pb-4"><h3 className="text-xl font-bold text-slate-900 dark:text-white">{client.name}</h3><p className="text-sm text-slate-500">Document Management</p></div><DocumentManager folder="users" id={client.id} documents={client.documents} onUpload={uploadDocument} onDelete={deleteDocument} /><div className="mt-6 flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-bold">Done</button></div></div></div>
    );
};

const CompleteShiftModal = ({ shift, onClose, onConfirm }) => {
    const [actualStartTime, setActualStartTime] = useState(shift.startTime); const [actualEndTime, setActualEndTime] = useState(shift.endTime); const [travelLogs, setTravelLogs] = useState([]); const [summary, setSummary] = useState(''); const [goals, setGoals] = useState(''); const [incidents, setIncidents] = useState('None'); const [incidentDetails, setIncidentDetails] = useState(''); const [loading, setLoading] = useState(false);
    const addTravelLeg = () => { const lastLog = travelLogs[travelLogs.length - 1]; const defaultFrom = lastLog ? lastLog.to : ''; setTravelLogs([...travelLogs, { id: Date.now(), from: defaultFrom, to: '', reason: '', km: '' }]); };
    const removeTravelLeg = (id) => { setTravelLogs(travelLogs.filter(log => log.id !== id)); };
    const updateTravel = (id, field, value) => { setTravelLogs(travelLogs.map(log => log.id === id ? { ...log, [field]: value } : log)); };
    const totalKm = travelLogs.reduce((acc, curr) => acc + (parseFloat(curr.km) || 0), 0);
    const openMapCheck = (log) => { if(!log.from || !log.to) return; window.open(`https://www.google.com/maps/dir/${encodeURIComponent(log.from + ' SA')}/${encodeURIComponent(log.to + ' SA')}`, '_blank'); };
    const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); const finalData = { actualStartTime, actualEndTime, scheduledStartTime: shift.startTime, scheduledEndTime: shift.endTime, travelLog: travelLogs, totalTravelKm: totalKm, summary, goals, incidents, incidentDetails: incidents === 'Yes' ? incidentDetails : 'N/A' }; await onConfirm(shift.id, finalData); setLoading(false); onClose(); };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-0 rounded-2xl shadow-2xl w-full max-w-2xl animate-pop-in relative overflow-hidden flex flex-col max-h-[90vh]"><div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800"><div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Complete Shift</h3><p className="text-sm text-slate-500">{shift.dateDisplay} • {shift.userName}</p></div><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center"><i className="fa-solid fa-xmark text-slate-500 dark:text-slate-300"></i></button></div><div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50"><form id="completeForm" onSubmit={handleSubmit} className="space-y-8"><div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><h4 className="text-xs font-bold text-brand-600 uppercase tracking-wide mb-4">1. Time & Attendance</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-1.5">Start Time</label><input type="time" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={actualStartTime} onChange={e => setActualStartTime(e.target.value)} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1.5">Finish Time</label><input type="time" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={actualEndTime} onChange={e => setActualEndTime(e.target.value)} /></div></div></div><div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><div className="flex justify-between items-center mb-4"><h4 className="text-xs font-bold text-brand-600 uppercase tracking-wide">2. Travel Log</h4><button type="button" onClick={addTravelLeg} className="text-xs bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-bold border border-brand-200"><i className="fa-solid fa-plus mr-1"></i> Add Trip</button></div>{travelLogs.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-200">No travel recorded.</p>}<div className="space-y-3">{travelLogs.map((log, index) => (<div key={log.id} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 relative group"><button type="button" onClick={() => removeTravelLeg(log.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-red-200"><i className="fa-solid fa-xmark text-xs"></i></button><div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"><div className="md:col-span-3"><input type="text" placeholder="From" className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={log.from} onChange={e => updateTravel(log.id, 'from', e.target.value)} /></div><div className="md:col-span-3"><input type="text" placeholder="To" className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={log.to} onChange={e => updateTravel(log.id, 'to', e.target.value)} /></div><div className="md:col-span-3"><input type="text" placeholder="Reason" className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={log.reason} onChange={e => updateTravel(log.id, 'reason', e.target.value)} /></div><div className="md:col-span-3 flex gap-2"><input type="number" step="0.1" placeholder="KM" className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white font-mono font-bold" value={log.km} onChange={e => updateTravel(log.id, 'km', e.target.value)} /><button type="button" onClick={() => openMapCheck(log)} className="px-2 bg-white border border-slate-300 rounded text-slate-500 hover:text-blue-600"><i className="fa-solid fa-map-location-dot"></i></button></div></div></div>))}</div>{travelLogs.length > 0 && (<div className="mt-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">Total: <span className="text-brand-600 text-lg">{totalKm.toFixed(1)} km</span></div>)}</div><div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><h4 className="text-xs font-bold text-brand-600 uppercase tracking-wide mb-4">3. Shift Report</h4><div className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Summary</label><textarea required rows="3" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={summary} onChange={e => setSummary(e.target.value)}></textarea></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Goals</label><textarea required rows="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={goals} onChange={e => setGoals(e.target.value)}></textarea></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Incidents?</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={incidents} onChange={e => setIncidents(e.target.value)}><option value="None">No Incidents</option><option value="Yes">Yes (Provide details)</option></select></div>{incidents === 'Yes' && (<div className="animate-fade-in"><label className="block text-xs font-bold text-red-600 uppercase mb-1.5">Incident Details</label><textarea required rows="2" className="w-full p-3 border border-red-200 rounded-lg bg-red-50 focus:ring-2 focus:ring-red-500 dark:bg-red-900/20 dark:border-red-800 dark:text-white" value={incidentDetails} onChange={e => setIncidentDetails(e.target.value)}></textarea></div>)}</div></div></form></div><div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"><button form="completeForm" disabled={loading} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/20 flex justify-center items-center transition-all transform hover:-translate-y-0.5">{loading ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : <i className="fa-solid fa-check-double mr-2"></i>} {loading ? 'Submitting...' : 'Submit & Complete Shift'}</button></div></div></div>);
};

const AddWorkerModal = ({ onClose, onAdd }) => { const [data, setData] = useState({ name: '', email: '', notes: '' }); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); const res = await onAdd(data); setLoading(false); if(res.success) onClose(); else setError(res.msg); }; return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-pop-in relative border border-slate-100 dark:border-slate-700"><button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-xl"></i></button><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Add New Worker</h3><form onSubmit={handleSubmit} className="space-y-4"><div><input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Name" value={data.name} onChange={e=>setData({...data, name: e.target.value})} /></div><div><input type="email" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Email" value={data.email} onChange={e=>setData({...data, email: e.target.value})} /></div><div><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Notes" rows="2" value={data.notes} onChange={e=>setData({...data, notes: e.target.value})}></textarea></div><button disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700">{loading ? 'Adding...' : 'Add Worker'}</button></form></div></div>); };

const EditWorkerModal = ({ worker, onClose, onUpdate, onDelete }) => { const [data, setData] = useState({ name: worker.name, email: worker.email, notes: worker.notes, screeningExpiry: worker.screeningExpiry || '', firstAidExpiry: worker.firstAidExpiry || '', cprExpiry: worker.cprExpiry || '' }); const [loading, setLoading] = useState(false); const handleUpdate = async () => { setLoading(true); await onUpdate(worker.id, data); setLoading(false); onClose(); }; const handleDelete = async () => { if(confirm('Delete?')) { setLoading(true); await onDelete(worker.id); setLoading(false); onClose(); } }; return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-pop-in relative border border-slate-100 dark:border-slate-700"><button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-xl"></i></button><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Edit Team Member</h3><div className="space-y-4"><div><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={data.name} onChange={e=>setData({...data, name: e.target.value})} placeholder="Name"/></div><div><input className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl dark:bg-slate-600 dark:border-slate-500 dark:text-slate-300" value={data.email} disabled /></div><div><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" rows="3" value={data.notes} onChange={e=>setData({...data, notes: e.target.value})} placeholder="Notes"></textarea></div><div className="pt-2 border-t border-slate-100 dark:border-slate-700"><h4 className="text-xs font-bold text-brand-600 mb-2">Compliance Expiry</h4><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-slate-400 uppercase block">Screening</label><input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={data.screeningExpiry} onChange={e=>setData({...data, screeningExpiry: e.target.value})} /></div><div><label className="text-[10px] text-slate-400 uppercase block">First Aid</label><input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={data.firstAidExpiry} onChange={e=>setData({...data, firstAidExpiry: e.target.value})} /></div><div><label className="text-[10px] text-slate-400 uppercase block">CPR</label><input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={data.cprExpiry} onChange={e=>setData({...data, cprExpiry: e.target.value})} /></div></div></div><div className="flex gap-3 pt-4"><button onClick={handleDelete} disabled={loading} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100">Delete</button><button onClick={handleUpdate} disabled={loading} className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700">Save</button></div></div></div></div>); };

const AssignWorkerModal = ({ shift, workersList, onClose, onAssign }) => { const [email, setEmail] = useState(''); const [applyToFuture, setApplyToFuture] = useState(false); const [loading, setLoading] = useState(false); const isRecurring = shift.seriesId && shift.recurrence !== 'none'; const handleSubmit = async (e) => { e.preventDefault(); if (!email) return; setLoading(true); await onAssign(shift.id, email, applyToFuture, shift); setLoading(false); onClose(); }; return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-pop-in relative border border-slate-100 dark:border-slate-700"><button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-xl"></i></button><h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Assign Worker</h3><p className="text-sm text-slate-500 mb-6">Select a worker for <strong>{shift.dateDisplay}</strong></p><form onSubmit={handleSubmit}><div className="mb-6"><select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={email} onChange={(e) => setEmail(e.target.value)}><option value="" disabled selected>Select a Worker</option>{workersList && workersList.map(w => <option key={w.id} value={w.email}>{w.name} ({w.email})</option>)}</select></div>{isRecurring && (<div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3"><input type="checkbox" id="futureAssign" className="mt-1 rounded text-brand-600 focus:ring-brand-500 w-4 h-4" checked={applyToFuture} onChange={e => setApplyToFuture(e.target.checked)} /><label htmlFor="futureAssign" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none"><strong>Recurring Shift</strong><br/>Assign this worker to all future shifts in this series?</label></div>)}<div className="flex gap-3 justify-end"><button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold">Cancel</button><button disabled={loading} className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700">{loading ? '...' : 'Assign'}</button></div></form></div></div>); };

const AdminActionModal = ({ shift, actionType, onClose, onConfirm }) => { const [reason, setReason] = useState(''); const [applyToFuture, setApplyToFuture] = useState(false); const [loading, setLoading] = useState(false); const isRecurring = shift.seriesId && shift.recurrence !== 'none'; const handleConfirm = async () => { if (!reason) return; setLoading(true); await onConfirm(shift.id, actionType, reason, applyToFuture, shift); setLoading(false); onClose(); }; return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md relative animate-pop-in border border-slate-100 dark:border-slate-700"><h3 className="text-xl font-bold mb-4 text-red-600">Action: {actionType}</h3><textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 dark:border-slate-600 rounded-xl mb-4 dark:bg-slate-700 dark:text-white" rows="3" placeholder="Reason..."></textarea>{isRecurring && (<div className="mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-start gap-3"><input type="checkbox" id="futureCancel" className="mt-1 rounded text-red-600 focus:ring-red-500 w-4 h-4" checked={applyToFuture} onChange={e => setApplyToFuture(e.target.checked)} /><label htmlFor="futureCancel" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none"><strong>Recurring Shift</strong><br/>Apply this action to all future shifts?</label></div>)}<div className="flex gap-3 justify-end"><button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold">Back</button><button onClick={handleConfirm} disabled={!reason || loading} className="px-6 py-2.5 text-white bg-red-600 rounded-xl font-bold hover:bg-red-700">Confirm</button></div></div></div>); };

const DayDetailsModal = ({ shifts, onClose }) => { return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-lg animate-pop-in relative max-h-[80vh] overflow-y-auto border border-slate-100 dark:border-slate-700"><button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-xl"></i></button><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Shifts Details</h3><div className="space-y-3">{shifts.map((s, idx) => (<div key={idx} className="border border-slate-200 dark:border-slate-700 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50"><div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-900 dark:text-white">{s.userName}</span><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${s.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.status}</span></div><div className="text-sm text-slate-600 dark:text-slate-300">{s.service} • {s.startTime}-{s.endTime}</div></div>))}</div></div></div>); }

// --- CLIENT CARD (ADMIN VIEW) ---
const ClientCard = ({ client, onExpand, isExpanded, onUpdateStatus, openActionModal, onAssign, showUnassignedOnly, workersList, onViewWorker, onRemoveWorker, onOpenDocs }) => {
    const pendingCount = client.stats.pending;
    const upcomingCount = client.stats.upcoming;
    
    // Optimized: Memoize filtering and sorting to prevent re-calc on every render
    const { scheduled, pending, history } = useMemo(() => {
        const today = new Date().setHours(0, 0, 0, 0);
        return {
            scheduled: client.shifts
                .filter(s => s.status === 'Confirmed' && new Date(s.date) >= today)
                .sort((a, b) => getSortValue(a) - getSortValue(b)),
            pending: client.shifts
                .filter(s => s.status === 'Pending')
                .sort((a, b) => getSortValue(a) - getSortValue(b)),
            history: client.shifts
                .filter(s => s.status === 'Cancelled' || s.status === 'Declined' || new Date(s.date) < today)
                .sort((a, b) => getSortValue(b) - getSortValue(a))
        };
    }, [client.shifts]);

    const renderList = showUnassignedOnly ? scheduled.filter(s => !s.assignedWorkerEmail) : [...scheduled, ...pending, ...history];
    if (showUnassignedOnly && renderList.length === 0) return null;

    const ShiftItem = ({ s }) => {
        const assignedWorker = s.assignedWorkerEmail ? workersList?.find(w => w.email.toLowerCase() === s.assignedWorkerEmail.toLowerCase()) : null;
        const workerDisplayName = assignedWorker ? assignedWorker.name : s.assignedWorkerEmail;
        let statusColor = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
        if (s.status === 'Confirmed') statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800";
        if (s.status === 'Pending') statusColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800";
        if (s.status === 'Cancelled' || s.status === 'Declined') statusColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";

        // --- PDF GENERATION HANDLER ---
        const downloadPDF = () => {
            const reportWindow = window.open('', '_blank');
            reportWindow.document.write(`
                <html>
                <head>
                    <title>Shift Report - ${s.dateDisplay}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>@media print { body { margin: 0; } .no-print { display: none; } }</style>
                </head>
                <body class="p-10 font-sans bg-white">
                    <div class="max-w-2xl mx-auto border border-gray-200 p-8 rounded-lg shadow-sm">
                        <div class="flex justify-between items-center mb-8 border-b pb-4">
                            <h1 class="text-2xl font-bold text-slate-900">Shift Report</h1>
                            <div class="text-right">
                                <p class="font-bold text-brand-600">Think Pathways</p>
                                <p class="text-xs text-gray-500">${new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-6 mb-6">
                            <div><p class="text-xs text-gray-500 uppercase font-bold">Client</p><p class="font-medium">${s.userName}</p></div>
                            <div><p class="text-xs text-gray-500 uppercase font-bold">Worker</p><p class="font-medium">${workerDisplayName || 'Unknown'}</p></div>
                            <div><p class="text-xs text-gray-500 uppercase font-bold">Date</p><p class="font-medium">${s.dateDisplay}</p></div>
                            <div><p class="text-xs text-gray-500 uppercase font-bold">Time</p><p class="font-medium">${s.timesheet?.start || s.startTime} - ${s.timesheet?.end || s.endTime}</p></div>
                        </div>
                        <div class="mb-6">
                            <p class="text-xs text-gray-500 uppercase font-bold mb-1">Summary of Support</p>
                            <div class="bg-gray-50 p-4 rounded text-sm leading-relaxed">${s.caseNotes?.summary || 'No summary provided.'}</div>
                        </div>
                        <div class="mb-6">
                            <p class="text-xs text-gray-500 uppercase font-bold mb-1">Goal Progress</p>
                            <div class="bg-gray-50 p-4 rounded text-sm leading-relaxed">${s.caseNotes?.goals || 'No goals recorded.'}</div>
                        </div>
                        
                        ${s.travel?.totalKm > 0 ? `
                        <div class="mb-6">
                            <p class="text-xs text-gray-500 uppercase font-bold mb-1">Travel Claim (${s.travel.totalKm} km)</p>
                            <table class="w-full text-xs text-left border-collapse border border-gray-200">
                                <thead class="bg-gray-50"><tr><th class="p-2 border">From</th><th class="p-2 border">To</th><th class="p-2 border">Reason</th><th class="p-2 border">KM</th></tr></thead>
                                <tbody>
                                    ${s.travel.logs.map(log => `
                                    <tr>
                                        <td class="p-2 border">${log.from}</td>
                                        <td class="p-2 border">${log.to}</td>
                                        <td class="p-2 border">${log.reason}</td>
                                        <td class="p-2 border">${log.km}</td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>` : ''}

                        ${s.caseNotes?.incidents === 'Yes' ? `<div class="mb-6 p-4 bg-red-50 border border-red-100 rounded"><p class="text-red-700 font-bold text-sm mb-1">Incident Reported</p><p class="text-red-600 text-sm">${s.caseNotes.incidentDetails}</p></div>` : ''}
                        <div class="mt-12 pt-4 border-t text-center text-xs text-gray-400">Generated via Think Pathways Portal</div>
                    </div>
                    <script>window.print();</script>
                </body>
                </html>
            `);
            reportWindow.document.close();
        };

        return (
            <div className="relative bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group">
                <div className="flex flex-col md:flex-row gap-4">
                    
                    {/* 1. DATE COLUMN */}
                    <div className="md:w-24 flex-shrink-0 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-2">
                        <div className="text-center md:text-left">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                {s.dateDisplay.split(' ').length > 2 ? s.dateDisplay.split(' ')[2] : ''}
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                                {s.dateDisplay.split(' ')[0]}
                            </div>
                            <div className="text-xs text-slate-500 uppercase">
                                {s.dateDisplay.split(' ').length > 1 ? s.dateDisplay.split(' ')[1] : ''}
                            </div>
                        </div>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md whitespace-nowrap">
                            {s.startTime} - {s.endTime}
                        </div>
                    </div>

                    {/* 2. CONTENT COLUMN */}
                    <div className="flex-grow border-l-0 md:border-l border-t md:border-t-0 border-slate-100 dark:border-slate-700 pt-3 md:pt-0 md:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">{s.service}</h4>
                            {s.recurrence && s.recurrence !== 'none' && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 uppercase font-bold tracking-wide">
                                    {s.recurrence}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                            {s.assignedWorkerEmail ? (
                                <div className="flex items-center bg-slate-50 dark:bg-slate-700/50 rounded-full pl-1 pr-3 py-1 border border-slate-100 dark:border-slate-600 w-fit">
                                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold mr-2">
                                        {workerDisplayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 mr-2">
                                        {workerDisplayName}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full ${s.workerStatus === 'Accepted' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                    {/* FIX: REMOVAL BUTTON ONLY IF NOT COMPLETED */}
                                    {s.workerStatus !== 'Completed' && (
                                        <button onClick={(e) => { e.stopPropagation(); onRemoveWorker(s.id); }} className="ml-2 text-slate-400 hover:text-red-500 transition-colors" title="Remove Worker">
                                            <i className="fa-solid fa-xmark"></i>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                /* FIX: ASSIGN BUTTON ONLY IF CONFIRMED */
                                s.status === 'Confirmed' ? (
                                    <button onClick={(e) => { e.stopPropagation(); onAssign(s); }} className="text-xs flex items-center gap-2 text-slate-500 hover:text-brand-600 border border-dashed border-slate-300 hover:border-brand-400 px-3 py-1.5 rounded-full transition-colors bg-white dark:bg-transparent dark:border-slate-600 dark:text-slate-400 dark:hover:text-brand-400">
                                        <i className="fa-solid fa-user-plus"></i> Assign Worker
                                    </button>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Waiting for approval...</span>
                                )
                            )}
                        </div>

                        {s.notes && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 italic flex items-start gap-1">
                                <i className="fa-regular fa-note-sticky mt-0.5"></i> <span>{s.notes}</span>
                            </div>
                        )}
                    </div>

                    {/* 3. ACTION COLUMN */}
                    <div className="md:w-auto flex-shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 border-slate-100 dark:border-slate-700 pt-3 md:pt-0">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusColor}`}>
                            {s.statusLabel}
                        </span>

                        <div className="flex items-center gap-2">
                            {s.status === 'Pending' ? (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(s.id, 'Confirmed'); }} className="w-9 h-9 rounded-full bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center transition-colors shadow-sm" title="Approve Request">
                                        <i className="fa-solid fa-check"></i>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); openActionModal(s, 'Declined'); }} className="w-9 h-9 rounded-full bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center transition-colors shadow-sm" title="Decline Request">
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                </>
                            ) : (
                                s.status === 'Confirmed' && (
                                    <button onClick={(e) => { e.stopPropagation(); openActionModal(s, 'Cancelled'); }} className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors bg-red-50 dark:bg-red-900/10 dark:border-red-900">
                                        Cancel
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                </div>
                
                {/* --- SHIFT REPORT VISIBILITY --- */}
                {(s.workerStatus === 'Completed' && (s.caseNotes || s.travel)) && (
                    <div className="mt-3 w-full bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-600 pt-3 px-2">
                            <div className="flex justify-between items-center mb-2">
                            <div className="text-xs font-bold text-brand-600 uppercase">Shift Report</div>
                            <button onClick={downloadPDF} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-100 flex items-center text-slate-600 shadow-sm"><i className="fa-solid fa-file-pdf mr-1 text-red-500"></i> Download PDF</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300">Summary:</p>
                                <p className="text-slate-600 dark:text-slate-400 mb-2">{s.caseNotes?.summary || 'N/A'}</p>
                                <p className="font-semibold text-slate-700 dark:text-slate-300">Goals:</p>
                                <p className="text-slate-600 dark:text-slate-400">{s.caseNotes?.goals || 'N/A'}</p>
                            </div>
                            <div>
                                <div className="mb-2">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">Time: </span>
                                    <span className="text-slate-600 dark:text-slate-400">{s.timesheet?.start} - {s.timesheet?.end}</span>
                                </div>
                                {s.travel?.totalKm > 0 && (
                                    <div className="mb-2">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Travel: </span>
                                        <span className="text-slate-600 dark:text-slate-400">{s.travel.totalKm} km</span>
                                        <ul className="mt-1 pl-4 list-disc text-[10px] text-slate-500">
                                            {s.travel.logs.map((log, i) => (
                                                <li key={i}>{log.from} to {log.to} ({log.km}km)</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {s.caseNotes?.incidents === 'Yes' && (
                                    <div className="bg-red-50 text-red-700 p-2 rounded border border-red-100">
                                        <strong>Incident:</strong> {s.caseNotes.incidentDetails}
                                    </div>
                                )}
                            </div>
                            </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md mb-6 group">
            <div className="p-6 flex flex-col md:flex-row justify-between items-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors" onClick={onExpand}>
                <div className="flex items-center gap-5 mb-4 md:mb-0 w-full md:w-auto">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md ${pendingCount > 0 ? 'bg-amber-500' : 'bg-brand-600'}`}>
                        {client.name.charAt(0).toUpperCase()}
                        {pendingCount > 0 && <span className="absolute top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{client.name}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{client.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center px-4">
                            <span className="text-xl font-bold text-brand-600 dark:text-brand-400">{upcomingCount}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Upcoming</span>
                        </div>
                        {pendingCount > 0 && (
                            <div className="flex flex-col items-center px-4 border-l border-slate-100 dark:border-slate-700">
                                <span className="text-xl font-bold text-amber-500">{pendingCount}</span>
                                <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wide">Pending</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center">
                        {/* 1. CONTRACT GENERATOR BUTTON */}
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                // Calculate dates (Today + 1 Year)
                                const start = new Date().toISOString().split('T')[0];
                                const end = new Date();
                                end.setFullYear(end.getFullYear() + 1);
                                const endStr = end.toISOString().split('T')[0];
                                
                                // Save to Session Storage
                                const agreementData = {
                                    name: client.name,
                                    start: start,
                                    end: endStr
                                };
                                sessionStorage.setItem('agreementData', JSON.stringify(agreementData));
                                
                                // Open the smart agreement
                                window.open(`service-agreement.html`, '_blank');
                            }} 
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors mr-2" 
                            title="Generate Service Agreement"
                        >
                            <i className="fa-solid fa-file-contract"></i>
                        </button>

                        {/* 2. EXISTING DOCS BUTTON */}
                        <button onClick={(e) => { e.stopPropagation(); onOpenDocs(client); }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-brand-600 flex items-center justify-center transition-colors" title="Manage Documents"><i className="fa-regular fa-folder-open"></i></button>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-slate-200 dark:bg-slate-600 text-slate-600' : ''}`}>
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                    </div>
                </div>
            </div>
            
            {/* EXPANDED AREA */}
            {isExpanded && (
                <div className="bg-slate-50/80 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 p-6 space-y-6 animate-fade-in">
                    {!showUnassignedOnly ? (
                        <>
                            {pending.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3 pl-1 flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>Action Required</h4>
                                    <div className="space-y-3">{pending.map(s => <ShiftItem key={s.id} s={s} />)}</div>
                                </div>
                            )}
                            
                            {scheduled.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3 pl-1 flex items-center mt-2"><span className="w-2 h-2 rounded-full bg-brand-500 mr-2"></span>Scheduled</h4>
                                    <div className="space-y-3">{scheduled.map(s => <ShiftItem key={s.id} s={s} />)}</div>
                                </div>
                            )}

                            {history.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1 mt-6">History</h4>
                                    <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">{history.map(s => <ShiftItem key={s.id} s={s} />)}</div>
                                </div>
                            )}

                            {scheduled.length === 0 && pending.length === 0 && history.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300"><i className="fa-regular fa-calendar-xmark text-xl"></i></div>
                                    <p className="text-sm text-slate-400">No shifts found for this client.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-3">{renderList.map(s => <ShiftItem key={s.id} s={s} />)}</div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = () => {
    const { shifts, workersList, usersList, user, logout, updateShiftStatus, assignWorker, removeWorker, addWorkerToDB, deleteWorkerFromDB, updateWorkerInDB, updateProfile, verifyUserAsClient, promoteUserToWorker, revokeUserRole, exportToCSV } = useContext(AuthContext);
    const [expandedClientId, setExpandedClientId] = useState(null);
    const [assignModalShift, setAssignModalShift] = useState(null);
    const [actionModal, setActionModal] = useState(null); 
    const [showWorkerModal, setShowWorkerModal] = useState(false);
    const [activeTab, setActiveTab] = useState('bookings');
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
    const [viewMode, setViewMode] = useState('list'); 
    const [selectedDayShifts, setSelectedDayShifts] = useState(null);
    const [selectedWorker, setSelectedWorker] = useState(null); 
    const [editingWorker, setEditingWorker] = useState(null);
    const [clientDocsClient, setClientDocsClient] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [isVerificationExpanded, setIsVerificationExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const clients = useMemo(() => {
        const groups = {};
        shifts.forEach(s => {
            if (!groups[s.userId]) { 
                const userRec = usersList.find(u => u.id === s.userId);
                groups[s.userId] = { 
                    id: s.userId, 
                    name: s.userName || 'Unknown', 
                    email: s.userEmail || 'No Email', 
                    documents: userRec ? userRec.documents : [], 
                    shifts: [], 
                    stats: { upcoming: 0, pending: 0 }, 
                    nextShiftTime: Infinity 
                }; 
            }
            groups[s.userId].shifts.push(s);
            const timeVal = getSortValue(s);
            const today = new Date().setHours(0,0,0,0);
            if (s.status === 'Pending') groups[s.userId].stats.pending++;
            if ((s.status === 'Confirmed' || s.status === 'Pending') && new Date(s.date) >= today) { groups[s.userId].stats.upcoming++; if (timeVal < groups[s.userId].nextShiftTime) { groups[s.userId].nextShiftTime = timeVal; } }
        });
        return Object.values(groups).sort((a, b) => a.nextShiftTime - b.nextShiftTime);
    }, [shifts, usersList]);
    
    const filteredClients = useMemo(() => {
        if (!searchQuery) return clients;
        const lowerQuery = searchQuery.toLowerCase();
        return clients.filter(c => c.name.toLowerCase().includes(lowerQuery) || c.email.toLowerCase().includes(lowerQuery));
    }, [clients, searchQuery]);

    const filteredShiftsForCalendar = useMemo(() => {
        if (!searchQuery) return shifts;
        const clientIds = new Set(filteredClients.map(c => c.id));
        return shifts.filter(s => clientIds.has(s.userId));
    }, [shifts, filteredClients, searchQuery]);

    const alerts = useMemo(() => shifts.filter(s => s.status === 'Pending'), [shifts]);
    const openActionModal = (shift, type) => setActionModal({ shift, type });
    const handleViewWorker = (email) => { const worker = workersList?.find(w => w.email.toLowerCase() === email.toLowerCase()); setSelectedWorker(worker || { name: 'Unknown', email: email, notes: 'Profile not found.' }); };
    const handleVerifyClient = async (uid) => { setActionLoading(uid); await verifyUserAsClient(uid); setActionLoading(null); };
    const handlePromoteWorker = async (uid, userData) => { setActionLoading(uid); await promoteUserToWorker(uid, userData); setActionLoading(null); };
    const handleRevokeRole = async (uid, email) => { if(confirm("Reset to 'Unverified'?")) { setActionLoading(uid); await revokeUserRole(uid, email); setActionLoading(null); } };

    const pendingUsers = usersList.filter(u => !u.role || u.role === 'unverified');
    const clientUsers = usersList.filter(u => u.role === 'client');
    const teamMembers = workersList.map(w => { const userAccount = usersList.find(u => u.email.toLowerCase() === w.email.toLowerCase()); return { ...w, userId: userAccount ? userAccount.id : null }; });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-12 transition-colors">
            {showWorkerModal && <AddWorkerModal onClose={() => setShowWorkerModal(false)} onAdd={addWorkerToDB} />}
            {editingWorker && <EditWorkerModal worker={editingWorker} onClose={() => setEditingWorker(null)} onUpdate={updateWorkerInDB} onDelete={deleteWorkerFromDB} />}
            {assignModalShift && <AssignWorkerModal shift={assignModalShift} workersList={workersList} onClose={() => setAssignModalShift(null)} onAssign={assignWorker} />}
            {actionModal && <AdminActionModal shift={actionModal.shift} actionType={actionModal.type} onClose={() => setActionModal(null)} onConfirm={updateShiftStatus} />}
            {selectedDayShifts && <DayDetailsModal shifts={selectedDayShifts} onClose={() => setSelectedDayShifts(null)} />}
            {selectedWorker && <WorkerDetailsModal worker={selectedWorker} onClose={() => setSelectedWorker(null)} />}
            {clientDocsClient && <ClientDocsModal client={clientDocsClient} onClose={() => setClientDocsClient(null)} />}
            {isProfileOpen && <ProfileModal user={user} onClose={() => setIsProfileOpen(false)} onUpdate={updateProfile} />}
            
            <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/30"><i className="fa-solid fa-user-shield"></i></div><h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Admin<span className="text-slate-400 font-normal">Portal</span></h1></div>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-full p-1 border border-slate-200 dark:border-slate-600"><button onClick={() => setActiveTab('bookings')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'bookings' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Bookings</button><button onClick={() => setActiveTab('users')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>People</button></div>
                    <div className="flex gap-3 items-center">
                        <button onClick={exportToCSV} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors" title="Export CSV"><i className="fa-solid fa-file-csv"></i></button>
                        <button onClick={() => window.location.reload()} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors" title="Refresh Data"><i className="fa-solid fa-rotate-right"></i></button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                        <ThemeToggle /><button onClick={() => setIsProfileOpen(true)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-white flex items-center justify-center transition-colors"><i className="fa-solid fa-user"></i></button><button onClick={logout} className="text-sm text-red-600 font-bold hover:text-red-500 transition-colors ml-2">Sign Out</button></div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 md:p-10">
                {activeTab === 'bookings' && (
                    <>
                        {alerts.length > 0 && (<div className="mb-10 animate-fade-in"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Task List</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{alerts.map(s => (<div key={s.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 border-amber-400 shadow-sm hover:shadow-md transition-all flex justify-between items-center group"><div><div className="text-xs font-bold text-amber-600 uppercase mb-1">Request</div><p className="font-bold text-slate-900 dark:text-white">{s.userName}</p><p className="text-xs text-slate-500">{s.dateDisplay}</p></div><button onClick={() => setExpandedClientId(s.userId)} className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-colors"><i className="fa-solid fa-arrow-right"></i></button></div>))}</div></div>)}
                        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4 border-b border-slate-200 dark:border-slate-700 pb-6"><div><h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Bookings</h2><div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Managing {clients.length} active clients</div></div><div className="flex flex-col sm:flex-row items-center gap-3"><div className="relative"><i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i><input type="text" placeholder="Search clients..." className="pl-9 pr-4 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-64 transition-all shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div><div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"><button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}><i className="fa-solid fa-list mr-2"></i>List</button><button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}><i className="fa-solid fa-calendar mr-2"></i>Calendar</button></div><button onClick={() => setShowUnassignedOnly(!showUnassignedOnly)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${showUnassignedOnly ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>{showUnassignedOnly ? 'Showing Unassigned' : 'Filter Unassigned'}</button></div></div>
                        {viewMode === 'list' ? (<div className="space-y-4">{filteredClients.length === 0 ? <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl"><i className="fa-solid fa-magnifying-glass text-4xl text-slate-300 mb-4"></i><p className="text-slate-500 font-medium">No clients found matching "{searchQuery}"</p></div> : filteredClients.map(client => <ClientCard key={client.id} client={client} isExpanded={expandedClientId === client.id} onExpand={() => setExpandedClientId(expandedClientId === client.id ? null : client.id)} onUpdateStatus={updateShiftStatus} openActionModal={openActionModal} onAssign={setAssignModalShift} onRemoveWorker={removeWorker} showUnassignedOnly={showUnassignedOnly} workersList={workersList} onViewWorker={handleViewWorker} onOpenDocs={setClientDocsClient} />)}</div>) : (<CalendarView shifts={filteredShiftsForCalendar} onDateClick={setSelectedDayShifts} />)}
                    </>
                )}
                
                {activeTab === 'users' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800 flex justify-between items-center cursor-pointer" onClick={() => setIsVerificationExpanded(!isVerificationExpanded)}><h3 className="font-bold text-orange-800 dark:text-orange-200 flex items-center"><i className="fa-solid fa-hourglass-half mr-2"></i> Pending Verification ({pendingUsers.length})</h3><i className={`fa-solid fa-chevron-down text-orange-400 transition-transform ${isVerificationExpanded ? 'rotate-180' : ''}`}></i></div>
                            {isVerificationExpanded && (<div className="p-0">{pendingUsers.length === 0 ? <div className="p-6 text-center text-slate-400 italic text-sm">No new signups waiting.</div> : <table className="w-full text-left"><thead className="bg-slate-50 dark:bg-slate-700 text-xs font-bold uppercase text-slate-500 dark:text-slate-400"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{pendingUsers.map(u => (<tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-4 font-bold text-slate-900 dark:text-white">{u.name}</td><td className="p-4 text-sm text-slate-500 dark:text-slate-300">{u.email}</td><td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleVerifyClient(u.id)} disabled={actionLoading === u.id} className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">Client</button><button onClick={() => handlePromoteWorker(u.id, u)} disabled={actionLoading === u.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">Worker</button></div></td></tr>))}</tbody></table>}</div>)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-fit"><div className="p-4 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600"><h3 className="font-bold text-slate-800 dark:text-white flex items-center"><i className="fa-solid fa-users mr-2 text-slate-400"></i> Clients ({clientUsers.length})</h3></div><div>{clientUsers.length === 0 ? <div className="p-6 text-center text-slate-400 italic text-sm">No clients yet.</div> : <table className="w-full text-left"><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{clientUsers.map(u => (<tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-3"><div className="font-bold text-slate-900 text-sm dark:text-white">{u.name}</div><div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div></td><td className="p-3 text-right"><button onClick={() => handleRevokeRole(u.id, u.email)} disabled={actionLoading === u.id} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded dark:hover:bg-red-900/30 dark:text-red-400" title="Revoke Role"><i className="fa-solid fa-user-slash"></i></button></td></tr>))}</tbody></table>}</div></div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-fit"><div className="p-4 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center"><h3 className="font-bold text-slate-800 dark:text-white flex items-center"><i className="fa-solid fa-briefcase mr-2 text-slate-400"></i> Team ({teamMembers.length})</h3><button onClick={() => setShowWorkerModal(true)} className="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700"><i className="fa-solid fa-plus mr-1"></i> Add</button></div><div>{teamMembers.length === 0 ? <div className="p-6 text-center text-slate-400 italic text-sm">No workers yet.</div> : <table className="w-full text-left"><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{teamMembers.map(w => (<tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-3"><div className="font-bold text-slate-900 text-sm dark:text-white flex items-center">{w.name}{!w.userId && <span className="ml-2 text-[8px] bg-slate-200 text-slate-500 px-1 rounded uppercase dark:bg-slate-600 dark:text-slate-300">Invited</span>}</div><div className="text-xs text-slate-500 dark:text-slate-400">{w.email}</div><div className="flex gap-2 mt-1 flex-wrap"><ComplianceBadge date={w.screeningExpiry} label="Screening" /><ComplianceBadge date={w.firstAidExpiry} label="First Aid" /><ComplianceBadge date={w.cprExpiry} label="CPR" /></div></td><td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => setEditingWorker(w)} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded dark:hover:bg-blue-900/30 dark:text-blue-400" title="Edit Profile"><i className="fa-solid fa-pen"></i></button>{w.userId && (<button onClick={() => handleRevokeRole(w.userId, w.email)} disabled={actionLoading === w.userId} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded dark:hover:bg-red-900/30 dark:text-red-400" title="Revoke User Access"><i className="fa-solid fa-user-slash"></i></button>)}</div></td></tr>))}</tbody></table>}</div></div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const UnverifiedDashboard = () => {
    const { logout, user } = useContext(AuthContext);
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 transition-colors">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 text-center animate-slide-up">
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <i className="fa-solid fa-hourglass-half"></i>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verification Pending</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                    Hi <strong>{user.displayName}</strong>, thanks for signing up! 
                    <br/><br/>
                    Your account is currently under review. Please wait for an administrator to verify your account before you can access the client portal.
                </p>
                
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg mb-6 text-sm text-slate-500 dark:text-slate-400">
                    Need access urgently?<br/>
                    Contact us at: <a href="mailto:care@thinkpathways.com" className="text-brand-600 font-bold hover:underline">care@thinkpathways.com</a>
                </div>

                <button onClick={logout} className="w-full bg-slate-200 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                    Sign Out
                </button>
            </div>
        </div>
    );
};

const Login = () => {
    const { login, signup, resetPassword } = useContext(AuthContext);
    const [mode, setMode] = useState('login');
    const [error, setError] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => { e.preventDefault(); setError(''); if(mode !== 'forgot' && !captchaToken) { setError('Please complete security check.'); return; } setLoading(true); const d = new FormData(e.target); try { if(mode === 'signup') { if(d.get('password') !== d.get('confirmPassword')) throw new Error("Firebase: Passwords do not match."); await signup(d.get('email'), d.get('password'), d.get('name')); } else if(mode === 'login') await login(d.get('email'), d.get('password')); else { await resetPassword(d.get('email')); setError('Reset email sent!'); setLoading(false); return; } } catch(err) { setError(err.message.replace('Firebase: ','')); setLoading(false); if(window.turnstile) window.turnstile.reset(); setCaptchaToken(null); } };
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 transition-colors">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-slide-up">
                <div className="text-center mb-8"><div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg"><i className="fa-solid fa-hands-holding-circle"></i></div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Pathway Portal</h1><p className="text-slate-500 dark:text-slate-400 text-sm mt-2">{mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Welcome Back' : 'Reset Password'}</p></div>
                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded flex items-center"><i className="fa-solid fa-circle-exclamation mr-2"></i>{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'signup' && <input name="name" required className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg outline-none focus:border-brand-500 dark:bg-slate-700 dark:text-white" placeholder="Full Name" />}
                    <input name="email" type="email" required className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg outline-none focus:border-brand-500 dark:bg-slate-700 dark:text-white" placeholder="Email" />
                    {mode !== 'forgot' && <div className="relative"><input name="password" type={showPassword?"text":"password"} required className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg outline-none focus:border-brand-500 dark:bg-slate-700 dark:text-white" placeholder="Password" /><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-2 text-slate-400"><i className={`fa-solid ${showPassword?'fa-eye-slash':'fa-eye'}`}></i></button></div>}
                    {mode === 'signup' && <input name="confirmPassword" type={showPassword?"text":"password"} required className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg outline-none focus:border-brand-500 dark:bg-slate-700 dark:text-white" placeholder="Confirm Password" />}
                    {mode !== 'forgot' && <TurnstileWidget onVerify={setCaptchaToken} />}
                    <button disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50">{loading ? 'Processing...' : (mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Sign In' : 'Send Link')}</button>
                </form>
                <div className="mt-6 text-center pt-6 border-t border-slate-100 dark:border-slate-700 space-y-2">{mode === 'login' && <><button onClick={()=>setMode('signup')} className="block w-full text-sm text-brand-600 dark:text-brand-400 font-medium">New Client? Create Account</button><button onClick={()=>setMode('forgot')} className="block w-full text-xs text-slate-500 dark:text-slate-400">Forgot Password?</button></>}{(mode === 'signup' || mode === 'forgot') && <button onClick={()=>setMode('login')} className="block w-full text-sm text-brand-600 dark:text-brand-400 font-medium">Back to Login</button>}</div>
                <div className="mt-4 text-center"><a href="index.html" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">← Back to Website</a></div>
            </div>
        </div>
    );
};

const BookingModal = ({ onClose }) => {
    const { bookShift } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const [recurrence, setRecurrence] = useState('none'); 
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [duration, setDuration] = useState(0);

    // Auto-calculate duration
    useEffect(() => {
        if(startTime && endTime) {
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            let diff = (end - start) / 1000 / 60 / 60;
            if (diff < 0) diff += 24; 
            setDuration(diff);
        } else {
            setDuration(0);
        }
    }, [startTime, endTime]);
    
    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setLoading(true); 
        setMsg(null);
        const d = new FormData(e.target);
        
        if (new Date(d.get('date')) < new Date(new Date().setDate(new Date().getDate() + 1))) { 
            setMsg({type:'error', text:'Please select a date from tomorrow onwards.'}); 
            setLoading(false); 
            return; 
        }
        if(!startTime || !endTime) { setMsg({type:'error', text:'Please select start and end times.'}); setLoading(false); return; }
        
        const result = await bookShift({ 
            date: d.get('date'), 
            startTime: startTime,
            endTime: endTime,
            duration: duration.toFixed(1), 
            service: d.get('service'), 
            recurrence: d.get('recurrence'), 
            endDate: d.get('endDate'), 
            notes: d.get('notes') 
        });

        if(result.success) { 
            setMsg({type:'success', text:'Request Sent Successfully!'}); 
            setTimeout(onClose, 1200); 
        } else { 
            setMsg({type:'error', text: result.msg || 'Failed to book.'}); 
            setLoading(false); 
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg relative animate-pop-in"><button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-2xl"></i></button><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Request Session</h3>{msg && <div className={`p-3 mb-4 text-sm rounded border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{msg.text}</div>}<form onSubmit={handleSubmit} className="space-y-5">
        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Date</label><input type="date" name="date" required min={getTomorrowDate()} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" /></div>
        
        <div className="grid grid-cols-2 gap-4">
            <TimeSelect label="Start Time" value={startTime} onChange={setStartTime} />
            <TimeSelect label="End Time" value={endTime} onChange={setEndTime} minTime={startTime} />
        </div>
        {duration > 0 && (<div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-brand-700 dark:text-brand-300 font-bold"><i className="fa-regular fa-clock mr-2"></i> Total Duration: {duration.toFixed(1)} hrs</div>)}

        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Recurrence</label>
                <select name="recurrence" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                    <option value="none">One-off</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                </select>
            </div>
            {recurrence !== 'none' && (
                <div className="col-span-2 animate-fade-in">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">End Date (Series)</label>
                    <input type="date" name="endDate" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
            )}
        </div>
        
        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Service Type</label><select name="service" required defaultValue="" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"><option value="" disabled>Select...</option><option>Community Access</option><option>In-Home Support</option><option>Skill Building</option><option>Complex Care</option></select></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Notes</label><textarea name="notes" rows="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Specific requests..."></textarea></div><button disabled={loading} className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-70 transition-colors shadow-lg shadow-brand-500/20">Submit Request</button></form></div></div>
    );
};

const CancellationModal = ({ shift, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const handleConfirm = async () => { setLoading(true); await onConfirm(shift.id, reason); setLoading(false); onClose(); };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md relative animate-pop-in"><h3 className="text-xl font-bold mb-4 text-red-600"><i className="fa-solid fa-triangle-exclamation mr-2"></i> Cancel Session?</h3>{isShortNotice(shift.date) && <div className="bg-red-50 border border-red-100 p-3 rounded-lg mb-4 text-xs text-red-800"><strong>Notice:</strong> Within 48 hours. Fees may apply.</div>}<textarea value={reason} onChange={(e)=>setReason(e.target.value)} className="w-full p-2 border rounded-lg mb-4 text-sm outline-none focus:border-red-500 dark:bg-slate-700 dark:text-white" rows="2" placeholder="Reason..."></textarea><div className="flex gap-3 justify-end"><button onClick={onClose} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg">Keep</button><button onClick={handleConfirm} disabled={!reason || loading} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold disabled:opacity-50">Confirm</button></div></div></div>
    );
};

const WorkerDashboard = () => {
     const { user, logout, workerShifts, workerResponse, completeShift, updateProfile } = useContext(AuthContext);
     const [loadingId, setLoadingId] = useState(null);
     const [viewMode, setViewMode] = useState('list');
     const [selectedDayShifts, setSelectedDayShifts] = useState(null);
     const [isProfileOpen, setIsProfileOpen] = useState(false);
     const [completionShift, setCompletionShift] = useState(null); // State for completion modal

     const handleResponse = async (id, response) => { setLoadingId(id); await workerResponse(id, response); setLoadingId(null); };
     
     const now = new Date();
     const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
     const todayStr = new Date().toLocaleDateString('en-CA'); 

     const activeWorkerShifts = workerShifts.filter(s => s.status !== 'Cancelled' && s.status !== 'Declined');

     const upcomingShifts = activeWorkerShifts
        .filter(s => s.date >= todayStr)
        .sort((a,b) => getSortValue(a) - getSortValue(b));

     const pastShifts = workerShifts.filter(s => s.date < todayStr).sort((a,b) => getSortValue(b) - getSortValue(a));

     const shiftsThisWeek = upcomingShifts.filter(s => {
        const d = new Date(s.date);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return d <= nextWeek;
     }).length;

     return (
         <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans pb-12 transition-colors">
             {selectedDayShifts && <DayDetailsModal shifts={selectedDayShifts} onClose={() => setSelectedDayShifts(null)} />}
             {isProfileOpen && <ProfileModal user={user} onClose={() => setIsProfileOpen(false)} onUpdate={updateProfile} />}
             {completionShift && <CompleteShiftModal shift={completionShift} onClose={() => setCompletionShift(null)} onConfirm={completeShift} />}
             
             <header className="bg-white shadow-sm sticky top-0 z-20 border-b-4 border-brand-600 dark:bg-slate-800">
                 <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
                     <div className="flex items-center gap-3"><div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white"><i className="fa-solid fa-hands-holding-circle"></i></div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Worker Portal</h1></div>
                     <div className="flex gap-4 items-center">
                         <ThemeToggle />
                         <button onClick={() => setIsProfileOpen(true)} className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"><i className="fa-solid fa-user-circle text-xl"></i></button>
                         <button onClick={logout} className="text-sm text-red-600 font-bold">Sign Out</button>
                     </div>
                 </div>
             </header>
             <main className="max-w-4xl mx-auto p-4 md:p-8">
                 
                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Upcoming Shifts</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{upcomingShifts.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">This Week</p>
                        <p className="text-2xl font-bold text-brand-600">{shiftsThisWeek}</p>
                    </div>
                 </div>
                 
                 <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Shifts</h2>
                     <div className="bg-white p-1 rounded-lg border border-slate-300 flex dark:bg-slate-800 dark:border-slate-700">
                         <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-md text-xs font-bold ${viewMode === 'list' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}><i className="fa-solid fa-list mr-1"></i></button>
                         <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 rounded-md text-xs font-bold ${viewMode === 'calendar' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}><i className="fa-solid fa-calendar mr-1"></i></button>
                     </div>
                 </div>

                 {viewMode === 'calendar' ? (
                     <div className="mb-8">
                         <div className="bg-blue-50 p-3 rounded-lg mb-4 text-xs text-blue-700 border border-blue-100 flex items-start dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                             <i className="fa-solid fa-circle-info mt-0.5 mr-2"></i>
                             <span>Recurring shifts are projected on the calendar for the next 3 months.</span>
                         </div>
                         <CalendarView shifts={activeWorkerShifts} onDateClick={setSelectedDayShifts} />
                     </div>
                 ) : (
                     <>
                         <h3 className="text-lg font-bold text-slate-900 mb-4 dark:text-white">Upcoming</h3>
                         {upcomingShifts.length === 0 ? <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 mb-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">No upcoming shifts assigned.</div> : (
                             <div className="space-y-4 mb-8">{upcomingShifts.map(s => (
                                 <div key={s.id} className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden dark:bg-slate-800 dark:border-slate-700`}>
                                     <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.workerStatus === 'Accepted' ? 'bg-green-500' : s.workerStatus === 'Completed' ? 'bg-brand-500' : 'bg-yellow-400'}`}></div>
                                     <div className="pl-3">
                                         <div className="flex items-center gap-2 mb-1">
                                             <span className="font-bold text-lg text-slate-900 dark:text-white">{s.dateDisplay}</span>
                                             {(s.recurrence && s.recurrence !== 'none') && (
                                                 <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase dark:bg-blue-900/30 dark:text-blue-300">
                                                     <i className="fa-solid fa-rotate mr-1"></i> {s.recurrence}
                                                 </span>
                                             )}
                                             <span className={`text-xs px-2 py-0.5 rounded border ${s.workerStatus === 'Accepted' ? 'bg-green-50 text-green-800 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : s.workerStatus === 'Completed' ? 'bg-brand-50 text-brand-800 border-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800' : 'bg-yellow-50 text-yellow-800 border-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'}`}>{s.workerStatus || 'Pending Action'}</span>
                                         </div>
                                         <div className="text-sm text-slate-600 dark:text-slate-400"><p><strong>Client:</strong> {s.userName}</p><p>{s.service} • {s.startTime}-{s.endTime} ({s.duration}h)</p></div>
                                     </div>
                                     
                                     <div className="flex gap-3">
                                        {(s.workerStatus === 'Pending Acceptance' || !s.workerStatus) && (
                                            <>
                                                <button onClick={()=>handleResponse(s.id, 'Accepted')} disabled={loadingId===s.id} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors">Accept</button>
                                                <button onClick={()=>handleResponse(s.id, 'Declined')} disabled={loadingId===s.id} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-50 transition-colors dark:bg-slate-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">Decline</button>
                                            </>
                                        )}
                                        
                                        {(s.workerStatus === 'Accepted' && s.status === 'Confirmed') && (
                                            <button onClick={() => setCompletionShift(s)} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 shadow-sm transition-colors flex items-center">
                                                <i className="fa-solid fa-clipboard-check mr-2"></i> Complete
                                            </button>
                                        )}
                                     </div>
                                 </div>
                             ))}</div>
                         )}

                         <h3 className="text-lg font-bold text-slate-900 mb-4 dark:text-white">History</h3>
                         {pastShifts.length === 0 ? <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 mb-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">No past shifts found.</div> : (
                             <div className="space-y-4 opacity-75">{pastShifts.map(s => (
                                 <div key={s.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center dark:bg-slate-800/50 dark:border-slate-700">
                                     <div>
                                         <div className="font-bold text-slate-700 dark:text-slate-300">{s.dateDisplay}</div>
                                         <div className="text-sm text-slate-500 dark:text-slate-400">{s.userName} • {s.service}</div>
                                     </div>
                                     <div className="text-xs font-bold text-slate-400 uppercase dark:text-slate-500">{s.status === 'Confirmed' ? 'Completed' : s.status}</div>
                                 </div>
                             ))}</div>
                         )}
                     </>
                 )}
             </main>
         </div>
     );
 };

const ClientDashboard = () => {
    const { user, logout, shifts, isLoadingShifts, updateShiftStatus, updateProfile } = useContext(AuthContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cancelModalShift, setCancelModalShift] = useState(null);
    const [viewMode, setViewMode] = useState('list'); 
    const [selectedDayShifts, setSelectedDayShifts] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const upcomingShifts = useMemo(() => 
        shifts.filter(s => new Date(s.date) >= today && s.status === 'Confirmed')
              .sort((a,b) => getSortValue(a) - getSortValue(b)), 
    [shifts]);

    const pendingShifts = useMemo(() => 
        shifts.filter(s => s.status === 'Pending')
              .sort((a,b) => getSortValue(a) - getSortValue(b)), 
    [shifts]);
    
    const historyShifts = useMemo(() => 
        shifts.filter(s => new Date(s.date) < today || s.status === 'Cancelled' || s.status === 'Declined')
              .sort((a,b) => getSortValue(b) - getSortValue(a)), 
    [shifts]);

    const nextShift = upcomingShifts.length > 0 ? upcomingShifts[0] : null;

    // --- CLIENT-SPECIFIC SHIFT ITEM ---
    const ClientShiftItem = ({ s }) => {
        let statusColor = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
        if (s.status === 'Confirmed') statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800";
        if (s.status === 'Pending') statusColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800";
        if (s.status === 'Cancelled' || s.status === 'Declined') statusColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";

        // Removed PDF logic since report is hidden

        return (
            <div className="relative bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group">
                <div className="flex flex-col md:flex-row gap-4">
                    
                    {/* 1. DATE COLUMN */}
                    <div className="md:w-24 flex-shrink-0 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-2">
                        <div className="text-center md:text-left">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                {s.dateDisplay.split(' ').length > 2 ? s.dateDisplay.split(' ')[2] : ''}
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                                {s.dateDisplay.split(' ')[0]}
                            </div>
                            <div className="text-xs text-slate-500 uppercase">
                                {s.dateDisplay.split(' ').length > 1 ? s.dateDisplay.split(' ')[1] : ''}
                            </div>
                        </div>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md whitespace-nowrap">
                            {s.startTime} - {s.endTime}
                        </div>
                    </div>

                    {/* 2. CONTENT COLUMN */}
                    <div className="flex-grow border-l-0 md:border-l border-t md:border-t-0 border-slate-100 dark:border-slate-700 pt-3 md:pt-0 md:pl-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">{s.service}</h4>
                            {s.recurrence && s.recurrence !== 'none' && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 uppercase font-bold tracking-wide">
                                    {s.recurrence}
                                </span>
                            )}
                        </div>
                        
                        {s.notes && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 italic flex items-start gap-1">
                                <i className="fa-regular fa-note-sticky mt-0.5"></i> <span>{s.notes}</span>
                            </div>
                        )}
                        
                        {s.assignedWorkerEmail && (
                            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                <i className="fa-solid fa-user-check text-green-500"></i> Worker Assigned
                            </div>
                        )}
                    </div>

                    {/* 3. ACTION COLUMN (CLIENT SPECIFIC) */}
                    <div className="md:w-auto flex-shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 border-slate-100 dark:border-slate-700 pt-3 md:pt-0">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusColor} flex items-center gap-1`}>
                            {s.workerStatus === 'Completed' && <i className="fa-solid fa-check"></i>}
                            {s.statusLabel}
                        </span>

                        <div className="flex items-center gap-2">
                            {s.status === 'Pending' && (
                                <button onClick={() => setCancelModalShift(s)} className="text-xs text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:text-red-400" title="Withdraw Request">
                                    <i className="fa-solid fa-ban mr-1"></i> Withdraw
                                </button>
                            )}
                            
                            {s.status === 'Confirmed' && s.workerStatus !== 'Completed' && (
                                <button onClick={() => setCancelModalShift(s)} className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors bg-red-50 dark:bg-red-900/10 dark:border-red-900">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12 transition-colors dark:bg-slate-900">
            {isModalOpen && <BookingModal onClose={() => setIsModalOpen(false)} />}
            {cancelModalShift && <CancellationModal shift={cancelModalShift} onClose={() => setCancelModalShift(null)} onConfirm={(id, reason) => updateShiftStatus(id, 'Cancelled', reason)} />}
            {selectedDayShifts && <DayDetailsModal shifts={selectedDayShifts} onClose={() => setSelectedDayShifts(null)} />}
            {isProfileOpen && <ProfileModal user={user} onClose={() => setIsProfileOpen(false)} onUpdate={updateProfile} />}

            <header className="bg-white shadow-sm sticky top-0 z-20 border-b-4 border-brand-600 dark:bg-slate-800">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white"><i className="fa-solid fa-hands-holding-circle"></i></div><h1 className="text-xl font-bold text-slate-900 hidden md:inline dark:text-white">My Pathway Portal</h1></div>
                    <div className="flex items-center gap-6">
                        <span className="text-sm text-slate-500 hidden md:inline dark:text-slate-400">Welcome, <span className="text-slate-900 font-bold dark:text-white">{user.displayName || 'Client'}</span></span>
                        <button onClick={() => setIsProfileOpen(true)} className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"><i className="fa-solid fa-user-circle text-xl"></i></button>
                        <button onClick={logout} className="text-sm text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">Sign Out</button>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 order-2 lg:order-1 space-y-6">
                    
                    {nextShift ? (
                        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden animate-fade-in">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><i className="fa-regular fa-clock text-9xl"></i></div>
                            <p className="text-brand-100 text-sm font-bold uppercase tracking-wider mb-2">Next Session</p>
                            <h3 className="text-3xl font-bold mb-1">{nextShift.dateDisplay.split(',')[0]}</h3>
                            <p className="text-xl opacity-90 mb-4">{nextShift.dateDisplay.split(',')[1]}</p>
                            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                                <i className="fa-solid fa-user-clock mr-2"></i> {nextShift.startTime}-{nextShift.endTime} ({nextShift.duration}h)
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center dark:bg-slate-800 dark:border-slate-700">
                            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fa-regular fa-calendar-plus text-2xl text-brand-600"></i></div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 dark:text-white">No Upcoming Sessions</h3>
                            <p className="text-slate-500 text-sm mb-4 dark:text-slate-400">You are all caught up! Book a new session below.</p>
                            <button onClick={() => setIsModalOpen(true)} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 shadow-lg transform hover:-translate-y-0.5 transition-all">Request New Session</button>
                        </div>
                    )}

                    {nextShift && (
                        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center dark:bg-slate-800 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 mb-2 dark:text-white">Book Another Session</h3>
                            <button onClick={() => setIsModalOpen(true)} className="w-full bg-brand-50 text-brand-700 border border-brand-200 py-3 rounded-xl font-bold hover:bg-brand-100 transition-all dark:bg-slate-700 dark:text-brand-300 dark:border-slate-600 dark:hover:bg-slate-600">Request New Session</button>
                        </div>
                    )}

                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm dark:bg-blue-900/30 dark:border-blue-800">
                        <h4 className="font-bold text-blue-900 text-sm mb-2 dark:text-blue-200"><i className="fa-solid fa-headset mr-2"></i>Need Assistance?</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">We are here to support you. For scheduling changes or questions:</p>
                        <div className="text-sm font-bold text-brand-700 dark:text-brand-300 mb-1"><i className="fa-solid fa-envelope mr-2"></i> <a href="mailto:care@thinkpathways.com" className="hover:underline">care@thinkpathways.com</a></div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">For urgent matters call: <span className="font-bold">+61 420 673 303</span></div>
                    </div>
                </div>
                <div className="lg:col-span-2 order-1 lg:order-2">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4 dark:border-slate-700">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Schedule</h2>
                        <div className="flex gap-2">
                            <div className="bg-white p-1 rounded-lg border border-slate-300 flex dark:bg-slate-800 dark:border-slate-700">
                                <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-md text-xs font-bold ${viewMode === 'list' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}><i className="fa-solid fa-list mr-1"></i></button>
                                <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 rounded-md text-xs font-bold ${viewMode === 'calendar' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}><i className="fa-solid fa-calendar mr-1"></i></button>
                            </div>
                            <button onClick={() => window.location.reload()} className="text-slate-400 hover:text-brand-600 p-2 dark:hover:text-brand-400"><i className="fa-solid fa-rotate-right"></i></button>
                        </div>
                    </div>
                    
                    {isLoadingShifts ? <div className="p-12 text-center text-slate-400">Loading...</div> : (
                        <>
                            {viewMode === 'calendar' ? (
                                <CalendarView shifts={shifts} onDateClick={setSelectedDayShifts} />
                            ) : (
                                <>
                                    <div className="flex space-x-2 mb-6 bg-slate-200 p-1 rounded-lg w-fit dark:bg-slate-700">
                                        <button onClick={() => setActiveTab('upcoming')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'upcoming' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Upcoming</button>
                                        <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${activeTab === 'pending' ? 'bg-white text-yellow-700 shadow-sm dark:bg-slate-800 dark:text-yellow-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Pending {pendingShifts.length > 0 && <span className="ml-2 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingShifts.length}</span>}</button>
                                        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>History</button>
                                    </div>

                                    {activeTab === 'upcoming' && (
                                        <div className="animate-fade-in">
                                            {upcomingShifts.length === 0 ? <div className="text-center text-slate-400 py-8 italic dark:text-slate-500">No confirmed upcoming sessions.</div> : 
                                            <div className="space-y-3">
                                                {upcomingShifts.map(s => (
                                                    <ClientShiftItem key={s.id} s={s} />
                                                ))}
                                            </div>}
                                        </div>
                                    )}

                                    {activeTab === 'pending' && (
                                        <div className="animate-fade-in">
                                            {pendingShifts.length === 0 ? <div className="text-center text-slate-400 py-8 italic dark:text-slate-500">No pending requests.</div> : 
                                            <div className="space-y-3">
                                                {pendingShifts.map(s => (
                                                    <ClientShiftItem key={s.id} s={s} />
                                                ))}
                                            </div>}
                                        </div>
                                    )}

                                    {activeTab === 'history' && (
                                        <div className="animate-fade-in">
                                            {historyShifts.length === 0 ? <div className="text-center text-slate-400 py-8 italic dark:text-slate-500">No history found.</div> : 
                                            <div className="space-y-3 opacity-75">
                                                {historyShifts.map(s => (
                                                    <ClientShiftItem key={s.id} s={s} />
                                                ))}
                                            </div>}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

const App = () => {
    if (configMissing) return <div className="min-h-screen flex items-center justify-center p-4"><div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-l-4 border-yellow-400"><h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Required</h2><p className="text-slate-600">Configure Firebase keys in portal.html</p></div></div>;
    const authData = useAuthAndData();
    if (!authData.isAuthReady) return <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-900"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-brand-600"></i></div>;
    // Remove loader
    if(window.removeLoader) window.removeLoader();

    return (
        <ThemeProvider>
            <AuthContext.Provider value={authData}>
                {authData.user ? (
                    authData.isAdmin ? <AdminDashboard /> : 
                    authData.isWorker ? <WorkerDashboard /> : 
                    authData.isClient ? <ClientDashboard /> : <UnverifiedDashboard />
                ) : <Login />}
            </AuthContext.Provider>
        </ThemeProvider>
    );
};