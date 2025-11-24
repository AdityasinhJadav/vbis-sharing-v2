import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { 
  FaDoorOpen, FaEye, FaPlus, FaUpload, FaCopy, 
  FaCheck, FaTimes, FaInbox, FaTrash, FaCalendarAlt, FaUsers
} from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import { createRoom, myRooms, joinRoom, getJoinedRooms, deleteRoom } from '../api';
import { useTheme } from '../theme/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonCard } from '../components/SkeletonLoader';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { isLight } = useTheme();
  const navigate = useNavigate();

  const [myRoomsList, setMyRoomsList] = useState([]);
  const [joinedRoomsList, setJoinedRoomsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        setError('');
        if (currentUser.role === 'organizer') {
          setMyRoomsList(await myRooms());
        } else {
          setJoinedRoomsList(await getJoinedRooms());
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim() || isCreating) return;
    
    // Validation
    if (roomName.trim().length < 3) {
      setError('Room name must be at least 3 characters');
      return;
    }
    if (roomName.trim().length > 100) {
      setError('Room name must be less than 100 characters');
      return;
    }
    if (roomDescription.trim().length > 500) {
      setError('Description must be less than 500 characters');
      return;
    }
    
    try {
      setIsCreating(true);
      setActionMessage('');
      setError('');
      const room = await createRoom(roomName.trim(), roomDescription.trim() || undefined, eventDate || undefined);
      setMyRoomsList(prev => [room, ...prev]);
      setRoomName('');
      setRoomDescription('');
      setEventDate('');
      setShowCreateModal(false);
      setActionMessage(`Successfully created "${room.name}"`);
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim() || isJoining) return;
    try {
      setIsJoining(true);
      setActionMessage('');
      setError('');
      const response = await joinRoom(joinCode.trim().toUpperCase());
      setJoinedRoomsList(prev => {
        const exists = prev.some(r => r.id === response.room.id);
        return exists ? prev : [response.room, ...prev];
      });
      setJoinCode('');
      setActionMessage(`Successfully joined "${response.room.name}"`);
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      setDeletingRoomId(roomToDelete.id);
      setActionMessage('');
      setError('');
      await deleteRoom(roomToDelete.id);
      setMyRoomsList(prev => prev.filter(r => r.id !== roomToDelete.id));
      setRoomToDelete(null);
      setDeleteConfirmation('');
      setEventDate('');
      setActionMessage(`Deleted "${roomToDelete.name}"`);
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to delete room');
    } finally {
      setDeletingRoomId(null);
    }
  };

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const RoomCard = ({ room, isOrganizer, index = 0, onDelete }) => (
    <div
      className={`rounded-lg border ${
        isLight 
          ? 'bg-white border-slate-200 hover:border-slate-300' 
          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
      } transition-colors`}
    >
      <div className="p-5">
        <div className="mb-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={`text-lg font-semibold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {room.name}
              </h3>
              {room.description && (
                <p className={`text-sm mt-1 line-clamp-2 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {room.description}
                </p>
              )}
            </div>
            {isOrganizer && onDelete && (
              <button
                onClick={onDelete}
                className={`p-2 rounded-full border transition-colors ${
                  isLight
                    ? 'border-rose-200 text-rose-500 hover:bg-rose-50'
                    : 'border-rose-900/40 text-rose-300 hover:bg-rose-900/20'
                }`}
                title="Delete room"
              >
                <FaTrash className="w-3.5 h-3.5" />
                <span className="sr-only">Delete room</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Code:
            </span>
            <div className={`flex items-center gap-2 px-2 py-1 rounded ${
              isLight ? 'bg-slate-100' : 'bg-slate-700'
            }`}>
              <span className="font-mono text-sm font-medium text-sky-500">
                {room.code}
              </span>
              <button
                onClick={() => copyToClipboard(room.code)}
                className="p-1 rounded hover:bg-slate-600 transition-colors"
                title="Copy code"
              >
                {copiedCode === room.code ? (
                  <FaCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <FaCopy className="w-3 h-3 text-slate-400 hover:text-sky-400 transition-colors" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs mt-2">
            {room.eventDate && (
              <div className={`flex items-center gap-1 ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <FaCalendarAlt className="w-3 h-3" />
                {new Date(room.eventDate).toLocaleDateString()}
              </div>
            )}
            <div className={`flex items-center gap-1 ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <FaUsers className="w-3 h-3" />
              {(room.participants ?? 0)} joined
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-700">
          {isOrganizer && (
            <button
              onClick={() => navigate(`/upload/${room.id}`, { state: { room } })}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              <FaUpload className="w-3.5 h-3.5" /> Upload
            </button>
          )}
          <button
            onClick={() => navigate(`/photos/${room.id}`, { state: { room } })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors"
          >
            <FaEye className="w-3.5 h-3.5" /> View
          </button>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
    <div className={`text-center py-12 px-6 rounded-lg border ${
      isLight 
        ? 'bg-white border-slate-200' 
        : 'bg-slate-800 border-slate-700'
    }`}
    >
      <div className="flex justify-center mb-4">
        <div className={`p-3 rounded-full ${
          isLight ? 'bg-slate-100' : 'bg-slate-700'
        }`}>
          <Icon className={`w-6 h-6 ${
            isLight ? 'text-slate-400' : 'text-slate-500'
          }`} />
        </div>
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${
        isLight ? 'text-slate-900' : 'text-white'
      }`}>
        {title}
      </h3>
      <p className={`text-sm mb-6 ${
        isLight ? 'text-slate-600' : 'text-slate-400'
      }`}>
        {description}
      </p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="px-5 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );

  useEffect(() => {
    // Redirect to username setup if user doesn't have a username
    if (currentUser && !currentUser.username) {
      navigate('/setup-username');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  // Don't render dashboard if username is missing (will redirect)
  if (!currentUser.username) return null;

  const isOrganizer = currentUser.role === 'organizer';

  return (
    <div className={`min-h-screen pt-24 pb-12 px-4 ${
      isLight ? 'bg-slate-50' : 'bg-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <section className={`rounded-xl border px-5 py-6 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
        }`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={`text-sm uppercase tracking-widest ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Dashboard
              </p>
              <h1 className={`text-2xl font-bold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {currentUser.username || currentUser.email}
              </h1>
              <p className={`mt-1 text-sm ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Role: {isOrganizer ? 'Organizer' : 'Participant'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isOrganizer ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors"
                >
                  <FaPlus className="w-4 h-4" /> Create room
                </button>
              ) : (
                <button
                  onClick={() => document.getElementById('join-room-input')?.focus()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors"
                >
                  <FaDoorOpen className="w-4 h-4" /> Join a room
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 flex items-center gap-3"
            >
              <FaTimes className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </Motion.div>
          )}
          {actionMessage && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 px-4 py-3 flex items-center gap-3"
            >
              <FaCheck className="text-emerald-500 flex-shrink-0" />
              <p className="text-emerald-700 dark:text-emerald-400 text-sm">{actionMessage}</p>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard height="h-32" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard height="h-48" />
              <SkeletonCard height="h-48" />
              <SkeletonCard height="h-48" />
            </div>
          </div>
        ) : isOrganizer ? (
          <>
            {/* Rooms List */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-semibold ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Your Rooms
                  {myRoomsList.length > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {myRoomsList.length}
                    </span>
                  )}
                </h2>
                <span className={`text-sm ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Manage your active rooms below
                </span>
              </div>
              {myRoomsList.length === 0 ? (
                <EmptyState
                  icon={FaInbox}
                  title="No rooms yet"
                  description="Create your first room to start organizing and matching photos."
                  actionLabel="Create Your First Room"
                  onAction={() => setShowCreateModal(true)}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {myRoomsList.map((room, index) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      isOrganizer
                      index={index}
                      onDelete={() => {
                        setDeleteConfirmation('');
                        setRoomToDelete(room);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {/* Join Room Section */}
            <section
              className={`rounded-lg border p-5 ${
                isLight 
                  ? 'bg-white border-slate-200' 
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <h2 className={`text-lg font-semibold mb-4 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Join a Room
              </h2>
                <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleJoinRoom}>
                  <input
                    id="join-room-input"
                    type="text"
                  placeholder="Enter room code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  disabled={isJoining}
                  maxLength={6}
                  className={`flex-1 rounded-md border px-4 py-2.5 text-base font-mono tracking-wider transition-colors ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      : 'bg-slate-900 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  } focus:outline-none disabled:opacity-50 uppercase`}
                />
                <button
                  type="submit"
                  disabled={isJoining || !joinCode.trim()}
                  className="px-6 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <FaDoorOpen className="w-3.5 h-3.5" /> Join
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Joined Rooms List */}
            <section className="space-y-4">
              <h2 className={`text-xl font-semibold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Joined Rooms
                {joinedRoomsList.length > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                    isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {joinedRoomsList.length}
                  </span>
                )}
              </h2>
              {joinedRoomsList.length === 0 ? (
                <EmptyState
                  icon={FaInbox}
                  title="No rooms joined yet"
                  description="Enter a room code above to join and start matching photos."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {joinedRoomsList.map((room, index) => (
                    <RoomCard key={room.id} room={room} isOrganizer={false} index={index} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !isCreating && setShowCreateModal(false)}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-lg border shadow-lg ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-5 border-b ${
                isLight ? 'border-slate-200' : 'border-slate-700'
              }`}>
                <h2 className={`text-xl font-semibold ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Create New Room
                </h2>
                <button
                  onClick={() => !isCreating && setShowCreateModal(false)}
                  disabled={isCreating}
                  className={`p-1.5 rounded-md transition-colors ${
                    isLight
                      ? 'hover:bg-slate-100 text-slate-600'
                      : 'hover:bg-slate-700 text-slate-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateRoom} className="p-5 space-y-4">
                {/* Room Name + Date */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      Room Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Company Event 2024"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      disabled={isCreating}
                      maxLength={100}
                      className={`w-full rounded-md border px-3 py-2.5 text-sm transition-colors ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                          : 'bg-slate-900 border-slate-600 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      } focus:outline-none disabled:opacity-50`}
                      autoFocus
                    />
                    <div className={`flex justify-between items-center mt-1 text-xs ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      <span>Choose a descriptive name</span>
                      <span>{roomName.length}/100</span>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      Event Date <span className="text-xs text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      disabled={isCreating}
                      className={`w-full rounded-md border px-3 py-2.5 text-sm transition-colors ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                          : 'bg-slate-900 border-slate-600 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      } focus:outline-none disabled:opacity-50`}
                    />
                    <p className={`mt-1 text-xs ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      Add a reference date for guests (optional)
                    </p>
                  </div>
                </div>

                {/* Room Description */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    Description <span className="text-xs text-slate-400">(Optional)</span>
                  </label>
                  <textarea
                    placeholder="Add details about this room..."
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    disabled={isCreating}
                    maxLength={500}
                    rows={3}
                    className={`w-full rounded-md border px-3 py-2.5 text-sm resize-none transition-colors ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                        : 'bg-slate-900 border-slate-600 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                    } focus:outline-none disabled:opacity-50`}
                  />
                  <div className={`flex justify-between items-center mt-1 text-xs ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <span>Provide context about this room</span>
                    <span>{roomDescription.length}/500</span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <Motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-3 py-2 flex items-center gap-2"
                  >
                    <FaTimes className="text-red-500 flex-shrink-0 w-3.5 h-3.5" />
                    <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
                  </Motion.div>
                )}

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setRoomName('');
                      setRoomDescription('');
                      setEventDate('');
                      setError('');
                    }}
                    disabled={isCreating}
                    className={`px-4 py-2 rounded-md border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !roomName.trim() || roomName.trim().length < 3}
                    className="px-5 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FaPlus className="w-3.5 h-3.5" /> Create Room
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Delete Room Confirmation */}
      <AnimatePresence>
        {roomToDelete && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => {
              if (!deletingRoomId) {
                setDeleteConfirmation('');
                setRoomToDelete(null);
              }
            }}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-lg border shadow-xl ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
                    <FaTrash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      Delete room?
                    </h3>
                    <p className={`text-sm ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      Deleting <span className="font-semibold">{roomToDelete.name}</span> will permanently remove the room, all photos, and face data from our servers and Cloudinary. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <label className={`text-sm font-medium ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                    className={`w-full rounded-md border px-3 py-2 text-sm ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'bg-slate-900 border-slate-600 text-white focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
                    }`}
                  />

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (!deletingRoomId) {
                          setDeleteConfirmation('');
                          setRoomToDelete(null);
                        }
                      }}
                      disabled={!!deletingRoomId}
                      className={`px-4 py-2 rounded-md border font-medium transition-colors disabled:opacity-50 ${
                        isLight
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                          : 'border-slate-600 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteRoom}
                      disabled={
                        deletingRoomId === roomToDelete.id ||
                        deleteConfirmation.trim().toUpperCase() !== 'DELETE'
                      }
                      className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-40"
                    >
                      {deletingRoomId === roomToDelete.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <FaTrash className="w-3.5 h-3.5" />
                          Confirm delete
                        </>
                      )}
                    </button>
                  </div>
                  
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
