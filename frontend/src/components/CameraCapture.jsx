import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaCamera, FaTimes, FaSyncAlt, FaCheck } from 'react-icons/fa';

const CameraCapture = ({ onCapture, onClose, isOpen }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please ensure you have granted camera permissions.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          // Create preview URL
          const previewUrl = URL.createObjectURL(blob);
          setCapturedImage(previewUrl);
          
          // Store the file for later use
          setCapturedImage(prev => ({ ...prev, file, previewUrl }));
        }
      }, 'image/jpeg', 0.9);
    }
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const confirmCapture = useCallback(() => {
    if (capturedImage?.file) {
      onCapture(capturedImage.file);
      setCapturedImage(null);
      stopCamera();
      onClose();
    }
  }, [capturedImage, onCapture, onClose, stopCamera]);

  const retakePhoto = useCallback(() => {
    if (capturedImage?.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    setCapturedImage(null);
  }, [capturedImage]);

  const handleClose = useCallback(() => {
    if (capturedImage?.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    setCapturedImage(null);
    stopCamera();
    onClose();
  }, [capturedImage, stopCamera, onClose]);

  // Start camera when modal opens
  React.useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, startCamera, stopCamera, capturedImage]);

  // Restart camera when facing mode changes
  React.useEffect(() => {
    if (isOpen && isStreaming && !capturedImage) {
      startCamera();
    }
  }, [facingMode, isOpen, isStreaming, startCamera, capturedImage]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-slate-800 rounded-2xl overflow-hidden max-w-2xl w-full mx-4 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">
            {capturedImage ? 'Review Photo' : 'Take Photo for Face Matching'}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Camera/Preview Area */}
        <div className="relative">
          {capturedImage ? (
            // Preview captured image
            <div className="relative">
              <img
                src={capturedImage.previewUrl}
                alt="Captured"
                className="w-full h-auto max-h-96 object-cover"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={retakePhoto}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  <FaSyncAlt className="inline mr-2" />
                  Retake
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmCapture}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                >
                  <FaCheck className="inline mr-2" />
                  Use This Photo
                </motion.button>
              </div>
            </div>
          ) : (
            // Live camera feed
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-96 object-cover bg-slate-900"
              />
              
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <FaCamera className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-300">Starting camera...</p>
                  </div>
                </div>
              )}

              {/* Camera controls */}
              {isStreaming && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                  {/* Switch camera button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={switchCamera}
                    className="p-3 bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-full transition-colors"
                    title="Switch camera"
                  >
                    <FaSyncAlt className="h-5 w-5" />
                  </motion.button>

                  {/* Capture button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={capturePhoto}
                    className="p-4 bg-white hover:bg-gray-100 text-slate-900 rounded-full transition-colors shadow-lg"
                  >
                    <FaCamera className="h-6 w-6" />
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        {!capturedImage && (
          <div className="p-4 bg-slate-700/50 text-center">
            <p className="text-slate-300 text-sm">
              Position your face in the frame and click the camera button to capture
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CameraCapture;
