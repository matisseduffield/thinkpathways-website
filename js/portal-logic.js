// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
                    <pre className="text-xs text-red-400 bg-slate-100 p-4 rounded text-left overflow-auto">{this.state.error.toString()}</pre>
                    <button onClick={() => window.location.reload()} className="mt-4 bg-brand-600 text-white px-4 py-2 rounded">Reload</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- FIREBASE INIT ---
let auth, db, storage, configMissing = false;
try {
    if (window.__firebase_config && window.__firebase_config.apiKey) {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.__firebase_config);
        }
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
    } else {
        configMissing = true;
    }
} catch(e) { 
    console.error("Firebase Init Error", e);
    configMissing = true;
}

const { useState, useEffect, useMemo, useRef, useContext, createContext } = React;

const COLLECTION_PATH = 'artifacts/thinkpathways/public/data/shifts';
const WORKERS_PATH = 'artifacts/thinkpathways/public/data/workers';
const USERS_PATH = 'artifacts/thinkpathways/public/data/users'; 
const ADMIN_EMAIL = window.__admin_email;

// --- HELPERS ---
const formatBookingDate = (dateString) => {
    if (!dateString) return 'Pending Date';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-AU', { month: 'long' });
    const weekday = date.toLocaleDateString('en-AU', { weekday: 'long' });
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';
    return `${day}${suffix} ${month}, ${weekday}`;
};

const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};

const isShortNotice = (shiftDateString) => {
    if (!shiftDateString) return false;
    const shiftDate = new Date(shiftDateString);
    const now = new Date();
    const diffHours = (shiftDate - now) / 1000 / 60 / 60;
    return diffHours < 48 && diffHours > 0;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const getSortValue = (shift) => {
    const datePart = shift.date || '9999-99-99';
    const timePart = shift.startTime || '00:00';
    return new Date(`${datePart}T${timePart}`).getTime();
};

const AuthContext = createContext();
const ThemeContext = createContext();

// --- THEME PROVIDER ---
const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);
    return <ThemeContext.Provider value={{ darkMode, setDarkMode }}>{children}</ThemeContext.Provider>;
};

// --- MAIN DATA HOOK ---
const useAuthAndData = () => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isWorker, setIsWorker] = useState(false);
    const [workerProfile, setWorkerProfile] = useState(null); // NEW: Store full worker data
    const [isClient, setIsClient] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [shifts, setShifts] = useState([]);
    const [workerShifts, setWorkerShifts] = useState([]);
    const [workersList, setWorkersList] = useState([]); 
    const [usersList, setUsersList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (configMissing || !auth) { setIsAuthReady(true); return; }
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                const email = u.email.toLowerCase();
                let adminStatus = false;

                // 1. Check Admin
                if (email === ADMIN_EMAIL.toLowerCase()) {
                    setIsAdmin(true);
                    adminStatus = true;
                } else {
                    setIsAdmin(false);
                }

                // 2. Check Worker
                try {
                    const q = db.collection(WORKERS_PATH).where("email", "==", email);
                    const snapshot = await q.get();
                    if (!snapshot.empty) {
                        setIsWorker(true);
                        setWorkerProfile({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
                    } else {
                        setIsWorker(false);
                        setWorkerProfile(null);
                    }
                } catch (err) { setIsWorker(false); }

                // 3. Check User Role
                if (!adminStatus) {
                    try {
                        const userDoc = await db.collection(USERS_PATH).doc(u.uid).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            setIsClient(userData.role === 'client'); 
                        } else {
                            setIsClient(false); 
                        }
                    } catch (e) { setIsClient(false); }
                }
            } else {
                setUser(null);
                setIsAdmin(false);
                setIsWorker(false);
                setWorkerProfile(null);
                setIsClient(false);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // Data Subscription
    useEffect(() => {
        if (!user) {
            setShifts([]);
            setWorkerShifts([]);
            return;
        }
        if (!isAdmin && !isWorker && !isClient) return;

        setIsLoading(true);
        const unsubscribe = db.collection(COLLECTION_PATH).onSnapshot((snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                let statusText = d.status;
                if (d.status === 'Pending') statusText = 'Request Sent';
                if (d.status === 'Confirmed') statusText = 'Scheduled';
                if (d.status === 'Cancelled') statusText = 'Unavailable';
                if (d.status === 'Declined') statusText = 'Declined';
                if (d.workerStatus === 'Completed') statusText = 'Completed'; 

                return {
                    id: doc.id,
                    ...d,
                    statusLabel: statusText,
                    dateDisplay: d.date ? formatBookingDate(d.date) : 'Pending',
                    rawTimestamp: d.timestamp?.toMillis() || 0
                };
            });

            data.sort((a, b) => getSortValue(a) - getSortValue(b));

            if (isAdmin) {
                setShifts(data);
            } else if (isWorker) {
                const assigned = data.filter(s => s.assignedWorkerEmail && s.assignedWorkerEmail.toLowerCase() === user.email.toLowerCase());
                setWorkerShifts(assigned);
            } else {
                const myShifts = data.filter(s => s.userId === user.uid);
                setShifts(myShifts);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user, isAdmin, isWorker, isClient]);

    // Admin Subscriptions
    useEffect(() => {
        if (!isAdmin) return;
        const unsubWorkers = db.collection(WORKERS_PATH).onSnapshot((snapshot) => {
            const wList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWorkersList(wList);
        });
        const unsubUsers = db.collection(USERS_PATH).onSnapshot((snapshot) => {
            const uList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsersList(uList);
        });
        return () => { unsubWorkers(); unsubUsers(); };
    }, [isAdmin]);

    const login = (email, password) => auth.signInWithEmailAndPassword(email, password);
    
    const signup = async (email, password, name) => {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        await db.collection(USERS_PATH).doc(cred.user.uid).set({
            email: email.toLowerCase(),
            name: name,
            role: 'unverified', 
            documents: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        setUser({...cred.user, displayName: name});
    };

    const resetPassword = (email) => auth.sendPasswordResetEmail(email);
    const logout = () => auth.signOut();
    
    // UPDATED: Handles Compliance Updates for Workers
    const updateProfile = async (name, complianceData = null) => {
        try {
            await user.updateProfile({ displayName: name });
            setUser({ ...user, displayName: name });
            
            // Update User Doc
            await db.collection(USERS_PATH).doc(user.uid).update({ name: name }).catch(()=>null);

            // If Worker, update Worker Doc with Compliance Data
            if (isWorker && workerProfile) {
                const updateData = { name: name };
                if (complianceData) {
                    updateData.screeningExpiry = complianceData.screeningExpiry;
                    updateData.firstAidExpiry = complianceData.firstAidExpiry;
                    updateData.cprExpiry = complianceData.cprExpiry;
                }
                await db.collection(WORKERS_PATH).doc(workerProfile.id).update(updateData);
                
                // Refresh local profile state
                setWorkerProfile(prev => ({ ...prev, ...updateData }));
            }

            return { success: true };
        } catch (e) {
            return { success: false, msg: e.message };
        }
    };

    // ... (Existing bookShift, updateShiftStatus, assignWorker, etc. kept same)
    const checkConflict = (date) => { if(!shifts || shifts.length === 0) return false; return shifts.some(s => s.date === date && s.status !== 'Cancelled' && s.status !== 'Declined'); };
    const bookShift = async (data) => {
        try {
            const batch = db.batch();
            const createdTimestamp = firebase.firestore.FieldValue.serverTimestamp();
            const seriesId = Math.random().toString(36).substr(2, 9); 
            let datesToBook = [];
            let currentDate = new Date(data.date);
            let endDate = (data.recurrence !== 'none' && data.endDate) ? new Date(data.endDate) : new Date(data.date);
            if (data.recurrence === 'none') endDate = currentDate; 
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                if (checkConflict(dateStr)) return { success: false, msg: `Conflict on ${dateStr}.` };
                datesToBook.push(dateStr);
                if (data.recurrence === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                else if (data.recurrence === 'fortnightly') currentDate.setDate(currentDate.getDate() + 14);
                else break; 
            }
            datesToBook.forEach(dateStr => {
                const ref = db.collection(COLLECTION_PATH).doc();
                batch.set(ref, { ...data, date: dateStr, seriesId: seriesId, userId: user.uid, userName: user.displayName || 'Client', userEmail: user.email, status: 'Pending', timestamp: createdTimestamp });
            });
            await batch.commit();
            return { success: true };
        } catch (e) { return { success: false, msg: e.message }; }
    };

    const updateShiftStatus = async (shiftId, newStatus, reason = null, applyToFuture = false, currentShift = null) => {
        try {
            const batch = db.batch();
            const updateData = { status: newStatus };
            if (reason) updateData.cancellationReason = reason;
            const currentRef = db.collection(COLLECTION_PATH).doc(shiftId);
            batch.update(currentRef, updateData);
            if (applyToFuture && currentShift && currentShift.seriesId) {
                const futureShifts = await db.collection(COLLECTION_PATH).where('seriesId', '==', currentShift.seriesId).where('date', '>', currentShift.date).get();
                futureShifts.forEach(doc => batch.update(doc.ref, updateData));
            }
            await batch.commit();
            return true;
        } catch (e) { return false; }
    };

    const assignWorker = async (shiftId, workerEmail, applyToFuture = false, currentShift = null) => {
        try {
            const batch = db.batch();
            const updateData = { assignedWorkerEmail: workerEmail, workerStatus: 'Pending Acceptance' };
            batch.update(db.collection(COLLECTION_PATH).doc(shiftId), updateData);
            if (applyToFuture && currentShift && currentShift.seriesId) {
                const futureShifts = await db.collection(COLLECTION_PATH).where('seriesId', '==', currentShift.seriesId).where('date', '>', currentShift.date).get();
                futureShifts.forEach(doc => batch.update(doc.ref, updateData));
            }
            await batch.commit();
            return true;
        } catch (e) { return false; }
    };

    const removeWorker = async (shiftId) => { try { await db.collection(COLLECTION_PATH).doc(shiftId).update({ assignedWorkerEmail: firebase.firestore.FieldValue.delete(), workerStatus: firebase.firestore.FieldValue.delete() }); return true; } catch(e) { return false; } };
    const workerResponse = async (shiftId, response) => { try { await db.collection(COLLECTION_PATH).doc(shiftId).update({ workerStatus: response }); return true; } catch (e) { return false; } };
    const completeShift = async (shiftId, finalData) => { try { await db.collection(COLLECTION_PATH).doc(shiftId).update({ workerStatus: 'Completed', status: 'Confirmed', caseNotes: { summary: finalData.summary, goals: finalData.goals, incidents: finalData.incidents, incidentDetails: finalData.incidentDetails }, timesheet: { start: finalData.actualStartTime, end: finalData.actualEndTime, scheduledStart: finalData.scheduledStartTime, scheduledEnd: finalData.scheduledEndTime }, travel: { logs: finalData.travelLog, totalKm: finalData.totalTravelKm }, completedAt: firebase.firestore.FieldValue.serverTimestamp() }); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };
    
    // --- WORKER/USER MGMT ---
    const addWorkerToDB = async (workerData) => { if (!isAdmin) return false; try { const check = await db.collection(WORKERS_PATH).where("email", "==", workerData.email.toLowerCase()).get(); if (!check.empty) return { success: false, msg: 'Exists.' }; await db.collection(WORKERS_PATH).add({ ...workerData, email: workerData.email.toLowerCase(), documents: [], timestamp: firebase.firestore.FieldValue.serverTimestamp() }); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };
    const deleteWorkerFromDB = async (id) => { if (!isAdmin) return; try { await db.collection(WORKERS_PATH).doc(id).delete(); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };
    const updateWorkerInDB = async (id, data) => { if (!isAdmin) return; try { await db.collection(WORKERS_PATH).doc(id).update(data); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };
    const verifyUserAsClient = async (uid) => { try { await db.collection(USERS_PATH).doc(uid).update({ role: 'client', documents: [] }); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };
    const promoteUserToWorker = async (uid, userData) => { try { const batch = db.batch(); batch.update(db.collection(USERS_PATH).doc(uid), { role: 'worker' }); const check = await db.collection(WORKERS_PATH).where("email", "==", userData.email.toLowerCase()).get(); if (check.empty) { batch.set(db.collection(WORKERS_PATH).doc(), { name: userData.name, email: userData.email.toLowerCase(), notes: 'Promoted', documents: [], timestamp: firebase.firestore.FieldValue.serverTimestamp() }); } await batch.commit(); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };
    const revokeUserRole = async (uid, email) => { try { const batch = db.batch(); batch.update(db.collection(USERS_PATH).doc(uid), { role: 'unverified' }); if (email) { const q = await db.collection(WORKERS_PATH).where("email", "==", email.toLowerCase()).get(); q.forEach(doc => batch.delete(doc.ref)); } await batch.commit(); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };

    // --- DOCUMENTS ---
    const uploadDocument = async (folder, id, file, docName) => { if (!storage) return { success: false, msg: 'Storage error' }; try { const ref = storage.ref().child(`${folder}/${id}/${Date.now()}_${file.name}`); const snapshot = await ref.put(file); const url = await snapshot.ref.getDownloadURL(); await db.collection(folder === 'workers' ? WORKERS_PATH : USERS_PATH).doc(id).update({ documents: firebase.firestore.FieldValue.arrayUnion({ name: docName || file.name, url: url, uploadedAt: Date.now() }) }); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };
    const deleteDocument = async (folder, id, docObject) => { try { await db.collection(folder === 'workers' ? WORKERS_PATH : USERS_PATH).doc(id).update({ documents: firebase.firestore.FieldValue.arrayRemove(docObject) }); return { success: true }; } catch (e) { return { success: false, msg: e.message }; } };

    // --- NEW: EXPORT TO CSV ---
    const exportToCSV = () => {
        if (!shifts || shifts.length === 0) return;

        // Filter only completed or confirmed shifts
        const dataToExport = shifts.filter(s => s.status === 'Confirmed' || s.workerStatus === 'Completed');

        if (dataToExport.length === 0) {
            alert("No confirmed or completed shifts to export.");
            return;
        }

        // Headers
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Client Name,Worker Email,Service,Start Time,End Time,Duration (Hrs),Status,Travel KM,Notes\n";

        // Rows
        dataToExport.forEach(s => {
            const row = [
                s.date,
                s.userName,
                s.assignedWorkerEmail || 'Unassigned',
                s.service,
                s.timesheet?.start || s.startTime,
                s.timesheet?.end || s.endTime,
                s.duration,
                s.workerStatus === 'Completed' ? 'Completed' : 'Scheduled',
                s.travel?.totalKm || 0,
                (s.caseNotes?.summary || '').replace(/,/g, ' ') // Escape commas in notes
            ].join(",");
            csvContent += row + "\n";
        });

        // Download trigger
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const filename = `ThinkPathways_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return { 
        user, isAdmin, isWorker, isClient, workerProfile, isAuthReady, shifts, workerShifts, workersList, usersList, isLoading, 
        login, signup, resetPassword, logout, updateProfile, bookShift, updateShiftStatus, 
        assignWorker, removeWorker, workerResponse, completeShift, addWorkerToDB, deleteWorkerFromDB, updateWorkerInDB,
        verifyUserAsClient, promoteUserToWorker, revokeUserRole, uploadDocument, deleteDocument, exportToCSV
    };
};