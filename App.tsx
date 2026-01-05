import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppStatus, ExtractedItem, SUPPORTED_LANGUAGES, HistoryItem } from './types';
import { extractAndTranslate, translateAudio } from './services/aiService';
import { databaseService } from './services/databaseService';

// --- Constants ---
const DEMO_PASSWORD = "password123"; // The required password for access
const MAX_DIMENSION = 1024;
const MAX_FILE_SIZE_MB = 10;

// --- Helper Functions ---

async function normalizeImage(source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<{base64: string, mimeType: string}> {
  const canvas = document.createElement('canvas');
  let width = 0;
  let height = 0;

  if (source instanceof HTMLVideoElement) {
    width = source.videoWidth;
    height = source.videoHeight;
  } else if (source instanceof HTMLCanvasElement) {
    width = source.width;
    height = source.height;
  } else {
    width = source.width;
    height = source.height;
  }

  if (width === 0 || height === 0) {
    throw new Error("We couldn't detect the size of your image. Please try another file or retake the photo.");
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = (height / width) * MAX_DIMENSION;
      width = MAX_DIMENSION;
    } else {
      width = (width / height) * MAX_DIMENSION;
      height = MAX_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Our image processor hit a snag. Please refresh the page and try again.");
  
  try {
    ctx.drawImage(source, 0, 0, width, height);
  } catch (e) {
    throw new Error("Failed to process image data. The file might be corrupted.");
  }
  
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64Data = dataUrl.split(',')[1];
  
  if (!base64Data) {
    throw new Error("Failed to encode image. Please try a different format.");
  }

  return {
    base64: base64Data,
    mimeType: 'image/jpeg'
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// --- Components ---

const AuthPage: React.FC<{ 
  onLogin: (email: string, pass: string) => boolean;
  onSignUp: (email: string, pass: string) => void;
}> = ({ onLogin, onSignUp }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isSignUp) {
      try {
        onSignUp(email, password);
        setSuccess("Account created successfully! You can now sign in.");
        setIsSignUp(false);
        setPassword('');
      } catch (err: any) {
        setError(err.message || "Failed to create account.");
      }
    } else {
      const loginSuccess = onLogin(email, password);
      if (!loginSuccess) {
        setError("Access denied. Invalid credentials.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-indigo-200 shadow-2xl mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">LensLingua</h1>
          <p className="text-slate-500 mt-2 text-center">
            {isSignUp ? "Join our community of explorers" : "Sign in with your traveler credentials"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-3 animate-in slide-in-from-top-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center space-x-3 animate-in slide-in-from-top-2">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-semibold text-emerald-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email Address</label>
            <input 
              type="email" 
              required 
              placeholder="name@example.com" 
              className={`w-full px-4 py-3 bg-slate-50 border ${error ? 'border-red-200' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 text-indigo-900 font-medium`}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              placeholder="••••••••" 
              className={`w-full px-4 py-3 bg-slate-50 border ${error ? 'border-red-200' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 pr-12 text-indigo-900 font-medium`}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute bottom-3 right-4 text-slate-400 hover:text-indigo-600 transition-colors">
              {showPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
            </button>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all">
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-slate-500">
          {isSignUp ? (
            <>
              Already have an account? <span onClick={() => setIsSignUp(false)} className="text-indigo-600 font-bold cursor-pointer hover:underline">Sign In</span>
            </>
          ) : (
            <>
              Don't have an account? <span onClick={() => setIsSignUp(true)} className="text-indigo-600 font-bold cursor-pointer hover:underline">Create Account</span>
            </>
          )}
        </div>

        {!isSignUp && (
          <div className="mt-6 text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest border-t pt-4">
            Guest access password: <span className="text-indigo-600 font-bold font-mono px-1 bg-indigo-50 rounded">password123</span>
          </div>
        )}
      </div>
      <p className="mt-8 text-slate-400 text-xs font-medium uppercase tracking-widest text-center">Created by Integration Coders</p>
    </div>
  );
};

const Header: React.FC<{ 
  targetLang: string; 
  onLangChange: (lang: string) => void; 
  onSignOut: () => void;
  onShowHistory: () => void;
  userEmail: string;
}> = ({ targetLang, onLangChange, onSignOut, onShowHistory, userEmail }) => (
  <header className="bg-white border-b sticky top-0 z-10">
    <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">LensLingua</h1>
          <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider truncate max-w-[120px]" title={userEmail}>
            {userEmail}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button onClick={onShowHistory} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors" title="View History">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <select value={targetLang} onChange={(e) => onLangChange(e.target.value)} className="bg-white border-none text-xs font-bold text-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer shadow-sm">
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.name}>{lang.name}</option>
            ))}
          </select>
        </div>
        <button onClick={onSignOut} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Sign Out">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </div>
  </header>
);

const ResultCard: React.FC<{ item: ExtractedItem; targetLang: string }> = ({ item, targetLang }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md animate-in slide-in-from-bottom-2">
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1 block">Original Transcription</span>
        <p className="text-lg font-medium text-slate-800 leading-relaxed">{item.originalText}</p>
      </div>
      <div className="h-px bg-gray-100 w-full" />
      <div>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1 block">Interpretation ({targetLang})</span>
        <p className="text-xl font-bold text-indigo-700 italic leading-snug">"{item.translatedText}"</p>
      </div>
      
      {item.allergens && item.allergens.trim().length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-start space-x-2">
           <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           <div>
             <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Allergen Alert</span>
             <p className="text-xs text-orange-800 font-bold">{item.allergens}</p>
           </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-indigo-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cultural Insight</span>
            <p className="text-sm text-slate-600 leading-relaxed mt-1 font-medium">{item.context}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HistoryPanel: React.FC<{ 
  email: string; 
  activeHistoryId: string | null;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onDeletedCurrent: () => void;
}> = ({ email, activeHistoryId, onClose, onSelect, onClear, onDeletedCurrent }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(databaseService.getUserHistory(email));
  }, [email]);

  const handleClear = () => {
    if (window.confirm("Permanently delete ALL your translation history?")) {
      databaseService.clearUserHistory(email);
      setHistory([]);
      onClear();
    }
  };

  const handleDeleteItem = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Delete this translation record?")) {
      databaseService.deleteHistoryItem(email, itemId);
      setHistory(prev => prev.filter(h => h.id !== itemId));
      if (itemId === activeHistoryId) {
        onDeletedCurrent();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-sm:max-w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 py-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Translation History</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="font-medium italic">No past translations found.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id} 
                className={`group relative rounded-2xl border transition-all ${item.id === activeHistoryId ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-100 bg-slate-50'}`}
              >
                <button 
                  onClick={() => onSelect(item)}
                  className="w-full text-left p-4 pr-12 relative z-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${item.type === 'audio' ? 'bg-violet-100 text-violet-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 truncate pr-4">
                    {item.items && item.items[0]?.translatedText || "Untitled"}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {item.targetLanguage} Translation
                  </p>
                </button>
                
                <button 
                  onClick={(e) => handleDeleteItem(e, item.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-red-400 hover:text-red-600 transition-colors bg-white/80 backdrop-blur rounded-xl shadow-sm border border-slate-100 z-20 hover:scale-110 active:scale-95"
                  title="Delete Entry"
                >
                  <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="p-4 border-t">
            <button 
              onClick={handleClear}
              className="w-full py-4 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors uppercase tracking-widest border border-red-100"
            >
              Clear All History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState({ email: '', password: '' });
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractedItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);
  const [showSessionCreds, setShowSessionCreds] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const resultsEndRef = useRef<HTMLDivElement>(null);

  // Audio specific states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef(false);

  const handleLogin = (email: string, pass: string): boolean => {
    if (pass === DEMO_PASSWORD) {
      setUserData({ email, password: pass });
      setIsAuthenticated(true);
      return true;
    }
    if (databaseService.verifyUser(email, pass)) {
      setUserData({ email, password: pass });
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleSignUp = (email: string, pass: string): void => {
    databaseService.registerUser(email, pass);
  };

  const copyResultsAsJson = () => {
    const jsonStr = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    });
  };

  const stopCamera = useCallback(() => {
    isInitializingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraReady(false);
  }, []);

  const onVideoReady = useCallback(() => {
    const video = videoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      setIsCameraReady(true);
    }
  }, []);

  const startCamera = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    setError(null);
    setCapturedImage(null);
    setImagePreview(null);
    setResults([]);
    setIsCameraReady(false);
    setIsCameraActive(true);
    const constraints = {
      video: { facingMode: { ideal: 'environment' } as any, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    };
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (!isInitializingRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch (e: any) { if (e.name !== 'AbortError') console.error("Video play failed:", e); }
      }
    } catch (err: any) {
      setIsCameraActive(false);
      setError("Could not access camera. Please check permissions.");
    } finally {
      isInitializingRef.current = false;
    }
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isCameraReady) return;
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 150);
    try {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) throw new Error("Could not initialize capture context.");
      ctx.drawImage(video, 0, 0);
      const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    } catch (e) {
      setError("Failed to capture image.");
    }
  }, [stopCamera, isCameraReady]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setResults([]);
    setActiveHistoryId(null);
    startCamera();
  }, [startCamera]);

  const processAndTranslate = async (source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
    setStatus(AppStatus.PROCESSING);
    setError(null);
    setActiveHistoryId(null);
    try {
      const { base64, mimeType } = await normalizeImage(source);
      const data = await extractAndTranslate(base64, mimeType, targetLanguage);
      if (!data.items || data.items.length === 0) throw new Error("We couldn't find any clear text.");
      
      setResults(data.items);
      const newId = databaseService.saveHistory(userData.email, 'scan', targetLanguage, data.items);
      setActiveHistoryId(newId);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze the image.');
      setStatus(AppStatus.ERROR);
    }
  };

  const confirmCapture = useCallback(async () => {
    if (!capturedImage) return;
    const img = new Image();
    img.onload = async () => {
      await processAndTranslate(img);
    };
    img.src = capturedImage;
  }, [capturedImage, targetLanguage, userData.email]);

  const startRecording = async () => {
    setError(null);
    setResults([]);
    setActiveHistoryId(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setStatus(AppStatus.PROCESSING);
        try {
          const base64Audio = await blobToBase64(audioBlob);
          const data = await translateAudio(base64Audio, 'audio/webm', targetLanguage);
          setResults(data.items);
          const newId = databaseService.saveHistory(userData.email, 'audio', targetLanguage, data.items);
          setActiveHistoryId(newId);
          setStatus(AppStatus.SUCCESS);
        } catch (err: any) {
          setError(err.message || "Failed to translate audio.");
          setStatus(AppStatus.ERROR);
        } finally {
          stream.getTracks().forEach(t => t.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResults([]);
    setActiveHistoryId(null);
    setStatus(AppStatus.IDLE);

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      const img = new Image();
      img.onload = () => processAndTranslate(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    stopCamera();
    setImagePreview(null);
    setCapturedImage(null);
    setResults([]);
    setActiveHistoryId(null);
    setStatus(AppStatus.IDLE);
    setError(null);
    if (isRecording) stopRecording();
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResults(item.items);
    setTargetLanguage(item.targetLanguage);
    setActiveHistoryId(item.id);
    setImagePreview(null);
    setCapturedImage(null);
    setStatus(AppStatus.SUCCESS);
    setShowHistory(false);
  };

  const deleteCurrentHistoryRecord = () => {
    if (activeHistoryId && window.confirm("Permanently delete this translation record from history?")) {
      databaseService.deleteHistoryItem(userData.email, activeHistoryId);
      reset();
    }
  };

  useEffect(() => {
    if (status === AppStatus.SUCCESS && results.length > 0) {
      resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [status, results]);

  useEffect(() => {
    let interval: number;
    if (isCameraActive && !isCameraReady) {
      interval = window.setInterval(() => {
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          setIsCameraReady(true);
          clearInterval(interval);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isCameraActive, isCameraReady]);

  if (!isAuthenticated) {
    return (
      <AuthPage onLogin={handleLogin} onSignUp={handleSignUp} />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-inter">
      <Header 
        targetLang={targetLanguage} 
        onLangChange={setTargetLanguage} 
        onSignOut={() => setIsAuthenticated(false)} 
        onShowHistory={() => setShowHistory(true)}
        userEmail={userData.email} 
      />

      <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-8">
        {!imagePreview && !isCameraActive && !capturedImage && !isRecording && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">LensLingua Interpreter</h2>
                <p className="text-slate-500 mt-2 px-4 font-medium italic">Ready to translate to <span className="text-indigo-600 font-bold">{targetLanguage}</span></p>
              </div>

              <div className="flex flex-col gap-4 px-4">
                <button onClick={startRecording} className="w-full bg-violet-600 text-white font-bold py-5 rounded-2xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  <span className="text-lg">Live Audio Translation</span>
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={startCamera} 
                    className="bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex flex-col items-center justify-center space-y-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-sm">Lens (Camera)</span>
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="bg-slate-800 text-white font-bold py-5 rounded-2xl shadow-lg shadow-slate-200 hover:bg-slate-900 active:scale-[0.98] transition-all flex flex-col items-center justify-center space-y-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="text-sm">Upload Image</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>

                {results.length > 0 && status === AppStatus.SUCCESS && (
                  <div className="mt-12 space-y-6 text-left animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex flex-col">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Interpretation History</h3>
                        {activeHistoryId && <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tight">Active Record</span>}
                      </div>
                      <button 
                        onClick={copyResultsAsJson} 
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-sm ${copiedJson ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        {copiedJson ? '✓ Copied' : 'Copy JSON'}
                      </button>
                    </div>
                    <div className="grid gap-4">
                      {results.map((item, idx) => (
                        <ResultCard key={idx} item={item} targetLang={targetLanguage} />
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                      <button 
                        onClick={reset} 
                        className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest px-6 py-3"
                      >
                        Clear Current View
                      </button>
                      {activeHistoryId && (
                        <button 
                          onClick={deleteCurrentHistoryRecord} 
                          className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest px-6 py-3 border border-red-100 rounded-xl hover:bg-red-50"
                        >
                          Delete Record
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-left mt-8 animate-in shake duration-300">
                    <p className="font-bold">Interpretation Error</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                )}
              </div>

              <div className="mt-16 pt-8 border-t border-slate-200">
                <button 
                  onClick={() => setShowSessionCreds(!showSessionCreds)}
                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                >
                  {showSessionCreds ? "Hide User Session" : "Show User Session"}
                </button>
                {showSessionCreds && (
                  <div className="mt-4 p-5 bg-slate-100 rounded-2xl text-left animate-in slide-in-from-top-3 duration-300">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Active Credentials</p>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 font-medium">Account: <span className="text-indigo-900 font-bold">{userData.email}</span></p>
                      <p className="text-xs text-slate-600 font-medium">Session Key: <span className="text-indigo-900 font-bold font-mono px-1.5 py-0.5 bg-white rounded border border-slate-200">{userData.password}</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in duration-300">
              <div className="mb-8 relative flex justify-center">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center relative z-10 shadow-lg shadow-red-200">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Listening Closely...</h2>
              <p className="text-slate-500 mb-10 font-medium">Translate the surrounding audio into <span className="text-indigo-600 font-bold">{targetLanguage}</span>.</p>
              <button onClick={stopRecording} className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl">End & Translate</button>
            </div>
          </div>
        )}

        {status === AppStatus.PROCESSING && !isRecording && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-pulse">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900">Interpreting Media</h3>
              <p className="text-slate-500 font-medium italic">LensLingua is analyzing tone and context...</p>
            </div>
          </div>
        )}

        {(isCameraActive || capturedImage || imagePreview) && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Visual Header */}
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                {isCameraActive && !capturedImage ? 'Lens Active' : 'Image Analysis'}
              </h3>
              <div className="h-px flex-1 bg-indigo-100 mx-4" />
              <button onClick={reset} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">
                Exit Mode
              </button>
            </div>

            {/* The Image View Section */}
            <div className="relative aspect-[3/4] sm:aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white flex items-center justify-center">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
              ) : imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  onLoadedMetadata={onVideoReady} 
                  className={`w-full h-full object-cover transition-opacity duration-700 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`} 
                />
              )}

              {/* Status Overlay */}
              {status === AppStatus.PROCESSING && (
                <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm z-40 flex flex-col items-center justify-center text-white space-y-4 animate-in fade-in duration-300">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center px-6">
                    <p className="text-lg font-black tracking-tight uppercase italic">Scanning...</p>
                    <p className="text-xs text-white/70 font-medium">LensLingua is extracting nuances and text</p>
                  </div>
                </div>
              )}
              
              {/* Shutter Flash */}
              {isShutterFlashing && <div className="absolute inset-0 bg-white z-[60] animate-in fade-out duration-200" />}
              
              {/* Controls Overlay */}
              <div className="absolute inset-x-0 bottom-8 flex justify-center items-center px-4 z-30">
                {isCameraActive && !capturedImage ? (
                  <div className="flex items-center space-x-12">
                    <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-black/60 transition-all">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <button 
                      onClick={capturePhoto} 
                      disabled={!isCameraReady} 
                      className="w-20 h-20 rounded-full bg-white border-8 border-indigo-500/20 flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-600 shadow-inner"></div>
                    </button>
                    <div className="w-12"></div>
                  </div>
                ) : (
                  <div className="flex w-full max-w-sm space-x-4">
                    {results.length > 0 ? (
                      <button onClick={reset} className="flex-1 bg-white/95 backdrop-blur shadow-lg text-slate-800 font-bold py-4 rounded-2xl border border-slate-200 hover:bg-white transition-all active:scale-95">
                        Finish
                      </button>
                    ) : (
                      <button onClick={reset} className="flex-1 bg-white/90 backdrop-blur shadow text-slate-700 font-bold py-4 rounded-2xl border border-slate-200 hover:bg-white transition-all active:scale-95">
                        Back
                      </button>
                    )}
                    
                    {(!results.length || status === AppStatus.ERROR) && (
                      <button 
                        onClick={capturedImage ? confirmCapture : undefined} 
                        disabled={status === AppStatus.PROCESSING || !capturedImage}
                        className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 shadow-xl shadow-indigo-300/40 hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        {status === AppStatus.PROCESSING ? 'Extracting...' : 'Extract & Translate'}
                      </button>
                    )}
                    
                    {results.length > 0 && (capturedImage || imagePreview) && (
                       <button onClick={retakePhoto} className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-300/40 hover:bg-indigo-700 transition-all active:scale-95">
                        Scan Another
                       </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Results Section - DIRECTLY BELOW THE IMAGE */}
            {results.length > 0 && status === AppStatus.SUCCESS && (
              <div className="space-y-6 text-left animate-in slide-in-from-top-6 duration-700 pb-20">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 px-2">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Findings</h3>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-tight">Analysis Complete • {targetLanguage}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {activeHistoryId && (
                      <button 
                        onClick={deleteCurrentHistoryRecord} 
                        className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl transition-all shadow-sm border border-red-100 text-red-500 bg-white hover:bg-red-50"
                      >
                        Delete Record
                      </button>
                    )}
                    <button 
                      onClick={copyResultsAsJson} 
                      className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl transition-all shadow-sm border ${copiedJson ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                    >
                      {copiedJson ? '✓ JSON Copied' : 'Export JSON'}
                    </button>
                  </div>
                </div>
                
                <div className="grid gap-5">
                  {results.map((item, idx) => (
                    <ResultCard key={idx} item={item} targetLang={targetLanguage} />
                  ))}
                </div>

                <div ref={resultsEndRef} className="pt-8 flex flex-col items-center">
                  <button 
                    onClick={reset} 
                    className="bg-slate-900 text-white font-bold px-12 py-5 rounded-2xl shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all active:scale-[0.98] w-full sm:w-auto"
                  >
                    Close & Finish
                  </button>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-6">Interpretation powered by Gemini Flash</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-8 py-5 rounded-[2rem] text-left animate-in shake duration-300">
                <p className="font-black text-lg flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Extraction Failed
                </p>
                <p className="text-sm mt-2 font-medium">{error}</p>
                <button onClick={reset} className="mt-4 text-xs font-bold uppercase tracking-widest text-red-600 hover:underline">Try again with new photo</button>
              </div>
            )}
          </div>
        )}
      </main>

      {showHistory && (
        <HistoryPanel 
          email={userData.email} 
          activeHistoryId={activeHistoryId}
          onClose={() => setShowHistory(false)} 
          onSelect={loadHistoryItem}
          onClear={reset}
          onDeletedCurrent={reset}
        />
      )}

      <footer className="w-full py-10 border-t bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-3">
          <div className="flex items-center space-x-2 opacity-20">
            <div className="w-2 h-2 rounded-full bg-slate-900" />
            <div className="w-2 h-2 rounded-full bg-slate-900" />
            <div className="w-2 h-2 rounded-full bg-slate-900" />
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">LensLingua • By Integration Coders</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
