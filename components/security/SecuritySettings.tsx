'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function SecuritySettings() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  // Email change state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Sessions state
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    setEmailLoading(true);
    setEmailMessage('');

    try {
      const res = await fetch('/api/account/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });

      if (res.ok) {
        setEmailMessage(t('security.email_updated'));
        setShowEmailForm(false);
        setNewEmail('');
      } else {
        const data = await res.json();
        setEmailMessage(data.error || t('auth.error'));
      }
    } catch {
      setEmailMessage(t('auth.error'));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword.length < 8) {
      setPasswordError(t('security.password_min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('security.password_mismatch'));
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordMessage(t('security.password_updated'));
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordError(t('auth.error'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOutAll = async () => {
    setSessionLoading(true);
    setSessionMessage('');
    try {
      await supabase.auth.signOut({ scope: 'global' });
      setSessionMessage(t('security.signed_out_all'));
      // After global sign out, redirect to login
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch {
      setSessionMessage(t('auth.error'));
    } finally {
      setSessionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleteLoading(true);
    setDeleteMessage('');

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteInput }),
      });

      if (res.ok) {
        setDeleteMessage(t('security.account_deleted'));
        setTimeout(() => {
          signOut();
        }, 1500);
      } else {
        const data = await res.json();
        setDeleteMessage(data.error || t('auth.error'));
      }
    } catch {
      setDeleteMessage(t('auth.error'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '-';

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browserInfo = (() => {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    return 'Unknown Browser';
  })();

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-xl font-bold text-gray-900">{t('security.title')}</h2>

      <div className="space-y-6">
        {/* Section 1: Email & Authentication */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            {t('security.email_section')}
          </h3>

          <div className="mb-3">
            <p className="text-xs text-gray-500">{t('security.current_email')}</p>
            <p className="text-sm font-medium text-gray-900">{user?.email || '-'}</p>
          </div>

          {!showEmailForm ? (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('security.change_email')}
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="sec-new-email"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  {t('security.new_email')}
                </label>
                <input
                  id="sec-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('security.new_email_placeholder')}
                  className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={emailLoading || !newEmail}
                  className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {emailLoading ? t('security.updating') : t('security.change_email')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setNewEmail('');
                  }}
                  className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {emailMessage && <p className="mt-2 text-sm text-green-600">{emailMessage}</p>}
        </div>

        {/* Section 2: Password */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-gray-900">
            {t('security.password_section')}
          </h3>
          <p className="mb-3 text-xs text-gray-500">{t('security.password_description')}</p>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="sec-new-password"
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                {t('security.new_password')}
              </label>
              <input
                id="sec-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                  setPasswordMessage('');
                }}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="sec-confirm-password"
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                {t('security.confirm_password')}
              </label>
              <input
                id="sec-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                  setPasswordMessage('');
                }}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-green-600">{passwordMessage}</p>}

            <button
              type="button"
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {passwordLoading ? t('security.updating') : t('security.set_password')}
            </button>
          </div>
        </div>

        {/* Section 3: Active Sessions */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            {t('security.sessions_section')}
          </h3>

          <div className="mb-4 rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-900">{t('security.current_session')}</p>
            <p className="text-xs text-gray-500">{browserInfo}</p>
            <p className="mt-1 text-xs text-gray-500">
              {t('security.last_sign_in')}: {lastSignIn}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOutAll}
            disabled={sessionLoading}
            className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {sessionLoading ? t('security.updating') : t('security.sign_out_all')}
          </button>

          {sessionMessage && <p className="mt-2 text-sm text-green-600">{sessionMessage}</p>}
        </div>

        {/* Section 4: Danger Zone */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-red-900">{t('security.danger_zone')}</h3>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="min-h-[44px] rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              {t('security.delete_account')}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-700">{t('security.delete_confirm')}</p>
              <label htmlFor="sec-delete-confirm" className="sr-only">
                {t('security.delete_confirm')}
              </label>
              <input
                id="sec-delete-confirm"
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={t('security.delete_placeholder')}
                className="min-h-[44px] w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteInput !== 'DELETE'}
                  className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? t('security.updating') : t('security.delete_account')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteInput('');
                  }}
                  className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {t('common.cancel')}
                </button>
              </div>

              {deleteMessage && <p className="text-sm text-red-600">{deleteMessage}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
