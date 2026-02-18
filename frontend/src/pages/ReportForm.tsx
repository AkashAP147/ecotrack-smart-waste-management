import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useMutation } from 'react-query';
import { Camera, Upload, MapPin, X, AlertTriangle, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  isMobileDevice, 
  isSecureContext, 
  checkCameraSupport, 
  checkLocationSupport, 
  getMobileInstructions,
  createFileInput
} from '@/utils/mobileUtils';
import { CreateReportData, WasteType, UrgencyLevel } from '@/types';
import MapPicker from '@/components/MapPicker';

interface FormData {
  description: string;
  wasteType: WasteType;
  urgency: UrgencyLevel;
  address: string;
  estimatedQuantity: string;
}

const ReportForm = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      wasteType: 'other',
      urgency: 'medium',
    },
  });

  const createReportMutation = useMutation(
    (data: CreateReportData) => apiService.createReport(data),
    {
      onSuccess: () => {
        toast.success('Report created successfully!');
        navigate('/reports');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create report');
      },
    }
  );

  // Check mobile and security context on component mount
  useEffect(() => {
    const mobile = isMobileDevice();
    const secure = isSecureContext();
    
    setIsMobile(mobile);
    setIsSecure(secure);
    
    // Show warning if mobile and not secure
    if (mobile && !secure) {
      setShowMobileWarning(true);
      toast.error(
        'Camera and location may not work on mobile without HTTPS. Use file upload instead.',
        { duration: 8000 }
      );
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const getCurrentLocation = () => {
    // Check location support using mobile utilities
    const locationSupport = checkLocationSupport();
    
    if (!locationSupport.supported) {
      toast.error(locationSupport.reason || 'Location not supported');
      if (isMobile && !isSecure) {
        toast.error(getMobileInstructions(), { duration: 10000 });
      }
      setShowMap(true);
      return;
    }
    
    // Show loading toast with mobile-specific instructions
    const loadingToast = toast.loading(
      isMobile 
        ? 'Getting location... If prompted, tap "Allow" for location access. This may take 10-30 seconds on mobile.'
        : 'Getting your location... Please allow location access when prompted.'
    );

    // Enhanced options for mobile devices
    const options = {
      enableHighAccuracy: true, // Always request high accuracy for best GPS precision
      timeout: isMobile ? 45000 : 15000, // Longer timeout for mobile
      maximumAge: isMobile ? 600000 : 300000 // Accept older cached position on mobile
    };

    // Try to get location without permission check first (some browsers block the permission API)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('Location obtained:', { latitude, longitude, accuracy });
        
        setLocation({ lat: latitude, lng: longitude });
        
        // Reverse geocode to get address
        reverseGeocode(latitude, longitude);
        
        toast.dismiss(loadingToast);
        toast.success(`Location detected! (Accuracy: ${Math.round(accuracy)}m)`);
      },
      (error) => {
        toast.dismiss(loadingToast);
        console.error('Geolocation error:', error);
        
        let errorMessage = '';
        let instructions = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was blocked. ';
            if (isMobile) {
              instructions = 'On mobile: Go to browser settings → Site permissions → Allow location for this site. Then refresh and try again.';
            } else {
              instructions = 'Click the location icon in your browser address bar and select "Allow".';
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location not available. ';
            instructions = isMobile 
              ? 'Make sure GPS is enabled in your phone settings and try going outside for better signal.'
              : 'Please check your location services and try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. ';
            instructions = isMobile
              ? 'This is common on mobile. Try going outside or near a window for better GPS signal.'
              : 'Please try again.';
            break;
          default:
            errorMessage = 'Location error occurred. ';
            instructions = 'Please enter your location manually below.';
            break;
        }
        
        toast.error(errorMessage + instructions, { duration: 8000 });
        setShowMap(true);
      },
      options
    );
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Use a simple reverse geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        setValue('address', data.display_name);
      } else if (data && (data.locality || data.city)) {
        const address = [
          data.locality || data.city,
          data.principalSubdivision,
          data.countryName
        ].filter(Boolean).join(', ');
        setValue('address', address);
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Don't show error to user, just log it
    }
  };

  const startCamera = async () => {
    // Check camera support using mobile utilities
    const cameraSupport = await checkCameraSupport();
    
    if (!cameraSupport.supported) {
      toast.error(cameraSupport.reason || 'Camera not supported');
      if (isMobile && !isSecure) {
        toast.error(getMobileInstructions(), { duration: 10000 });
      }
      return;
    }

    // Show loading message with mobile-specific instructions
    const loadingToast = toast.loading(
      isMobile 
        ? 'Starting camera... Tap "Allow" when prompted. This may take a few seconds on mobile.'
        : 'Starting camera... Please allow camera access when prompted.'
    );

    try {

      // Mobile-optimized camera configurations
      let mediaStream;
      
      if (isMobile) {
        // Mobile-specific camera settings
        try {
          // Try back camera first (better for taking photos of objects)
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment', // Back camera
              width: { ideal: 640, max: 1280 }, // Lower resolution for mobile
              height: { ideal: 480, max: 720 }
            }
          });
        } catch (backCameraError) {
          console.log('Back camera failed, trying front camera:', backCameraError);
          try {
            // Fallback to front camera
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'user', // Front camera
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 }
              }
            });
          } catch (frontCameraError) {
            console.log('Front camera failed, trying basic video:', frontCameraError);
            // Last resort - basic video
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true
            });
          }
        }
      } else {
        // Desktop camera settings
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 }
            }
          });
        } catch (desktopError) {
          // Fallback for desktop
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
      }

      setStream(mediaStream);
      setShowCamera(true);
      toast.dismiss(loadingToast);
      toast.success('Camera started! Position the waste item and tap the camera button to capture.');
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.dismiss(loadingToast);
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      let errorMessage = '';
      let instructions = '';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access was denied. ';
        if (isMobile) {
          instructions = 'On mobile: Go to browser settings → Site permissions → Allow camera for this site. Then refresh and try again.';
        } else {
          instructions = 'Click the camera icon in your browser address bar and select "Allow".';
        }
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found. ';
        instructions = isMobile 
          ? 'Make sure no other apps are using the camera and try again.'
          : 'Please check your camera connection and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported. ';
        instructions = 'Please use the file upload option instead.';
      } else {
        errorMessage = 'Camera error occurred. ';
        instructions = 'Please try the file upload option instead.';
      }
      
      toast.error(errorMessage + instructions, { duration: 8000 });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFile(file);
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          stopCamera();
          toast.success('Photo captured successfully!');
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedFile) {
      toast.error('Please select a photo');
      return;
    }

    if (!location) {
      toast.error('Please select a location');
      return;
    }

    const reportData: CreateReportData = {
      photo: selectedFile,
      lat: location.lat,
      lng: location.lng,
      description: data.description,
      wasteType: data.wasteType,
      urgency: data.urgency,
      address: data.address,
      estimatedQuantity: data.estimatedQuantity,
    };

    createReportMutation.mutate(reportData);
  };

  const wasteTypes: { value: WasteType; label: string }[] = [
    { value: 'organic', label: 'Organic Waste' },
    { value: 'plastic', label: 'Plastic' },
    { value: 'paper', label: 'Paper & Cardboard' },
    { value: 'metal', label: 'Metal' },
    { value: 'glass', label: 'Glass' },
    { value: 'electronic', label: 'Electronic Waste' },
    { value: 'hazardous', label: 'Hazardous Waste' },
    { value: 'mixed', label: 'Mixed Waste' },
    { value: 'other', label: 'Other' },
  ];

  const urgencyLevels: { value: UrgencyLevel; label: string; description: string }[] = [
    { value: 'low', label: 'Low', description: 'Can wait a few days' },
    { value: 'medium', label: 'Medium', description: 'Should be collected soon' },
    { value: 'high', label: 'High', description: 'Needs attention within 24 hours' },
    { value: 'critical', label: 'Critical', description: 'Immediate attention required' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Mobile Warning Banner */}
      {showMobileWarning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                <Smartphone className="w-4 h-4 inline mr-1" />
                Mobile Device Detected
              </h3>
              <p className="text-sm text-yellow-700 mb-2">
                Camera and location features may not work properly on mobile devices without HTTPS.
              </p>
              <div className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
                <strong>Alternative:</strong> Use the "Upload File" option to select photos from your gallery instead of taking new photos.
              </div>
              <button
                onClick={() => setShowMobileWarning(false)}
                className="mt-2 text-xs text-yellow-600 hover:text-yellow-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">
            Create Waste Report
          </h1>
          <p className="text-gray-600 mt-1">
            Help keep your community clean by reporting waste that needs collection.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-6">
          {/* Photo Upload */}
          <div>
            <label className="form-label">
              Photo <span className="text-red-500">*</span>
            </label>
            
            {!selectedFile && !showCamera ? (
              <div className="space-y-4">
                {/* Camera and Upload Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn btn-primary flex items-center justify-center p-6 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-500 transition-colors"
                  >
                    <Camera className="w-8 h-8 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">Take Photo</p>
                      <p className="text-sm opacity-75">Use camera to capture</p>
                    </div>
                  </button>
                  
                  <div
                    {...getRootProps()}
                    className={`flex items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isDragActive
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="w-8 h-8 mr-3 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">
                        {isDragActive ? 'Drop here' : 'Upload File'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Select from gallery
                      </p>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  Supports JPEG, PNG, GIF, WebP (max 5MB)
                </p>
              </div>
            ) : showCamera ? (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    id="camera-video"
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                    ref={(video) => {
                      if (video && stream) {
                        video.srcObject = stream;
                      }
                    }}
                  />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-white text-gray-900 p-3 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Position the waste in the camera view and tap the camera button to capture
                </p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="form-label">
              Location <span className="text-red-500">*</span>
            </label>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="btn btn-primary flex-1"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="btn btn-outline flex-1"
                >
                  Select on Map
                </button>
              </div>
              
              {location && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Location selected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="form-label">
              Address (Optional)
            </label>
            <input
              {...register('address')}
              type="text"
              className="form-input"
              placeholder="Enter street address or landmark"
            />
            <p className="form-help">
              Provide additional location details to help collectors find the waste.
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="form-label">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description', {
                required: 'Description is required',
                minLength: {
                  value: 10,
                  message: 'Description must be at least 10 characters',
                },
                maxLength: {
                  value: 500,
                  message: 'Description cannot exceed 500 characters',
                },
              })}
              className="form-textarea"
              rows={4}
              placeholder="Describe the waste situation in detail..."
            />
            {errors.description && (
              <p className="form-error">{errors.description.message}</p>
            )}
          </div>

          {/* Waste Type */}
          <div>
            <label htmlFor="wasteType" className="form-label">
              Waste Type
            </label>
            <select {...register('wasteType')} className="form-select">
              {wasteTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="form-help">
              Our AI will also try to identify the waste type from your photo.
            </p>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="form-label">Urgency Level</label>
            <div className="space-y-3">
              {urgencyLevels.map((level) => (
                <label key={level.value} className="flex items-start space-x-3">
                  <input
                    {...register('urgency')}
                    type="radio"
                    value={level.value}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{level.label}</span>
                      <span className={`badge urgency-${level.value}`}>
                        {level.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{level.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Estimated Quantity */}
          <div>
            <label htmlFor="estimatedQuantity" className="form-label">
              Estimated Quantity (Optional)
            </label>
            <input
              {...register('estimatedQuantity')}
              type="text"
              className="form-input"
              placeholder="e.g., 2-3 bags, 1 large bin, handful of bottles"
            />
            <p className="form-help">
              Help collectors prepare by estimating the amount of waste.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createReportMutation.isLoading}
              className="btn btn-primary flex-1"
            >
              {createReportMutation.isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating Report...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Select Location
                  </h3>
                  <button
                    onClick={() => setShowMap(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="h-96">
                  <MapPicker
                    onLocationSelect={(lat, lng) => {
                      setLocation({ lat, lng });
                      setShowMap(false);
                      toast.success('Location selected successfully!');
                    }}
                    initialLocation={location}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportForm;
