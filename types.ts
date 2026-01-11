
export interface Task {
  task: string;
  assignee?: string;
  priority: string;
  completed?: boolean;
}

export interface MeetingSummary {
  transcript: string;
  summary: string;
  keyTakeaways: string[];
  actionPlan: Task[];
  sentimentScore: number;
  professionalGrade: string;
}

export interface MeetingRecord extends MeetingSummary {
  id: string;
  timestamp: number;
  title: string;
  source?: string; // Original data source (e.g., 'Recorded Audio' or 'Demo Data')
}

export interface MeetingStats {
  totalMeetings: number;
  totalTasks: number;
  completedTasks: number;
  avgSentiment: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type View = 'NEW' | 'HISTORY' | 'DETAIL';
