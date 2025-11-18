import React, { useState, useContext, useMemo, useEffect } from "react";
import { db } from "../firebase";
import { AuthContext } from "../auth/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import { useTheme } from "../theme/ThemeContext";
import { motion } from "framer-motion";
import { FaUpload, FaImage, FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { collection, query, where, getDocs } from "firebase/firestore";
import { enhancedUploadService } from '../utils/enhancedUploadService';

export default function UploadPhotos() {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const initialPasscode = useMemo(() => (location.state?.passcode ? String(location.state.passcode).toUpperCase() : ""), [location.state]);
  const toast = useToast();
  const { isLight } = useTheme();

  const [passcode, setPasscode] = useState(initialPasscode);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  
  // Enhanced upload states
  const [isPaused, setIsPaused] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'paused', 'completed' - Used by event handlers
  const [fileProgress, setFileProgress] = useState({});
  const [uploadResults, setUploadResults] = useState([]); // Used by event handlers for potential UI display
  const [faceProcessingStatus, setFaceProcessingStatus] = useState({ active: false, progress: 0 });

  // Enhanced upload event handlers
  useEffect(() => {
    const handleUploadStarted = (data) => {
      setUploadStatus('uploading');
      setUploading(true);
      setUploadComplete(false);
      setFileProgress({});
      setUploadResults([]);
      toast.info(`Starting upload of ${data.totalFiles} files...`);
    };

    const handleFileProgress = (data) => {
      setFileProgress(prev => ({
        ...prev,
        [data.index]: {
          fileName: data.fileName,
          progress: data.progress,
          stage: data.stage
        }
      }));
    };

    const handleBatchComplete = (_data) => {
      const completed = Object.values(fileProgress).filter(p => p.stage === 'complete').length;
      const total = files.length;
      setUploadProgress(Math.round((completed / total) * 100));
    };

    const handleUploadComplete = (data) => {
      setUploadStatus('completed');
      setUploading(false);
      setUploadComplete(true);
      setUploadResults(data.results);
      
      if (data.successful > 0) {
        toast.success(`Successfully uploaded ${data.successful} photos!`);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000); // 2 second delay to show success message
      }
      if (data.failed > 0) {
        toast.error(`${data.failed} photos failed to upload`);
      }
    };

    const handleUploadPaused = () => {
      setIsPaused(true);
      setUploadStatus('paused');
      toast.info('Upload paused');
    };

    const handleUploadResumed = () => {
      setIsPaused(false);
      setUploadStatus('uploading');
      toast.info('Upload resumed');
    };

    const handleFaceProcessingStarted = (data) => {
      setFaceProcessingStatus({ active: true, progress: 0, total: data.count });
      toast.info(`Processing faces for ${data.count} photos in background...`);
    };

    const handleFaceProcessingProgress = (data) => {
      setFaceProcessingStatus(prev => ({
        ...prev,
        progress: Math.round((data.index / data.total) * 100),
        current: data.fileName
      }));
    };

    const handleFaceProcessingFinished = (data) => {
      setFaceProcessingStatus({ active: false, progress: 100 });
      toast.success(`Face processing completed: ${data.successful}/${data.total} photos processed`);
    };

    // Register event listeners
    enhancedUploadService.on('uploadStarted', handleUploadStarted);
    enhancedUploadService.on('fileProgress', handleFileProgress);
    enhancedUploadService.on('batchComplete', handleBatchComplete);
    enhancedUploadService.on('uploadComplete', handleUploadComplete);
    enhancedUploadService.on('uploadPaused', handleUploadPaused);
    enhancedUploadService.on('uploadResumed', handleUploadResumed);
    enhancedUploadService.on('faceProcessingStarted', handleFaceProcessingStarted);
    enhancedUploadService.on('faceProcessingProgress', handleFaceProcessingProgress);
    enhancedUploadService.on('faceProcessingFinished', handleFaceProcessingFinished);

    // Cleanup
    return () => {
      enhancedUploadService.eventListeners = {};
    };
  }, [files.length, fileProgress]);

  // Image compression utility
  const compressImage = (file, _maxSizeMB = 8, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions to stay under size limit
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    const MAX_SIZE_MB = 10;
    
    setCompressing(true);
    setCompressionProgress(0);
    setUploadComplete(false);
    
    const processedFiles = [];
    const oversizedFiles = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileSizeMB = file.size / (1024 * 1024);
      
      setCompressionProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      
      if (fileSizeMB > MAX_SIZE_MB) {
        try {
          const compressedFile = await compressImage(file);
          const compressedSizeMB = compressedFile.size / (1024 * 1024);
          
          if (compressedSizeMB <= MAX_SIZE_MB) {
            processedFiles.push(compressedFile);
          } else {
            oversizedFiles.push(file.name);
          }
        } catch (error) {
          console.error('Compression failed for', file.name, error);
          oversizedFiles.push(file.name);
        }
      } else {
        processedFiles.push(file);
      }
    }
    
    setFiles(processedFiles);
    setCompressing(false);
    setCompressionProgress(0);
    
    if (oversizedFiles.length > 0) {
      toast.error(`Some files were too large and couldn't be compressed: ${oversizedFiles.join(', ')}`);
    }
    
    if (processedFiles.length > 0 && oversizedFiles.length > 0) {
      toast.success(`${processedFiles.length} files ready for upload. ${oversizedFiles.length} files were too large.`);
    }
  };

  async function handleUpload() {
    if (!passcode) {
      toast.error("Please enter the event passcode.");
      return;
    }
    if (!files.length) {
      toast.error("Please select at least one photo.");
      return;
    }

    try {
      // First verify the event exists
      const eventQuery = query(collection(db, 'events'), where('passcode', '==', passcode));
      const eventSnapshot = await getDocs(eventQuery);
      
      if (eventSnapshot.empty) {
        toast.error("Invalid event passcode. Please check and try again.");
        return;
      }

      const eventDoc = eventSnapshot.docs[0];
      const eventId = eventDoc.id;
      const eventData = eventDoc.data();

      // Use enhanced upload service
      const results = await enhancedUploadService.uploadFiles(files, {
        passcode,
        eventId,
        eventName: eventData.eventName || 'Unknown Event',
        uploadedBy: currentUser.email,
        uploadedByUid: currentUser.uid,
        folder: `facematch/${passcode}`,
        tags: [passcode, 'facematch', eventId]
      });

      console.log('Upload results:', results);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    }
  }

  // Pause/Resume handlers
  const handlePause = () => {
    enhancedUploadService.pause();
  };

  const handleResume = () => {
    enhancedUploadService.resume();
  };

  const handleCancel = () => {
    enhancedUploadService.cancel();
    setUploading(false);
    setUploadStatus('idle');
    toast.info('Upload cancelled');
  };

  // Suppress linter warnings for state variables that are set but may not be directly read
  // They're used by event handlers and may be displayed in future UI enhancements
  void uploadStatus;
  void uploadResults;

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-x-hidden pt-24 pb-10 px-4">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-24 left-8 w-72 h-72 rounded-full blur-3xl animate-pulse bg-sky-500/10" />
        <div className="absolute bottom-24 right-8 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 bg-purple-500/10" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="p-3 rounded-xl transition-all bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
          >
            <FaArrowLeft className="h-5 w-5" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-bold text-white">Upload Photos</h1>
            <p className="text-slate-400">Add photos to your event for face matching</p>
          </div>
        </motion.div>

        {/* Upload Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="backdrop-blur-sm border rounded-2xl p-8 shadow-xl bg-slate-800/90 border-slate-700"
        >
          {/* Event Info */}
          {location.state?.eventId && (
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="text-sm font-medium text-blue-300">Uploading to Event</div>
              <div className="font-mono text-lg text-blue-200">{location.state.passcode}</div>
            </div>
          )}

          {/* Passcode Input */}
          <div className="mb-6">
            <label className="block mb-3 font-semibold text-slate-200">
              Event Passcode
            </label>
            <input
              type="text"
              maxLength={10}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.toUpperCase())}
              placeholder="Enter event passcode"
              className="w-full px-4 py-4 rounded-xl font-mono text-lg tracking-widest uppercase text-center transition-all bg-slate-900/60 border-2 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20"
            />
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block mb-3 font-semibold text-slate-200">
              Select Photos
            </label>
            <div className="relative border-2 border-dashed rounded-xl p-8 text-center transition-all border-slate-600 hover:border-purple-400 bg-slate-800/50">
              <input
                id="photo-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={compressing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="pointer-events-none">
                <FaImage className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                <p className="text-lg font-medium mb-2 text-slate-300">
                  {compressing ? 'Processing images...' : files.length > 0 ? `${files.length} file(s) ready` : 'Click to select photos'}
                </p>
                <p className="text-sm text-slate-400">
                  Supports JPG, PNG, GIF • Max 10MB per file • Auto-compression enabled
                </p>
              </div>
            </div>
            
            {/* Size limit warning */}
            <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <FaExclamationTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Files larger than 10MB will be automatically compressed. Very large files may be rejected.</span>
            </div>
          </div>

          {/* Selected Files Preview */}
          {files.length > 0 && (
            <div className="mb-6">
              <h3 className={`font-semibold mb-3 ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>Selected Files:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Array.from(files).slice(0, 6).map((file, index) => (
                  <div key={index} className={`p-2 rounded-lg text-xs truncate ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-700 text-slate-300'}`}>
                    {file.name}
                  </div>
                ))}
                {files.length > 6 && (
                  <div className={`p-2 rounded-lg text-xs ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-600 text-slate-300'}`}>
                    +{files.length - 6} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compression Progress */}
          {compressing && (
            <div className="mb-6">
              <div className={`flex justify-between text-sm mb-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>Compressing images...</span>
                <span>{compressionProgress}%</span>
              </div>
              <div className={`w-full rounded-full h-2 ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}>
                <div 
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${compressionProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-6">
              <div className={`flex justify-between text-sm mb-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className={`w-full rounded-full h-2 ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}>
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-6 p-4 rounded-xl ${isLight ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-green-500/10 border border-green-500/30 text-green-300'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <FaCheckCircle className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-medium">Photos uploaded successfully!</div>
                  <div className="text-sm opacity-80 mt-1">Redirecting to dashboard...</div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard')}
                className="w-full py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
              >
                Go to Dashboard Now
              </motion.button>
            </motion.div>
          )}

          {/* Enhanced Upload Controls */}
          <div className="space-y-4">
            {/* Upload Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              disabled={uploading || compressing || !passcode || files.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                isLight
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {compressing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Compressing... {compressionProgress}%</span>
                </>
              ) : uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Uploading... {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <FaUpload className="h-5 w-5" />
                  <span>Upload {files.length > 0 ? `${files.length} Photo${files.length > 1 ? 's' : ''}` : 'Photos'}</span>
                </>
              )}
            </motion.button>

            {/* Pause/Resume/Cancel Controls */}
            {uploading && (
              <div className="flex gap-3">
                {!isPaused ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePause}
                    className="flex-1 py-3 px-4 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-medium transition-colors"
                  >
                    ⏸️ Pause Upload
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleResume}
                    className="flex-1 py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                  >
                    ▶️ Resume Upload
                  </motion.button>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                >
                  ❌ Cancel
                </motion.button>
              </div>
            )}

            {/* Enhanced Progress Display */}
            {uploading && (
              <div className="space-y-3">
                {/* Overall Progress */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-300">Overall Progress</span>
                    <span className="text-sm text-slate-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>

                {/* Individual File Progress */}
                {Object.keys(fileProgress).length > 0 && (
                  <div className="bg-slate-700 rounded-lg p-4">
                    <div className="text-sm font-medium text-slate-300 mb-3">File Progress</div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(fileProgress).map(([index, progress]) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-400 truncate">{progress.fileName}</div>
                            <div className="text-xs text-slate-500 capitalize">{progress.stage}</div>
                          </div>
                          <div className="w-16 bg-slate-600 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8">{Math.round(progress.progress)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Face Processing Status */}
                {faceProcessingStatus.active && (
                  <div className="bg-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-300">Face Processing</span>
                      <span className="text-sm text-slate-400">{faceProcessingStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${faceProcessingStatus.progress}%` }}
                      />
                    </div>
                    {faceProcessingStatus.current && (
                      <div className="text-xs text-slate-400 mt-1 truncate">
                        Processing: {faceProcessingStatus.current}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
