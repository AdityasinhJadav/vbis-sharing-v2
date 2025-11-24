import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FaArrowLeft, FaCloudUploadAlt, FaCheckCircle, FaTimes } from 'react-icons/fa';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useUploadService } from '../services/UploadService';
import { myRooms, roomDetails } from '../api';
import { compressImages } from '../utils/imageCompression';

const UploadPhotos = () => {
  const { currentUser } = useAuth();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const toast = useToast();
  const { startUpload, getUploadsByRoom, attachCallbacks, cancelUpload } = useUploadService();

  const initialRoom = useMemo(() => location.state?.room || null, [location.state]);

  const [rooms, setRooms] = useState(initialRoom ? [initialRoom] : []);
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoom?.id || params.roomId || '');
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadToastId, setUploadToastId] = useState(null);
  const [currentUploadId, setCurrentUploadId] = useState(null);
  const restoredUploadRef = useRef(null);
  const lastToastUpdateRef = useRef(0);
  const completionTriggeredRef = useRef(false);

  useEffect(() => {
    const loadRooms = async () => {
      if (!currentUser || currentUser.role !== 'organizer') {
        setStatus('Only organizers can upload reference photos.');
        setLoading(false);
        return;
      }
      try {
        setStatus('');
        if (params.roomId && !initialRoom) {
          const room = await roomDetails(params.roomId);
          setRooms([room]);
          setSelectedRoomId(room.id);
        } else {
          const list = await myRooms();
          setRooms(list);
          if (!selectedRoomId && list.length > 0) {
            setSelectedRoomId(list[0].id);
          }
        }
      } catch (err) {
        setStatus(err.message || 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    };
    loadRooms();
  }, [currentUser, initialRoom, params.roomId, selectedRoomId]);

  // Check for active uploads when component mounts or room changes
  useEffect(() => {
    if (!selectedRoomId) {
      restoredUploadRef.current = null;
      return;
    }

    const checkActiveUploads = () => {
      const activeUploads = getUploadsByRoom(selectedRoomId);
      const activeUpload = activeUploads.find(u => u.status === 'uploading');
      
      // Only restore if we haven't already restored this upload
      if (activeUpload && restoredUploadRef.current !== activeUpload.id) {
        restoredUploadRef.current = activeUpload.id;
        
        // Restore upload state
        setCurrentUploadId(activeUpload.id);
        setSubmitting(true);
        setUploadProgress({
          uploaded: activeUpload.uploadedFiles,
          total: activeUpload.totalFiles,
          failed: activeUpload.failedFiles,
          progress: activeUpload.progress
        });

        // Create or restore toast
        const toastId = toast.loading(`Uploading ${activeUpload.uploadedFiles}/${activeUpload.totalFiles} photos...`, {
          persistent: true,
          progress: activeUpload.progress
        });
        setUploadToastId(toastId);

        // Re-attach callbacks
        attachCallbacks(
          activeUpload.id,
          // Progress callback
          (progress) => {
            setUploadProgress(progress);
            const message = `Uploading ${progress.uploaded}/${progress.total} photos${progress.failed > 0 ? ` (${progress.failed} failed)` : ''}...`;
            toast.progress(message, progress.progress, toastId);
          },
          // Complete callback
          (result) => {
            setSubmitting(false);
            setUploadProgress(null);
            setFiles([]);
            const successMsg = `Successfully uploaded ${result.uploaded} photo${result.uploaded === 1 ? '' : 's'}`;
            setStatus(`Success: ${successMsg}`);
            
            toast.success(successMsg, {
              duration: 5000
            });
            
            setTimeout(() => setStatus(''), 5000);
            setCurrentUploadId(null);
            restoredUploadRef.current = null;
          },
          // Error callback
          (error) => {
            setSubmitting(false);
            setUploadProgress(null);
            const errorMsg = error.message || 'Upload failed';
            setStatus(`Error: ${errorMsg}`);
            
            toast.error(errorMsg, {
              duration: 5000
            });
            setCurrentUploadId(null);
            restoredUploadRef.current = null;
          }
        );
      } else if (!activeUpload && restoredUploadRef.current) {
        // No active uploads, reset state
        restoredUploadRef.current = null;
        setCurrentUploadId(null);
        setSubmitting(false);
        setUploadProgress(null);
      }
    };

    checkActiveUploads();
    
    // Set up interval to check for progress updates
    const interval = setInterval(checkActiveUploads, 500);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) {
      toast.error('Select a room first');
      setStatus('Error: Select a room first');
      return;
    }
    if (files.length === 0) {
      toast.error('Choose at least one photo');
      setStatus('Error: Choose at least one photo');
      return;
    }
    
    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidTypes = files.filter(f => !allowedTypes.includes(f.type));
    if (invalidTypes.length > 0) {
      const errorMsg = `${invalidTypes.length} file(s) have invalid type. Only JPEG, PNG, GIF, and WebP are allowed`;
      toast.error(errorMsg);
      setStatus(`Error: ${errorMsg}`);
      return;
    }
    
    try {
      // Compress large images before upload
      setStatus('Compressing large images...');
      toast.info('Compressing large images for upload...', { duration: 2000 });
      
      const compressedFiles = await compressImages(files, {
        maxSizeMB: 9, // Compress to under 10MB for Cloudinary
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85
      });
      
      console.log('🚀 [Upload Page] Starting upload process:', {
        roomId: selectedRoomId,
        fileCount: compressedFiles.length,
        originalFiles: files.map(f => ({ name: f.name, size: `${(f.size / 1024 / 1024).toFixed(2)}MB` })),
        compressedFiles: compressedFiles.map(f => ({ name: f.name, size: `${(f.size / 1024 / 1024).toFixed(2)}MB` }))
      });
      
      completionTriggeredRef.current = false; // Reset completion flag for new upload
      setSubmitting(true);
      setStatus('Starting upload...');
      setUploadProgress({ uploaded: 0, total: compressedFiles.length, failed: 0, progress: 0 });
      
      // Create toast notification for upload progress
      const toastId = toast.loading(`Uploading 0/${compressedFiles.length} photos...`, {
        persistent: true,
        progress: 0
      });
      setUploadToastId(toastId);
      
      // Start background upload with compressed files
      const uploadId = await startUpload(
        selectedRoomId,
        compressedFiles,
        // Progress callback
        (progress) => {
          // Only log significant progress updates (every 10% or at completion)
          if (progress.progress % 10 === 0 || progress.progress >= 95) {
            console.log('📊 [Upload Page] Progress update:', {
              uploaded: progress.uploaded,
              total: progress.total,
              failed: progress.failed,
              progressPercent: progress.progress
            });
          }
          setUploadProgress(progress);
          
          // Fallback: If progress reaches 100%, trigger completion after a short delay
          if (progress.progress >= 100 && submitting && !completionTriggeredRef.current) {
            console.log('🔄 [Upload Page] Progress reached 100%, setting up completion fallback...', {
              progress: progress.progress,
              uploaded: progress.uploaded,
              total: progress.total,
              submitting: submitting,
              completionTriggered: completionTriggeredRef.current
            });
            completionTriggeredRef.current = true;
            
            // Use a shorter delay since upload is complete
            setTimeout(() => {
              // Always trigger navigation if progress is 100%
              // Don't check submitting state as it might have changed
              console.log('⏱️ [Upload Page] Fallback timer fired, triggering navigation...', {
                progress: progress.progress,
                uploaded: progress.uploaded,
                total: progress.total
              });
              
              console.log('✅ [Upload Page] Fallback: Upload complete, navigating...');
              setSubmitting(false);
              setUploadProgress(null);
              setFiles([]);
              toast.success(`Uploaded ${progress.uploaded} photo${progress.uploaded === 1 ? '' : 's'}! Face matching processing in background...`, {
                duration: 2000
              });
              setCurrentUploadId(null);
              
              // Navigate after short delay
              console.log('🔄 [Upload Page] Scheduling navigation to dashboard...');
              setTimeout(() => {
                console.log('🚀 [Upload Page] Navigating to dashboard NOW!');
                navigate('/dashboard');
              }, 1500);
            }, 1000); // 1 second delay
          }
          
          // Update toast - show "Processing..." when near completion to indicate backend is still working
          if (toastId && (progress.progress % 10 === 0 || progress.progress >= 90 || progress.progress >= 100)) {
            let message;
            if (progress.progress >= 90 && progress.progress < 100) {
              message = `Processing ${progress.uploaded}/${progress.total} photos... (finalizing)`;
            } else if (progress.progress >= 100) {
              message = `Upload complete! Processing face matching in background...`;
            } else {
              message = `Uploading ${progress.uploaded}/${progress.total} photos${progress.failed > 0 ? ` (${progress.failed} failed)` : ''}...`;
            }
            toast.progress(message, progress.progress, toastId);
          }
        },
        // Complete callback
        (result) => {
          console.log('🎉 [Upload Page] Upload completed successfully - completion callback triggered:', {
            uploaded: result.uploaded,
            total: result.total,
            failed: result.failed
          });
          
          completionTriggeredRef.current = true; // Mark as triggered so fallback doesn't fire
          setSubmitting(false);
          setUploadProgress(null);
          setFiles([]);
          const successMsg = `Successfully uploaded ${result.uploaded} photo${result.uploaded === 1 ? '' : 's'}. Face matching is running in background.`;
          setStatus(`Success: ${successMsg}`);
          
          // Update toast to success with background processing info
          toast.success(`Uploaded ${result.uploaded} photo${result.uploaded === 1 ? '' : 's'}! Face matching processing in background...`, {
            duration: 2000
          });
          
          setCurrentUploadId(null);
          
          // Automatically navigate to dashboard after 2 seconds
          console.log('⏱️ [Upload Page] Setting navigation timer (2 seconds)...');
          setTimeout(() => {
            console.log('🔄 [Upload Page] Auto-navigating to dashboard now...');
            navigate('/dashboard');
          }, 2000);
        },
        // Error callback
        (error) => {
          console.error('❌ [Upload Page] Upload error:', {
            error: error.message,
            errorName: error.name
          });
          setSubmitting(false);
          setUploadProgress(null);
          const errorMsg = error.message || 'Upload failed';
          setStatus(`Error: ${errorMsg}`);
          
          // Progress toast will be replaced by error toast
          toast.error(errorMsg, {
            duration: 5000
          });
          setCurrentUploadId(null);
        }
      );
      
      setCurrentUploadId(uploadId);
    } catch (err) {
      setSubmitting(false);
      setUploadProgress(null);
      const errorMsg = err.message || 'Upload failed';
      setStatus(`Error: ${errorMsg}`);
      toast.error(errorMsg);
    }
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-300 hover:text-white"
        >
          <FaArrowLeft /> Back to dashboard
        </Motion.button>

        <div className={`rounded-2xl border p-6 ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'}`}>
          <div className="flex items-center gap-3 mb-6">
            <FaCloudUploadAlt className="text-3xl text-sky-400" />
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">Organizer action</p>
              <h1 className="text-2xl font-bold">Upload room photos</h1>
              <p className="text-slate-400">Reference photos will be processed and indexed for face matching.</p>
            </div>
          </div>

          {status && (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              status.startsWith('Error:')
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                : status.startsWith('Success:')
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-slate-600 bg-slate-900/60 text-slate-200'
            }`}>
              {status}
            </div>
          )}

          {loading ? (
            <div className="text-slate-400">Loading rooms...</div>
          ) : (
            <form className="space-y-5" onSubmit={handleUpload}>
              {selectedRoom && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
                  <div className="font-semibold">{selectedRoom.name}</div>
                  <div>Room code: <span className="font-mono">{selectedRoom.code}</span></div>
                </div>
              )}

              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-300">
                  Photos
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    (Large files will be automatically compressed)
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  disabled={submitting}
                  className="w-full rounded-lg border border-dashed border-slate-600 bg-slate-900/30 px-4 py-6 text-center text-slate-400 focus:border-sky-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Files larger than 10MB will be automatically compressed to fit Cloudinary's free tier limits.
                </p>
                {files.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-slate-400">{files.length} file(s) selected</p>
                    {uploadProgress && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Progress: {uploadProgress.uploaded}/{uploadProgress.total} uploaded</span>
                          <span>{uploadProgress.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <Motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress.progress}%` }}
                            transition={{ duration: 0.3 }}
                            className="bg-sky-500 h-2 rounded-full"
                          />
                        </div>
                        {uploadProgress.failed > 0 && (
                          <p className="text-xs text-rose-400">{uploadProgress.failed} file(s) failed</p>
                        )}
                        {submitting && currentUploadId && (
                          <Motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              console.log('🚫 [Upload Page] User cancelled upload:', currentUploadId);
                              cancelUpload(currentUploadId);
                              setSubmitting(false);
                              setUploadProgress(null);
                              setCurrentUploadId(null);
                              toast.info('Upload cancelled');
                            }}
                            className="w-full mt-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-semibold transition-colors"
                          >
                            <FaTimes className="inline mr-2" />
                            Cancel Upload
                          </Motion.button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {!submitting && (
                  <button
                    type="submit"
                    disabled={submitting || !selectedRoomId}
                    className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-3 font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FaCloudUploadAlt /> Upload photos
                  </button>
                )}
                {submitting && (
                  <p className="text-xs text-center text-slate-400">
                    Upload in progress. You can navigate away - upload will continue in background.
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPhotos;

