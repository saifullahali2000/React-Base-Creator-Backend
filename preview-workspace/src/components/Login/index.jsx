import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { loginUser } from '../../api/auth';
import './index.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser(email, password);
      if (response.success) {
        login(response.data.jwttoken, response.data.user);
        navigate('/', { replace: true });
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='login-container'>
      <div className='login-card'>
        <div className='login-header'>
          <h1 className='login-title'>Transaction Manager</h1>
          <p className='login-subtitle'>Sign in to your account</p>
        </div>
        <form className='login-form' onSubmit={handleSubmit}>
          <div className='form-group'>
            <label htmlFor='email' className='form-label'>
              Email Address
            </label>
            <input
              id='email'
              type='email'
              className='form-input'
              placeholder='you@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className='form-group'>
            <label htmlFor='password' className='form-label'>
              Password
            </label>
            <input
              id='password'
              type='password'
              className='form-input'
              placeholder='Enter your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <div className='error-message'>{error}</div>}
          <button type='submit' className='login-button' disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;