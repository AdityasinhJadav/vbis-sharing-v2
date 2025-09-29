import React, { useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaUsers, FaPlus, FaCalendarAlt, FaEye, FaCode, FaSignOutAlt, FaUserCircle, FaUpload, FaTrash, FaTrashAlt, FaSearch } from 'react-icons/fa';
import { AuthContext } from '../auth/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, limit, onSnapshot, doc, getDoc, setDoc, serverTimestamp, addDoc, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../theme/ThemeContext';

const Dashboard = () => {
  const { isLight } = useTheme();
  const { currentUser } = useContext(AuthContext);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  // Enter-code modal state
  const [showEnterCode, setShowEnterCode] = useState(false);
  const [eventCode, setEventCode] = useState('');
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState('');
  // Create-event modal state
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventPasscode, setNewEventPasscode] = useState('');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser) return;
      
      // First try to get role from localStorage
      let role = localStorage.getItem('role');
      
      // If no role in localStorage, fetch from Firestore
      if (!role) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            role = userDoc.data().role || 'attendee';
            localStorage.setItem('role', role);
          } else {
            role = 'attendee'; // default fallback
            localStorage.setItem('role', role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          role = 'attendee'; // fallback on error
          localStorage.setItem('role', role);
        }
      }
      
      setUserRole(role);
    };
    
    fetchUserRole();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('role');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const OrganizerDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 ${isLight ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white' : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border border-slate-600/30'}`}>
        <div className="flex items-center space-x-3 mb-4">
          <FaCrown className="h-8 w-8 text-yellow-300" />
          <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
        </div>
        <p className={`${isLight ? 'text-slate-100/90' : 'text-slate-100'}`}>Manage your events and photo sharing</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.05 }}
          onClick={() => { setCreateError(''); setNewEventName(''); setNewEventDate(''); setShowCreateEvent(true); }}
          className={`rounded-xl p-6 cursor-pointer transition-all border ${isLight ? 'bg-white border-slate-200 hover:border-purple-300' : 'bg-slate-800 border-slate-700 hover:border-purple-400'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`${isLight ? 'bg-purple-500/10' : 'bg-purple-500/20'} p-3 rounded-lg`}>
              <FaPlus className={`h-6 w-6 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Create Event</h3>
              <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Start a new photo sharing event</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          onClick={() => navigate('/upload')}
          className={`rounded-xl p-6 cursor-pointer transition-all border ${isLight ? 'bg-white border-slate-200 hover:border-green-300 hover:shadow-lg' : 'bg-slate-800 border-slate-700 hover:border-green-400 hover:shadow-xl'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`${isLight ? 'bg-green-500/10' : 'bg-green-500/20'} p-3 rounded-lg`}>
              <FaUpload className={`h-6 w-6 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Upload Photos</h3>
              <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Add photos to your events</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Events */}
      <RecentEvents mode="organizer" />
    </div>
  );

  const AttendeeDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 ${isLight ? 'bg-sky-600 text-white' : 'bg-gradient-to-r from-sky-600 to-blue-800 text-white'}`}>
        <div className="flex items-center space-x-3 mb-4">
          <FaUsers className="h-8 w-8 text-sky-300" />
          <h1 className="text-3xl font-bold">Attendee Dashboard</h1>
        </div>
        <p className={`${isLight ? 'text-sky-100/90' : 'text-sky-100'}`}>Join events and view shared photos</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.05 }}
          onClick={() => { 
            console.log('Enter Event Code clicked!');
            setEnterError(''); 
            setEventCode(''); 
            setShowEnterCode(true); 
          }}
          className={`rounded-xl p-6 cursor-pointer transition-all border ${isLight ? 'bg-white border-slate-200 hover:border-sky-300' : 'bg-slate-800 border-slate-700 hover:border-sky-400'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`${isLight ? 'bg-sky-500/10' : 'bg-sky-500/20'} p-3 rounded-lg`}>
              <FaCode className={`h-6 w-6 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Enter Event Code</h3>
              <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Join an event with a code</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          onClick={() => navigate('/face-match')}
          className={`rounded-xl p-6 cursor-pointer transition-all border ${isLight ? 'bg-white border-slate-200 hover:border-purple-300' : 'bg-slate-800 border-slate-700 hover:border-purple-400'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`${isLight ? 'bg-purple-500/10' : 'bg-purple-500/20'} p-3 rounded-lg`}>
              <FaSearch className={`h-6 w-6 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Find Your Photos</h3>
              <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Use face matching to find photos of you</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Joined Events */}
      <RecentEvents mode="attendee" />
    </div>
  );

  return (
    <div className={isLight ? `min-h-screen bg-slate-900 text-white` : `min-h-screen bg-slate-900 text-white`}>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24`}>
        {userRole === 'organizer' ? <OrganizerDashboard /> : <AttendeeDashboard />}
      </main>

      {/* Enter Event Code Modal */}
      {showEnterCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 ${isLight ? 'bg-black/30' : 'bg-black/60'}`}
            onClick={() => !entering && setShowEnterCode(false)}
          />
          {/* Dialog */}
          <div className={`relative z-10 w-full max-w-md mx-auto rounded-2xl border p-6 shadow-2xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
          }`}>
            <h3 className="text-xl font-semibold mb-2">Enter Event Code</h3>
            <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-sm mb-4`}>
              Enter the 6-character code provided by the organizer.
            </p>
            {enterError && (
              <div className={`mb-3 text-sm rounded-md px-3 py-2 border ${
                isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {enterError}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEnterError('');
                const code = eventCode.trim().toUpperCase();
                if (!/^[A-Z0-9]{4,8}$/.test(code)) {
                  setEnterError('Please enter a valid code (4-8 alphanumeric characters).');
                  return;
                }
                setEntering(true);
                try {
                  const q = query(collection(db, 'events'), where('passcode', '==', code), limit(1));
                  const unsub = onSnapshot(
                    q,
                    async (snap) => {
                      // one-time fetch then unsubscribe
                      unsub();
                      if (snap.empty) {
                        setEnterError('No event found for that code.');
                        setEntering(false);
                        return;
                      }
                      const evDoc = snap.docs[0];
                      const eventId = evDoc.id;
                      // Record joined event for this user (idempotent)
                      if (currentUser?.uid) {
                        const joinId = `${currentUser.uid}_${eventId}`;
                        await setDoc(
                          doc(db, 'userJoinedEvents', joinId),
                          {
                            userId: currentUser.uid,
                            eventId,
                            passcode: code,
                            joinedAt: serverTimestamp(),
                          },
                          { merge: true }
                        );
                      }
                      // Store passcode in session storage and navigate to photos
                      sessionStorage.setItem('currentEventPasscode', code);
                      navigate('/photos');
                      setEntering(false);
                      setShowEnterCode(false);
                    },
                    (err) => {
                      console.error(err);
                      setEnterError('Failed to verify code. Please try again.');
                      setEntering(false);
                    }
                  );
                } catch (err) {
                  console.error(err);
                  setEnterError('Something went wrong.');
                  setEntering(false);
                }
              }}
            >
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. A1B2C3"
                className={`w-full rounded-xl px-4 py-3 mb-4 focus:ring-2 transition ${
                  isLight ? 'bg-white border border-slate-300 focus:ring-sky-400 focus:border-sky-400 text-slate-900 placeholder-slate-500' : 'bg-slate-700/50 border border-slate-600/50 focus:ring-sky-400 focus:border-sky-400 text-white placeholder-slate-400'
                }`}
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                disabled={entering}
                maxLength={8}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg border ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-50' : 'border-slate-600 text-slate-200 hover:bg-slate-700/50'}`}
                  onClick={() => setShowEnterCode(false)}
                  disabled={entering}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${isLight ? 'bg-sky-600 hover:bg-sky-700 text-white' : 'bg-sky-500 hover:bg-sky-400 text-slate-900'}`}
                  disabled={entering}
                >
                  {entering && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Enter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 ${isLight ? 'bg-black/30' : 'bg-black/60'}`}
            onClick={() => !creating && setShowCreateEvent(false)}
          />
          {/* Dialog */}
          <div className={`relative z-10 w-full max-w-md mx-auto rounded-2xl border p-6 shadow-2xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
          }`}>
            <h3 className="text-xl font-semibold mb-2">Create Event</h3>
            <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-sm mb-4`}>
              Enter details for your new event. Passcode is required (4-10 uppercase letters or digits).
            </p>
            {createError && (
              <div className={`mb-3 text-sm rounded-md px-3 py-2 border ${
                isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {createError}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setCreateError('');
                const name = newEventName.trim();
                if (!name) {
                  setCreateError('Please enter an event name.');
                  return;
                }
                try {
                  setCreating(true);
                  let pass = newEventPasscode.trim().toUpperCase();
                  if (!pass) {
                    setCreateError('Passcode is required.');
                    setCreating(false);
                    return;
                  }
                  if (!/^[A-Z0-9]{4,10}$/.test(pass)) {
                    setCreateError('Passcode must be 4-10 uppercase letters or digits.');
                    setCreating(false);
                    return;
                  }
                  const payload = {
                    eventName: name,
                    eventDate: newEventDate || null,
                    location: newEventLocation.trim() || null,
                    passcode: pass,
                    organizerId: currentUser?.uid || null,
                    createdAt: serverTimestamp(),
                  };
                  const ref = await addDoc(collection(db, 'events'), payload);
                  // Close modal after creation
                  setShowCreateEvent(false);
                  setCreating(false);
                  setNewEventName('');
                  setNewEventDate('');
                  setNewEventLocation('');
                  setNewEventPasscode('');
                  // Optional: navigate to photos page for the new event
                  // navigate(`/photos/${pass}`);
                } catch (err) {
                  console.error(err);
                  setCreateError('Failed to create event. Please try again.');
                  setCreating(false);
                }
              }}
            >
              <input
                type="text"
                placeholder="Event name"
                className={`w-full rounded-xl px-4 py-3 mb-3 focus:ring-2 transition ${
                  isLight ? 'bg-white border border-slate-300 focus:ring-purple-400 focus:border-purple-400 text-slate-900 placeholder-slate-500' : 'bg-slate-700/50 border border-slate-600/50 focus:ring-purple-400 focus:border-purple-400 text-white placeholder-slate-400'
                }`}
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                disabled={creating}
                maxLength={120}
              />
              <input
                type="date"
                className={`w-full rounded-xl px-4 py-3 mb-4 focus:ring-2 transition ${
                  isLight ? 'bg-white border border-slate-300 focus:ring-purple-400 focus:border-purple-400 text-slate-900 placeholder-slate-500' : 'bg-slate-700/50 border border-slate-600/50 focus:ring-purple-400 focus:border-purple-400 text-white placeholder-slate-400'
                }`}
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                disabled={creating}
              />
              <input
                type="text"
                placeholder="Location (optional)"
                className={`w-full rounded-xl px-4 py-3 mb-3 focus:ring-2 transition ${
                  isLight ? 'bg-white border border-slate-300 focus:ring-purple-400 focus:border-purple-400 text-slate-900 placeholder-slate-500' : 'bg-slate-700/50 border border-slate-600/50 focus:ring-purple-400 focus:border-purple-400 text-white placeholder-slate-400'
                }`}
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                disabled={creating}
                maxLength={160}
              />
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Passcode (required, 4-10 A-Z/0-9)"
                  className={`w-full rounded-xl px-4 py-3 focus:ring-2 transition ${
                    isLight ? 'bg-white border border-slate-300 focus:ring-purple-400 focus:border-purple-400 text-slate-900 placeholder-slate-500' : 'bg-slate-700/50 border border-slate-600/50 focus:ring-purple-400 focus:border-purple-400 text-white placeholder-slate-400'
                  }`}
                  value={newEventPasscode}
                  onChange={(e) => setNewEventPasscode(e.target.value.toUpperCase())}
                  disabled={creating}
                  maxLength={10}
                  required
                />
                <p className={`mt-1 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Use only A-Z and 0-9, length 4 to 10.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg border ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-50' : 'border-slate-600 text-slate-200 hover:bg-slate-700/50'}`}
                  onClick={() => setShowCreateEvent(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${isLight ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                  disabled={creating}
                >
                  {creating && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Recent Events list component
const RecentEvents = ({ mode = 'organizer' }) => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const { isLight } = useTheme();
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    setErr(null);
    if (mode === 'organizer') {
      const qOrg = query(
        collection(db, 'events'),
        where('organizerId', '==', currentUser.uid),
        limit(20)
      );
      const unsub = onSnapshot(
        qOrg,
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rows.sort((a, b) => {
            const ta = a.createdAt?.seconds || 0;
            const tb = b.createdAt?.seconds || 0;
            return tb - ta;
          });
          setEvents(rows);
          setLoading(false);
        },
        (error) => {
          console.error('RecentEvents error:', error);
          setErr('Failed to load events');
          setLoading(false);
        }
      );
      return () => unsub();
    } else {
      // attendee view: load joined events mapping and then fetch event docs
      const qJoins = query(
        collection(db, 'userJoinedEvents'),
        where('userId', '==', currentUser.uid),
        limit(20)
      );
      const unsub = onSnapshot(
        qJoins,
        async (snap) => {
          try {
            const joins = snap.docs.map((d) => d.data());
            const ids = Array.from(new Set(joins.map(j => j.eventId))).filter(Boolean);
            if (ids.length === 0) {
              setEvents([]);
              setLoading(false);
              return;
            }
            const docs = await Promise.all(ids.map(id => getDoc(doc(db, 'events', id))));
            const rows = docs
              .filter(d => d.exists())
              .map(d => ({ id: d.id, ...d.data() }));
            rows.sort((a, b) => {
              const ta = a.createdAt?.seconds || 0;
              const tb = b.createdAt?.seconds || 0;
              return tb - ta;
            });
            setEvents(rows);
            setLoading(false);
          } catch (e) {
            console.error('RecentEvents attendee error:', e);
            setErr('Failed to load joined events');
            setLoading(false);
          }
        },
        (error) => {
          console.error('RecentEvents attendee error:', error);
          setErr('Failed to load joined events');
          setLoading(false);
        }
      );
      return () => unsub();
    }
  }, [currentUser, mode]);

  return (
    <div className={`rounded-xl p-6 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
      <h2 className={`text-xl font-semibold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>{mode === 'organizer' ? 'Recent Events' : 'Joined Events'}</h2>
      {loading ? (
        <div className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Loading...</div>
      ) : err ? (
        <div className={`${isLight ? 'text-rose-600' : 'text-rose-300'}`}>{err}</div>
      ) : events.length === 0 ? (
        <div className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No events yet. Create your first event to get started!</div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className={`flex items-center justify-between rounded-lg p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-700'}`}>
              <div>
                <div className={`${isLight ? 'text-slate-900' : 'text-white'} font-medium`}>{ev.eventName || 'Untitled Event'}</div>
                <div className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-sm`}>
                  {ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : 'No date'} • Passcode:
                  <span className={`ml-1 font-mono tracking-widest ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{ev.passcode}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    sessionStorage.setItem('currentEventPasscode', ev.passcode);
                    navigate('/photos');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isLight ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200' : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30'}`}
                >
                  <FaEye className="h-3 w-3" />
                  View
                </motion.button>
                {mode === 'organizer' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/upload', { state: { passcode: ev.passcode, eventId: ev.id } })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isLight ? 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200' : 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30'}`}
                  >
                    <FaUpload className="h-3 w-3" />
                    Upload
                  </motion.button>
                )}
                {mode === 'organizer' && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={busyId === ev.id}
                      onClick={async () => {
                        if (!window.confirm('Delete ALL photos for this event? This cannot be undone.')) return;
                        try {
                          setBusyId(ev.id);
                          // Delete photos by event_id (preferred) or fallback to passcode
                          let photosQ = query(collection(db, 'photos'), where('event_id', '==', ev.id));
                          let snap = await getDocs(photosQ);
                          
                          // If no photos found by event_id, try by passcode for backward compatibility
                          if (snap.empty) {
                            photosQ = query(collection(db, 'photos'), where('project_passcode', '==', ev.passcode));
                            snap = await getDocs(photosQ);
                          }
                          
                          while (!snap.empty) {
                            const batch = writeBatch(db);
                            snap.docs.forEach(d => batch.delete(d.ref));
                            await batch.commit();
                            snap = await getDocs(photosQ);
                          }
                          alert('Photos deleted for this event.');
                        } catch (e) {
                          console.error(e);
                          alert('Failed to delete photos.');
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200' : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30'}`}
                    >
                      <FaTrash className="h-3 w-3" />
                      {busyId === ev.id ? 'Deleting...' : 'Delete Photos'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={busyId === ev.id}
                      onClick={async () => {
                        if (!window.confirm('Delete this event and all related data (photos and joins)?')) return;
                        try {
                          setBusyId(ev.id);
                          console.log('Starting deletion for event:', ev.id);
                          
                          // Helper function to delete in very small chunks
                          const deleteInChunks = async (docs, collectionName) => {
                            const BATCH_SIZE = 50; // Much smaller batches
                            let totalDeleted = 0;
                            
                            for (let i = 0; i < docs.length; i += BATCH_SIZE) {
                              const chunk = docs.slice(i, i + BATCH_SIZE);
                              const batch = writeBatch(db);
                              
                              chunk.forEach(doc => {
                                batch.delete(doc.ref);
                              });
                              
                              await batch.commit();
                              totalDeleted += chunk.length;
                              console.log(`Deleted ${chunk.length} ${collectionName} (${totalDeleted}/${docs.length} total)`);
                              
                              // Add small delay between batches
                              if (i + BATCH_SIZE < docs.length) {
                                await new Promise(resolve => setTimeout(resolve, 100));
                              }
                            }
                            
                            return totalDeleted;
                          };
                          
                          // Step 1: Delete joined mappings
                          console.log('Deleting joined mappings...');
                          const joinsQ = query(collection(db, 'userJoinedEvents'), where('eventId', '==', ev.id));
                          const snapJoins = await getDocs(joinsQ);
                          
                          if (!snapJoins.empty) {
                            await deleteInChunks(snapJoins.docs, 'join records');
                          }
                          
                          // Step 2: Delete photos by event_id first
                          console.log('Deleting photos by event_id...');
                          let photosQ = query(collection(db, 'photos'), where('event_id', '==', ev.id));
                          let photosSnap = await getDocs(photosQ);
                          
                          // If no photos by event_id, try by passcode
                          if (photosSnap.empty) {
                            console.log('No photos found by event_id, trying passcode...');
                            photosQ = query(collection(db, 'photos'), where('project_passcode', '==', ev.passcode));
                            photosSnap = await getDocs(photosQ);
                          }
                          
                          if (!photosSnap.empty) {
                            await deleteInChunks(photosSnap.docs, 'photos');
                          }
                          
                          // Step 3: Delete the event document
                          console.log('Deleting event document...');
                          await deleteDoc(doc(db, 'events', ev.id));
                          console.log('Event deleted successfully');
                          
                          alert('Event and all related data deleted successfully!');
                        } catch (e) {
                          console.error('Delete event error:', e);
                          alert(`Failed to delete event: ${e.message || 'Unknown error'}`);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 text-white border border-red-600`}
                    >
                      <FaTrashAlt className="h-3 w-3" />
                      {busyId === ev.id ? 'Deleting...' : 'Delete Event'}
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
