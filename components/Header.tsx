
import React from 'react';
import { View } from '../types';

interface HeaderProps {
  onViewChange: (view: View) => void;
  currentView: View;
  isTeamsConnected: boolean;
  onTeamsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onViewChange, currentView, isTeamsConnected, onTeamsClick }) => {
  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-gray-100 py-5 px-8 sticky top-0 z-[100]">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div 
          onClick={() => onViewChange('NEW')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">MeetingMind</h1>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Autopilot Agent</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => onViewChange('NEW')}
              className={`text-sm font-bold tracking-tight transition-all ${currentView === 'NEW' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-900'}`}
            >
              Studio
            </button>
            <button 
              onClick={() => onViewChange('HISTORY')}
              className={`text-sm font-bold tracking-tight transition-all ${currentView === 'HISTORY' || currentView === 'DETAIL' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-900'}`}
            >
              Vault
            </button>
          </div>

          <div className="h-4 w-px bg-gray-100 hidden md:block"></div>

          <button 
            onClick={onTeamsClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              isTeamsConnected 
                ? 'bg-[#6264A7]/10 border-[#6264A7]/20 text-[#6264A7]' 
                : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.5 8.5C21.5 8.22386 21.2761 8 21 8H11.5C11.2239 8 11 8.22386 11 8.5V15.5C11 15.7761 11.2239 16 11.5 16H21C21.2761 16 21.5 15.7761 21.5 15.5V8.5Z" />
              <path d="M9 7H3.5C3.22386 7 3 7.22386 3 7.5V14.5C3 14.7761 3.22386 15 3.5 15H9V7Z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
              {isTeamsConnected ? 'Teams Linked' : 'Link Teams'}
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Director Ready</span>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
