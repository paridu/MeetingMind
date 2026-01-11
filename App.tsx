
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Recorder from './components/Recorder';
import NoteDisplay from './components/NoteDisplay';
import NoteList from './components/NoteList';
import { AppStatus, MeetingSummary, MeetingRecord, View } from './types';
import { processMeetingAudio, processMeetingText } from './services/geminiService';
import { blobToBase64 } from './utils/audio';
import { saveNote, getNotes, updateNote, getSettings, saveSettings } from './services/storageService';
import { sendToTeams } from './services/teamsService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('NEW');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [summary, setSummary] = useState<MeetingRecord | null>(null);
  const [history, setHistory] = useState<MeetingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<'TEXT' | 'TEAMS' | null>(null);
  const [importText, setImportText] = useState('');
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [teamsWebhook, setTeamsWebhook] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);

  useEffect(() => {
    setHistory(getNotes());
    const settings = getSettings();
    if (settings.teamsWebhookUrl) {
      setTeamsWebhook(settings.teamsWebhookUrl);
      setAutoSync(settings.autoSync || false);
    }

    // Auto Update Simulation: Check for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'meeting_mind_notes') {
        setIsAutoUpdating(true);
        setHistory(getNotes());
        setTimeout(() => setIsAutoUpdating(false), 2000);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handlePostProcess = async (record: MeetingRecord) => {
    saveNote(record);
    setHistory(getNotes());
    setSummary(record);
    setStatus(AppStatus.COMPLETED);

    // Auto-Sync to Teams if enabled
    const settings = getSettings();
    if (settings.autoSync && settings.teamsWebhookUrl) {
      console.log("Auto-syncing to Teams...");
      await sendToTeams(settings.teamsWebhookUrl, record);
    }
  };

  const handleAudioReady = async (blob: Blob) => {
    setStatus(AppStatus.PROCESSING);
    setError(null);
    try {
      const base64 = await blobToBase64(blob);
      const result = await processMeetingAudio(base64);
      
      const record: MeetingRecord = {
        ...result,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title: result.title || `Meeting ${new Date().toLocaleDateString()}`,
        source: 'Recorded Audio'
      };
      
      await handlePostProcess(record);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please ensure the audio is clear.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleTextImport = async () => {
    if (!importText.trim()) return;
    setStatus(AppStatus.PROCESSING);
    setError(null);
    const importSource = isImporting === 'TEAMS' ? 'MS Teams Feed' : 'Imported Transcript';
    setIsImporting(null);
    try {
      const result = await processMeetingText(importText);
      
      const record: MeetingRecord = {
        ...result,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title: result.title || `Discussion ${new Date().toLocaleDateString()}`,
        source: importSource
      };
      
      await handlePostProcess(record);
      setImportText('');
    } catch (err) {
      console.error(err);
      setError("Text analysis failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const saveTeamsSettings = () => {
    saveSettings({ teamsWebhookUrl: teamsWebhook, autoSync: autoSync });
    setShowTeamsModal(false);
  };

  const loadDemoData = () => {
    const demoRecord: MeetingRecord = {
      id: 'demo-' + Date.now(),
      title: 'Strategic Sync: แผนการตลาด Q4 (Bilingual Demo)',
      timestamp: Date.now(),
      professionalGrade: 'A',
      sentimentScore: 9,
      source: 'MeetingMind GPT Prototype Demo',
      summary: 'การประชุมสรุปแผนกลยุทธ์ไตรมาสที่ 4 เน้นการนำ AI เข้ามาเพิ่มประสิทธิภาพในการทำงานและการจัดการทรัพยากร...',
      keyTakeaways: [
        'ปรับแผนการจัดสรรทรัพยากร (Resource Allocation) 40% ไปยัง AI Automation.',
        'เน้นการพัฒนา Code-generation plugins ในช่วง Q1.'
      ],
      actionPlan: [
        { task: 'ร่างแผนการจัดสรรทรัพยากร AI (Draft AI Resource Plan)', assignee: 'คุณเจน (Lead Eng)', priority: 'High' },
        { task: 'ตรวจสอบงบประมาณ API รายไตรมาส', assignee: 'คุณสาร่า (CFO)', priority: 'Low' }
      ],
      transcript: "[00:01] Sarah: สวัสดีค่ะทุกคน วันนี้เราจะมาคุยเรื่อง Q4 goals กัน..."
    };
    saveNote(demoRecord);
    setHistory(getNotes());
    setSummary(demoRecord);
    setView('DETAIL');
    setStatus(AppStatus.COMPLETED);
  };

  const handleUpdateRecord = (updated: MeetingRecord) => {
    updateNote(updated.id, updated);
    setHistory(getNotes());
    setSummary(updated);
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setSummary(null);
    setError(null);
    setView('NEW');
    setIsImporting(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-gray-900 pb-20">
      <Header 
        onViewChange={setView} 
        currentView={view} 
        isTeamsConnected={!!teamsWebhook}
        onTeamsClick={() => setShowTeamsModal(true)}
      />
      
      {isAutoUpdating && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Auto-Updating Records...
           </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {view === 'NEW' && (
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black tracking-tight text-gray-900">Intelligence on Autopilot.</h2>
              <p className="text-gray-500 font-medium max-w-lg mx-auto">
                Professional meeting summaries & MS Teams chat analysis.
              </p>
              
              {status === AppStatus.IDLE && (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button 
                    onClick={loadDemoData}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all"
                  >
                    Load Demo
                  </button>
                  <button 
                    onClick={() => setIsImporting(isImporting === 'TEXT' ? null : 'TEXT')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                      isImporting === 'TEXT' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Import Transcript
                  </button>
                  <button 
                    onClick={() => setIsImporting(isImporting === 'TEAMS' ? null : 'TEAMS')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                      isImporting === 'TEAMS' ? 'bg-[#6264A7] text-white border-[#6264A7]' : 'bg-white text-[#6264A7] border-[#6264A7]/20 hover:bg-[#6264A7]/5'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M21.5 8.5H11.5V15.5H21.5V8.5Z"/><path d="M9 7H3.5V15H9V7Z"/></svg>
                    Import Teams Feed
                  </button>
                </div>
              )}
            </div>

            {!isImporting && status !== AppStatus.COMPLETED && (
              <div className="animate-in fade-in zoom-in duration-500">
                <Recorder 
                  status={status} 
                  onStart={() => setStatus(AppStatus.RECORDING)} 
                  onStop={handleAudioReady} 
                />
              </div>
            )}

            {isImporting && status === AppStatus.IDLE && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-800">
                    {isImporting === 'TEAMS' ? 'Import MS Teams Feed' : 'Import Meeting Data'}
                  </h3>
                  <button onClick={() => setIsImporting(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <p className="text-sm text-gray-400 font-medium italic">
                  {isImporting === 'TEAMS' 
                    ? 'Paste chat logs from your Teams channel. Gemini will identify speakers and structure the discussion feed.'
                    : 'Paste your transcript below.'}
                </p>
                <textarea 
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={isImporting === 'TEAMS' ? "[9:45 AM] Jane Doe: Let's start the project..." : "Paste meeting text here..."}
                  className="w-full h-64 p-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                />
                <button 
                  onClick={handleTextImport}
                  disabled={!importText.trim()}
                  className={`w-full py-4 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all ${
                    isImporting === 'TEAMS' ? 'bg-[#6264A7] hover:bg-[#4E518A]' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                  }`}
                >
                  Analyze Feed
                </button>
              </div>
            )}

            {status === AppStatus.PROCESSING && (
              <div className="mt-12 space-y-8 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-widest">Processing Intelligence...</h3>
              </div>
            )}

            {summary && status === AppStatus.COMPLETED && (
              <div className="space-y-8">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black">Strategic Result</h3>
                    <button onClick={reset} className="text-indigo-600 font-bold hover:underline">New Analysis</button>
                 </div>
                 <NoteDisplay summary={summary} onUpdate={(val) => handleUpdateRecord(val as MeetingRecord)} />
              </div>
            )}
          </div>
        )}

        {(view === 'HISTORY' || view === 'DETAIL') && (
           <div className="space-y-8">
             {view === 'DETAIL' && summary ? (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <button onClick={() => setView('HISTORY')} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg> Back
                  </button>
                  <NoteDisplay summary={summary} onUpdate={(val) => handleUpdateRecord(val as MeetingRecord)} />
               </div>
             ) : (
               <NoteList notes={history} onSelect={(r) => { setSummary(r); setView('DETAIL'); }} onDeleted={() => setHistory(getNotes())} />
             )}
           </div>
        )}
      </main>

      {/* Teams Integration Modal with Auto-Sync Toggle */}
      {showTeamsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowTeamsModal(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-8 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#6264A7] rounded-xl flex items-center justify-center text-white">
                       <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M21.5 8.5H11.5V15.5H21.5V8.5Z"/><path d="M9 7H3.5V15H9V7Z"/></svg>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-gray-900">Microsoft Teams Link</h3>
                       <p className="text-[10px] font-black text-[#6264A7] uppercase tracking-widest">Global Connector</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Webhook URL</label>
                       <input 
                          type="text" 
                          value={teamsWebhook}
                          onChange={(e) => setTeamsWebhook(e.target.value)}
                          placeholder="https://your-tenant.webhook.office.com/..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6264A7]/20"
                       />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <div>
                          <p className="text-xs font-black text-gray-700">Auto-Sync New Results</p>
                          <p className="text-[10px] text-gray-400 font-medium">Automatically push every new summary to Teams</p>
                       </div>
                       <button 
                          onClick={() => setAutoSync(!autoSync)}
                          className={`w-12 h-6 rounded-full transition-all relative ${autoSync ? 'bg-emerald-500' : 'bg-gray-300'}`}
                       >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoSync ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </div>
                 </div>

                 <div className="flex gap-3">
                    <button onClick={() => setShowTeamsModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                    <button onClick={saveTeamsSettings} className="flex-1 py-4 bg-[#6264A7] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#6264A7]/20 hover:bg-[#4E518A] transition-all">Save Connection</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-100 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-12 z-50 transition-all active:scale-95">
        <button onClick={() => setView('NEW')} className={`flex flex-col items-center gap-1 ${view === 'NEW' ? 'text-indigo-600' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Studio</span>
        </button>
        <button onClick={() => setView('HISTORY')} className={`flex flex-col items-center gap-1 ${view === 'HISTORY' || view === 'DETAIL' ? 'text-indigo-600' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Vault</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
