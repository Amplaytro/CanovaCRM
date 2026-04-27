import { useState, useEffect } from 'react';
import api from '../../api/axios';
import './Settings.css';

const Settings = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/settings/profile');
      setFormData({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        email: res.data.email || '',
        password: '',
        confirmPassword: '',
      });
    } catch (fetchError) {
      console.error('Fetch profile error:', fetchError);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.put('/settings/profile', updateData);
      setMessage('Profile updated successfully');
      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (updateError) {
      setError(updateError.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page" id="settings-page">
      <div className="settings-breadcrumb">
        <span className="breadcrumb-home">Home</span>
        <span className="breadcrumb-sep">&rsaquo;</span>
        <span className="breadcrumb-active">Settings</span>
      </div>

      <div className="settings-card">
        <div className="settings-tab-header">
          <span className="settings-tab active">Edit Profile</span>
        </div>
        <div className="settings-divider"></div>

        <form onSubmit={handleSubmit} className="settings-form" id="settings-form">
          {message && <div className="settings-success">{message}</div>}
          {error && <div className="settings-error">{error}</div>}

          <div className="settings-field">
            <label htmlFor="settings-firstName">First name</label>
            <input
              type="text"
              id="settings-firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>

          <div className="settings-field">
            <label htmlFor="settings-lastName">Last name</label>
            <input
              type="text"
              id="settings-lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="settings-field">
            <label htmlFor="settings-email">Email</label>
            <input
              type="email"
              id="settings-email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="settings-field">
            <label htmlFor="settings-password">Password</label>
            <input
              type="password"
              id="settings-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="************"
            />
          </div>

          <div className="settings-field">
            <label htmlFor="settings-confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="settings-confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="************"
            />
          </div>
        </form>

        <div className="settings-form-footer">
          <button
            type="submit"
            form="settings-form"
            className="settings-save-btn"
            disabled={loading}
            id="btn-update-settings"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
