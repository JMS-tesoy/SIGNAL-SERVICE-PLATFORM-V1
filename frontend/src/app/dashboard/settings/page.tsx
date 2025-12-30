'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Key,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Camera,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { userApi } from '@/lib/api';

export default function SettingsPage() {
  const { accessToken, user, setUser, logout } = useAuthStore();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
  });
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
    fetchSessions();
  }, [accessToken]);

  const fetchProfile = async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const result = await userApi.getProfile(accessToken);
      if (result.data?.user) {
        setProfile({
          name: result.data.user.name || '',
          email: result.data.user.email,
          phone: result.data.user.phone || '',
          avatar: result.data.user.avatar || '',
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
          if (user) {
            setUser({ ...user, avatar: base64 });
          }
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
        if (user) {
          setUser({ ...user, avatar: '' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove avatar' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const fetchSessions = async () => {
    if (!accessToken) return;

    try {
      const result = await userApi.getSessions(accessToken);
      if (result.data?.sessions) {
        setSessions(result.data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
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
        if (user) {
          setUser({ ...user, name: profile.name });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwords.new.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setIsChangingPassword(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await userApi.changePassword(accessToken, passwords.current, passwords.new);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswords({ current: '', new: '', confirm: '' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!accessToken) return;
    if (!confirm('This will log you out of all other devices. Continue?')) return;

    try {
      await userApi.revokeAllSessions(accessToken);
      fetchSessions();
      setMessage({ type: 'success', text: 'All other sessions have been revoked' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to revoke sessions' });
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
            <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {isUploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
              <input
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
            <label className="block text-xs sm:text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="input"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground-subtle" />
              <input
                type="email"
                value={profile.email}
                className="input pl-10 sm:pl-12 bg-background-elevated cursor-not-allowed text-sm"
                disabled
              />
            </div>
            <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground-subtle" />
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="input pl-10 sm:pl-12 text-sm"
                placeholder="+1234567890"
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

      {/* Change Password */}
      <div className="card">
        <h2 className="text-base sm:text-lg font-semibold mb-6 flex items-center gap-2">
          <Key className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="truncate">Change Password</span>
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                className="input pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="input text-sm"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">Confirm New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="input text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="btn-primary flex items-center gap-2 text-sm sm:text-base"
          >
            {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Change Password
          </button>
        </form>
      </div>

      {/* Active Sessions */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="truncate">Active Sessions</span>
          </h2>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllSessions}
              className="text-accent-red text-xs sm:text-sm hover:underline whitespace-nowrap"
            >
              Revoke All Other Sessions
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.map((session, i) => (
            <div
              key={session.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-background-elevated rounded-xl gap-2"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">
                  {session.userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop'}
                  {i === 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-accent-green/10 text-accent-green text-xs rounded whitespace-nowrap">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-xs sm:text-sm text-foreground-muted truncate">
                  {session.ipAddress} • {new Date(session.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
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
