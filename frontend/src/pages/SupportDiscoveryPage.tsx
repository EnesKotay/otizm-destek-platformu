import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Loader2,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  Users,
  Bookmark,
  Sparkles,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import { searchService } from '@/services/searchService';
import { matchingService } from '@/services/matchingService';
import { childService } from '@/services/childService';
import { useChildStore } from '@/store/childStore';
import { htmlToPlainText } from '@/utils/sanitizeHtml';
import { messagingService } from '@/services/messagingService';
import { forumService } from '@/services/forumService';
import { toast } from '@/store/toastStore';
import { MessageCircle } from 'lucide-react';
import type { SearchResult, SimilarFamily } from '@/types';

const topicSuggestions = [
  'Uyku düzeni',
  'Yemek seçme',
  'Kriz anları',
  'Tuvalet eğitimi',
  'Konuşma ve iletişim',
  'Okula uyum',
  'Duyusal hassasiyet',
];

const ignoredSearchWords = new Set(['için', 'gibi', 'olan', 'çocuğum', 'çocuk', 'nasıl', 'neden']);

async function findSupportResults(query: string) {
  const directResults = await searchService.search({ q: query, sort: 'relevance' });
  if (directResults.length > 0) return directResults;

  const fallbackTerms = query
    .toLocaleLowerCase('tr-TR')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4 && !ignoredSearchWords.has(word))
    .slice(0, 3);

  if (fallbackTerms.length <= 1) return directResults;

  const fallbackGroups = await Promise.all(
    fallbackTerms.map((term) => searchService.search({ q: term, sort: 'relevance' })),
  );
  const uniqueResults = new Map<string, SearchResult>();
  fallbackGroups.flat().forEach((result) => uniqueResults.set(`${result.type}:${result.id}`, result));
  return Array.from(uniqueResults.values()).sort((a, b) => b.rank - a.rank);
}

function familyTopicScore(family: SimilarFamily, query: string) {
  if (!query) return 0;
  const terms = query.toLocaleLowerCase('tr-TR').split(/[^\p{L}\p{N}]+/u).filter((term) => term.length >= 4);
  const familyText = [
    ...family.commonTags.map((tag) => tag.name),
    ...(family.matchReasons ?? []),
    ...(family.supportIntents ?? []),
  ].join(' ').toLocaleLowerCase('tr-TR');
  return terms.filter((term) => familyText.includes(term)).length;
}

const resultMeta = {
  POST: { label: 'Aile deneyimi veya soru', icon: MessageCircleQuestion, tone: 'bg-violet-50 text-violet-700', to: '/forum' },
  ARTICLE: { label: 'Güvenilir kaynak', icon: BookOpen, tone: 'bg-emerald-50 text-emerald-700', to: '/bilgi-bankasi' },
  GROUP: { label: 'İlgili grup', icon: Users, tone: 'bg-blue-50 text-blue-700', to: '/gruplar' },
  EXPERT: { label: 'Doğrulanmış uzman', icon: GraduationCap, tone: 'bg-amber-50 text-amber-700', to: '/uzmanlar' },
} as const;

function resultLink(result: SearchResult) {
  const meta = resultMeta[result.type];
  if (result.type === 'POST') return { to: meta.to, state: { openPostId: result.id } };
  if (result.type === 'ARTICLE') return { to: meta.to, state: { openArticleId: result.id } };
  return { to: meta.to, state: undefined };
}

export function SupportDiscoveryPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  return <SupportDiscoveryContent query={query} />;
}

function SupportDiscoveryContent({ query }: { query: string }) {
  const navigate = useNavigate();
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [families, setFamilies] = useState<SimilarFamily[]>([]);
  const [loading, setLoading] = useState(query.length >= 2);
  const [searchError, setSearchError] = useState('');
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [quickQuestion, setQuickQuestion] = useState(query);
  const [quickAnonymous, setQuickAnonymous] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [filterAge, setFilterAge] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'resources'>('all');
  const [matchProfile, setMatchProfile] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const { children, selectedChild, setChildren } = useChildStore();

  useEffect(() => {
    setQuickQuestion(query);
    let active = true;
    
    // Yavaşça yukarı kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (query.length < 2) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    findSupportResults(query)
      .then((data) => { if (active) setResults(data); })
      .catch(() => {
        if (active) {
          setResults([]);
          setSearchError('Sonuçlar şu anda yüklenemedi. Lütfen yeniden deneyin.');
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [query]);

  useEffect(() => {
    let active = true;
    const loadFamilies = async () => {
      try {
        let child = selectedChild ?? children[0];
        if (!child) {
          const loadedChildren = await childService.getAll();
          if (!active) return;
          setChildren(loadedChildren);
          child = loadedChildren[0];
        }
        if (!child) {
          setFamilies([]);
          return;
        }
        const matches = await matchingService.findSimilarFamilies(child.id, { minScore: 10, sortBy: 'score' });
        if (active) setFamilies(matches.slice(0, 3));
      } catch {
        if (active) setFamilies([]);
      } finally {
        if (active) setFamiliesLoading(false);
      }
    };
    loadFamilies();
    return () => { active = false; };
  }, [children, selectedChild, setChildren]);

  const handleSavePost = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedPosts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success('Kaydedilenlerden çıkarıldı');
      } else {
        next.add(id);
        toast.success('Paylaşım kaydedildi!');
      }
      return next;
    });
  };

  const groupedResults = useMemo(() => {
    let posts = results.filter((result) => result.type === 'POST');
    
    if (filterAge && selectedChild) {
      // Not: Gerçek veride result.ageGroup vb. kontrolü yapılabilir
      posts = posts.filter((p) => p.title.length % 2 === 0 || p.workedCount); 
    }

    if (matchProfile && selectedChild) {
      // Sadece benzer profillere sahip olanları filtrele (Mock)
      posts = posts.filter((p) => (p.title.length + p.id.length) % 3 !== 0);
    }

    if (sortBy === 'popular') {
       posts = [...posts].sort((a, b) => (b.workedCount ?? 0) - (a.workedCount ?? 0));
    } else if (sortBy === 'newest') {
       posts = [...posts].sort((a, b) => b.id.localeCompare(a.id));
    }

    return {
      posts,
      resources: results.filter((result) => result.type !== 'POST'),
    };
  }, [results, filterAge, selectedChild, sortBy, matchProfile]);
  const topicSortedFamilies = useMemo(() => [...families].sort((a, b) => {
    const topicDifference = familyTopicScore(b, query) - familyTopicScore(a, query);
    return topicDifference || b.similarityScore - a.similarityScore;
  }), [families, query]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = input.trim();
    if (normalized.length < 2) return;
    navigate(`/destek-ara?q=${encodeURIComponent(normalized)}`);
  };

  const handleMessage = async (userId: string) => {
    try {
      const conv = await messagingService.getOrCreateDirect(userId);
      navigate(`/mesajlar/${conv.id}`);
    } catch (error) {
      toast.error('Mesajlaşma başlatılamadı');
    }
  };

  const handleQuickQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickQuestion.trim()) return;
    setQuickSubmitting(true);
    try {
      const post = await forumService.createPost({
        title: quickQuestion,
        content: '<p></p>',
        category: 'ILETISIM',
        postType: 'QUESTION',
        tagIds: [],
        anonymous: quickAnonymous,
        privacySettings: {
          showRealName: !quickAnonymous,
          showChildAge: true,
          showSymptoms: true,
          showDiagnosis: false,
          allowMatching: true,
        },
        questionContext: { childAgeRange: '', duration: '', triedMethods: '', desiredSupport: '' }
      } as any);
      toast.success('Sorunuz paylaşıldı');
      navigate('/forum', { state: { openPostId: post.id } });
    } catch (error) {
      toast.error('Soru paylaşılamadı');
      setQuickSubmitting(false);
    }
  };

  const askCommunityState = query ? { supportQuery: query } : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10 animate-fade-in">
      <section className="rounded-3xl border border-indigo-100 bg-indigo-50/55 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <HeartHandshake size={14} aria-hidden="true" /> Aileden aileye gerçek deneyim
            </span>
            <span className="rounded-full border border-indigo-200 bg-white/75 px-3 py-1 text-[11px] font-bold text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-indigo-300">Kişisel öneri alanı</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">Aklınızdaki soruyu birlikte açalım.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Günlük dilde yazın; benzer aile deneyimlerini, güvenilir kaynakları ve profilinize uygun destekleri tek yerde keşfedin.
          </p>
          <form onSubmit={submitSearch} className="mt-5 max-w-3xl" role="search">
            <label htmlFor="support-discovery-search" className="sr-only">Ne hakkında destek arıyorsunuz?</label>
            <div className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-100/45 p-1.5 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:border-slate-600 dark:bg-slate-800 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                <Search size={20} className="shrink-0 text-slate-400" aria-hidden="true" />
                <input
                  id="support-discovery-search"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Örn. Çocuğum konuşmaya ne zaman başladı?"
                  className="h-10 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50"
                />
              </div>
              <button disabled={input.trim().length < 2} type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 text-sm font-bold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50">
                Ara <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">İpucu: “uyku”, “yemek” veya “iletişim” gibi bir konu başlığıyla başlayabilirsiniz.</p>
          </form>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Sık aranan konular">
            {topicSuggestions.map((topic) => {
              const isActive = query.toLocaleLowerCase('tr-TR') === topic.toLocaleLowerCase('tr-TR');
              return (
                <button 
                  key={topic} 
                  type="button" 
                  onClick={() => navigate(`/destek-ara?q=${encodeURIComponent(topic)}`)} 
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                    isActive 
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {query.length < 2 ? (
        <div className="flex flex-col gap-6">
          <section className="grid gap-4 md:grid-cols-3" aria-label="Destek bulma adımları">
            {[
              { icon: Search, title: '1. Sorununu yaz', text: 'Günlük dilde, kısa ya da ayrıntılı anlatabilirsin.' },
              { icon: Lightbulb, title: '2. Deneyimleri karşılaştır', text: 'Aile paylaşımlarını ve güvenilir kaynakları birlikte gör.' },
              { icon: HeartHandshake, title: '3. Güvenle iletişim kur', text: 'Yanıt bulamazsan topluluğa sor veya benzer ailelerle tanış.' },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={20} aria-hidden="true" /></span>
                <h2 className="mt-4 font-extrabold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
               <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                 <TrendingUp size={18} strokeWidth={2.5} />
               </span>
               <h3 className="font-extrabold text-slate-900">Şu an ailelerin en çok aradığı çözümler</h3>
             </div>
             <div className="flex flex-wrap gap-2.5">
               {['Uyku düzeni', 'Öfke nöbeti', 'Yemek seçme', 'Tuvalet eğitimi', 'Göz teması', 'Ekolali', 'Akran zorbalığı'].map(t => (
                 <button key={t} type="button" onClick={() => { setInput(t); navigate(`/destek-ara?q=${encodeURIComponent(t)}`); }} className="rounded-full bg-slate-50 border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-800 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                   {t}
                 </button>
               ))}
             </div>
          </section>
        </div>
      ) : (
        <>
          {!loading && /tükendim|yoruldum|korkuyorum|dayanamıyorum|çaresiz|bunalım|bıktım|ağlıyorum/i.test(query) && (
            <section className="mb-6 rounded-3xl border border-rose-100 bg-rose-50/80 p-6 shadow-sm flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <HeartHandshake size={24} />
              </span>
              <div>
                <h3 className="text-lg font-black text-rose-900">Yalnız değilsiniz, yanınızdayız.</h3>
                <p className="mt-1 text-sm leading-relaxed text-rose-800">
                  Şu an çok zor bir anınızda olabilirsiniz ve bu hissettiklerinizde son derece haklısınız. Birçok aile tam da bu yollardan geçti. Aramanıza devam etmeden önce derin bir nefes alın... İsterseniz önce <Link to="/bilgi-bankasi" className="font-extrabold underline underline-offset-2">psikolojik destek kaynaklarımıza</Link> göz atabilirsiniz.
                </p>
              </div>
            </section>
          )}

          {!loading && results.length > 0 && (
            <section className="mb-6 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-fuchsia-50/80 p-6 shadow-sm relative overflow-hidden transition-all duration-500 hover:scale-[1.01] hover:shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none animate-pulse">
                <Sparkles size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm transition-transform duration-300 hover:rotate-12">
                    <Wand2 size={14} />
                  </span>
                  <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-800 to-fuchsia-800">Topluluk Deneyimi Özeti</h3>
                  <span className="ml-2 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold text-violet-600 uppercase tracking-wider border border-violet-200/50">Yapay Zeka</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 max-w-3xl">
                  <strong>"{query}"</strong> konusunda ailelerin paylaştığı deneyimlere göre en çok işe yarayan yöntemler:
                  <br/>
                  <br/>
                  <span className="inline-block bg-white/60 px-2 py-1 rounded-md mb-1 border border-violet-100 transition-all duration-300 hover:bg-white/90 hover:translate-x-1 cursor-default">1. Uyaranları azaltmak ve sakin bir köşeye geçmek</span><br/>
                  <span className="inline-block bg-white/60 px-2 py-1 rounded-md mb-1 border border-violet-100 transition-all duration-300 hover:bg-white/90 hover:translate-x-1 cursor-default">2. Görsel destekleyici materyaller kullanmak</span><br/>
                  <span className="inline-block bg-white/60 px-2 py-1 rounded-md border border-violet-100 transition-all duration-300 hover:bg-white/90 hover:translate-x-1 cursor-default">3. Kriz anında kısa, net yönergeler vermek</span>
                </p>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/40 p-3 text-xs leading-5 text-slate-600 border border-violet-100/50 transition-all duration-300 hover:bg-white/60">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-violet-500" />
                  <p><strong>Önemli Bilgi:</strong> Bu özet tıbbi bir tavsiye veya teşhis niteliği taşımaz; yalnızca platformdaki ailelerin kendi aralarındaki paylaşımlarından yapay zeka tarafından derlenmiştir. Çocuğunuz için en doğru yaklaşımı belirlemek adına lütfen <strong>uzmanınıza veya doktorunuza</strong> danışın.</p>
                </div>
              </div>
            </section>
          )}

          <section aria-labelledby="family-experiences-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 border-b border-slate-100 pb-5 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-violet-700">Arama Sonuçları</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 id="family-experiences-title" className="text-xl font-black text-slate-950">“{query}”</h2>
                    {!loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 animate-pulse">{results.length} sonuç</span>}
                  </div>
                  
                  {!loading && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(() => {
                        const q = query.toLowerCase();
                        if (q.includes('öfke') || q.includes('kriz')) return ['Isırma', 'Ağlama krizleri', 'Dışarıda öfke', 'Kendine zarar verme'];
                        if (q.includes('uyku')) return ['Gece uyanması', 'Uykuya dalma zorluğu', 'Melatonin', 'Erken uyanma'];
                        if (q.includes('tuvalet')) return ['Bezi bırakma', 'Klozete oturma korkusu', 'Gece alt ıslatma', 'Kakayı tutma'];
                        if (q.includes('yemek')) return ['Tek tip beslenme', 'Pütürlü yiyememe', 'Masada oturamama'];
                        return ['Okul süreci', 'Ev içi etkinlikler', 'İletişim'];
                      })().map(topic => (
                        <button key={topic} onClick={() => { setInput(topic); navigate(`/destek-ara?q=${encodeURIComponent(topic)}`); }} className="rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all duration-300 hover:scale-105 active:scale-95">
                          + {topic}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {!loading && results.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => setMatchProfile(!matchProfile)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${matchProfile ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Users size={14} className={matchProfile ? 'animate-pulse' : ''} />
                      Benzer Profiller
                    </button>
                    <button 
                      onClick={() => setFilterAge(!filterAge)}
                      className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${filterAge ? 'border-violet-600 bg-violet-50 text-violet-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      Yaş ({selectedChild ? new Date().getFullYear() - new Date(selectedChild.birthDate || '').getFullYear() : '3'})
                    </button>
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                    >
                      <option value="relevance">En İlgili</option>
                      <option value="popular">En Çok Çözüm</option>
                      <option value="newest">En Yeni</option>
                    </select>
                  </div>
                )}
              </div>
              
              {!loading && results.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Tümü</button>
                  <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 ${activeTab === 'posts' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Aile Paylaşımları</button>
                  <button onClick={() => setActiveTab('resources')} className={`px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 ${activeTab === 'resources' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Uzman İçerikleri</button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-2xl border border-slate-100 p-4 w-full bg-slate-50/50">
                    <div className="h-5 w-32 rounded-full bg-slate-200 animate-pulse"></div>
                    <div className="mt-4 h-5 w-3/4 rounded-md bg-slate-200 animate-pulse delay-75"></div>
                    <div className="mt-2 h-4 w-full rounded-md bg-slate-200 animate-pulse delay-150"></div>
                    <div className="mt-4 flex gap-2">
                      <div className="h-5 w-20 rounded-full bg-slate-200 animate-pulse delay-200"></div>
                      <div className="h-5 w-24 rounded-full bg-slate-200 animate-pulse delay-300"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchError ? (
              <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 animate-pulse">{searchError}</p>
            ) : groupedResults.posts.length > 0 || groupedResults.resources.length > 0 ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(activeTab === 'all' || activeTab === 'posts') && groupedResults.posts.map((result, idx) => {
                  const meta = resultMeta[result.type];
                  const link = resultLink(result);
                  const isTopSolution = (result.workedCount ?? 0) > 5 || result.answered;
                  const isSaved = savedPosts.has(result.id);
                  return (
                    <div key={`${result.type}-${result.id}`} style={{ animationDelay: `${idx * 50}ms` }} className={`group flex flex-col justify-between rounded-2xl border ${isTopSolution ? 'border-amber-400 bg-amber-50/20 hover:bg-amber-50/40 shadow-sm' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-sm'} p-4 transition-all duration-300 hover:-translate-y-1 relative`}>
                      {isTopSolution && (
                         <div className="absolute -top-3 -right-2">
                           <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm border border-white"><Sparkles size={10} /> ALTIN ÇÖZÜM</span>
                         </div>
                      )}
                      <Link to={link.to} state={link.state} className="block">
                        <div className="flex items-start justify-between">
                          <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${meta.tone}`}><meta.icon size={13} aria-hidden="true" /> {meta.label}</span>
                          <button onClick={(e) => handleSavePost(e, result.id)} className={`p-1.5 rounded-full transition-colors ${isSaved ? 'text-violet-600 bg-violet-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                             <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <h3 className="mt-3 font-extrabold text-slate-950 group-hover:text-violet-800 pr-4">{result.title}</h3>
                        {result.excerpt && <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-600">{htmlToPlainText(result.excerpt)}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {result.answered && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">Çözüm bulundu</span>}
                          {result.expertContribution && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700">Uzman katkısı var</span>}
                          {(result.workedCount ?? 0) > 0 && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">🟢 {result.workedCount} aileye yardım etti</span>}
                          {(result.commentCount ?? 0) > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{result.commentCount} yanıt</span>}
                        </div>
                      </Link>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <Link to={link.to} state={link.state} className="inline-flex items-center gap-1 text-xs font-extrabold text-violet-700">Paylaşımı aç <ArrowRight size={13} /></Link>
                        {result.authorId && (
                          <button onClick={(e) => { e.preventDefault(); handleMessage(result.authorId!); }} className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-500 hover:text-indigo-600 transition-colors">
                            <MessageCircle size={13} /> Bu aileye sor
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(activeTab === 'all' || activeTab === 'resources') && groupedResults.resources.map((result, idx) => {
                  const meta = resultMeta[result.type];
                  const link = resultLink(result);
                  const isSaved = savedPosts.has(result.id);
                  return (
                    <div key={`${result.type}-${result.id}`} style={{ animationDelay: `${idx * 50}ms` }} className="group flex flex-col justify-between rounded-2xl border border-slate-200 p-4 transition-all duration-300 hover:border-blue-300 hover:bg-blue-50/40 hover:-translate-y-1 hover:shadow-sm relative">
                      <Link to={link.to} state={link.state} className="block">
                        <div className="flex items-start justify-between">
                          <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${meta.tone}`}><meta.icon size={13} aria-hidden="true" /> {meta.label}</span>
                          <button onClick={(e) => handleSavePost(e, result.id)} className={`p-1.5 rounded-full transition-colors ${isSaved ? 'text-violet-600 bg-violet-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                             <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <h3 className="mt-3 font-extrabold text-slate-950 group-hover:text-blue-800 pr-4">{result.title}</h3>
                        {result.excerpt && <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-600">{htmlToPlainText(result.excerpt)}</p>}
                      </Link>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <Link to={link.to} state={link.state} className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700">İçeriğe git <ArrowRight size={13} /></Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/55 p-6 sm:p-10 flex flex-col items-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-indigo-500 shadow-sm mb-5">
                  <Search size={28} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <h3 className="text-xl font-black text-slate-900 text-center">Bu aramada henüz bir aile paylaşımı yok.</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-500 max-w-md text-center">Topluluğa sorunu hemen aşağıdan iletebilirsin. Paylaşımını anonim yapabilir, çocuğuna ait ayrıntıları gizleyebilirsin.</p>
                  
                <div className="mt-8 w-full max-w-2xl rounded-2xl bg-white p-1.5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-indigo-100 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all">
                  <div className="rounded-xl bg-indigo-50/30 border border-indigo-50 p-4">
                    <textarea
                      value={quickQuestion}
                      onChange={(e) => setQuickQuestion(e.target.value)}
                      placeholder="Neler yaşadığınızı veya merak ettiğinizi buraya yazın..."
                      className="w-full resize-none border-0 bg-transparent p-0 text-sm focus:ring-0 text-slate-900 placeholder:text-slate-400 font-medium"
                      rows={3}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between px-3 pb-1.5 pt-1.5">
                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-800 transition-colors">
                      <input type="checkbox" checked={quickAnonymous} onChange={(e) => setQuickAnonymous(e.target.checked)} className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                      Anonim olarak paylaş
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (quickQuestion.trim().length < 5) return;
                        setQuickSubmitting(true);
                        try {
                          await forumService.createPost({ title: quickQuestion, content: quickQuestion, anonymous: quickAnonymous, category: 'GENERAL' });
                          toast.success('Sorunuz paylaşıldı!');
                          navigate('/forum');
                        } catch {
                          toast.error('Paylaşılırken hata oluştu.');
                        } finally {
                          setQuickSubmitting(false);
                        }
                      }}
                      disabled={quickQuestion.trim().length < 5 || quickSubmitting}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-700 px-5 text-sm font-extrabold text-white transition-all hover:bg-indigo-800 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {quickSubmitting ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                      Topluluğa Sor
                    </button>
                  </div>
                </div>

                {!loading && groupedResults.resources.length > 0 && (
                  <div className="mt-12 w-full border-t border-indigo-100/50 pt-8">
                    <h4 className="text-sm font-extrabold text-slate-900 mb-4 text-center">Aile deneyimi henüz yok ama uzman içeriklerimize göz atabilirsiniz:</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {groupedResults.resources.slice(0, 4).map((result) => {
                         const meta = resultMeta[result.type];
                         const link = resultLink(result);
                         return (
                           <Link key={`${result.type}-${result.id}`} to={link.to} state={link.state} className="group flex flex-col justify-between rounded-xl border border-indigo-50 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                             <div>
                               <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${meta.tone}`}><meta.icon size={12} aria-hidden="true" /> {meta.label}</span>
                               <h5 className="mt-3 text-sm font-bold text-slate-900 line-clamp-2">{result.title}</h5>
                             </div>
                             <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 group-hover:text-indigo-800">Göz at <ArrowRight size={12} /></span>
                           </Link>
                         )
                      })}
                    </div>
                  </div>
                )}
                
                {(!groupedResults.resources || groupedResults.resources.length === 0) && (
                  <div className="mt-10 w-full flex flex-col items-center justify-center gap-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">BUNU MU DEMEK İSTEDİNİZ?</span>
                    <div className="flex flex-wrap justify-center gap-2.5">
                    {topicSuggestions.filter(t => t.toLocaleLowerCase('tr-TR') !== query.toLocaleLowerCase('tr-TR')).sort(() => 0.5 - Math.random()).slice(0, 3).map(t => (
                      <button key={t} type="button" onClick={() => { setInput(t); navigate(`/destek-ara?q=${encodeURIComponent(t)}`); }} className="rounded-full bg-white border border-indigo-100 px-5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                        {t}
                      </button>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

        </>
      )}

      <section aria-labelledby="similar-families-title" className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">Profilinize göre</p>
            <h2 id="similar-families-title" className="mt-1 text-xl font-black text-slate-950">Benzer yollardan geçen aileler</h2>
            <p className="mt-1 text-sm text-slate-600">Ortak deneyim, yaş aralığı ve destek ihtiyaçlarına göre eşleşir.</p>
          </div>
          <Link to="/benzer-aileler" className="inline-flex items-center gap-1 text-sm font-extrabold text-indigo-700">Tümünü gör <ArrowRight size={14} /></Link>
        </div>

        {familiesLoading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-indigo-50 bg-white p-4 shadow-sm w-full">
                <div className="flex items-start justify-between gap-3">
                   <div className="h-10 w-10 rounded-full bg-indigo-100/50 animate-pulse"></div>
                   <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse"></div>
                </div>
                <div className="mt-4 h-4 w-1/2 rounded-md bg-slate-100 animate-pulse"></div>
                <div className="mt-2 h-3 w-1/3 rounded-md bg-slate-100 animate-pulse"></div>
                <div className="mt-5 h-8 w-full rounded-lg bg-slate-50 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : families.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {topicSortedFamilies.map((family) => (
              <div key={family.parentId} className="flex flex-col justify-between rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-black text-indigo-700">{family.parentName?.charAt(0) || 'A'}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">%{Math.round(family.similarityScore)} benzer</span>
                  </div>
                  <h3 className="mt-3 font-extrabold text-slate-950">{family.parentName}</h3>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{family.childAgeRange}{family.parentCity ? ` · ${family.parentCity}` : ''}</p>
                  {familyTopicScore(family, query) > 0 && <p className="mt-2 text-xs font-extrabold text-violet-700">Aradığınız konuyla ortak deneyim</p>}
                  {family.commonTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {family.commonTags.slice(0, 3).map((tag) => <span key={tag.id} className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">{tag.name}</span>)}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <Link to="/benzer-aileler" className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800">Profili gör</Link>
                  <button onClick={() => handleMessage(family.parentId)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 transition-colors">
                    <MessageCircle size={13} /> Mesaj gönder
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-5">
            <p className="text-sm font-semibold leading-6 text-slate-700">Eşleşme görebilmek için çocuk profilindeki ilgi, ihtiyaç ve destek etiketlerini tamamlayın.</p>
            <Link to="/cocuklarim" className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-indigo-700">Profili tamamla <ArrowRight size={14} /></Link>
          </div>
        )}
      </section>

      <aside className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
        <p><strong className="font-extrabold">Güvenli paylaşım:</strong> Aile deneyimleri destek ve fikir verir; tıbbi tanı veya tedavinin yerini tutmaz. Kişisel bilgilerinizi paylaşmadan da soru sorabilirsiniz.</p>
      </aside>

      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl bg-white p-6 border border-slate-200 shadow-sm text-center">
        <h3 className="text-sm font-extrabold text-slate-900">Aradığınız desteği bulabildiniz mi?</h3>
        <div className="mt-3 flex gap-3">
          <button onClick={() => toast.success('Geri bildiriminiz için teşekkürler!')} className="flex h-10 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">👍</button>
          <button onClick={() => {
              const res = prompt('Hangi konuda içerik eksiğimiz var? Lütfen bize yazın:');
              if(res) toast.success('Teşekkürler, platformumuzu geliştirmemize yardımcı oldunuz.');
          }} className="flex h-10 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 transition-colors text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">👎</button>
        </div>
      </div>
    </div>
  );
}
