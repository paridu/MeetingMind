
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus } from '../types';
import { formatDuration } from '../utils/audio';

interface RecorderProps {
  status: AppStatus;
  onStop: (blob: Blob) => void;
  onStart: () => void;
}

const Recorder: React.FC<RecorderProps> = ({ status, onStop, onStart }) => {
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (status === AppStatus.RECORDING) {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onStop(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      onStart();
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone access is required to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === AppStatus.RECORDING) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
      <div className="relative mb-6">
        {status === AppStatus.RECORDING && (
          <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-20"></div>
        )}
        <button
          onClick={status === AppStatus.RECORDING ? stopRecording : startRecording}
          disabled={status === AppStatus.PROCESSING}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${
            status === AppStatus.RECORDING 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
          } ${status === AppStatus.PROCESSING ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {status === AppStatus.RECORDING ? (
            <div className="w-8 h-8 bg-white rounded-sm"></div>
          ) : (
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="text-center">
        <p className="text-2xl font-mono font-bold text-gray-800 mb-1">
          {status === AppStatus.RECORDING ? formatDuration(duration) : "0:00"}
        </p>
        <p className="text-sm font-medium text-gray-500">
          {status === AppStatus.RECORDING ? "Recording..." : status === AppStatus.PROCESSING ? "Analyzing Audio..." : "Tap to record meeting"}
        </p>
      </div>
    </div>
  );
};

export default Recorder;
