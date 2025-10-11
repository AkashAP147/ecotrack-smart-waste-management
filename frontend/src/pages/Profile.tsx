import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { User, Phone, Mail, Shield, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ProfileFormData {
  name: string;
  phone: string;
  fcmToken?: string;
}

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      fcmToken: user?.fcmToken || '',
    },
  });

  const updateProfileMutation = useMutation(
    (data: ProfileFormData) => apiService.updateProfile(data),
    {
      onSuccess: (response) => {
        if (response.success) {
          updateUser(response.data.user);
          toast.success('Profile updated successfully!');
          setIsEditing(false);
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      },
    }
  );

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    reset({
      name: user?.name || '',
      phone: user?.phone || '',
      fcmToken: user?.fcmToken || '',
    });
    setIsEditing(false);
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'badge-danger',
      collector: 'badge-warning',
      user: 'badge-primary',
    };
    return badges[role as keyof typeof badges] || 'badge-secondary';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-primary-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`badge ${getRoleBadge(user?.role || 'user')}`}>
                  {user?.role}
                </span>
                {user?.isVerified && (
                  <span className="badge badge-success">Verified</span>
                )}
                {user?.isActive ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-danger">Inactive</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Profile Information
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-outline btn-sm"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="form-label">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('name', {
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                    type="text"
                    className="form-input pl-10"
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.name && (
                  <p className="form-error">{errors.name.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="form-label">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^\+?[\d\s-()]+$/,
                        message: 'Please enter a valid phone number',
                      },
                    })}
                    type="tel"
                    className="form-input pl-10"
                    placeholder="Enter your phone number"
                  />
                </div>
                {errors.phone && (
                  <p className="form-error">{errors.phone.message}</p>
                )}
              </div>

              {/* FCM Token (hidden field for notifications) */}
              <input
                {...register('fcmToken')}
                type="hidden"
              />

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="btn btn-primary flex-1"
                >
                  {updateProfileMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Email (read-only) */}
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="form-input pl-10 bg-gray-50"
                    disabled
                  />
                </div>
                <p className="form-help">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              {/* Name (read-only) */}
              <div>
                <label className="form-label">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={user?.name || ''}
                    className="form-input pl-10 bg-gray-50"
                    disabled
                  />
                </div>
              </div>

              {/* Phone (read-only) */}
              <div>
                <label className="form-label">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={user?.phone || ''}
                    className="form-input pl-10 bg-gray-50"
                    disabled
                  />
                </div>
              </div>

              {/* Role (read-only) */}
              <div>
                <label className="form-label">Account Type</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || ''}
                    className="form-input pl-10 bg-gray-50"
                    disabled
                  />
                </div>
                <p className="form-help">
                  Contact an administrator to change your account type.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Statistics */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            Account Information
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Member Since</label>
              <p className="text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 'Unknown'}
              </p>
            </div>
            
            <div>
              <label className="form-label">Last Updated</label>
              <p className="text-gray-900">
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 'Unknown'}
              </p>
            </div>

            <div>
              <label className="form-label">Verification Status</label>
              <p className="text-gray-900">
                {user?.isVerified ? (
                  <span className="text-green-600 font-medium">✓ Verified</span>
                ) : (
                  <span className="text-yellow-600 font-medium">⚠ Pending Verification</span>
                )}
              </p>
            </div>

            <div>
              <label className="form-label">Account Status</label>
              <p className="text-gray-900">
                {user?.isActive ? (
                  <span className="text-green-600 font-medium">✓ Active</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Inactive</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <div className="card-header border-red-200">
          <h2 className="text-lg font-semibold text-red-900">
            Danger Zone
          </h2>
        </div>
        <div className="card-body">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              Delete Account
            </h3>
            <p className="text-sm text-red-700 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="btn btn-danger btn-sm">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
