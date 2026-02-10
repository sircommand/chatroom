"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, X, ChevronLeft, Image as ImageIcon, 
  Video, Music, Paperclip, Mic, Smile, Bold, 
  Trash2, Download, Plus, Search, Hash, 
  Reply, Maximize2, Loader2, Lock, Unlock, AlertCircle, Palette, Wallpaper
} from 'lucide-react';

// تنظیمات اتصال به سوپابیس
const SUPABASE_URL = 'https://tpraynocoxkbjvoyjzua.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1M9183i0HraE0cLug-RBuw_mMIpyIqG';

const COLORS = [
  { name: 'Default', value: 'bg-[#0f172a]' },
  { name: 'Blue', value: 'bg-blue-900/40' },
  { name: 'Red', value: 'bg-rose-900/40' },
  { name: 'Green', value: 'bg-emerald-900/40' },
  { name: 'Yellow', value: 'bg-amber-900/40' },
  { name: 'Orange', value: 'bg-orange-900/40' },
  { name: 'Black', value: 'bg-black' }
];

const PATTERNS = [
  { id: 'none', label: 'بدون طرح', css: '' },
  { id: 'dots', label: 'نقاط', css: 'opacity-20 [background-image:radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:20px_20px]' },
  { id: 'grid', label: 'شطرنجی', css: 'opacity-10 [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:30px_30px]' },
  { id: 'lines', label: 'خطوط', css: 'opacity-10 [background-image:repeating-linear-gradient(45deg,#fff_0,#fff_1px,transparent_0,transparent_50%)] [background-size:10px_10px]' }
];

export default function App() {
  const [supabase, setSupabase] = useState(null);
  const [userId, setUserId] = useState(null);
  const [view, setView] = useState('lobby'); 
  const [darkMode, setDarkMode] = useState(true);
  const [errorLog, setErrorLog] = useState("");
  
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', password: '' });
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passError, setPassError] = useState('');

  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);
  const scrollRef = useRef();

  // لود کردن کتابخانه Supabase از CDN
  useEffect(() => {
    const initSupabase = () => {
      if (window.supabase) {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabase(client);
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = () => {
          if (window.supabase) {
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            setSupabase(client);
          }
        };
        document.body.appendChild(script);
      }
    };
    initSupabase();

    let storedId = localStorage.getItem('nexchat_user_id');
    if (!storedId) {
      storedId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('nexchat_user_id', storedId);
    }
    setUserId(storedId);
  }, []);

  const theme = {
    bg: darkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]',
    card: darkMode ? 'bg-[#1e293b]' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-slate-900',
    border: darkMode ? 'border-white/10' : 'border-slate-200',
    input: darkMode ? 'bg-slate-800/50' : 'bg-slate-100',
    bubbleUser: 'bg-violet-600 text-white shadow-lg shadow-violet-500/20',
    bubbleOther: darkMode ? 'bg-slate-700 text-slate-100' : 'bg-white border border-slate-200 text-slate-800',
  };

  useEffect(() => {
    if (!supabase) return;

    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) setRooms(data);
      } catch (err) {
        setErrorLog("خطا در دریافت لیست اتاق‌ها");
      }
    };

    fetchRooms();
    const sub = supabase.channel('lobby_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !activeRoom) return;
    
    const fetchMsgs = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
      scrollToBottom();
    };

    fetchMsgs();

    const ch = supabase.channel(`room_sync_${activeRoom.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `room_id=eq.${activeRoom.id}` 
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'rooms',
        filter: `id=eq.${activeRoom.id}`
      }, payload => {
        setActiveRoom(payload.new);
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'messages' 
      }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, activeRoom?.id]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleJoinRoom = (room) => {
    if (room.password && room.password.trim() !== "" && room.creator_id !== userId) {
      setSelectedRoom(room);
      setPasswordInput('');
      setPassError('');
      setShowPasswordModal(true);
    } else {
      setActiveRoom(room);
      setView('chat');
    }
  };

  const verifyPasswordAndJoin = () => {
    if (passwordInput === selectedRoom.password) {
      setActiveRoom(selectedRoom);
      setShowPasswordModal(false);
      setView('chat');
    } else {
      setPassError('رمز عبور اشتباه است.');
    }
  };

  const createRoom = async () => {
    if (!newRoom.name || !newRoom.name.trim() || isCreating || !supabase) return;
    setIsCreating(true);
    try {
      const roomPayload = {
        name: newRoom.name.trim(),
        creator_id: userId,
        password: newRoom.password && newRoom.password.trim() !== "" ? newRoom.password.trim() : null
      };
      const { data, error } = await supabase.from('rooms').insert([roomPayload]).select();
      if (error) throw error;
      if (data) {
        setNewRoom({ name: '', password: '' });
        setShowCreateModal(false);
        setActiveRoom(data[0]);
        setView('chat');
      }
    } catch (err) {
      setErrorLog("خطا در ساخت اتاق");
    } finally {
      setIsCreating(false);
    }
  };

  const updateRoomTheme = async (field, value) => {
    if (!activeRoom || !supabase) return;
    const { error } = await supabase
      .from('rooms')
      .update({ [field]: value })
      .eq('id', activeRoom.id);
    
    if (error) setErrorLog("خطا در همگام‌سازی ظاهر");
  };

  const sendMsg = async (fileInfo = null) => {
    if ((!input.trim() && !fileInfo) || isSending || !activeRoom || !supabase) return;
    setIsSending(true);
    try {
      const newMsg = {
        text: input.trim(),
        sender_id: userId,
        sender_name: `کاربر ${String(userId).slice(-4)}`,
        room_id: activeRoom.id,
        attachments: fileInfo ? [fileInfo] : [],
        reply_to: replyTo ? { text: replyTo.text, sender: replyTo.sender_name } : null
      };
      await supabase.from('messages').insert([newMsg]);
      setInput('');
      setReplyTo(null);
    } catch (err) {
      setErrorLog("خطا در ارسال");
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (id) => {
    if (!supabase) return;
    await supabase.from('messages').delete().eq('id', id);
  };

  const handleFileUpload = (type) => {
    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { setErrorLog("حجم فایل زیاد است."); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        await sendMsg({ type, fileData: reader.result, fileName: file.name });
      };
      reader.readAsDataURL(file);
    };
    inputEl.click();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          await sendMsg({ type: 'voice', fileData: reader.result, fileName: 'voice.webm' });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e) { setErrorLog('میکروفون در دسترس نیست.'); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };

  const getRoomBg = () => {
    if (!activeRoom) return theme.bg;
    return activeRoom.bg_color || theme.bg;
  };

  const getPatternClass = () => {
    if (!activeRoom?.bg_pattern) return "";
    return PATTERNS.find(p => p.id === activeRoom.bg_pattern)?.css || "";
  };

  return (
    <div className={`flex flex-col h-screen max-w-xl mx-auto ${theme.bg} ${theme.text} rtl relative overflow-hidden`} dir="rtl">
      
      {/* استایل‌های سفارشی برای اسکرول‌بار */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.2); border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* مدال‌ها */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
          <div className={`${theme.card} border ${theme.border} w-full max-w-sm rounded-3xl p-6 relative z-10 shadow-2xl`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">ساخت اتاق جدید</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-500/10 rounded-full text-white"><X/></button>
            </div>
            <div className="space-y-4">
              <input className={`w-full ${theme.input} border ${theme.border} p-4 rounded-2xl outline-none focus:border-violet-500 text-white`} placeholder="نام اتاق..." value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})}/>
              <input type="password" className={`w-full ${theme.input} border ${theme.border} p-4 rounded-2xl outline-none focus:border-violet-500 text-white`} placeholder="رمز عبور (اختیاری)" value={newRoom.password} onChange={e => setNewRoom({...newRoom, password: e.target.value})}/>
              <button onClick={createRoom} disabled={!newRoom.name || isCreating} className="w-full bg-violet-600 text-white p-4 rounded-2xl font-bold shadow-lg">
                تایید و ساخت
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
          <div className={`${theme.card} border ${theme.border} w-full max-w-sm rounded-3xl p-6 relative z-10 shadow-2xl text-center`}>
                <Lock className="mx-auto mb-4 text-amber-500" size={40} />
                <h3 className="text-xl font-bold mb-4">رمز عبور اتاق</h3>
             <input type="password" className={`w-full ${theme.input} border ${theme.border} p-4 rounded-2xl outline-none text-center mb-4`} placeholder="••••••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyPasswordAndJoin()}/>
             {passError && <p className="text-rose-500 text-xs mb-4">{passError}</p>}
             <div className="flex gap-2">
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-slate-500/10 p-3 rounded-xl">لغو</button>
                <button onClick={verifyPasswordAndJoin} className="flex-1 bg-violet-600 text-white p-3 rounded-xl font-bold">ورود</button>
             </div>
          </div>
        </div>
      )}

      {view === 'lobby' ? (
        <div className="flex flex-col h-full">
           <div className={`p-6 ${theme.card} border-b ${theme.border}`}>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-black italic">NEXCHAT <span className="text-violet-500 underline decoration-2">PRO</span></h1>
              <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-500/10 transition-colors">
                {darkMode ? '🌙' : '☀️'}
              </button>
            </div>
            <div className="flex gap-3">
              <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl ${theme.input} border ${theme.border}`}>
                <Search size={18} className="opacity-40" />
                <input placeholder="جستجوی اتاق..." className="bg-transparent outline-none w-full text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <button onClick={() => { setErrorLog(""); setShowCreateModal(true); }} className="bg-violet-600 w-12 h-12 flex items-center justify-center rounded-2xl text-white"><Plus size={24}/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {rooms.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(room => (
              <div key={room.id} onClick={() => handleJoinRoom(room)} className={`p-4 rounded-2xl ${theme.card} border ${theme.border} flex items-center justify-between cursor-pointer shadow-sm`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-black text-2xl">{room.name?.[0]}</div>
                  <div>
                    <div className="flex items-center gap-2"><h3 className="font-bold">{room.name}</h3>{room.password && <Lock size={12} className="text-amber-500"/>}</div>
                    <p className="text-[10px] opacity-40">سازنده: کاربر {String(room.creator_id).slice(-4)}</p>
                  </div>
                </div>
                <ChevronLeft size={20} className="text-violet-500 opacity-50"/>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`flex flex-col h-full relative transition-colors duration-500 ${getRoomBg()}`}>
          <div className={`absolute inset-0 pointer-events-none ${getPatternClass()}`} />

          <header className={`p-4 flex flex-col border-b ${theme.border} ${theme.card} z-10 shadow-md`}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('lobby')} className="p-2 hover:bg-slate-500/10 rounded-xl text-white"><ChevronLeft size={24} /></button>
                <h2 className="font-bold text-sm truncate max-w-[150px]">{activeRoom?.name}</h2>
              </div>
              <button onClick={() => setShowThemePanel(!showThemePanel)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${showThemePanel ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/40' : 'bg-slate-500/10'}`}>
                 <Palette size={20} />
              </button>
            </div>

            {showThemePanel && (
              <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-xl animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold opacity-60 mb-2 text-white">رنگ پس‌زمینه (برای هر دو طرف):</p>
                    <div className="flex flex-wrap gap-3">
                      {COLORS.map((c) => (
                        <button 
                          key={c.value} 
                          onClick={() => updateRoomTheme('bg_color', c.value)}
                          className={`w-9 h-9 rounded-full border-2 transition-transform active:scale-90 ${c.value} ${activeRoom?.bg_color === c.value ? 'border-white scale-110' : 'border-white/10'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold opacity-60 mb-2 text-white">طرح پس‌زمینه (برای هر دو طرف):</p>
                    <div className="flex flex-wrap gap-2">
                      {PATTERNS.map((p) => (
                        <button 
                          key={p.id} 
                          onClick={() => updateRoomTheme('bg_pattern', p.id)}
                          className={`px-3 py-2 rounded-xl text-[10px] border transition-all ${activeRoom?.bg_pattern === p.id ? 'bg-white text-black border-white font-bold' : 'bg-white/5 text-white/60 border-white/10'}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-0 custom-scrollbar">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender_id === userId ? 'items-start' : 'items-end'}`}>
                <div className={`relative max-w-[85%] px-4 py-3 rounded-2xl ${m.sender_id === userId ? theme.bubbleUser : theme.bubbleOther} shadow-sm`}>
                  {m.reply_to && (
                    <div className="mb-2 p-2 bg-black/10 rounded-xl text-[11px] border-r-4 border-violet-400 italic backdrop-blur-sm">
                      <div className="font-bold opacity-80">{m.reply_to.sender}</div>
                      <div className="truncate opacity-60">{m.reply_to.text}</div>
                    </div>
                  )}
                  {m.attachments?.map((at, i) => (
                    <div key={i} className="mb-2 rounded-xl overflow-hidden">
                      {at.type === 'image' && <img src={at.fileData} className="w-full rounded-lg max-h-72 object-cover cursor-pointer" onClick={() => setFullScreenImage(at.fileData)} alt="attachment"/>}
                      {(at.type === 'audio' || at.type === 'voice') && <audio src={at.fileData} controls className="w-full h-10 rounded-full" />}
                    </div>
                  ))}
                  {m.text && <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.text}</p>}
                  <div className="flex items-center justify-between gap-6 mt-2 opacity-40 text-[9px]">
                    <span>{new Date(m.created_at).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}</span>
                    <div className="flex gap-3">
                       <button onClick={() => setReplyTo(m)}><Reply size={14}/></button>
                       {m.sender_id === userId && <button onClick={() => deleteMessage(m.id)}><Trash2 size={14}/></button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <footer className={`p-4 ${theme.card} border-t ${theme.border} z-20`}>
            {replyTo && (
              <div className="flex items-center justify-between p-3 bg-violet-500/10 rounded-t-2xl border-x border-t border-violet-500/20 mb-[-1px]">
                <div className="text-xs truncate pr-3 border-r-4 border-violet-500">
                  <span className="font-bold block text-violet-500 text-[10px]">پاسخ به {replyTo.sender_name}</span>
                  <span className="opacity-70 text-[11px]">{replyTo.text || "فایل"}</span>
                </div>
                <button onClick={() => setReplyTo(null)}><X size={18} /></button>
              </div>
            )}
            <div className="flex gap-4 mb-3 opacity-40 px-2">
              <button onClick={() => handleFileUpload('image')}><ImageIcon size={20}/></button>
              <button onClick={() => handleFileUpload('video')}><Video size={20}/></button>
              <button onClick={() => handleFileUpload('file')}><Paperclip size={20}/></button>
            </div>
            <div className="flex items-end gap-3">
              <div className={`flex-1 ${theme.input} rounded-2xl p-4 border ${theme.border}`}>
                {isRecording ? (
                  <div className="flex justify-between items-center text-rose-500 animate-pulse font-bold text-sm h-6">
                    <div> ضبط صدا...</div><span>{recordingTime}s</span>
                  </div>
                ) : (
                  <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="پیام..." className="bg-transparent w-full outline-none text-[14px] resize-none max-h-32 text-white" rows={1} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMsg())}/>
                )}
              </div>
              <button 
                onMouseDown={(!input.trim() && !isSending) ? startRecording : undefined} 
                onMouseUp={(!input.trim() && !isSending) ? stopRecording : undefined}
                onClick={(input.trim() && !isSending) ? () => sendMsg() : undefined}
                className={`${(input.trim() || isRecording) ? 'bg-violet-600' : 'bg-slate-500/20 text-slate-400'} w-14 h-14 flex items-center justify-center rounded-2xl text-white shadow-xl shrink-0`}
              >
                {isSending ? <Loader2 className="animate-spin" size={24}/> : (input.trim() ? <Send size={24}/> : <Mic size={24}/>)}
              </button>
            </div>
          </footer>
        </div>
      )}

      {fullScreenImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullScreenImage(null)}>
          <img src={fullScreenImage} className="max-w-full max-h-full object-contain" alt="fullscreen" />
        </div>
      )}
    </div>
  );
}