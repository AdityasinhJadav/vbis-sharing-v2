import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaDownload, FaTimes, FaEye, FaSpinner, FaCamera, FaUpload, FaUser, FaImages, FaCheck, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { AuthContext } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
// import { useTheme } from '../theme/ThemeContext'; // Commented out - not used
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getThumbnailUrl, getFullSizeUrl } from '../utils/cloudinary';
import { flaskFaceService } from '../utils/flaskFaceApi';
import CameraCapture from '../components/CameraCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonPhotoGrid } from '../components/SkeletonLoader';

// Justified gallery that preserves image aspect ratios.
// Wider images occupy more horizontal space within a row.
const JustifiedGallery = ({ photos, onSelect, onToggleSelect, selectedPhotos, isSelectionMode, targetRowHeight = 260, rowGap = 16, itemGap = 16 }) => {
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
          {row.map((item, _iIndex) => (
            <div
              key={item.photo.id}
              className="group relative overflow-hidden bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
              style={{ width: item.width, height: item.height }}
              onClick={() => isSelectionMode ? onToggleSelect(item.photo) : onSelect(item.photo)}
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
              {/* Selection checkbox */}
              {isSelectionMode && (
                <div className="absolute top-2 left-2">
                  <div className="w-6 h-6 bg-black/50 rounded flex items-center justify-center">
                    {selectedPhotos.includes(item.photo.id) ? (
                      <FaCheckSquare className="h-4 w-4 text-sky-400" />
                    ) : (
                      <FaSquare className="h-4 w-4 text-white/70" />
                    )}
                  </div>
                </div>
              )}
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
  // const { isLight } = useTheme(); // Commented out - not used
  
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
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Suppress linter warning - userFaceDescriptor is set but may be used for future features
  void userFaceDescriptor;

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
      
      const matchedPhotos = await flaskFaceService.findMatchingPhotos(descriptor, photos, 0.5, imageFile);
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
      
      // Provide specific error messages based on the error type
      let errorMessage = 'Face matching failed - please try a different photo';
      
      if (error.message && error.message.includes('No faces detected')) {
        errorMessage = 'No face detected in your photo. Please try:\n• A clearer, front-facing photo\n• Better lighting\n• A different angle';
      } else if (error.message && error.message.includes('Invalid image format')) {
        errorMessage = 'Invalid image format. Please upload a JPG or PNG file.';
      } else if (error.message && error.message.includes('Backend service not available')) {
        errorMessage = 'Face recognition service is not available. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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

  // Fetch event info first
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
          const eventId = snapshot.docs[0].id;
          setEventInfo({ id: eventId, ...eventData });
        } else {
          setError('Event not found. Please check the passcode.');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Event fetch error:', err);
        setError('Failed to load event. Please try again.');
        setLoading(false);
      }
    );

    return () => {
      unsubEvent();
    };
  }, [passcode, currentUser]);

  // Fetch photos after event info is available
  useEffect(() => {
    if (!eventInfo?.id || !currentUser) return;

    // Get photos using event_id for better uniqueness
    const photosQuery = query(
      collection(db, 'photos'),
      where('event_id', '==', eventInfo.id)
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
      unsubPhotos();
    };
  }, [eventInfo?.id, currentUser]);

  // Filter photos based on active tab
  useEffect(() => {
    const currentPhotos = activeTab === 'yours' ? userMatchedPhotos : photos;
    setFilteredPhotos(currentPhotos);
  }, [photos, userMatchedPhotos, activeTab]);

  const downloadPhoto = async (photo) => {
    try {
      const imageUrl = getFullSizeUrl(photo.cloudinaryPublicId);
      const fileName = photo.originalName || `photo-${photo.id}.jpg`;
      
      console.log('Downloading photo:', {
        photoId: photo.id,
        fileName,
        imageUrl,
        cloudinaryPublicId: photo.cloudinaryPublicId
      });
      
      try {
        // Method 1: Fetch as blob (handles CORS properly)
        console.log('Attempting blob download...');
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log('Blob created, size:', blob.size);
        
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the object URL
        window.URL.revokeObjectURL(url);
        
        console.log('Blob download successful');
        toast.success('Download started!');
      } catch (blobError) {
        console.warn('Blob download failed, trying direct download:', blobError);
        
        // Method 2: Direct download (fallback)
        console.log('Attempting direct download...');
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = fileName;
        link.target = '_blank';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Direct download attempted');
        toast.success('Download started!');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download photo. Please try again.');
    }
  };

  const togglePhotoSelection = (photo) => {
    setSelectedPhotos(prev => {
      if (prev.includes(photo.id)) {
        return prev.filter(id => id !== photo.id);
      } else {
        return [...prev, photo.id];
      }
    });
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(filteredPhotos.map(photo => photo.id));
  };

  const clearSelection = () => {
    setSelectedPhotos([]);
  };

  const downloadSelectedPhotos = async () => {
    if (selectedPhotos.length === 0) {
      toast.warning('No photos selected');
      return;
    }

    try {
      const selectedPhotoObjects = filteredPhotos.filter(photo => selectedPhotos.includes(photo.id));
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < selectedPhotoObjects.length; i++) {
        const photo = selectedPhotoObjects[i];
        
        try {
          const imageUrl = getFullSizeUrl(photo.cloudinaryPublicId);
          const fileName = photo.originalName || `photo-${photo.id}.jpg`;
          
          // Fetch the image as a blob to handle CORS properly
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the object URL
          window.URL.revokeObjectURL(url);
          
          successCount++;
        } catch (error) {
          console.error(`Failed to download photo ${photo.id}:`, error);
          errorCount++;
        }
        
        // Add delay between downloads to prevent browser blocking
        if (i < selectedPhotoObjects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (successCount > 0) {
        toast.success(`Downloaded ${successCount} photo${successCount !== 1 ? 's' : ''}!`);
      }
      if (errorCount > 0) {
        toast.warning(`Failed to download ${errorCount} photo${errorCount !== 1 ? 's' : ''}`);
      }
      
      clearSelection();
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Bulk download error:', error);
      toast.error('Failed to download photos');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 pt-24 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
              <FaArrowLeft className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <div className="h-8 w-48 bg-slate-800 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-slate-800 rounded animate-pulse"></div>
            </div>
          </div>
          <SkeletonPhotoGrid count={12} />
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
          
          <div className="flex items-center gap-4">
            <div className="text-slate-400">
              {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
            </div>
            
            {filteredPhotos.length > 0 && (
              <div className="flex items-center gap-2">
                {!isSelectionMode ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsSelectionMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                  >
                    <FaCheck className="h-4 w-4" />
                    Select Photos
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={selectAllPhotos}
                      className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors text-sm"
                    >
                      Select All
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={clearSelection}
                      className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors text-sm"
                    >
                      Clear
                    </motion.button>
                    {selectedPhotos.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={downloadSelectedPhotos}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <FaDownload className="h-4 w-4" />
                        Download ({selectedPhotos.length})
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsSelectionMode(false);
                        clearSelection();
                      }}
                      className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors text-sm"
                    >
                      Cancel
                    </motion.button>
                  </div>
                )}
              </div>
            )}
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
            <LoadingSpinner 
              type="search"
              message="Analyzing your face and finding matches..."
              size="large"
            />
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
              onToggleSelect={togglePhotoSelection}
              selectedPhotos={selectedPhotos}
              isSelectionMode={isSelectionMode}
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
              
              <p className="text-slate-400 mb-4">
                Upload a clear photo of yourself to find all photos containing your face.
              </p>
              
              <div className="bg-slate-700 rounded-lg p-4 mb-6">
                <h4 className="text-white font-medium mb-2">📸 Tips for better face detection:</h4>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• Use good lighting (avoid shadows on your face)</li>
                  <li>• Look directly at the camera</li>
                  <li>• Make sure your face is clearly visible</li>
                  <li>• Avoid sunglasses or face coverings</li>
                  <li>• Use a high-quality photo</li>
                </ul>
              </div>
              
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
