import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaDownload, FaTimes, FaEye, FaSpinner, FaCamera, FaUpload, FaUser, FaImages } from 'react-icons/fa';
import { AuthContext } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { getThumbnailUrl, getFullSizeUrl } from '../utils/cloudinary';
import { flaskFaceService } from '../utils/flaskFaceApi';
import CameraCapture from '../components/CameraCapture';

// Justified gallery that preserves image aspect ratios.
// Wider images occupy more horizontal space within a row.
const JustifiedGallery = ({ photos, onSelect, targetRowHeight = 260, rowGap = 16, itemGap = 16 }) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setContainerWidth(Math.floor(width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(() => {
    if (!photos || photos.length === 0 || containerWidth === 0) return [];

    const effectiveWidth = containerWidth; // padding already handled by parent
    const items = photos
      .filter((p) => p.width && p.height)
      .map((p) => ({
        photo: p,
        aspect: p.width / p.height,
        // initial width at target row height
        widthAtTarget: (p.width / p.height) * targetRowHeight,
        heightAtTarget: targetRowHeight,
      }));

    const computedRows = [];
    let currentRow = [];
    let currentRowWidth = 0;
    const gapTotal = (count) => (count - 1) * itemGap;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const tentativeWidth = currentRowWidth + item.widthAtTarget + (currentRow.length > 0 ? itemGap : 0);
      currentRow.push(item);
      currentRowWidth = tentativeWidth;

      const isLastItem = i === items.length - 1;
      const minRowFill = effectiveWidth * 0.9; // allow some slack before justifying

      if (currentRowWidth >= minRowFill || isLastItem) {
        // Scale row to fit exactly the container width
        const totalWidthAtTarget = currentRow.reduce((sum, it) => sum + it.widthAtTarget, 0);
        const scale = (effectiveWidth - gapTotal(currentRow.length)) / Math.max(totalWidthAtTarget, 1);
        const row = currentRow.map((it) => ({
          photo: it.photo,
          width: Math.max(1, Math.round(it.widthAtTarget * scale)),
          height: Math.max(1, Math.round(it.heightAtTarget * scale)),
        }));
        computedRows.push(row);
        currentRow = [];
        currentRowWidth = 0;
      }
    }
    return computedRows;
  }, [photos, containerWidth, targetRowHeight, itemGap]);

  return (
    <div ref={containerRef} style={{ gap: rowGap }} className="flex flex-col">
      {rows.map((row, rIndex) => (
        <div key={rIndex} className="flex" style={{ gap: itemGap }}>
          {row.map((item, iIndex) => (
            <div
              key={item.photo.id}
              className="group relative overflow-hidden bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
              style={{ width: item.width, height: item.height }}
              onClick={() => onSelect(item.photo)}
            >
              <img
                src={getThumbnailUrl(item.photo.cloudinaryPublicId, Math.min(1600, item.width * 2))}
                alt={item.photo.originalName || 'Photo'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] block"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <FaEye className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-sm font-medium truncate">
                  {item.photo.originalName || 'Untitled'}
                </p>
                {item.photo.uploadedAt && (
                  <p className="text-slate-300 text-xs">
                    {new Date(item.photo.uploadedAt.seconds * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const ViewPhotos = () => {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState(null);
  const { currentUser } = useContext(AuthContext);
  const toast = useToast();
  const { isLight } = useTheme();
  
  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [userMatchedPhotos, setUserMatchedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'yours'
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [faceMatching, setFaceMatching] = useState(false);
  const [userFaceDescriptor, setUserFaceDescriptor] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Get passcode from session storage
  useEffect(() => {
    const storedPasscode = sessionStorage.getItem('currentEventPasscode');
    if (!storedPasscode) {
      // No passcode found, redirect to dashboard
      navigate('/dashboard');
      return;
    }
    setPasscode(storedPasscode);

    // Cleanup function to clear passcode when component unmounts
    return () => {
      // Only clear if we're navigating away (not just refreshing)
      const currentPath = window.location.pathname;
      if (currentPath !== '/photos') {
        sessionStorage.removeItem('currentEventPasscode');
      }
    };
  }, [navigate]);

  // Initialize Flask face recognition service
  useEffect(() => {
    const initializeFaceRecognition = async () => {
      try {
        console.log('🚀 Initializing Flask face recognition service...');
        await flaskFaceService.initialize();
        console.log('✅ Flask face recognition service initialized successfully');
        setModelsLoaded(true);
        // Silent initialization - no toast notifications
      } catch (error) {
        console.error('❌ Failed to initialize face recognition:', error);
        console.log('💡 Make sure Flask backend is running on http://localhost:5000');
        // Silent error handling - no toast notifications
      }
    };
    initializeFaceRecognition();
  }, []);

  // Handle face matching using Flask backend
  const handleFaceMatching = async (imageFile) => {
    if (!modelsLoaded) {
      toast.error('Face recognition service not ready');
      return;
    }

    setFaceMatching(true);
    try {
      console.log('Starting face matching with', photos.length, 'photos');
      console.log('Sample photo object:', photos[0]);
      
      const descriptor = await flaskFaceService.getFaceDescriptor(imageFile);
      console.log('Got user face descriptor:', descriptor ? 'SUCCESS' : 'FAILED');
      setUserFaceDescriptor(descriptor);
      
      const matchedPhotos = await flaskFaceService.findMatchingPhotos(descriptor, photos, 0.5);
      console.log('Face matching results:', matchedPhotos.length, 'matches out of', photos.length, 'photos');
      console.log('Matched photos:', matchedPhotos);
      
      setUserMatchedPhotos(matchedPhotos);
      setActiveTab('yours');
      
      if (matchedPhotos.length > 0) {
        const avgAccuracy = Math.round((matchedPhotos.reduce((sum, photo) => sum + photo.matchScore, 0) / matchedPhotos.length) * 100);
        toast.success(`🎉 Found ${matchedPhotos.length} photos with your face! (Avg. accuracy: ${avgAccuracy}%)`);
      } else {
        toast.warning('😔 No matching faces found. Try a clearer photo with good lighting.');
      }
    } catch (error) {
      console.error('Face matching error:', error);
      toast.error(error.message || 'Face matching failed - please try a different photo');
    } finally {
      setFaceMatching(false);
    }
  };

  // Camera capture handler
  const handleCameraCapture = (imageFile) => {
    setShowCameraCapture(false);
    handleFaceMatching(imageFile);
  };

  // File upload handler
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFaceMatching(file);
      setShowUploadModal(false);
    }
  };

  // Fetch photos from Firestore
  useEffect(() => {
    if (!passcode || !currentUser) return;

    setLoading(true);
    setError(null);

    // First get event info
    const eventQuery = query(
      collection(db, 'events'),
      where('passcode', '==', passcode.toUpperCase())
    );

    const unsubEvent = onSnapshot(
      eventQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const eventData = snapshot.docs[0].data();
          setEventInfo({ id: snapshot.docs[0].id, ...eventData });
        }
      },
      (err) => {
        console.error('Event fetch error:', err);
      }
    );

    // Then get photos (temporarily without orderBy to avoid index requirement)
    const photosQuery = query(
      collection(db, 'photos'),
      where('project_passcode', '==', passcode.toUpperCase())
    );

    const unsubPhotos = onSnapshot(
      photosQuery,
      (snapshot) => {
        const photosList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort photos by uploadedAt in JavaScript (since we can't use orderBy without index)
        photosList.sort((a, b) => {
          const aTime = a.uploadedAt?.seconds || 0;
          const bTime = b.uploadedAt?.seconds || 0;
          return bTime - aTime; // Descending order (newest first)
        });
        
        setPhotos(photosList);
        setFilteredPhotos(photosList);
        setLoading(false);
      },
      (err) => {
        console.error('Photos fetch error:', err);
        setError('Failed to load photos. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => {
      unsubEvent();
      unsubPhotos();
    };
  }, [passcode, currentUser]);

  // Filter photos based on active tab
  useEffect(() => {
    const currentPhotos = activeTab === 'yours' ? userMatchedPhotos : photos;
    setFilteredPhotos(currentPhotos);
  }, [photos, userMatchedPhotos, activeTab]);

  const downloadPhoto = async (photo) => {
    try {
      const imageUrl = getFullSizeUrl(photo.cloudinaryPublicId);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = photo.originalName || `photo-${photo.id}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download photo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center pt-24">
        <div className="text-center">
          <FaSpinner className="h-8 w-8 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center pt-24">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Access Error</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-10">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <FaArrowLeft className="h-5 w-5" />
            </motion.button>
            <div>
              <h1 className="text-3xl font-bold text-white">Event Photos</h1>
              {eventInfo && (
                <p className="text-slate-400">
                  {eventInfo.eventName}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-slate-400">
            {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 mb-6"
        >
          <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaImages className="h-4 w-4" />
              All Photos ({photos.length})
            </button>
            <button
              onClick={() => setActiveTab('yours')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'yours'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaUser className="h-4 w-4" />
              Your Photos ({userMatchedPhotos.length})
            </button>
          </div>

          {/* Face Matching Status */}
          {activeTab === 'yours' && faceMatching && (
            <div className="flex items-center gap-2 text-sky-400">
              <FaSpinner className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analyzing faces...</span>
            </div>
          )}
        </motion.div>

      </div>

      {/* Photos Grid - full width */}
      <div className="w-full px-0">
{faceMatching && activeTab === 'yours' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-sky-400">
                <FaSpinner className="h-8 w-8 animate-spin" />
                <span className="text-xl font-medium">Analyzing your face and finding matches...</span>
              </div>
              <div className="text-slate-400">
                This may take a few moments. Please wait.
              </div>
            </div>
          </motion.div>
        ) : filteredPhotos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-slate-500 text-6xl mb-4">📷</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {activeTab === 'yours' && userMatchedPhotos.length === 0 && photos.length > 0
                ? 'No photos found with your face'
                : 'No photos yet'
              }
            </h3>
            <p className="text-slate-400 mb-4">
              {activeTab === 'yours' && userMatchedPhotos.length === 0 && photos.length > 0
                ? 'Upload a photo of yourself or take a selfie to find photos containing your face'
                : 'Photos uploaded to this event will appear here'
              }
            </p>
            {activeTab === 'yours' && userMatchedPhotos.length === 0 && photos.length > 0 && (
              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCameraCapture(true)}
                  disabled={!modelsLoaded}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  <FaCamera className="h-5 w-5" />
                  Take Selfie
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUploadModal(true)}
                  disabled={!modelsLoaded}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  <FaUpload className="h-5 w-5" />
                  Upload Photo
                </motion.button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <JustifiedGallery
              photos={filteredPhotos}
              onSelect={(p) => setSelectedPhoto(p)}
            />
          </motion.div>
        )}
      </div>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>

              {/* Download button */}
              <button
                onClick={() => downloadPhoto(selectedPhoto)}
                className="absolute top-4 right-16 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <FaDownload className="h-5 w-5" />
              </button>

              {/* Image */}
              <img
                src={getFullSizeUrl(selectedPhoto.cloudinaryPublicId)}
                alt={selectedPhoto.originalName || 'Photo'}
                className="max-w-full max-h-full object-contain rounded-lg"
              />

              {/* Photo details */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-1">
                  {selectedPhoto.originalName || 'Untitled'}
                </h3>
                <div className="text-slate-300 text-sm space-y-1">
                  {selectedPhoto.uploadedAt && (
                    <p>Uploaded: {new Date(selectedPhoto.uploadedAt.seconds * 1000).toLocaleString()}</p>
                  )}
                  {selectedPhoto.uploadedBy && (
                    <p>By: {selectedPhoto.uploadedBy}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCameraCapture}
        onCapture={handleCameraCapture}
        onClose={() => setShowCameraCapture(false)}
      />

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Upload Your Photo</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-slate-400 mb-6">
                Upload a clear photo of yourself to find all photos containing your face.
              </p>
              
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="face-upload"
              />
              <label
                htmlFor="face-upload"
                className="block w-full p-8 border-2 border-dashed border-slate-600 rounded-xl text-center hover:border-sky-400 transition-colors cursor-pointer"
              >
                <FaUpload className="h-8 w-8 mx-auto mb-4 text-slate-500" />
                <p className="text-slate-300 font-medium mb-2">Click to upload photo</p>
                <p className="text-slate-500 text-sm">JPG, PNG, GIF up to 10MB</p>
              </label>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewPhotos;
