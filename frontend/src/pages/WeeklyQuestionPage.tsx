import { useState } from 'react';
import { Flame, MessageSquare, Heart, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { Button } from '@/components/ui/Button';
import { toast } from '@/store/toastStore';

const WEEKLY_QUESTIONS = [
  {
    id: 1,
    tag: '#günlük',
    question: 'Çocuğunuzla en çok hangi aktiviteyi yapıyorsunuz ve neden işe yarıyor?',
    weekLabel: 'Bu Hafta',
    answers: [
      { id: 1, author: 'Ayşe K.', city: 'İstanbul', text: 'Sabahları 10 dakika yapboz yapıyoruz. Hem sakinleştiriyor hem de el-göz koordinasyonunu geliştiriyor. Büyük parçalı yapbozlardan başladık.', likes: 14, liked: false },
      { id: 2, author: 'Mehmet Y.', city: 'Ankara', text: 'Su oyunu! Leğene biraz su koyup çeşitli kaplar, kepçe veriyorum. Saatlerce oynuyor. Duyusal olarak çok iyi geliyor.', likes: 9, liked: false },
      { id: 3, author: 'Zeynep A.', city: 'İzmir', text: 'Müzik dinlerken dans etmek. Başta çekiniyordu ama şimdi kendisi istiyor. Hem eğleniyor hem göz teması artıyor yavaş yavaş.', likes: 7, liked: true },
    ],
  },
  {
    id: 2,
    tag: '#okul',
    question: 'Çocuğunuzu okula ya da terapiye hazırlarken ne yapıyorsunuz?',
    weekLabel: 'Geçen Hafta',
    answers: [
      { id: 4, author: 'Fatma Ö.', city: 'Bursa', text: 'Görsel bir program hazırladım. Her sabah adımları resimli kartlarla gösteriyorum: önce kahvaltı, sonra giyinme, sonra çanta, sonra araba. Bu rutin çok işe yaradı.', likes: 22, liked: false },
      { id: 5, author: 'Ali Ç.', city: 'Antalya', text: 'Bir gün önceden hazırlık yapıyoruz. Kıyafeti birlikte seçiyoruz, çantayı beraber hazırlıyoruz. Sabah sürprizi olmasın diye.', likes: 11, liked: false },
    ],
  },
  {
    id: 3,
    tag: '#duyusal',
    question: 'Duyusal bunalma anında çocuğunuzu sakinleştirmek için ne yapıyorsunuz?',
    weekLabel: '2 Hafta Önce',
    answers: [
      { id: 6, author: 'Selin D.', city: 'İstanbul', text: 'Sakin bir odaya geçiyoruz, ışıkları kısıyoruz. Sevdiği ağır battaniyeyi veriyorum. Konuşmuyorum, sadece yanında oturuyorum.', likes: 31, liked: false },
    ],
  },
];

interface Answer {
  id: number;
  author: string;
  city: string;
  text: string;
  likes: number;
  liked: boolean;
}

interface Question {
  id: number;
  tag: string;
  question: string;
  weekLabel: string;
  answers: Answer[];
}

export function WeeklyQuestionPage() {
  const [questions, setQuestions] = useState<Question[]>(WEEKLY_QUESTIONS);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([1]));
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[0];
  const pastQuestions = questions.slice(1);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLike = (questionId: number, answerId: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        answers: q.answers.map(a => {
          if (a.id !== answerId) return a;
          return { ...a, liked: !a.liked, likes: a.liked ? a.likes - 1 : a.likes + 1 };
        }),
      };
    }));
  };

  const handleSubmit = async () => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const newAnswer: Answer = {
      id: Date.now(),
      author: 'Siz',
      city: '',
      text: answerText.trim(),
      likes: 0,
      liked: false,
    };
    setQuestions(prev => prev.map((q, i) => i === 0 ? { ...q, answers: [newAnswer, ...q.answers] } : q));
    setAnswerText('');
    setSubmitting(false);
    toast.success('Cevabınız paylaşıldı, teşekkürler!');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <PageOnboarding
        pageId="weekly-question"
        title="Haftanın Sorusu"
        description="Her hafta yeni bir konu, herkesin paylaşabileceği bir soru. Cevabınız başka bir aileye yol gösterebilir."
        steps={[
          {
            icon: <Flame size={20} />,
            title: 'Bu Haftanın Sorusunu Okuyun',
            description: 'Her Pazartesi yeni bir soru yayınlanır.',
          },
          {
            icon: <MessageSquare size={20} />,
            title: 'Cevabınızı Yazın',
            description: 'Kısa da olsa değerli. Bir cümle bile yeterli.',
          },
          {
            icon: <Heart size={20} />,
            title: 'Başkalarını Destekleyin',
            description: 'Faydalı bulduğunuz cevaplara kalp gönderin.',
          },
        ]}
      />

      {/* Bu haftanın sorusu */}
      <div className="rounded-3xl overflow-hidden border border-indigo-100 shadow-sm">
        <div className="p-6" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={18} className="text-yellow-300" />
            <span className="text-indigo-200 text-sm font-bold uppercase tracking-wide">Bu Haftanın Sorusu</span>
            <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">{currentQuestion.tag}</span>
          </div>
          <p className="text-white text-xl font-bold leading-snug">{currentQuestion.question}</p>
          <p className="mt-3 text-indigo-200 text-sm">{currentQuestion.answers.length} kişi cevap verdi</p>
        </div>

        {/* Cevap yaz */}
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
            <Button onClick={handleSubmit} disabled={!answerText.trim() || submitting}>
              <Send size={15} className="mr-2" />
              {submitting ? 'Gönderiliyor...' : 'Cevabı Paylaş'}
            </Button>
          </div>
        </div>

        {/* Mevcut cevaplar */}
        <div className="bg-white divide-y divide-gray-50">
          {currentQuestion.answers.map(answer => (
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
                  <p className="text-sm text-gray-700 leading-relaxed">{answer.text}</p>
                  <button
                    onClick={() => toggleLike(currentQuestion.id, answer.id)}
                    className={`mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${answer.liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
                  >
                    <Heart size={14} className={answer.liked ? 'fill-rose-500' : ''} />
                    {answer.likes} faydalı buldu
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Geçmiş sorular */}
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
                  {q.answers.map(answer => (
                    <div key={answer.id} className="p-4 pl-5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">{answer.author}</span>
                        {answer.city && <span className="text-xs text-gray-400">{answer.city}</span>}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{answer.text}</p>
                      <button
                        onClick={() => toggleLike(q.id, answer.id)}
                        className={`mt-2 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${answer.liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
                      >
                        <Heart size={13} className={answer.liked ? 'fill-rose-500' : ''} />
                        {answer.likes}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
