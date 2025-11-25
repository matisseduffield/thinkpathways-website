import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged, 
    signOut,
    updateProfile
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    query, 
    onSnapshot, 
    addDoc, 
    serverTimestamp 
} from 'firebase/firestore';

// --- Global Variables (Provided by Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Context ---
const AuthContext = React.createContext();

// --- Helpers ---
const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};

// --- Main Hook ---
const useAuthAndData = () => {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [shifts, setShifts] = useState([]);
    const [isLoadingShifts, setIsLoadingShifts] = useState(false);

    // 1. Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // 2. Data Listener
    useEffect(() => {
        if (!user) {
            setShifts([]);
            return;
        }
        
        const path = `/artifacts/${appId}/users/${user.uid}/shifts`;
        const q = query(collection(db, path));
        setIsLoadingShifts(true);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dateDisplay: doc.data().timestamp ? formatTimestamp(doc.data().timestamp) : 'Pending',
            })).sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            
            setShifts(data);
            setIsLoadingShifts(false);
        });
        return () => unsubscribe();
    }, [user]);

    // 3. Actions
    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const signup = async (email, password, name) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
    };
    const logout = () => signOut(auth);
    
    const bookShift = async (data) => {
        if (!user) return false;
        try {
            await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/shifts`), {
                ...data,
                userId: user.uid,
                status: 'Pending',
                timestamp: serverTimestamp(),
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    return { user, isAuthReady, shifts, isLoadingShifts, login, signup, logout, bookShift };
};

// --- Login Component ---
const Login = () => {
    const { login, signup } = React.useContext(AuthContext);
    const [isSignup, setIsSignup] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const data = new FormData(e.target);
        
        try {
            if (isSignup) {
                await signup(data.get('email'), data.get('password'), data.get('name'));
            } else {
                await login(data.get('email'), data.get('password'));
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
                        <i className="fa-solid fa-hands-holding-circle"></i>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">My Pathway Portal</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        {isSignup ? 'Create an account to manage your support.' : 'Sign in to view shifts and book sessions.'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
                        <i className="fa-solid fa-circle-exclamation mr-2"></i> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {isSignup && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input name="name" type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input name="email" type="email" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input name="password" type="password" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>

                    <button disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 transition-all shadow-md disabled:opacity-50">
                        {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className="mt-6 text-center pt-6 border-t border-slate-100">
                    <button onClick={() => setIsSignup(!isSignup)} className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                        {isSignup ? 'Already have an account? Sign In' : 'New client? Create an account'}
                    </button>
                </div>
                <div className="mt-4 text-center">
                     <a href="index.html" className="text-xs text-slate-400 hover:text-slate-600">← Back to Home</a>
                </div>
            </div>
        </div>
    );
};

// --- Internal Dashboard Components ---
const BookingForm = () => {
    const { bookShift } = React.useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const d = new FormData(e.target);
        const success = await bookShift({
            date: d.get('date'),
            duration: d.get('duration'),
            service: d.get('service'),
            notes: d.get('notes')
        });
        
        if (success) {
            setMsg({ type: 'success', text: 'Request sent successfully!' });
            e.target.reset();
        } else {
            setMsg({ type: 'error', text: 'Failed to send request.' });
        }
        setLoading(false);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <i className="fa-solid fa-calendar-plus text-brand-500 mr-2"></i> Request Session
            </h3>
            {msg && <div className={`p-2 mb-3 text-sm rounded ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                    <input type="date" name="date" required min={getTomorrowDate()} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration</label>
                        <select name="duration" className="w-full p-2 border rounded-lg outline-none">
                            {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Hours</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service</label>
                        <select name="service" className="w-full p-2 border rounded-lg outline-none">
                            <option>Community Access</option>
                            <option>In-Home Support</option>
                            <option>Skill Building</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                    <textarea name="notes" rows="2" className="w-full p-2 border rounded-lg outline-none" placeholder="Any specific goals?"></textarea>
                </div>
                <button disabled={loading} className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700">
                    {loading ? 'Sending...' : 'Submit Request'}
                </button>
            </form>
        </div>
    );
};

const ShiftList = () => {
    const { shifts, isLoadingShifts } = React.useContext(AuthContext);

    if (isLoadingShifts) return <div className="p-8 text-center text-slate-400">Loading history...</div>;
    if (shifts.length === 0) return (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">No shifts found. Book one to get started!</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {shifts.map(s => (
                <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-brand-200 transition-colors">
                    <div>
                        <div className="font-bold text-slate-800">{s.dateDisplay}</div>
                        <div className="text-xs text-slate-500">{s.service} • {s.duration} hrs</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        s.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 
                        s.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                        {s.status === 'Pending' ? 'Request Sent' : s.status}
                    </span>
                </div>
            ))}
        </div>
    );
};

// --- Main App Shell ---
const App = () => {
    const authData = useAuthAndData();

    if (!authData.isAuthReady) return <LoadingScreen />;
    if (!authData.user) return <AuthContext.Provider value={authData}><Login /></AuthContext.Provider>;

    return (
        <AuthContext.Provider value={authData}>
            <div className="min-h-screen bg-slate-50 font-sans">
                <header className="bg-white shadow-sm sticky top-0 z-20">
                    <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-brand-600">
                            <i className="fa-solid fa-hands-holding-circle text-2xl"></i>
                            <span className="font-bold text-slate-900 text-lg tracking-tight hidden md:inline">My Pathway Portal</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-600 hidden md:inline">Hello, {authData.user.displayName || 'Client'}</span>
                            <button onClick={authData.logout} className="text-sm text-red-600 font-bold hover:text-red-800">Sign Out</button>
                        </div>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <BookingForm />
                        <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-900 text-sm mb-1"><i className="fa-solid fa-phone mr-2"></i>Need Help?</h4>
                            <p className="text-xs text-blue-700">Call us on <span className="font-mono font-bold">+61 420 673 303</span> for urgent changes.</p>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Schedule</h2>
                        <ShiftList />
                    </div>
                </main>
            </div>
        </AuthContext.Provider>
    );
};

export default App;