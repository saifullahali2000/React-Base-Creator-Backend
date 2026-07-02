import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './index.css';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className='app-header'>
      <div className='header-container'>
        <div className='header-logo'>
          <h2 className='logo-text'>Transaction Manager</h2>
        </div>
        <div className='header-actions'>
          <div className='user-info'>
            <span className='user-name'>{user?.name}</span>
            <span className='user-role'>{user?.role}</span>
          </div>
          <button className='logout-button' onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;