import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { Camera, MapPin, Upload, X, AlertCircle } from 'lucide-react';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
import { CreateReportData, WasteType, UrgencyLevel } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          toast.success('Location detected successfully!');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Please select manually on the map.');
          setShowMap(true);
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
      setShowMap(true);
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
            
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? 'Drop the photo here' : 'Upload a photo'}
                </p>
                <p className="text-sm text-gray-600">
                  Drag and drop or click to select a photo of the waste
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Supports JPEG, PNG, GIF, WebP (max 5MB)
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
