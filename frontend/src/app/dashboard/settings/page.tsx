'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { userApi } from '@/lib/api';

export default function SettingsPage() {
  const { accessToken, user, setUser } = useAuthStore();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, [accessToken]);

  const fetchProfile = async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const result = await userApi.getProfile(accessToken);
      if (result.data?.user) {
        const profileUser = result.data.user;

        setProfile({
          name: profileUser.name || '',
          email: profileUser.email,
          phone: profileUser.phone || '',
          avatar: profileUser.avatar || '',
        });

        setUser({
          ...user,
          ...profileUser,
          avatar: profileUser.avatar || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 2MB' });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage({ type: '', text: '' });

    try {
      // Convert to base64 for preview and storage
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        // Update local state immediately for preview
        setProfile(prev => ({ ...prev, avatar: base64 }));

        // Save to backend
        const result = await userApi.updateProfile(accessToken, {
          name: profile.name,
          phone: profile.phone,
          avatar: base64,
        } as any);

        if (result.error) {
          setMessage({ type: 'error', text: result.error });
          // Revert on error
          setProfile(prev => ({ ...prev, avatar: '' }));
        } else {
          setMessage({ type: 'success', text: 'Avatar updated successfully' });
          setUser({
            ...user,
            ...(result.data?.user || {}),
            avatar: base64,
          });
        }
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to upload avatar' });
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!accessToken) return;

    setIsUploadingAvatar(true);
    try {
      const result = await userApi.updateProfile(accessToken, {
        name: profile.name,
        phone: profile.phone,
        avatar: '',
      } as any);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setProfile(prev => ({ ...prev, avatar: '' }));
        setMessage({ type: 'success', text: 'Avatar removed' });
        setUser({
          ...user,
          ...(result.data?.user || {}),
          avatar: '',
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove avatar' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await userApi.updateProfile(accessToken, {
        name: profile.name,
        phone: profile.phone,
      });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        setUser({
          ...user,
          ...(result.data?.user || {}),
          name: profile.name,
          phone: profile.phone,
          avatar: profile.avatar,
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Settings</h1>
        <p className="text-sm sm:text-base text-foreground-muted">
          Manage your profile and account preferences
        </p>
      </div>

      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-accent-green/10 border border-accent-green/20 text-accent-green'
              : 'bg-accent-red/10 border border-accent-red/20 text-accent-red'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {message.text}
        </motion.div>
      )}

      {/* Profile Settings */}
      <div className="card">
        <h2 className="text-base sm:text-lg font-semibold mb-6 flex items-center gap-2">
          <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="truncate">Profile Information</span>
        </h2>

        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-6 border-b border-border">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>

            {/* Upload overlay */}
            <label htmlFor="profile-avatar" className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {isUploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
              <input
                id="profile-avatar"
                name="avatar"
                aria-label="Upload profile photo"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={isUploadingAvatar}
              />
            </label>

            {/* Remove button */}
            {profile.avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                className="absolute -top-1 -right-1 w-6 h-6 bg-accent-red rounded-full flex items-center justify-center text-white hover:bg-accent-red/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-center sm:text-left">
            <h3 className="font-medium mb-1">Profile Photo</h3>
            <p className="text-sm text-foreground-muted mb-3">
              Click on the avatar to upload a new photo
            </p>
            <p className="text-xs text-foreground-subtle">
              JPG, PNG or GIF. Max 2MB.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs sm:text-sm font-medium mb-2">Name</label>
            <input
              id="profile-name"
              name="name"
              aria-label="Name"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="input"
              placeholder="Your name"
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-xs sm:text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground-subtle" />
              <input
                id="profile-email"
                name="email"
                aria-label="Email"
                type="email"
                value={profile.email}
                className="input pl-10 sm:pl-12 bg-background-elevated cursor-not-allowed text-sm"
                disabled
                readOnly
                autoComplete="email"
              />
            </div>
            <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          <div>
            <label htmlFor="profile-phone" className="block text-xs sm:text-sm font-medium mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground-subtle" />
              <input
                id="profile-phone"
                name="phone"
                aria-label="Phone number"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="input pl-10 sm:pl-12 text-sm"
                placeholder="+1234567890"
                autoComplete="tel"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary flex items-center gap-2 text-sm sm:text-base"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card border-accent-red/20">
        <h2 className="text-base sm:text-lg font-semibold mb-4 text-accent-red">Danger Zone</h2>
        <p className="text-sm sm:text-base text-foreground-muted mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          onClick={() => alert('Please contact support to delete your account.')}
          className="px-3 sm:px-4 py-2 border border-accent-red/50 text-accent-red text-sm sm:text-base rounded-lg hover:bg-accent-red/10 transition"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
