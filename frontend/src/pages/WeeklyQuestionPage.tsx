import { useEffect, useState } from 'react';
import { 
  Flame, 
  MessageSquare, 
  Heart, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Loader2, 
  Search, 
  Award, 
  Users, 
  MapPin, 
  Sparkles, 
  Clock, 
  EyeOff, 
  TrendingUp, 
  CheckCircle2, 
  Info 
} from 'lucide-react';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { communityService, type WeeklyAnswer, type WeeklyQuestion } from '@/services/communityService';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';

const EXPERT_ADVICE: Record<string, { author: string; title: string; text: string; avatar: string }> = {
  '#günlük': {
    author: 'Dr. Enes Can Kotay',
    title: 'Çocuk Psikiyatristi',
    text: 'Duyusal ve motor becerileri destekleyen oyunlarda çocuğun liderliğini takip edin. Eğer yapbozu ters yerleştiriyorsa düzeltmeyin, önce onun oyun dünyasına dahil olun. Ortak dikkat geliştirmek için harika bir fırsattır.',
    avatar: 'E'
  },
  '#okul': {
    author: 'Uzm. Özel Eğitimci Yasin Gülşen',
    title: 'Özel Eğitim Uzmanı',
    text: 'Okul ve terapi geçişlerinde görsel çizelgeler kaygıyı %80 azaltır. Rutinin her adımını resimli kartlarla takip etmek, çocuğun ne zaman ne olacağını öngörmesini sağlayarak öfke nöbetlerini engeller.',
    avatar: 'Y'
  },
  '#duyusal': {
    author: 'Dr. Enes Can Kotay',
    title: 'Çocuk Psikiyatristi',
    text: 'Duyusal bunalma sırasında derin basınç uygulaması (ağır battaniye, sıkı sarılma) sinir sistemini yatıştırır. Bu hassas anlarda sözel yönergeleri minimumda tutun ve sakin bir ses tonu kullanın.',
    avatar: 'E'
  }
};

const AVAILABLE_TAGS = ['Oyun', 'Duyusal', 'Rutin', 'Eğitim', 'Kriz Yönetimi'];
const CHAR_LIMIT = 500;

const TABS = [
  { id: 'all', label: 'Tüm Cevaplar', icon: MessageSquare },
  { id: 'expert', label: 'Uzman Görüşleri', icon: Award },
  { id: 'popular', label: 'En Popüler', icon: TrendingUp },
  { id: 'local', label: 'Şehrimden', icon: MapPin },
] as const;

// Metadata parse helper
const parseAnswerText = (rawText: string) => {
  let text = rawText;
  let isAnonymous = false;
  let tags: string[] = [];

  if (text.startsWith('[ANONYMOUS_META:true]')) {
    isAnonymous = true;
    text = text.replace('[ANONYMOUS_META:true]', '');
  }

  const tagsMatch = text.match(/^\[TAGS:(.*?)\]/);
  if (tagsMatch) {
    tags = tagsMatch[1].split(',').filter(Boolean);
    text = text.replace(/^\[TAGS:(.*?)\]/, '');
  }

  return { text, isAnonymous, tags };
};

export function WeeklyQuestionPage() {
  const { user } = useAuthStore();
  const userCity = user?.city || '';

  const [questions, setQuestions] = useState<WeeklyQuestion[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [answerText, setAnswerText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hideLocation, setHideLocation] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [poppingAnswerId, setPoppingAnswerId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'expert' | 'popular' | 'local'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    communityService.getWeeklyQuestions()
      .then(data => {
        setQuestions(data);
        if (data[0]) {
          setExpandedIds(new Set([data[0].id]));
        }
      })
      .catch(err => toast.error(err instanceof Error ? err.message : 'Haftanın soruları yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  const currentQuestion = questions[0];
  const pastQuestions = questions.slice(1);

  const charCount = answerText.length;

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
    setPoppingAnswerId(answerId);
    setTimeout(() => setPoppingAnswerId(null), 300);

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
      let rawText = '';
      if (isAnonymous) {
        rawText += '[ANONYMOUS_META:true]';
      }
      if (selectedTags.length > 0) {
        rawText += `[TAGS:${selectedTags.join(',')}]`;
      }
      rawText += answerText.trim();

      const answer = await communityService.createWeeklyAnswer(currentQuestion.id, rawText);
      updateAnswer(currentQuestion.id, answer);
      setAnswerText('');
      setSelectedTags([]);
      setIsAnonymous(false);
      setHideLocation(false);
      toast.success('Cevabınız paylaşıldı, teşekkürler!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cevap paylaşılamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-600" />
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

  // Parse and filter current answers
  const filteredAnswers = (currentQuestion.answers || []).map(answer => {
    const parsed = parseAnswerText(answer.text);
    const isExpertUser = answer.authorRole === 'EXPERT' || answer.author.includes('Uzm.') || answer.author.includes('Dr.');
    return {
      ...answer,
      displayText: parsed.text,
      isAnonymous: parsed.isAnonymous,
      tags: parsed.tags,
      isExpert: isExpertUser
    };
  }).filter(answer => {
    // Search query check
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesText = answer.displayText.toLowerCase().includes(query);
      const matchesAuthor = answer.isAnonymous ? false : answer.author.toLowerCase().includes(query);
      const matchesCity = (answer.isAnonymous || hideLocation) ? false : (answer.city?.toLowerCase().includes(query) || false);
      const matchesTitle = answer.expertTitle?.toLowerCase().includes(query) || false;
      if (!matchesText && !matchesAuthor && !matchesCity && !matchesTitle) {
        return false;
      }
    }

    // Tab check
    if (activeTab === 'expert') {
      return answer.isExpert;
    }
    if (activeTab === 'local') {
      if (answer.isAnonymous) return false;
      return userCity ? answer.city?.toLowerCase() === userCity.toLowerCase() : true;
    }
    return true;
  });

  // Sort by popular tab
  if (activeTab === 'popular') {
    filteredAnswers.sort((a, b) => b.likes - a.likes);
  }

  // Dashboard Stats
  const totalAnswersCount = questions.reduce((acc, q) => acc + (q.answers?.length || 0), 0);
  const totalLikesCount = questions.reduce((acc, q) => acc + (q.answers?.reduce((sum, a) => sum + a.likes, 0) || 0), 0);
  const activeExpertAdvice = currentQuestion.tag ? EXPERT_ADVICE[currentQuestion.tag] : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
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

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Question & Answers */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl overflow-hidden border border-slate-100 shadow-sm bg-white relative">
            
            {/* Header / Question card */}
            <div className="p-6 text-white relative overflow-hidden bg-gradient-to-r from-sky-600 to-sky-700">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={18} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                  <span className="text-sky-100 text-xs font-black uppercase tracking-wider">Bu Haftanın Sorusu</span>
                  {currentQuestion.tag && (
                    <span className="ml-auto text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">{currentQuestion.tag}</span>
                  )}
                </div>
                <p className="text-white text-lg font-bold leading-snug">{currentQuestion.question}</p>
                
                {/* Stats Dashboard */}
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs text-sky-100">
                  <div className="flex items-center justify-center gap-1.5 bg-white/10 border border-white/5 rounded-xl px-2.5 py-1.5 backdrop-blur-sm shadow-sm">
                    <Users size={14} className="text-sky-200" />
                    <span className="font-semibold">{currentQuestion.answers?.length || 0} Aile</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 bg-white/10 border border-white/5 rounded-xl px-2.5 py-1.5 backdrop-blur-sm shadow-sm">
                    <Award size={14} className="text-yellow-300" />
                    <span className="font-semibold">{currentQuestion.answers?.filter(a => a.authorRole === 'EXPERT' || a.author.includes('Uzm.') || a.author.includes('Dr.')).length || 0} Uzman</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 bg-white/10 border border-white/5 rounded-xl px-2.5 py-1.5 backdrop-blur-sm shadow-sm">
                    <Heart size={14} className="text-rose-300" />
                    <span className="font-semibold">{currentQuestion.answers?.reduce((acc, a) => acc + a.likes, 0) || 0} Beğeni</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Box */}
            <div className="bg-white p-5 border-b border-gray-100 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Siz ne yapıyorsunuz?</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={answerText}
                    maxLength={CHAR_LIMIT}
                    onChange={e => setAnswerText(e.target.value)}
                    placeholder="Kısa da olsa değerli. Deneyiminizi paylaşın..."
                    className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 transition-all placeholder:text-gray-400"
                  />
                  <span className={`absolute bottom-3 right-3 text-xs ${
                    charCount >= CHAR_LIMIT - 50 ? 'text-red-500 font-bold' : charCount >= CHAR_LIMIT - 100 ? 'text-amber-500 font-medium' : 'text-slate-400'
                  }`}>
                    {charCount}/{CHAR_LIMIT}
                  </span>
                </div>
              </div>

              {/* Tag Selector */}
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Yanıtınızı Etiketleyin:</span>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Privacy and share */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 transition-colors select-none">
                    <input 
                      type="checkbox" 
                      checked={isAnonymous} 
                      onChange={e => setIsAnonymous(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" 
                    />
                    <EyeOff size={14} className="shrink-0" />
                    Anonim olarak paylaş
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 transition-colors select-none">
                    <input 
                      type="checkbox" 
                      checked={hideLocation} 
                      onChange={e => setHideLocation(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" 
                    />
                    <MapPin size={14} className="shrink-0" />
                    Şehrimi gizle
                  </label>
                </div>

                <Button onClick={handleSubmit} disabled={!answerText.trim() || submitting} loading={submitting}>
                  <Send size={15} className="mr-2" />
                  Cevabı Paylaş
                </Button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-50/50 p-4 border-b border-gray-100 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {TABS.map(tab => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-white text-sky-600 shadow-sm border border-slate-200/60' 
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <IconComponent size={13} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full md:w-60 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cevaplarda ara..."
                    className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 transition-all"
                  />
                </div>
              </div>

              {activeTab === 'local' && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-sky-50/50 rounded-lg p-2 border border-sky-100/50">
                  <Info size={12} className="text-sky-500 shrink-0" />
                  <span>
                    {userCity 
                      ? `Sadece "${userCity}" şehrindeki ailelerin paylaşımları listeleniyor.` 
                      : 'Profilinizde şehir bilgisi bulunmadığı için tüm cevaplar listeleniyor. Profilinizden şehrinizi güncelleyebilirsiniz.'
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Answer List */}
            <div className="bg-white divide-y divide-gray-50 min-h-[150px]">
              {filteredAnswers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <MessageSquare className="mx-auto text-slate-300" size={24} />
                  <p className="text-sm font-medium">Aradığınız kriterde cevap bulunamadı.</p>
                  <p className="text-xs">İlk cevabı siz yazarak topluluğa rehberlik edebilirsiniz.</p>
                </div>
              ) : (
                filteredAnswers.map(answer => {
                  const isCurrentUser = answer.author === 'Siz' || answer.author === user?.fullName;
                  return (
                    <div 
                      key={answer.id} 
                      className={`p-5 transition-colors ${
                        answer.isExpert 
                          ? 'bg-gradient-to-r from-amber-50/15 to-orange-50/15 hover:bg-slate-50/50' 
                          : isCurrentUser 
                            ? 'bg-slate-50/30' 
                            : 'hover:bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm relative ${
                          answer.isExpert
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                            : isCurrentUser
                              ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white'
                              : 'bg-gradient-to-br from-sky-100 to-blue-100 text-sky-600'
                        }`}>
                          {answer.isExpert ? (
                            <Award size={18} className="text-white" />
                          ) : (
                            answer.author.charAt(0)
                          )}
                          
                          {isCurrentUser && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full" />
                          )}
                        </div>

                        {/* Content details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                            <span className={`text-sm font-bold truncate ${
                              answer.isExpert ? 'text-amber-800' : 'text-gray-900'
                            }`}>
                              {answer.isExpert ? answer.author : (answer.isAnonymous ? 'Bir Otizm Ailesi' : answer.author)}
                            </span>

                            {answer.isExpert && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <CheckCircle2 size={10} />
                                Uzman Görüşü
                              </span>
                            )}

                            {isCurrentUser && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 text-sky-600 border border-sky-100">
                                Siz
                              </span>
                            )}

                            {!answer.isAnonymous && !hideLocation && answer.city && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-slate-400 font-semibold">
                                <MapPin size={10} />
                                {answer.city}
                              </span>
                            )}
                          </div>

                          {answer.isExpert && answer.expertTitle && (
                            <p className="text-xs font-semibold text-amber-700/80 -mt-1 mb-1.5">{answer.expertTitle}</p>
                          )}

                          <p className="text-sm text-gray-700 leading-relaxed font-normal whitespace-pre-wrap">{answer.displayText}</p>
                          
                          {/* Tags */}
                          {answer.tags && answer.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {answer.tags.map(t => (
                                <span key={t} className="text-[10px] font-semibold text-sky-600 bg-sky-50/50 px-2 py-0.5 rounded-md">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Heart Button */}
                          <button
                            onClick={() => toggleLike(currentQuestion.id, answer.id)}
                            disabled={likingIds.has(answer.id)}
                            className={`mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold transition-all px-2.5 py-1 rounded-full cursor-pointer border ${
                              answer.liked 
                                ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-sm' 
                                : 'bg-slate-50/50 border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50/20'
                            }`}
                          >
                            <Heart 
                              size={13} 
                              className={`transition-all duration-300 ${
                                poppingAnswerId === answer.id ? 'scale-130 fill-rose-500 text-rose-500' : ''
                              } ${answer.liked ? 'fill-rose-500 text-rose-500' : ''}`} 
                            />
                            <span>{answer.likes} kişi faydalı buldu</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Information & Sidebars */}
        <div className="space-y-6">
          
          {/* Expert tip widget */}
          {/* Expert tip widget */}
          {activeExpertAdvice && (
            <div className="bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10 rounded-2xl border border-amber-100 shadow-sm overflow-hidden p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-amber-100/60">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                  <Award size={15} />
                </div>
                <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">Haftanın Uzman Tavsiyesi</h3>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-amber-800 font-semibold italic leading-relaxed">
                  "{activeExpertAdvice.text}"
                </p>
              </div>
            </div>
          )}

          {/* Topluluk İstatistikleri */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-400 to-sky-600" />
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shadow-sm">
                <TrendingUp size={15} />
              </div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Topluluk Katılımı</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Toplam Katılım</span>
                <span className="text-lg font-extrabold text-slate-800">{totalAnswersCount} Yanıt</span>
              </div>
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Faydalı Fikirler</span>
                <span className="text-lg font-extrabold text-slate-800">{totalLikesCount} Kalp</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600 py-1 border-b border-slate-50">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users size={12} className="text-slate-400" /> Aktif Aileler
                </span>
                <span className="font-bold text-slate-800">24 Aile</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 py-1 border-b border-slate-50">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin size={12} className="text-slate-400" /> En Aktif Şehir
                </span>
                <span className="font-bold text-slate-800">İstanbul</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 py-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles size={12} className="text-slate-400" /> Öne Çıkan Etiket
                </span>
                <span className="font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full text-[10px]">#Oyun</span>
              </div>
            </div>
          </div>

          {/* Countdown & Upcoming Topic */}
          <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-sky-500/10 blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sky-400 border border-white/5 shadow-sm">
                <Clock size={14} />
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Yeni Soruya Kalan Süre</h3>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 text-center">
                <div className="flex-1 bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="block text-lg font-black text-sky-400">03</span>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Gün</span>
                </div>
                <div className="flex-1 bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="block text-lg font-black text-sky-400">12</span>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Saat</span>
                </div>
                <div className="flex-1 bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="block text-lg font-black text-sky-400">45</span>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Dakika</span>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1">
                <span className="block text-[10px] font-bold text-sky-400 uppercase">Gelecek Haftanın Konusu</span>
                <p className="text-xs font-bold text-slate-200">Çocuklarda Akran Etkileşimi ve Sosyalleşme</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Past Questions Accordion */}
      {pastQuestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-700 flex items-center gap-1.5">
            <MessageSquare size={16} className="text-slate-400" />
            Önceki Sorular
          </h2>
          {pastQuestions.map(q => {
            const isExpanded = expandedIds.has(q.id);
            const parsedAnswers = (q.answers || []).map(a => {
              const parsed = parseAnswerText(a.text);
              const isExpertUser = a.authorRole === 'EXPERT' || a.author.includes('Uzm.') || a.author.includes('Dr.');
              return {
                ...a,
                displayText: parsed.text,
                isAnonymous: parsed.isAnonymous,
                isExpert: isExpertUser
              };
            });
            const topAnswer = [...parsedAnswers].sort((a, b) => b.likes - a.likes)[0];

            return (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:border-gray-200">
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="w-full flex items-start justify-between gap-3 p-5 text-left cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {q.weekLabel && <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{q.weekLabel}</span>}
                      {q.tag && <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{q.tag}</span>}
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-gray-900 leading-snug">{q.question}</p>
                    
                    <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-400 font-semibold">
                      <span>{q.answers?.length || 0} cevap</span>
                      <span>{q.answers?.reduce((acc, a) => acc + a.likes, 0) || 0} faydalı oyu</span>
                    </div>

                    {!isExpanded && topAnswer && (
                      <div className="mt-3.5 flex items-start gap-2 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                        <Award size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-bold text-slate-800">{topAnswer.isAnonymous ? 'Bir Otizm Ailesi' : topAnswer.author}</span>
                          {topAnswer.isExpert && (
                            <span className="ml-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Uzman</span>
                          )}: "{topAnswer.displayText}"
                        </div>
                      </div>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-gray-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50 bg-slate-50/10">
                    {parsedAnswers.map(answer => (
                      <div key={answer.id} className={`p-4 pl-6 transition-colors ${answer.isExpert ? 'bg-gradient-to-r from-amber-50/10 to-orange-50/10' : ''}`}>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">
                            {answer.isExpert ? answer.author : (answer.isAnonymous ? 'Bir Otizm Ailesi' : answer.author)}
                          </span>
                          {answer.isExpert && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">Uzman Görüşü</span>
                          )}
                          {!answer.isAnonymous && answer.city && (
                            <span className="text-xs text-slate-400 flex items-center gap-0.5 font-semibold">
                              <MapPin size={10} />
                              {answer.city}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{answer.displayText}</p>
                        
                        <button
                          onClick={() => toggleLike(q.id, answer.id)}
                          disabled={likingIds.has(answer.id)}
                          className={`mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            answer.liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'
                          }`}
                        >
                          <Heart size={13} className={answer.liked ? 'fill-rose-500 text-rose-500' : ''} />
                          {answer.likes} faydalı buldu
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
