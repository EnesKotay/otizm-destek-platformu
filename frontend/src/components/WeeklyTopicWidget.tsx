import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ChevronRight, Flame, PenLine } from 'lucide-react';
import { communityService } from '@/services/communityService';

export interface WeeklyTopic {
  tag: string;
  title: string;
  replies: number;
}

interface WeeklyTopicWidgetProps {
  variant?: 'dashboard' | 'forum';
  onJoin?: (topic: WeeklyTopic) => void;
}

export function WeeklyTopicWidget({ variant = 'dashboard', onJoin }: WeeklyTopicWidgetProps) {
  const [topic, setTopic] = useState<WeeklyTopic | null>(null);

  useEffect(() => {
    let cancelled = false;
    communityService.getWeeklyQuestions()
      .then(questions => {
        if (cancelled || !questions[0]) return;
        const current = questions[0];
        setTopic({
          tag: current.tag ?? '',
          title: current.question,
          replies: current.answers.length,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!topic) return null;

  if (variant === 'forum') {
    return (
      <div
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
      >
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Flame size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sky-100 text-xs font-medium mb-0.5">🔥 Haftanın Konusu</p>
          <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{topic.title}</p>
          <p className="text-sky-200 text-xs mt-1">{topic.tag} · {topic.replies} yanıt</p>
        </div>
        <button
          onClick={() => onJoin?.(topic)}
          className="flex items-center gap-1.5 shrink-0 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          <PenLine size={13} />
          Katıl
        </button>
      </div>
    );
  }

  return (
    <Link to="/haftalik-soru">
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-indigo-100 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
            <Flame size={18} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Haftanın Konusu</span>
              <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full font-medium">{topic.tag}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 leading-snug">{topic.title}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MessageSquare size={11} /> {topic.replies} yanıt
              </span>
              <span className="text-xs text-indigo-600 font-medium">Tartışmaya katıl →</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-indigo-400 shrink-0 mt-1" />
        </div>
      </div>
    </Link>
  );
}
