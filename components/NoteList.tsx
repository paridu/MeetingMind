
import React, { useState, useMemo, useRef } from 'react';
import { MeetingRecord, MeetingStats } from '../types';
import { deleteNote, exportDatabase, importDatabase, clearAllNotes } from '../services/storageService';

interface NoteListProps {
  notes: MeetingRecord[];
  onSelect: (note: MeetingRecord) => void;
  onDeleted: () => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onSelect, onDeleted }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo<MeetingStats>(() => {
    const totalMeetings = notes.length;
    let totalTasks = 0;
    let completedTasks = 0;
    let totalSentiment = 0;

    notes.forEach(note => {
      totalTasks += note.actionPlan.length;
      completedTasks += note.actionPlan.filter(t => t.completed).length;
      totalSentiment += note.sentimentScore;
    });

    return {
      totalMeetings,
      totalTasks,
      completedTasks,
      avgSentiment: totalMeetings ? Number((totalSentiment / totalMeetings).toFixed(1)) : 0
    };
  }, [notes]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this record permanently?')) {
      deleteNote(id);
      onDeleted();
    }
  };

  const handleClearAll = () => {
    if (confirm('DANGER: This will delete ALL meetings in your vault. Continue?')) {
      clearAllNotes();
      onDeleted();
    }
  };

  const handleExport = () => {
    const data = exportDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meetingmind_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importDatabase(content)) {
        alert("Database restored successfully!");
        onDeleted();
      } else {
        alert("Failed to restore database. Invalid file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return notes;
    const term = searchTerm.toLowerCase();
    return notes.filter(note => 
      note.title.toLowerCase().includes(term) || 
      note.summary.toLowerCase().includes(term) ||
      note.keyTakeaways.some(t => t.toLowerCase().includes(term))
    );
  }, [notes, searchTerm]);

  return (
    <div className="space-y-8 pb-24">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Meetings</p>
          <p className="text-3xl font-black text-indigo-600">{stats.totalMeetings}</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Action Items</p>
          <p className="text-3xl font-black text-amber-500">{stats.totalTasks}</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Completion</p>
          <div className="flex items-baseline gap-1">
             <p className="text-3xl font-black text-emerald-500">{stats.completedTasks}</p>
             <p className="text-xs font-bold text-gray-300">done</p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Sentiment</p>
          <p className="text-3xl font-black text-indigo-400">{stats.avgSentiment}<span className="text-sm">/10</span></p>
        </div>
      </div>

      {/* Management Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <input 
            type="text" 
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 9l-4 4-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button 
            onClick={handleImportClick}
            className="flex-1 md:flex-none px-4 py-2 bg-gray-50 text-gray-600 border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          <button 
            onClick={handleClearAll}
            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Clear All History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">
            {searchTerm ? "No matching records found." : "Your vault is empty."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredNotes.map(note => (
            <div 
              key={note.id}
              onClick={() => onSelect(note)}
              className="group p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                  note.professionalGrade === 'A' ? 'bg-indigo-50 text-indigo-600' :
                  note.professionalGrade === 'B' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600'
                }`}>
                  {note.professionalGrade}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{note.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-400 font-medium">
                      {new Date(note.timestamp).toLocaleDateString()}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                    <p className="text-xs text-gray-400 font-medium">
                      {note.actionPlan.filter(t => t.completed).length}/{note.actionPlan.length} tasks
                    </p>
                    {note.source && (
                      <>
                        <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                          {note.source}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => handleDelete(e, note.id)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete record"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <div className="p-2 text-gray-300 group-hover:text-indigo-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList;
