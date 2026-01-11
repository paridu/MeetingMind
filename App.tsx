
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Recorder from './components/Recorder';
import NoteDisplay from './components/NoteDisplay';
import NoteList from './components/NoteList';
import { AppStatus, MeetingSummary, MeetingRecord, View } from './types';
import { processMeetingAudio, processMeetingText } from './services/geminiService';
import { blobToBase64 } from './utils/audio';
import { saveNote, getNotes, updateNote, getSettings, saveSettings } from './services/storageService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('NEW');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [summary, setSummary] = useState<MeetingRecord | null>(null);
  const [history, setHistory] = useState<MeetingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [teamsWebhook, setTeamsWebhook] = useState('');

  useEffect(() => {
    setHistory(getNotes());
    const settings = getSettings();
    if (settings.teamsWebhookUrl) {
      setTeamsWebhook(settings.teamsWebhookUrl);
    }
  }, []);

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
      
      saveNote(record);
      setHistory(getNotes());
      setSummary(record);
      setStatus(AppStatus.COMPLETED);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please ensure the audio is clear and your connection is stable.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleTextImport = async () => {
    if (!importText.trim()) return;
    setStatus(AppStatus.PROCESSING);
    setError(null);
    setIsImporting(false);
    try {
      const result = await processMeetingText(importText);
      
      const record: MeetingRecord = {
        ...result,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title: result.title || `Meeting ${new Date().toLocaleDateString()}`,
        source: 'Imported Transcript'
      };
      
      saveNote(record);
      setHistory(getNotes());
      setSummary(record);
      setImportText('');
      setStatus(AppStatus.COMPLETED);
    } catch (err) {
      console.error(err);
      setError("Text analysis failed. Please check the content and try again.");
      setStatus(AppStatus.ERROR);
    }
  };

  const loadDemoData = () => {
    const demoRecord: MeetingRecord = {
      id: 'demo-' + Date.now(),
      title: 'Strategic Sync: แผนการตลาด Q4 (Bilingual Demo)',
      timestamp: Date.now(),
      professionalGrade: 'A',
      sentimentScore: 9,
      source: 'MeetingMind GPT Prototype Demo',
      summary: 'การประชุมสรุปแผนกลยุทธ์ไตรมาสที่ 4 เน้นการนำ AI เข้ามาเพิ่มประสิทธิภาพในการทำงานและการจัดการทรัพยากร The team aligned on shifting 40% of development resources toward internal automation tools while maintaining a feature parity roadmap for our flagship product.',
      keyTakeaways: [
        'ปรับแผนการจัดสรรทรัพยากร (Resource Allocation) 40% ไปยัง AI Automation.',
        'เน้นการพัฒนา Code-generation plugins ในช่วง Q1.',
        'สรุปข้อมูลจากการตอบรับของลูกค้าว่ามีความต้องการ Automated Meeting Summaries สูงมาก.'
      ],
      actionPlan: [
        { task: 'ร่างแผนการจัดสรรทรัพยากร AI (Draft AI Resource Plan)', assignee: 'คุณเจน (Lead Eng)', priority: 'High' },
        { task: 'Set up Beta testing for Summary Plugin', assignee: 'คุณมาร์ค (DevOps)', priority: 'Medium' },
        { task: 'ตรวจสอบงบประมาณ API รายไตรมาส', assignee: 'คุณสาร่า (CFO)', priority: 'Low' }
      ],
      transcript: "[00:01] Sarah: สวัสดีค่ะทุกคน วันนี้เราจะมาคุยเรื่อง Q4 goals กัน มาร์ค งานวิจัย AI ไปถึงไหนแล้วคะ?\n[00:15] Mark: We've found Gemini 2.5 Flash highly efficient. เจนกับผมเสนอให้เราทำ Resource pivot ครับ\n[01:30] Jane: ใช่ค่ะ ถ้าเราย้ายทีม 40% มาทำ Automation เราจะเพิ่ม Output ได้ 3 เท่าภายใน Q2 ค่ะ\n[03:45] Sarah: ฟังดูน่าสนใจและเป็นไปได้มาก Let's make it our main priority ค่ะ"
    };
    saveNote(demoRecord);
    setHistory(getNotes());
    setSummary(demoRecord);
    setView('DETAIL');
    setStatus(AppStatus.COMPLETED);
  };

  const saveTeamsSettings = () => {
    saveSettings({ teamsWebhookUrl: teamsWebhook });
    setShowTeamsModal(false);
  };

  const handleUpdateRecord = (updated: MeetingRecord) => {
    updateNote(updated.id, updated);
    setHistory(getNotes());
    setSummary(updated);
  };

  const handleStart = () => {
    setStatus(AppStatus.RECORDING);
    setSummary(null);
    setError(null);
    setIsImporting(false);
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setSummary(null);
    setError(null);
    setView('NEW');
    setIsImporting(false);
  };

  const navigateToDetail = (record: MeetingRecord) => {
    setSummary(record);
    setView('DETAIL');
  };

  const refreshHistory = () => {
    setHistory(getNotes());
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-gray-900 pb-20">
      <Header 
        onViewChange={setView} 
        currentView={view} 
        isTeamsConnected={!!teamsWebhook}
        onTeamsClick={() => setShowTeamsModal(true)}
      />
      
      <main className="max-w-4xl mx-auto px-6 pt-12">
        {view === 'NEW' && (
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black tracking-tight text-gray-900">Intelligence on Autopilot.</h2>
              <p className="text-gray-500 font-medium max-w-lg mx-auto">
                สรุปประชุมระดับมืออาชีพ รองรับทั้งภาษาไทยและอังกฤษ <br/>
                Professional-grade meeting summaries with full Thai/English support.
              </p>
              
              {status === AppStatus.IDLE && (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button 
                    onClick={loadDemoData}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all"
                  >
                    ลองใช้ Demo (Bilingual)
                  </button>
                  <button 
                    onClick={() => { setIsImporting(!isImporting); setStatus(AppStatus.IDLE); }}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                      isImporting ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Import Transcript
                  </button>
                </div>
              )}
            </div>

            {!isImporting && status !== AppStatus.COMPLETED && (
              <div className="animate-in fade-in zoom-in duration-500">
                <Recorder 
                  status={status} 
                  onStart={handleStart} 
                  onStop={handleAudioReady} 
                />
              </div>
            )}

            {isImporting && status === AppStatus.IDLE && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-800">Import Meeting Data</h3>
                  <button onClick={() => setIsImporting(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <p className="text-sm text-gray-400 font-medium italic">Paste your meeting transcript or raw notes below. Gemini will analyze and structure it.</p>
                <textarea 
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste meeting text here..."
                  className="w-full h-64 p-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                />
                <button 
                  onClick={handleTextImport}
                  disabled={!importText.trim()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Analyze & Structure
                </button>
              </div>
            )}

            {status === AppStatus.PROCESSING && (
              <div className="mt-12 space-y-8 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gray-900">กำลังวิเคราะห์ข้อมูลการประชุม...</h3>
                  <p className="text-sm text-gray-400 font-medium tracking-wide uppercase">Applying 4-Phase Autopilot Review...</p>
                </div>
              </div>
            )}

            {status === AppStatus.ERROR && (
              <div className="p-6 bg-red-50 border border-red-100 rounded-3xl text-center">
                <p className="font-bold text-red-600 mb-2">Process Error</p>
                <p className="text-sm text-red-500 mb-6">{error}</p>
                <button onClick={reset} className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all">ลองใหม่ (Try Again)</button>
              </div>
            )}

            {summary && status === AppStatus.COMPLETED && (
              <div className="space-y-8">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black">ผลการสรุปประชุม (Result)</h3>
                    <button onClick={reset} className="text-indigo-600 font-bold hover:underline">บันทึกใหม่</button>
                 </div>
                 <NoteDisplay summary={summary} onUpdate={(val) => handleUpdateRecord(val as MeetingRecord)} />
              </div>
            )}
          </div>
        )}

        {view === 'HISTORY' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tight">Meeting Vault</h2>
                <button onClick={() => setView('NEW')} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                </button>
             </div>
             <NoteList notes={history} onSelect={navigateToDetail} onDeleted={refreshHistory} />
          </div>
        )}

        {view === 'DETAIL' && summary && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <button 
               onClick={() => setView('HISTORY')}
               className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Back to Vault
             </button>
             <NoteDisplay summary={summary} onUpdate={(val) => handleUpdateRecord(val as MeetingRecord)} />
          </div>
        )}
      </main>

      {/* Teams Integration Modal */}
      {showTeamsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowTeamsModal(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
              <div className="p-8 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#6264A7] rounded-xl flex items-center justify-center text-white">
                       <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21.5 8.5C21.5 8.22386 21.2761 8 21 8H11.5C11.2239 8 11 8.22386 11 8.5V15.5C11 15.7761 11.2239 16 11.5 16H21C21.2761 16 21.5 15.7761 21.5 15.5V8.5Z" />
                          <path d="M9 7H3.5C3.22386 7 3 7.22386 3 7.5V14.5C3 14.7761 3.22386 15 3.5 15H9V7Z" />
                       </svg>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-gray-900">Link Microsoft Teams</h3>
                       <p className="text-xs font-bold text-[#6264A7] uppercase tracking-widest">Connect to Workspace</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Teams Incoming Webhook URL</label>
                       <input 
                          type="text" 
                          value={teamsWebhook}
                          onChange={(e) => setTeamsWebhook(e.target.value)}
                          placeholder="https://your-tenant.webhook.office.com/..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#6264A7]/20 outline-none"
                       />
                    </div>
                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                       <p className="text-[10px] font-black text-indigo-600 uppercase">How to get a Webhook URL?</p>
                       <ol className="text-[11px] text-indigo-900 leading-relaxed font-medium list-decimal list-inside">
                          <li>Go to your Teams Channel > Connectors.</li>
                          <li>Find "Incoming Webhook" and click Configure.</li>
                          <li>Provide a name and Copy the generated URL.</li>
                       </ol>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button 
                       onClick={() => setShowTeamsModal(false)}
                       className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={saveTeamsSettings}
                       className="flex-1 py-4 bg-[#6264A7] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#6264A7]/20 hover:bg-[#4E518A] transition-all"
                    >
                       Save Connection
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-100 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-12 z-50 transition-all active:scale-95">
        <button 
          onClick={() => setView('NEW')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'NEW' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Record</span>
        </button>
        <button 
          onClick={() => setView('HISTORY')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'HISTORY' || view === 'DETAIL' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Vault</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
