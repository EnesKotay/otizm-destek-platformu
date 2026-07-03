import { useEffect, useState } from 'react';
import { Flame, MessageSquare, Heart, ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { communityService, type WeeklyAnswer, type WeeklyQuestion } from '@/services/communityService';
import { toast } from '@/store/toastStore';

export function WeeklyQuestionPage() {
  const [questions, setQuestions] = useState<WeeklyQuestion[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    communityService.getWeeklyQuestions()
      .then(data => {
        setQuestions(data);
        if (data[0]) setExpandedIds(new Set([data[0].id]));
      })
      .catch(err => toast.error(err instanceof Error ? err.message : 'Haftanın sorusu yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  const currentQuestion = questions[0];
  const pastQuestions = questions.slice(1);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateAnswer = (questionId: string, answer: WeeklyAnswer) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      const exists = q.answers.some(a => a.id === answer.id);
      return {
        ...q,
        answers: exists
          ? q.answers.map(a => a.id === answer.id ? answer : a)
          : [answer, ...q.answers],
      };
    }));
  };

  const toggleLike = async (questionId: string, answerId: string) => {
    if (likingIds.has(answerId)) return;
    setLikingIds(prev => new Set(prev).add(answerId));
    try {
      const updated = await communityService.toggleWeeklyAnswerLike(answerId);
      updateAnswer(questionId, updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Beğeni kaydedilemedi.');
    } finally {
      setLikingIds(prev => {
        const next = new Set(prev);
        next.delete(answerId);
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!answerText.trim() || !currentQuestion) return;
    setSubmitting(true);
    try {
      const answer = await communityService.createWeeklyAnswer(currentQuestion.id, answerText.trim());
      updateAnswer(currentQuestion.id, answer);
      setAnswerText('');
      toast.success('Cevabınız paylaşıldı, teşekkürler!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cevap paylaşılamadı.');
    }
    setSubmitting(false);
  };

  const renderAnswer = (question: WeeklyQuestion, answer: WeeklyAnswer) => (
    <div key={answer.id} className="p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
          {answer.author.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-900">{answer.author}</span>
            {answer.city && <span className="text-xs text-gray-400">{answer.city}</span>}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{answer.text}</p>
          <button
            onClick={() => toggleLike(question.id, answer.id)}
            disabled={likingIds.has(answer.id)}
            className={`mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${answer.liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
          >
            <Heart size={14} className={answer.liked ? 'fill-rose-500' : ''} />
            {answer.likes} faydalı buldu
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <EmptyState
        icon={<Flame size={28} />}
        title="Henüz haftalık soru yok"
        description="Yeni soru yayınlandığında burada ailelerin cevaplarını görebileceksiniz."
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <PageOnboarding
        pageId="weekly-question"
        title="Haftanın Sorusu"
        description="Her hafta yeni bir konu, herkesin paylaşabileceği bir soru. Cevabınız başka bir aileye yol gösterebilir."
        steps={[
          { icon: <Flame size={20} />, title: 'Bu Haftanın Sorusunu Okuyun', description: 'Her Pazartesi yeni bir soru yayınlanır.' },
          { icon: <MessageSquare size={20} />, title: 'Cevabınızı Yazın', description: 'Kısa da olsa değerli. Bir cümle bile yeterli.' },
          { icon: <Heart size={20} />, title: 'Başkalarını Destekleyin', description: 'Faydalı bulduğunuz cevaplara kalp gönderin.' },
        ]}
      />

      <div className="rounded-3xl overflow-hidden border border-indigo-100 shadow-sm">
        <div className="p-6" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={18} className="text-yellow-300" />
            <span className="text-indigo-200 text-sm font-bold uppercase tracking-wide">Bu Haftanın Sorusu</span>
            {currentQuestion.tag && <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">{currentQuestion.tag}</span>}
          </div>
          <p className="text-white text-xl font-bold leading-snug">{currentQuestion.question}</p>
          <p className="mt-3 text-indigo-200 text-sm">{currentQuestion.answers.length} kişi cevap verdi</p>
        </div>

        <div className="bg-white p-5 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Siz ne yapıyorsunuz?</p>
          <textarea
            rows={3}
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            placeholder="Kısa da olsa değerli. Deneyiminizi paylaşın..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={handleSubmit} disabled={!answerText.trim() || submitting} loading={submitting}>
              <Send size={15} className="mr-2" />
              Cevabı Paylaş
            </Button>
          </div>
        </div>

        <div className="bg-white divide-y divide-gray-50">
          {currentQuestion.answers.length > 0 ? (
            currentQuestion.answers.map(answer => renderAnswer(currentQuestion, answer))
          ) : (
            <p className="p-5 text-sm text-gray-500">İlk cevabı siz paylaşın.</p>
          )}
        </div>
      </div>

      {pastQuestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-700">Önceki Sorular</h2>
          {pastQuestions.map(q => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleExpand(q.id)}
                className="w-full flex items-start justify-between gap-3 p-5 text-left cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{q.weekLabel} · {q.tag}</span>
                  <p className="mt-1 text-sm font-semibold text-gray-900 leading-snug">{q.question}</p>
                  <p className="mt-1 text-xs text-gray-400">{q.answers.length} cevap</p>
                </div>
                {expandedIds.has(q.id) ? <ChevronUp size={16} className="text-gray-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />}
              </button>

              {expandedIds.has(q.id) && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {q.answers.length > 0 ? q.answers.map(answer => renderAnswer(q, answer)) : (
                    <p className="p-4 text-sm text-gray-500">Bu soruya henüz cevap verilmedi.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
