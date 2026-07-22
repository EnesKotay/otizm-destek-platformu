import { useState, useRef } from 'react';
import { Play, Pause, Clock, Plus, Trash2, CheckCircle2, MessageSquare, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface TimestampNote {
  id: string;
  timeSeconds: number;
  timeFormatted: string;
  text: string;
  authorName?: string;
  createdAt?: string;
}

interface TimestampedVideoPlayerProps {
  videoUrl: string;
  initialNotes?: TimestampNote[];
  onSaveNotes?: (notes: TimestampNote[]) => void;
  readOnly?: boolean;
}

function formatSeconds(sec: number): string {
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function TimestampedVideoPlayer({
  videoUrl,
  initialNotes = [],
  onSaveNotes,
  readOnly = false,
}: TimestampedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState<TimestampNote[]>(initialNotes);
  const [newNoteText, setNewNoteText] = useState('');

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (timeSec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timeSec;
    setCurrentTime(timeSec);
  };

  const handleAddNote = () => {
    if (!newNoteText.trim() || !videoRef.current) return;
    const timeSec = videoRef.current.currentTime;
    const timeFormatted = formatSeconds(timeSec);
    const newNote: TimestampNote = {
      id: String(Date.now()),
      timeSeconds: timeSec,
      timeFormatted,
      text: newNoteText.trim(),
      createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [...notes, newNote].sort((a, b) => a.timeSeconds - b.timeSeconds);
    setNotes(updated);
    setNewNoteText('');
    onSaveNotes?.(updated);
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    onSaveNotes?.(updated);
  };

  return (
    <div className="space-y-4">
      {/* Video Oynatıcı Alanı */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 shadow-lg border border-slate-800 group">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
          onEnded={() => setIsPlaying(false)}
          className="w-full max-h-[380px] object-contain mx-auto"
        />

        {/* Video Kontrol Barı */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between gap-3 text-white">
          <button
            type="button"
            onClick={togglePlay}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur transition-all text-white cursor-pointer"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <span className="text-xs font-mono font-bold text-slate-200">
            {formatSeconds(currentTime)} / {formatSeconds(duration)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="flex-1 accent-primary-500 h-1.5 rounded-lg cursor-pointer bg-white/30"
          />
        </div>
      </div>

      {/* Zaman Damgalı Geribildirim Notu Ekleme Formu */}
      {!readOnly && (
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Clock size={14} className="text-primary-600" />
              Zaman Damgalı Geribildirim Ekle
              <span className="px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 text-[11px] font-mono font-bold">
                {formatSeconds(currentTime)}
              </span>
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Örn: 01:20 - Duyu materyali tutuş açısı ve parmak kavrayışı çok başarılı..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              className="text-xs"
            />
            <Button
              type="button"
              onClick={handleAddNote}
              disabled={!newNoteText.trim()}
              size="sm"
              className="shrink-0 font-bold"
            >
              <Plus size={15} />
              Not Ekle
            </Button>
          </div>
        </div>
      )}

      {/* Zaman Damgaları Listesi */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <MessageSquare size={13} />
          Zaman Damgalı İnceleme Notları ({notes.length})
        </p>

        {notes.length === 0 ? (
          <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 text-xs font-medium text-slate-400">
            Henüz zaman damgalı not eklenmedi. Videonun istediğiniz saniyesinde not bırakabilirsiniz.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex items-start justify-between gap-3 p-3 bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-xl transition-all shadow-sm group"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleSeek(note.timeSeconds)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-mono font-bold border border-primary-200/60 transition-colors shrink-0 cursor-pointer"
                    title="Videonun bu saniyesine git"
                  >
                    <Clock size={12} />
                    {note.timeFormatted}
                  </button>

                  <div>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                      {note.text}
                    </p>
                    {note.createdAt && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {note.createdAt}
                      </span>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                    title="Notu sil"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
