
import React, { useState, useMemo } from 'react';
import { MeetingSummary, Task } from '../types';
import { getSettings } from '../services/storageService';
import { sendToTeams } from '../services/teamsService';

interface NoteDisplayProps {
  summary: MeetingSummary & { title?: string; id?: string; source?: string; timestamp: number };
  onUpdate?: (updatedSummary: MeetingSummary & { title?: string; id?: string; source?: string; timestamp: number }) => void;
}

type SortKey = 'task' | 'assignee' | 'priority';
type SortDirection = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = {
  'High': 3,
  'Medium': 2,
  'Low': 1
};

const getPriorityStyle = (priority: string, completed?: boolean) => {
  if (completed) return 'bg-gray-100 text-gray-400 border-gray-200 opacity-60';
  const normalized = priority.trim().toLowerCase();
  switch (normalized) {
    case 'high':
    case 'urgent':
    case 'blocker':
      return 'bg-red-50 text-red-600 border-red-100';
    case 'medium':
    case 'important':
      return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'low':
    case 'backlog':
      return 'bg-gray-50 text-gray-600 border-gray-200';
    default:
      return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  }
};

const NoteDisplay: React.FC<NoteDisplayProps> = ({ summary, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<Task | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const copyToClipboard = () => {
    const text = `
Meeting Title: ${summary.title || 'Untitled'}
Grade: ${summary.professionalGrade} | Sentiment: ${summary.sentimentScore}/10
Source: ${summary.source || 'Unknown'}

EXECUTIVE SUMMARY
${summary.summary}

KEY TAKEAWAYS
${summary.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}

ACTION PLAN
${summary.actionPlan.map(a => `${a.completed ? '✅' : '⬜️'} [${a.priority}] ${a.task} (${a.assignee || 'Any'})`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTeamsSync = async () => {
    const settings = getSettings();
    if (!settings.teamsWebhookUrl) {
      alert("Please connect Microsoft Teams in the header first.");
      return;
    }

    setIsSyncing(true);
    const success = await sendToTeams(settings.teamsWebhookUrl, summary as any);
    setIsSyncing(false);

    if (success) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } else {
      alert("Sync failed. Please check your Webhook URL.");
    }
  };

  const exportToCSV = () => {
    const headers = ['Status', 'Task', 'Assignee', 'Priority'];
    const rows = summary.actionPlan.map(task => [
      task.completed ? 'Completed' : 'Active',
      `"${task.task.replace(/"/g, '""')}"`,
      `"${(task.assignee || '').replace(/"/g, '""')}"`,
      `"${task.priority.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${summary.title || 'action_plan'}_tasks.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleTaskCompletion = (originalIdx: number) => {
    if (onUpdate) {
      const newActionPlan = [...summary.actionPlan];
      newActionPlan[originalIdx] = {
        ...newActionPlan[originalIdx],
        completed: !newActionPlan[originalIdx].completed
      };
      onUpdate({ ...summary, actionPlan: newActionPlan });
    }
  };

  const clearCompletedTasks = () => {
    if (onUpdate && confirm('Permanently clear all completed tasks?')) {
      const newActionPlan = summary.actionPlan.filter(t => !t.completed);
      onUpdate({ ...summary, actionPlan: newActionPlan });
    }
  };

  const sortedActionPlan = useMemo(() => {
    const allItems = summary.actionPlan.map((task, originalIndex) => ({ ...task, originalIndex }));
    
    const active = allItems.filter(t => !t.completed);
    const completed = allItems.filter(t => t.completed);

    const sortFn = (a: any, b: any) => {
      let comparison = 0;
      if (sortKey === 'priority') {
        const scoreA = PRIORITY_ORDER[a.priority] ?? 0;
        const scoreB = PRIORITY_ORDER[b.priority] ?? 0;
        comparison = scoreA - scoreB;
        if (comparison === 0) {
          comparison = a.priority.localeCompare(b.priority);
        }
      } else {
        const valA = (a[sortKey] || '').toLowerCase();
        const valB = (b[sortKey] || '').toLowerCase();
        comparison = valA.localeCompare(valB);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    };

    return {
      active: active.sort(sortFn),
      completed: completed.sort(sortFn)
    };
  }, [summary.actionPlan, sortKey, sortDirection]);

  const startEditing = (originalIdx: number, task: Task) => {
    setEditingIdx(originalIdx);
    setEditBuffer({ ...task });
  };

  const cancelEditing = () => {
    setEditingIdx(null);
    setEditBuffer(null);
  };

  const saveTask = () => {
    if (editingIdx !== null && editBuffer && onUpdate) {
      const newActionPlan = [...summary.actionPlan];
      newActionPlan[editingIdx] = editBuffer;
      onUpdate({ ...summary, actionPlan: newActionPlan });
      setEditingIdx(null);
      setEditBuffer(null);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade</p>
            <p className="text-4xl font-black text-indigo-600">{summary.professionalGrade}</p>
          </div>
          <div className="h-10 w-px bg-gray-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sentiment</p>
            <p className="text-4xl font-black text-emerald-500">{summary.sentimentScore}<span className="text-sm text-gray-300">/10</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={copyToClipboard}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              copied ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {copied ? (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Copied</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> Copy Results</>
            )}
          </button>
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print PDF
          </button>
        </div>
      </div>

      {/* Info Bar */}
      {summary.source && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100 w-max">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-xs font-bold text-indigo-600">Source: {summary.source}</span>
        </div>
      )}

      {/* Title */}
      {summary.title && (
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{summary.title}</h1>
      )}

      {/* Summary Section */}
      <section>
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
          Executive Summary
        </h2>
        <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm leading-relaxed text-gray-700 text-lg">
          {summary.summary}
        </div>
      </section>

      {/* Key Takeaways */}
      <section>
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
          Key Takeaways
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.keyTakeaways.map((item, idx) => (
            <div key={idx} className="flex gap-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 hover:border-emerald-200 transition-all group">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-white shadow-sm text-emerald-600 flex items-center justify-center text-xs font-black">
                {idx + 1}
              </span>
              <p className="text-emerald-900 font-semibold text-sm leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Action Plan */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-3">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
            Strategic Action Plan
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleTeamsSync}
              disabled={isSyncing}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                syncSuccess 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-[#6264A7] text-white hover:bg-[#4E518A] shadow-md shadow-[#6264A7]/20'
              }`}
            >
              {isSyncing ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : syncSuccess ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M21.5 8.5C21.5 8.22386 21.2761 8 21 8H11.5C11.2239 8 11 8.22386 11 8.5V15.5C11 15.7761 11.2239 16 11.5 16H21C21.2761 16 21.5 15.7761 21.5 15.5V8.5Z"/><path d="M9 7H3.5C3.22386 7 3 7.22386 3 7.5V14.5C3 14.7761 3.22386 15 3.5 15H9V7Z"/></svg>
              )}
              {syncSuccess ? 'Synced to Teams' : 'Sync to Teams'}
            </button>
            <button 
              onClick={exportToCSV}
              className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[10px] font-black uppercase hover:bg-amber-100 transition-all flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l4-4m-4 4L8 8" /></svg>
              Export CSV
            </button>
            <div className="h-4 w-px bg-gray-200 hidden md:block"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Sort by:</span>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => toggleSort('priority')}
                className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${sortKey === 'priority' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Priority {sortKey === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('assignee')}
                className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${sortKey === 'assignee' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Assignee {sortKey === 'assignee' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('task')}
                className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${sortKey === 'task' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Task {sortKey === 'task' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Task</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignee</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Priority</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedActionPlan.active.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-10 text-center text-gray-400 italic text-sm">No active tasks remaining.</td>
                  </tr>
                )}
                {sortedActionPlan.active.map((task) => (
                  <tr key={task.originalIndex} className="hover:bg-gray-50/50 transition-colors group">
                    {editingIdx === task.originalIndex ? (
                      <>
                        <td className="px-8 py-4">
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                            value={editBuffer?.task}
                            onChange={(e) => setEditBuffer(prev => prev ? {...prev, task: e.target.value} : null)}
                            placeholder="Task description"
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                            value={editBuffer?.assignee}
                            onChange={(e) => setEditBuffer(prev => prev ? {...prev, assignee: e.target.value} : null)}
                            placeholder="Assignee"
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input 
                            list="priority-options"
                            className="mx-auto block w-32 px-3 py-2 border border-indigo-200 rounded-lg text-sm outline-none text-center"
                            value={editBuffer?.priority}
                            onChange={(e) => setEditBuffer(prev => prev ? {...prev, priority: e.target.value} : null)}
                            placeholder="Priority"
                          />
                          <datalist id="priority-options">
                            <option value="High" />
                            <option value="Medium" />
                            <option value="Low" />
                            <option value="Urgent" />
                            <option value="Blocker" />
                            <option value="Backlog" />
                          </datalist>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={saveTask} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={cancelEditing} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <input 
                                type="checkbox" 
                                checked={task.completed || false} 
                                onChange={() => toggleTaskCompletion(task.originalIndex)}
                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="text-gray-800 font-bold text-sm">{task.task}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-gray-500 text-sm italic">{task.assignee || 'General'}</td>
                        <td className="px-8 py-6">
                          <div className={`mx-auto w-max px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${getPriorityStyle(task.priority, task.completed)}`}>
                            {task.priority}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => startEditing(task.originalIndex, task)}
                            className="p-2 text-gray-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Completed Tasks Section */}
        {sortedActionPlan.completed.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-gray-200 rounded-full"></div>
                Completed Tasks
              </h3>
              <button 
                onClick={clearCompletedTasks}
                className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Clear All
              </button>
            </div>
            <div className="bg-gray-50/30 rounded-3xl border border-gray-100 overflow-hidden">
               <table className="w-full text-left">
                  <tbody className="divide-y divide-gray-100">
                    {sortedActionPlan.completed.map((task) => (
                      <tr key={task.originalIndex} className="group transition-colors">
                        <td className="px-8 py-4 opacity-60">
                           <div className="flex items-center gap-4">
                              <input 
                                type="checkbox" 
                                checked={task.completed || false} 
                                onChange={() => toggleTaskCompletion(task.originalIndex)}
                                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="text-gray-400 font-medium text-sm line-through decoration-gray-300">{task.task}</span>
                           </div>
                        </td>
                        <td className="px-8 py-4 text-gray-300 text-xs italic">{task.assignee || 'General'}</td>
                        <td className="px-8 py-4">
                          <div className={`mx-auto w-max px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${getPriorityStyle(task.priority, true)}`}>
                            {task.priority}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Done</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </section>

      {/* Transcript */}
      <section>
        <details className="group">
          <summary className="text-sm font-black text-gray-400 uppercase tracking-widest cursor-pointer list-none flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-all">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-gray-300 rounded-full"></div>
              Meeting Transcript
            </div>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div className="mt-4 p-8 bg-gray-50 rounded-3xl border border-gray-200 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {summary.transcript}
          </div>
        </details>
      </section>
    </div>
  );
};

export default NoteDisplay;
