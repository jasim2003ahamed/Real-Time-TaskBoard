import React from 'react';
import { ConnectionStatus } from '../types';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  onlineCount: number;
}

export const Header: React.FC<HeaderProps> = ({ connectionStatus, onlineCount }) => {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon"></span>
          SyncBoard
        </div>
      </div>
      
      <div className="status-indicators">
        {/* Connection Status Pill */}
        <div className={`pill pill-status ${connectionStatus}`}>
          <span className="status-dot"></span>
          {connectionStatus === 'connected' && 'Connected'}
          {connectionStatus === 'reconnecting' && 'Reconnecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected'}
        </div>

        {/* Presence Count Pill */}
        <div className="pill pill-presence">
          <span>👥</span>
          <span>{onlineCount} {onlineCount === 1 ? 'user' : 'users'} active</span>
        </div>
      </div>
    </header>
  );
};
