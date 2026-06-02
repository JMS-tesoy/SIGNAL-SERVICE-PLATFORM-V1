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

const MAX_AVATAR_SOURCE_SIZE = 5 * 1024 * 1024;
const MAX_AVATAR_DATA_URL_LENGTH = 450000;
const AVATAR_MAX_DIMENSION = 512;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_ACCEPT_TYPES = ALLOWED_AVATAR_TYPES.join(',');

const formatFileSize = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file'));
    };

    image.src = objectUrl;
  });
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Failed to optimize image'));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read optimized image'));
    reader.readAsDataURL(blob);
  });
};

const optimizeAvatar = async (file: File) => {
  const image = await loadImage(file);
  const largestSide = Math.max(image.width, image.height);
  const initialScale = Math.min(1, AVATAR_MAX_DIMENSION / largestSide);
  let width = Math.max(1, Math.round(image.width * initialScale));
  let height = Math.max(1, Math.round(image.height * initialScale));
  const qualitySteps = [0.82, 0.72, 0.62, 0.52];

  while (width >= 128 && height >= 128) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Image optimization is not supported in this browser');
    }

    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, 'image/webp', quality);
      const dataUrl = await blobToDataUrl(blob);

      if (dataUrl.length <= MAX_AVATAR_DATA_URL_LENGTH) {
        return dataUrl;
      }
    }

    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }

  throw new Error('Image is too large to optimize for an avatar');
};

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
  const [avatarPreview, setAvatarPreview] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile({ showLoading: true });
  }, [accessToken]);

  const fetchProfile = async ({ showLoading = false } = {}) => {
    if (!accessToken) {
      if (showLoading) {
        setIsLoading(false);
      }
      return;
    }
    if (showLoading) {
      setIsLoading(true);
      setMessage({ type: '', text: '' });
    }

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

        return profileUser;
      }

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile.' });
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a JPG, PNG, or WebP image' });
      e.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SOURCE_SIZE) {
      setMessage({
        type: 'error',
        text: `Image must be ${formatFileSize(MAX_AVATAR_SOURCE_SIZE)} or smaller`,
      });
      e.target.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    setMessage({ type: '', text: '' });
    setAvatarPreview('');

    try {
      const optimizedAvatar = await optimizeAvatar(file);

      setAvatarPreview(optimizedAvatar);

      const result = await userApi.uploadAvatar(accessToken, optimizedAvatar);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        if (result.data?.user) {
          const uploadedUser = result.data.user;
          setProfile(prev => ({ ...prev, avatar: uploadedUser.avatar || '' }));
          setUser({
            ...user,
            ...uploadedUser,
            avatar: uploadedUser.avatar || '',
          });
        }

        await fetchProfile();
        setMessage({ type: 'success', text: 'Profile photo updated' });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to upload avatar';
      setMessage({ type: 'error', text: error });
    } finally {
      setIsUploadingAvatar(false);
      setAvatarPreview('');
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!accessToken) return;

    setIsUploadingAvatar(true);
    try {
      const result = await userApi.removeAvatar(accessToken);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        await fetchProfile();
        setMessage({ type: 'success', text: 'Avatar removed' });
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
          {message.type === 'error' && (
            <button
              type="button"
              onClick={() => fetchProfile({ showLoading: true })}
              className="ml-auto rounded-lg border border-current/30 px-3 py-1 text-xs hover:bg-background/20"
            >
              Retry
            </button>
          )}
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
              {avatarPreview || profile.avatar ? (
                <img
                  src={avatarPreview || profile.avatar}
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
                accept={AVATAR_ACCEPT_TYPES}
                onChange={handleAvatarChange}
                className="hidden"
                disabled={isUploadingAvatar}
              />
            </label>

            {/* Remove button */}
            {profile.avatar && !avatarPreview && (
              <button
                type="button"
                aria-label="Remove profile photo"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                className="absolute -top-1 -right-1 w-6 h-6 bg-accent-red rounded-full flex items-center justify-center text-white opacity-0 pointer-events-none transition-all hover:bg-accent-red/80 group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
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
              JPG, PNG, or WebP. Max {formatFileSize(MAX_AVATAR_SOURCE_SIZE)}. Optimized before saving.
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
