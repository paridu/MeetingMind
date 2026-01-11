
import { MeetingRecord } from '../types';

const STORAGE_KEY = 'meeting_mind_notes';
const SETTINGS_KEY = 'meeting_mind_settings';

export interface AppSettings {
  teamsWebhookUrl?: string;
}

export interface DatabaseBackup {
  notes: MeetingRecord[];
  settings: AppSettings;
  version: string;
  exportDate: number;
}

export const saveNote = (note: MeetingRecord) => {
  const existing = getNotes();
  const updated = [note, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const updateNote = (id: string, updatedNote: Partial<MeetingRecord>) => {
  const existing = getNotes();
  const updated = existing.map(n => n.id === id ? { ...n, ...updatedNote } : n);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getNotes = (): MeetingRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteNote = (id: string) => {
  const existing = getNotes();
  const updated = existing.filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearAllNotes = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getNoteById = (id: string): MeetingRecord | undefined => {
  return getNotes().find(n => n.id === id);
};

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : {};
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const exportDatabase = (): string => {
  const backup: DatabaseBackup = {
    notes: getNotes(),
    settings: getSettings(),
    version: "1.0",
    exportDate: Date.now()
  };
  return JSON.stringify(backup, null, 2);
};

export const importDatabase = (jsonString: string): boolean => {
  try {
    const backup: DatabaseBackup = JSON.parse(jsonString);
    if (!backup.notes || !Array.isArray(backup.notes)) {
      throw new Error("Invalid format");
    }
    
    // Restore data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.notes));
    if (backup.settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
    }
    return true;
  } catch (err) {
    console.error("Failed to import database:", err);
    return false;
  }
};
