import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppStatus, ExtractedItem, SUPPORTED_LANGUAGES, HistoryItem } from './types';
import { extractAndTranslate, translateAudio } from './services/aiService';
import { databaseService } from './services/databaseService';

// --- Constants ---
const DEMO_PASSWORD = "password123";
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
    throw new Error("We couldn't detect the size of your image.");
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
  if (!ctx) throw new Error("Image processor error.");
  
  ctx.drawImage(source, 0, 0, width, height);
  
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64Data = dataUrl.split(',')[1];
  
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
        setSuccess("Account created successfully!");
        setIsSignUp(false);
        setPassword('');
      } catch (err: any) {
        setError(err.message || "Failed to create account.");
      }
    } else {
      const loginSuccess = onLogin(email, password);
      if (!loginSuccess) setError("Access denied. Invalid credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
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

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">{error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm font-semibold">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email Address</label>
            <input type="email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Password</label>
            <input type={showPassword ? "text" : "password"} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all">
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>
        <div className="mt-8 text-center text-sm text-slate-500">
            {isSignUp ? <>Already have an account? <span onClick={() => setIsSignUp(false)} className="text-indigo-600 font-bold cursor-pointer">Sign In</span></> 
            : <>Don't have an account? <span onClick={() => setIsSignUp(true)} className="text-indigo-600 font-bold cursor-pointer">Create Account</span></>}
        </div>
      </div>
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
    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
        </div>
        <h1 className="text-xl font-bold">LensLingua</h1>
      </div>
      <div className="flex items-center space-x-3">
        <button onClick={onShowHistory} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
        <select value={targetLang} onChange={(e) => onLangChange(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2 py-1.5 outline-none">
          {SUPPORTED_LANGUAGES.map(lang => <option key={lang.code} value={lang.name}>{lang.name}</option>)}
        </select>
        <button onClick={onSignOut} className="p-2 text-slate-400 hover:text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
      </div>
    </div>
  </header>
);

const ResultCard: React.FC<{ item: ExtractedItem; targetLang: string }> = ({ item, targetLang }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-4">
    <div className="space-y-4">
      <div>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">Original</span>
        <p className="text-slate-800">{item.originalText}</p>
      </div>
      <div className="h-px bg-gray-100" />
      <div>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">Translation ({targetLang})</span>
        <p className="text-lg font-bold text-indigo-700 italic">"{item.translatedText}"</p>
      </div>
      {item.allergens && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-orange-800 text-xs">
          <strong>Allergen Alert:</strong> {item.allergens}
        </div>
      )}
      <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-600">
        <span className="font-bold uppercase block mb-1">Context</span>
        {item.context}
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
      if (window.confirm("Clear all history?")) {
        databaseService.clearUserHistory(email);
        setHistory([]);
        onClear();
      }
    };
  
    const handleDeleteItem = (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();
      if (window.confirm("Delete record?")) {
        databaseService.deleteHistoryItem(email, itemId);
        setHistory(prev => prev.filter(h => h.id !== itemId));
        if (itemId === activeHistoryId) onDeletedCurrent();
      }
    };
  
    return (
      <div className="fixed inset-0 z-[60] flex justify-end">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
          <div className="px-6 py-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">History</h2>
            <button onClick={onClose} className="p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? <p className="text-center text-slate-400 mt-20">No history yet.</p> :
              history.map((item) => (
                <div key={item.id} className={`p-4 rounded-xl border cursor-pointer relative ${item.id === activeHistoryId ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`} onClick={() => onSelect(item)}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-white rounded border">{item.type}</span>
                    <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-bold truncate pr-6">{item.items[0]?.translatedText || "Untitled"}</p>
                  <button onClick={(e) => handleDeleteItem(e, item.id)} className="absolute right-3 bottom-3 text-red-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))
            }
          </div>
          {history.length > 0 && <div className="p-4 border-t"><button onClick={handleClear} className="w-full py-3 text-red-600 font-bold text-xs uppercase border border-red-100 rounded-xl">Clear All</button></div>}
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
  const [showHistory, setShowHistory] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleLogin = (email: string, pass: string) => {
    if (pass === DEMO_PASSWORD || databaseService.verifyUser(email, pass)) {
      setUserData({ email, password: pass });
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleSignUp = (email: string, pass: string) => databaseService.registerUser(email, pass);

  const stopCamera = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsCameraActive(false);
    setIsCameraReady(false);
  }, []);

  const startCamera = async () => {
    reset();
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) { setError("Camera access denied."); setIsCameraActive(false); }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 150);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg'));
    stopCamera();
  };

  const startRecording = async () => {
    reset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      
      mediaRecorder.onstop = async () => {
        // FIX: Capture dynamic browser mimeType
        const recordedMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        
        setStatus(AppStatus.PROCESSING);
        try {
          const base64 = await blobToBase64(audioBlob);
          const data = await translateAudio(base64, recordedMimeType, targetLanguage);
          setResults(data.items);
          setActiveHistoryId(databaseService.saveHistory(userData.email, 'audio', targetLanguage, data.items));
          setStatus(AppStatus.SUCCESS);
        } catch (err: any) {
          setError(err.message);
          setStatus(AppStatus.ERROR);
        } finally {
          stream.getTracks().forEach(t => t.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) { setError("Mic access denied."); }
  };

  const processAndTranslate = async (source: any) => {
    setStatus(AppStatus.PROCESSING);
    try {
      const { base64, mimeType } = await normalizeImage(source);
      const data = await extractAndTranslate(base64, mimeType, targetLanguage);
      setResults(data.items);
      setActiveHistoryId(databaseService.saveHistory(userData.email, 'scan', targetLanguage, data.items));
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) { setError(err.message); setStatus(AppStatus.ERROR); }
  };

  const reset = () => {
    stopCamera();
    setIsRecording(false);
    setImagePreview(null);
    setCapturedImage(null);
    setResults([]);
    setError(null);
    setStatus(AppStatus.IDLE);
  };

  if (!isAuthenticated) return <AuthPage onLogin={handleLogin} onSignUp={handleSignUp} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header targetLang={targetLanguage} onLangChange={setTargetLanguage} onSignOut={() => setIsAuthenticated(false)} onShowHistory={() => setShowHistory(true)} userEmail={userData.email} />
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-8">
        {!isCameraActive && !capturedImage && !imagePreview && !isRecording && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-black mb-8">LensLingua Interpreter</h2>
            <div className="flex flex-col gap-4 max-w-sm mx-auto">
              <button onClick={startRecording} className="bg-violet-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:bg-violet-700 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> Audio Translation</button>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={startCamera} className="bg-indigo-600 text-white font-bold py-5 rounded-2xl flex flex-col items-center gap-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg> Camera</button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 text-white font-bold py-5 rounded-2xl flex flex-col items-center gap-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Upload</button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => { setImagePreview(ev.target?.result as string); const img = new Image(); img.onload = () => processAndTranslate(img); img.src = ev.target?.result as string; };
                  reader.readAsDataURL(file);
                }} />
              </div>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="fixed inset-0 bg-slate-900/90 z-[70] flex flex-col items-center justify-center text-white">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center animate-pulse mb-6 shadow-2xl"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></div>
            <p className="text-xl font-bold mb-10">Listening...</p>
            <button onClick={() => mediaRecorderRef.current?.stop()} className="bg-white text-slate-900 font-bold px-10 py-4 rounded-2xl shadow-xl">End & Translate</button>
          </div>
        )}

        {status === AppStatus.PROCESSING && <div className="py-20 flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="font-bold">Interpreting...</p></div>}

        {(isCameraActive || capturedImage || imagePreview) && (
          <div className="space-y-6">
            <div className="aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl border-4 border-white">
              {capturedImage ? <img src={capturedImage} className="w-full h-full object-contain" /> : imagePreview ? <img src={imagePreview} className="w-full h-full object-contain" /> : <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" onLoadedMetadata={() => setIsCameraReady(true)} />}
              {isShutterFlashing && <div className="absolute inset-0 bg-white z-[60]" />}
              <div className="absolute inset-x-0 bottom-6 flex justify-center gap-4 z-30">
                {isCameraActive && !capturedImage ? (
                  <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-indigo-600 shadow-xl" />
                ) : (
                  <div className="flex gap-3 w-full max-w-xs">
                    <button onClick={reset} className="flex-1 bg-white text-slate-900 font-bold py-4 rounded-2xl shadow-lg">Cancel</button>
                    {!results.length && capturedImage && <button onClick={() => { const img = new Image(); img.onload = () => processAndTranslate(img); img.src = capturedImage; }} className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl">Translate</button>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-10 space-y-6">
            <h3 className="font-bold border-b pb-2">Results ({targetLanguage})</h3>
            {results.map((item, i) => <ResultCard key={i} item={item} targetLang={targetLanguage} />)}
            <button onClick={reset} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg">New Translation</button>
          </div>
        )}

        {error && <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold"><p className="mb-2">Error</p><p className="text-sm font-medium">{error}</p><button onClick={reset} className="mt-4 text-xs underline">Try Again</button></div>}
      </main>
    </div>
  );
};

export default App;