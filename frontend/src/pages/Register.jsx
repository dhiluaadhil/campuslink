import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import TagPicker from '../components/TagPicker';
import api from '../api/axios';
import toast from 'react-hot-toast';

const EDU_RE = /\.edu$/i;

function validateEmail(email) {
  if (!email.includes('@')) return 'Enter a valid email';
  const domain = email.split('@')[1] || '';
  if (!EDU_RE.test(domain)) return 'Only .edu college emails are allowed';
  return null;
}

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '', email: '', password: '', college: '', bio: '',
  });
  const [interests, setInterests] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isAuthenticated) navigate('/'); }, [isAuthenticated]);

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get('/auth/tags').then((r) => r.data),
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (form.username.length < 3) errs.username = 'Min 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Letters, numbers, underscores only';
    const emailErr = validateEmail(form.email);
    if (emailErr) errs.email = emailErr;
    if (form.password.length < 8) errs.password = 'Min 8 characters';
    if (!form.college.trim()) errs.college = 'Enter your college name';
    if (interests.length < 3) errs.interests = 'Select at least 3 interests';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await register({ ...form, interests });
      toast.success('Welcome to CampusLink! 🎉');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error;
      toast.error(typeof msg === 'string' ? msg : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card slide-up" style={{ maxWidth: 560 }}>
        <div className="auth-logo">CampusLink</div>
        <p className="auth-subtitle">Your college social network — join the community</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" placeholder="coolstudent" value={form.username} onChange={set('username')} />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">College</label>
              <input className="form-input" placeholder="MIT" value={form.college} onChange={set('college')} />
              {errors.college && <span className="form-error">{errors.college}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">College Email (.edu)</label>
            <input className="form-input" type="email" placeholder="you@university.edu" value={form.email} onChange={set('email')} />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Bio (optional)</label>
            <textarea className="form-input" placeholder="Tell us about yourself…" value={form.bio} onChange={set('bio')} style={{ minHeight: 70 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Your Interests (pick at least 3)</label>
            <TagPicker tags={tags} selected={interests} onChange={setInterests} min={3} />
            {errors.interests && <span className="form-error">{errors.interests}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account 🚀'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
