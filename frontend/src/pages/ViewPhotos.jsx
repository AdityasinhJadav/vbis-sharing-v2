import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaDownload, FaTimes, FaEye, FaSpinner, FaCamera, FaUpload, FaUser, FaImages, FaCheck, FaCheckSquare, FaSquare, FaSyncAlt, FaEdit, FaChevronLeft, FaChevronRight, FaInfoCircle, FaCalendarAlt } from 'react-icons/fa';
import { AuthContext } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../theme/ThemeContext';
import { roomDetails, roomPhotos, match, retryPhotoIngestion, getIngestionStatus, deletePhoto } from '../api';
import CameraCapture from '../components/CameraCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonPhotoGrid } from '../components/SkeletonLoader';
import { compressImage } from '../utils/imageCompression';

// Justified gallery that preserves image aspect ratios.
// Wider images occupy more horizontal space within a row.
const JustifiedGallery = ({ photos, onSelect, onToggleSelect, selectedPhotos, isSelectionMode, targetRowHeight = 260, rowGap = 16, itemGap = 16 }) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [imageDimensions, setImageDimensions] = useState(new Map());

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

  // Load image dimensions
  useEffect(() => {
    const loadDimensions = async () => {
      const newDimensions = new Map();
      const promises = photos.map(photo => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            newDimensions.set(photo.id, { width: img.width, height: img.height });
            resolve();
          };
          img.onerror = () => {
            // Default dimensions if image fails to load
            newDimensions.set(photo.id, { width: 800, height: 600 });
            resolve();
          };
          img.src = photo.url || photo.cloudinaryPublicId || '';
        });
      });
      await Promise.all(promises);
      setImageDimensions(newDimensions);
    };
    if (photos.length > 0) {
      loadDimensions();
    }
  }, [photos]);

  const rows = useMemo(() => {
    if (!photos || photos.length === 0 || containerWidth === 0 || imageDimensions.size === 0) return [];

    const effectiveWidth = containerWidth;
    const items = photos
      .map((p) => {
        const dims = imageDimensions.get(p.id) || { width: 800, height: 600 };
        return {
          photo: p,
          aspect: dims.width / dims.height,
          widthAtTarget: (dims.width / dims.height) * targetRowHeight,
          heightAtTarget: targetRowHeight,
        };
      });

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
      const minRowFill = effectiveWidth * 0.9;

      if (currentRowWidth >= minRowFill || isLastItem) {
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
  }, [photos, containerWidth, targetRowHeight, itemGap, imageDimensions]);

  return (
    <div ref={containerRef} style={{ gap: rowGap }} className="flex flex-col">
      {rows.map((row, rIndex) => (
        <div key={rIndex} className="flex" style={{ gap: itemGap }}>
          {row.map((item) => (
            <div
              key={item.photo.id}
              className="group relative overflow-hidden bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
              style={{ width: item.width, height: item.height }}
              onClick={() => isSelectionMode ? onToggleSelect(item.photo) : onSelect(item.photo)}
            >
              <img
                src={item.photo.url || item.photo.cloudinaryPublicId || ''}
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
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const toast = useToast();
  const { isLight } = useTheme();

  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [userMatchedPhotos, setUserMatchedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(-1);
  const [roomInfo, setRoomInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'yours'
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [faceMatching, setFaceMatching] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState(null);
  const [retryingIngestion, setRetryingIngestion] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(null);

  // Fetch room info and photos
  useEffect(() => {
    if (!roomId || !currentUser) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch room details
        const room = await roomDetails(roomId);
        setRoomInfo(room);

        // Fetch all photos (fetch all pages)
        let allPhotos = [];
        let currentPage = 1;
        let hasMore = true;
        const pageLimit = 100; // Fetch 100 photos per page to minimize requests
        
        while (hasMore) {
          const response = await roomPhotos(roomId, currentPage, pageLimit);
          
          // Handle both paginated and non-paginated responses
          if (response.data && Array.isArray(response.data)) {
            // Paginated response
            allPhotos = [...allPhotos, ...response.data];
            hasMore = response.pagination?.hasNext || false;
            currentPage++;
          } else if (Array.isArray(response)) {
            // Non-paginated response (backward compatibility)
            allPhotos = response;
            hasMore = false;
          } else {
            // Unexpected format
            hasMore = false;
          }
          
          // Safety check to prevent infinite loop
          if (currentPage > 100) {
            console.warn('Reached maximum page limit while fetching photos');
            break;
          }
        }
        
        // Sort by uploadedAt if available, otherwise by id
        allPhotos.sort((a, b) => {
          const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          return bTime - aTime; // Descending order (newest first)
        });
        setPhotos(allPhotos);
        setFilteredPhotos(allPhotos);
      } catch (err) {
        console.error('Error loading room data:', err);
        setError(err.message || 'Failed to load room. Please check your permissions.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [roomId, currentUser]);

  // Filter photos based on active tab
  useEffect(() => {
    const currentPhotos = activeTab === 'yours' ? userMatchedPhotos : photos;
    setFilteredPhotos(currentPhotos);
  }, [photos, userMatchedPhotos, activeTab]);

  // Keyboard navigation for photo modal
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (e) => {
      // Don't handle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        setSelectedPhoto(null);
        setPhotoIndex(-1);
      } else if (e.key === 'ArrowLeft' && photoIndex > 0) {
        e.preventDefault();
        const prevPhoto = filteredPhotos[photoIndex - 1];
        const newIndex = photoIndex - 1;
        setPhotoIndex(newIndex);
        setSelectedPhoto(prevPhoto);
      } else if (e.key === 'ArrowRight' && photoIndex < filteredPhotos.length - 1) {
        e.preventDefault();
        const nextPhoto = filteredPhotos[photoIndex + 1];
        const newIndex = photoIndex + 1;
        setPhotoIndex(newIndex);
        setSelectedPhoto(nextPhoto);
      } else if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        downloadPhoto(selectedPhoto);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, photoIndex, filteredPhotos]);

  // Load ingestion status (for organizers)
  useEffect(() => {
    if (!roomId || !currentUser || currentUser.role !== 'organizer') return;
    
    const loadIngestionStatus = async () => {
      try {
        const status = await getIngestionStatus(roomId);
        setIngestionStatus(status);
      } catch (err) {
        console.error('Failed to load ingestion status:', err);
      }
    };
    
    loadIngestionStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(loadIngestionStatus, 30000);
    return () => clearInterval(interval);
  }, [roomId, currentUser]);

  // Handle retry ingestion
  const handleRetryIngestion = async () => {
    if (!roomId) return;
    
    setRetryingIngestion(true);
    try {
      const result = await retryPhotoIngestion(roomId);
      toast.success(result.message || 'Photo processing started in background');
      
      // Refresh status after a delay
      setTimeout(async () => {
        try {
          const status = await getIngestionStatus(roomId);
          setIngestionStatus(status);
        } catch (err) {
          console.error('Failed to refresh ingestion status:', err);
        }
      }, 2000);
    } catch (err) {
      toast.error(err.message || 'Failed to retry photo ingestion');
    } finally {
      setRetryingIngestion(false);
    }
  };

  // Handle face matching using existing API
  const handleFaceMatching = async (imageFile) => {
    if (!roomId) {
      toast.error('Room not found');
      return;
    }

    setFaceMatching(true);
    try {
      // Compress image if it's too large
      let processedFile = imageFile;
      if (imageFile.size > 10 * 1024 * 1024) {
        toast.info('Compressing image for upload...', { duration: 2000 });
        processedFile = await compressImage(imageFile, {
          maxSizeMB: 9,
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85
        });
      }
      
      console.log('Starting face matching with', photos.length, 'photos');
      
      const result = await match(roomId, processedFile);
      
      // match() function already extracts data, so result should be { matches: [...], threshold: ... }
      const matches = result.matches || [];
      const threshold = result.threshold;
      const message = result.message;
      
      console.log('Face matching results:', {
        matchesCount: matches.length,
        totalPhotos: photos.length,
        threshold: threshold,
        message: message,
        rawMatches: matches,
        fullResult: result
      });
      
      // Show helpful message if no matches but photos exist
      if (matches.length === 0 && photos.length > 0 && message) {
        toast.info(message);
      }
      
      // Map matches to photo objects
      const photoMap = new Map(photos.map(p => [p.id, p]));
      const matchedPhotos = matches
        .map(match => {
          // Handle both old format (match.id) and new format (match.photo.id)
          const matchId = match.id || match.photo?.id;
          const photo = photoMap.get(matchId);
          if (!photo) {
            console.warn('Photo not found for match:', match);
            return null;
          }
          // Use confidence if available (new improved algorithm), otherwise use score
          const confidence = match.confidence !== undefined ? match.confidence : match.score;
          return {
            ...photo,
            matchScore: match.score || match.similarity || 0,
            confidence: confidence || match.score || 0,
          };
        })
        .filter(photo => photo !== null)
        .sort((a, b) => {
          // Sort by confidence first (if available), then by score
          if (a.confidence !== undefined && b.confidence !== undefined) {
            return b.confidence - a.confidence;
          }
          return b.matchScore - a.matchScore;
        });

      setUserMatchedPhotos(matchedPhotos);
      setActiveTab('yours');

      if (matchedPhotos.length === 0) {
        toast.warning('No matching faces found. Try a clearer photo with good lighting.');
      }
    } catch (error) {
      console.error('Face matching error:', error);
      
      let errorMessage = 'Face matching failed - please try a different photo';
      
      if (error.message && error.message.includes('No faces detected')) {
        errorMessage = 'No face detected in your photo. Please try:\n• A clearer, front-facing photo\n• Better lighting\n• A different angle';
      } else if (error.message && error.message.includes('Invalid image format')) {
        errorMessage = 'Invalid image format. Please upload a JPG or PNG file.';
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

  const handleDeletePhoto = async (photo) => {
    if (!currentUser || currentUser.role !== 'organizer') {
      toast.error('Only organizers can delete photos');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this photo? This action cannot be undone.`)) {
      return;
    }

    setDeletingPhoto(photo.id);
    try {
      await deletePhoto(photo.id);
      
      // Remove photo from state
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setFilteredPhotos(prev => prev.filter(p => p.id !== photo.id));
      setUserMatchedPhotos(prev => prev.filter(p => p.id !== photo.id));
      
      // Close modal if this photo was selected
      if (selectedPhoto && selectedPhoto.id === photo.id) {
        setSelectedPhoto(null);
      }
      
      // Remove from selection if selected
      setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
      
      toast.success('Photo deleted successfully');
    } catch (error) {
      console.error('Delete photo error:', error);
      toast.error(error.message || 'Failed to delete photo');
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!currentUser || currentUser.role !== 'organizer') {
      toast.error('Only organizers can delete photos');
      return;
    }

    if (selectedPhotos.length === 0) {
      toast.warning('No photos selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedPhotos.length} photo(s)? This action cannot be undone.`)) {
      return;
    }

    const photosToDelete = [...selectedPhotos];
    setDeletingPhoto('bulk');
    
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const photoId of photosToDelete) {
        try {
          await deletePhoto(photoId);
          successCount++;
          
          // Remove from state
          setPhotos(prev => prev.filter(p => p.id !== photoId));
          setFilteredPhotos(prev => prev.filter(p => p.id !== photoId));
          setUserMatchedPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (error) {
          console.error(`Failed to delete photo ${photoId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} photo${successCount !== 1 ? 's' : ''} successfully`);
      }
      if (errorCount > 0) {
        toast.warning(`Failed to delete ${errorCount} photo${errorCount !== 1 ? 's' : ''}`);
      }

      clearSelection();
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete photos');
    } finally {
      setDeletingPhoto(null);
    }
  };

  const downloadPhoto = async (photo) => {
    try {
      const imageUrl = photo.url || photo.cloudinaryPublicId || '';
      const fileName = photo.originalName || `photo-${photo.id}.jpg`;

      console.log('Downloading photo:', {
        photoId: photo.id,
        fileName,
        imageUrl,
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
          const imageUrl = photo.url || photo.cloudinaryPublicId || '';
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
              {roomInfo && (
                <p className="text-slate-400">
                  {roomInfo.name}
                </p>
              )}
              {/* Ingestion Status (Organizers only) */}
              {currentUser?.role === 'organizer' && ingestionStatus && (
                <div className="mt-2 flex items-center gap-3">
                  <div className={`text-xs px-2 py-1 rounded ${
                    ingestionStatus.processingProgress === 100
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : ingestionStatus.unprocessedPhotos > 0
                      ? 'bg-yellow-900/30 text-yellow-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {ingestionStatus.processedPhotos}/{ingestionStatus.totalPhotos} photos processed
                    {ingestionStatus.processingProgress < 100 && ` (${ingestionStatus.processingProgress}%)`}
                  </div>
                  {ingestionStatus.unprocessedPhotos > 0 && (
                    <button
                      onClick={handleRetryIngestion}
                      disabled={retryingIngestion}
                      className="text-xs px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 text-white transition-colors"
                    >
                      {retryingIngestion ? 'Processing...' : `Process ${ingestionStatus.unprocessedPhotos} unprocessed`}
                    </button>
                  )}
                </div>
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
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={downloadSelectedPhotos}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <FaDownload className="h-4 w-4" />
                          Download ({selectedPhotos.length})
                        </motion.button>
                        {currentUser?.role === 'organizer' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleBulkDelete}
                            disabled={deletingPhoto === 'bulk'}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors"
                          >
                            {deletingPhoto === 'bulk' ? (
                              <FaSpinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <FaTimes className="h-4 w-4" />
                            )}
                            Delete ({selectedPhotos.length})
                          </motion.button>
                        )}
                      </>
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
          className="flex items-center justify-between gap-4 mb-6"
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
          
          {/* Change Photo button - show when viewing "Your Photos" tab and have matched photos */}
          {activeTab === 'yours' && userMatchedPhotos.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Show upload modal to change photo
                setShowUploadModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors border border-emerald-500 shadow-lg"
              title="Upload a new photo to get updated matches"
            >
              <FaSyncAlt className="h-4 w-4" />
              Change Photo
            </motion.button>
          )}
          
          {/* Show upload/camera buttons when no matches but photos exist */}
          {activeTab === 'yours' && userMatchedPhotos.length === 0 && photos.length > 0 && (
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCameraCapture(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <FaCamera className="h-4 w-4" />
                Take Selfie
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <FaUpload className="h-4 w-4" />
                Upload Photo
              </motion.button>
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
            {activeTab === 'all' ? (
              <>
                <div className="text-slate-500 text-6xl mb-4">📷</div>
                <h3 className="text-xl font-semibold text-white mb-2">No photos yet</h3>
                <p className="text-slate-400 mb-4">Photos uploaded to this event will appear here</p>
              </>
            ) : (
              // For "Your Photos" tab, just show a simple message since buttons are at top
              <p className="text-slate-400">Use the buttons above to upload a photo and find matches</p>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
            onClick={() => {
              setSelectedPhoto(null);
              setPhotoIndex(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSelectedPhoto(null);
                setPhotoIndex(-1);
              } else if (e.key === 'ArrowLeft' && photoIndex > 0) {
                const prevPhoto = filteredPhotos[photoIndex - 1];
                setPhotoIndex(photoIndex - 1);
                setSelectedPhoto(prevPhoto);
              } else if (e.key === 'ArrowRight' && photoIndex < filteredPhotos.length - 1) {
                const nextPhoto = filteredPhotos[photoIndex + 1];
                setPhotoIndex(photoIndex + 1);
                setSelectedPhoto(nextPhoto);
              }
            }}
            tabIndex={0}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full h-full max-w-7xl max-h-[95vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Bar - Controls Only */}
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-end p-4 bg-gradient-to-b from-black/80 to-transparent">
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => downloadPhoto(selectedPhoto)}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white transition-all"
                    title="Download photo (D)"
                  >
                    <FaDownload className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedPhoto(null);
                      setPhotoIndex(-1);
                    }}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white transition-all"
                    title="Close (ESC)"
                  >
                    <FaTimes className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              {/* Main Image Container */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                {/* Navigation Arrows */}
                {filteredPhotos.length > 1 && (
                  <>
                    {photoIndex > 0 && (
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.1, x: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const prevPhoto = filteredPhotos[photoIndex - 1];
                          setPhotoIndex(photoIndex - 1);
                          setSelectedPhoto(prevPhoto);
                        }}
                        className="absolute left-4 z-20 p-4 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 text-white transition-all"
                        title="Previous photo (←)"
                      >
                        <FaChevronLeft className="h-6 w-6" />
                      </motion.button>
                    )}
                    {photoIndex < filteredPhotos.length - 1 && (
                      <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.1, x: -5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextPhoto = filteredPhotos[photoIndex + 1];
                          setPhotoIndex(photoIndex + 1);
                          setSelectedPhoto(nextPhoto);
                        }}
                        className="absolute right-4 z-20 p-4 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 text-white transition-all"
                        title="Next photo (→)"
                      >
                        <FaChevronRight className="h-6 w-6" />
                      </motion.button>
                    )}
                  </>
                )}

                {/* Image */}
                <motion.img
                  key={selectedPhoto.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  src={selectedPhoto.url || selectedPhoto.cloudinaryPublicId || ''}
                  alt={selectedPhoto.originalName || 'Photo'}
                  className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                  style={{ maxWidth: 'min(90vw, 1400px)', maxHeight: '85vh' }}
                />
              </div>

              {/* Bottom Bar - Additional Info */}
              <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    {selectedPhoto.matchScore !== undefined && (
                      <div className="px-3 py-1.5 bg-emerald-900/30 backdrop-blur-sm rounded-lg border border-emerald-700/50">
                        <p className="text-xs text-emerald-300">
                          Match: {Math.round((selectedPhoto.confidence || selectedPhoto.matchScore) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Use arrow keys to navigate • ESC to close
                  </div>
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
                <h3 className="text-xl font-semibold text-white">
                  {userMatchedPhotos.length > 0 ? 'Change Your Photo' : 'Upload Your Photo'}
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              {userMatchedPhotos.length > 0 && (
                <p className="text-sm text-slate-400 mb-4">
                  Upload a new photo to update your matches. This will replace your current matched photos.
                </p>
              )}

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
                <p className="text-slate-500 text-sm">JPG, PNG, GIF (large files will be compressed automatically)</p>
              </label>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewPhotos;
