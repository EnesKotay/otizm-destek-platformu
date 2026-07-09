import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  Plus,
  Printer,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { chatbotService } from '@/services/chatbotService';
import { patientService } from '@/services/patientService';
import { noteService } from '@/services/noteService';
import { screeningService, type ScreeningResultDto } from '@/services/screeningService';
import { childService } from '@/services/childService';
import { bepReportService } from '@/services/bepReportService';
import { toast } from '@/store/toastStore';
import { formatDate } from '@/utils/date';
import type { DevelopmentNote, PatientSummary } from '@/types';

const DOMAINS = [
  'Bilişsel Beceriler',
  'Dil ve İletişim',
  'İnce Motor Becerileri',
  'Kaba Motor Becerileri',
  'Özbakım Becerileri',
  'Sosyal Beceriler',
  'Duyusal Düzenleme',
  'Davranış ve Uyum'
];

const GOAL_TEMPLATES = [
  {
    domain: 'Dil ve İletişim',
    title: 'İstek bildirme',
    longTerm: 'Günlük rutinlerde ihtiyaçlarını sözel, işaret veya görsel destekle uygun biçimde ifade eder.',
    shortTerm: 'Tercih edilen nesne/aktivite için iki seçenek arasından seçim yaparak isteğini belirtir.',
    criteria: '5 denemenin 4ünde, en az iki farklı ortamda',
    method: 'Model olma, iki seçenek sunma, bekleme süresi',
    material: 'Görsel seçim kartları, tercih edilen oyuncak/yiyecek',
    familyTask: 'Evde iki seçenekli tercih fırsatları oluşturulur.',
  },
  {
    domain: 'Sosyal Beceriler',
    title: 'Sıra alma',
    longTerm: 'Yetişkin veya akranla kısa yapılandırılmış oyunda sıra alma becerisini sürdürür.',
    shortTerm: 'Hatırlatmayla en az 3 tur boyunca sıra alma oyununa katılır.',
    criteria: '3 ardışık oturumda %80 başarı ile',
    method: 'Sosyal öykü, model olma, fiziksel/sözel ipucunu azaltma',
    material: 'Top, blok, kart oyunu, sıra kartı',
    familyTask: 'Günde 5 dakikalık sıra alma oyunu oynanır.',
  },
  {
    domain: 'Özbakım Becerileri',
    title: 'Günlük rutin',
    longTerm: 'Günlük özbakım rutinlerinden seçilen basamağı bağımsız tamamlar.',
    shortTerm: 'Görsel ipucu ile seçilen rutinin ilk iki basamağını tamamlar.',
    criteria: '4/5 denemede bağımsız ya da az ipucu ile',
    method: 'Görev analizi, görsel çizelge, pekiştirme',
    material: 'Rutin görseli, kontrol listesi, pekiştireç',
    familyTask: 'Aynı rutin evde aynı sıra ve kısa yönergeyle uygulanır.',
  },
  {
    domain: 'Bilişsel Beceriler',
    title: 'Eşleme ve sınıflama',
    longTerm: 'Nesne ve görselleri temel özelliklerine göre eşler ve sınıflar.',
    shortTerm: 'Aynı görselleri 6 seçenek içinden eşleştirir.',
    criteria: 'İki farklı materyal setinde %80 başarı ile',
    method: 'Ayrık denemeler, hata düzeltme, genelleme',
    material: 'Eşleme kartları, gerçek nesneler, kutular',
    familyTask: 'Ev nesneleriyle renk/şekil eşleme kısa tekrarları yapılır.',
  },
  {
    domain: 'Duyusal Düzenleme',
    title: 'Geçişe hazırlanma',
    longTerm: 'Etkinlik geçişlerinde duyusal düzenleme stratejisini kullanarak uyum sağlar.',
    shortTerm: 'Geçişten önce sunulan nefes, baskı veya hareket seçeneğinden birini kullanır.',
    criteria: 'Haftada 4 gün, geçişlerin %70inde',
    method: 'Önceden haber verme, seçim sunma, duyusal mola',
    material: 'Zamanlayıcı, geçiş kartı, minder veya fidget',
    familyTask: 'Evde geçişlerden önce aynı görsel ve kısa cümle kullanılır.',
  },
  {
    domain: 'Davranış ve Uyum',
    title: 'Bekleme toleransı',
    longTerm: 'Kısa bekleme durumlarında uygun bekleme davranışını sürdürür.',
    shortTerm: 'Görsel zamanlayıcı ile 1 dakika bekleme çalışmasına katılır.',
    criteria: '5 fırsatın 4ünde uygun bekleme ile',
    method: 'Görsel zamanlayıcı, pekiştirme, süreyi kademeli artırma',
    material: 'Kum saati/zamanlayıcı, bekleme kartı',
    familyTask: 'Evde tercih edilen etkinlikten önce kısa bekleme denemesi yapılır.',
  },
];

const BEP_TEMPLATES_KEY = 'bep_custom_goal_templates';

interface Goal {
  id: string;
  domain: string;
  shortTerm: string;
  longTerm: string;
  criteria: string;
  method: string;
  material: string;
  familyTask: string;
  progress: number;
  status: 'Başlamadı' | 'Devam ediyor' | 'Tamamlandı' | 'Revize edilmeli';
  lastObservation: string;
}

type GoalTemplate = typeof GOAL_TEMPLATES[number];

interface ActivityResult {
  activityTitle: string;
  score: number;
  total: number;
  detail: string;
  completedAt: string;
}

function readActivityResults(source?: Record<string, unknown>): ActivityResult[] {
  const screeningActivities = source?.screeningActivities as Record<string, unknown> | undefined;
  const results = screeningActivities?.results;
  return Array.isArray(results)
    ? [...results as ActivityResult[]].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    : [];
}

function readCustomTemplates(): GoalTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(BEP_TEMPLATES_KEY) || '[]') as GoalTemplate[];
  } catch {
    return [];
  }
}

export function BepGeneratorPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState(searchParams.get('child') || '');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [performance, setPerformance] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<DevelopmentNote[]>([]);
  const [screeningResults, setScreeningResults] = useState<ScreeningResultDto[]>([]);
  const [activityResults, setActivityResults] = useState<ActivityResult[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [sharedAt, setSharedAt] = useState('');
  const [savedReports, setSavedReports] = useState<import('@/services/bepReportService').BepReportDto[]>([]);
  const [customTemplates, setCustomTemplates] = useState<GoalTemplate[]>(() => readCustomTemplates());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  // New goal form state
  const [newDomain, setNewDomain] = useState(DOMAINS[0]);
  const [newShortTerm, setNewShortTerm] = useState('');
  const [newLongTerm, setNewLongTerm] = useState('');
  const [newCriteria, setNewCriteria] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newFamilyTask, setNewFamilyTask] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [aiAssistantInput, setAiAssistantInput] = useState('');
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [showAiBepModal, setShowAiBepModal] = useState(false);
  const [aiBepStrengths, setAiBepStrengths] = useState('');
  const [aiBepWeaknesses, setAiBepWeaknesses] = useState('');
  const [aiBepLoading, setAiBepLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatientsLoading(true);
    patientService.getPatients()
      .then(data => {
        setPatients(data);
        const queryChild = searchParams.get('child');
        const first = queryChild ? data.find(item => item.childId === queryChild) : data[0];
        if (first) {
          setSelectedChildId(first.childId);
          setStudentName(first.name);
          setStudentAge(first.age ? `${first.age} Yaş` : '');
          setDiagnosis(first.diagnosis || '');
        }
      })
      .catch(() => {
        setPatients([]);
      })
      .finally(() => setPatientsLoading(false));
  }, [searchParams]);

  useEffect(() => {
    if (!selectedChildId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotes([]);
      setScreeningResults([]);
      setActivityResults([]);
      return;
    }

     
    setContextLoading(true);
    Promise.allSettled([
      noteService.getRecent(selectedChildId),
      screeningService.getByChild(selectedChildId),
      childService.getById(selectedChildId),
      bepReportService.getByChild(selectedChildId),
    ]).then(([notesRes, screeningRes, childRes, bepRes]) => {
      setNotes(notesRes.status === 'fulfilled' ? notesRes.value : []);
      setScreeningResults(screeningRes.status === 'fulfilled' ? screeningRes.value : []);
      setActivityResults(childRes.status === 'fulfilled' ? readActivityResults(childRes.value.privacySettings) : []);
      const bepList = bepRes.status === 'fulfilled' ? bepRes.value : [];
      setSavedReports(bepList);
      setSharedAt(bepList[0]?.sharedAt || '');
    }).finally(() => setContextLoading(false));
  }, [selectedChildId]);

  const selectedPatient = patients.find(patient => patient.childId === selectedChildId);
  const allTemplates = useMemo(() => [...GOAL_TEMPLATES, ...customTemplates], [customTemplates]);
  const latestScreening = [...screeningResults].sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )[0];
  const latestActivity = activityResults[0];
  const averageProgress = goals.length
    ? Math.round(goals.reduce((total, goal) => total + goal.progress, 0) / goals.length)
    : 0;
  const completionItems = useMemo(() => [
    { label: 'Öğrenci bilgileri', done: Boolean(studentName && studentAge) },
    { label: 'Eğitsel tanı', done: Boolean(diagnosis) },
    { label: 'Performans özeti', done: performance.trim().length >= 30 },
    { label: 'En az 1 hedef', done: goals.length > 0 },
    { label: 'Aile görevi', done: goals.some(goal => goal.familyTask) },
    { label: 'İlerleme', done: goals.some(goal => goal.progress > 0) },
  ], [studentName, studentAge, diagnosis, performance, goals]);
  const completionCount = completionItems.filter(item => item.done).length;
  const completionPercent = Math.round((completionCount / completionItems.length) * 100);

  const noteBasedTemplates = useMemo(() => {
    const text = notes.map(note => `${note.title} ${note.content || ''} ${note.category || ''}`).join(' ').toLocaleLowerCase('tr-TR');
    return allTemplates.filter(template => {
      if (goals.some(goal => goal.longTerm === template.longTerm)) return false;
      if (template.domain.includes('İletişim')) return /iletişim|istek|sözcük|konuş|göz|işaret/.test(text);
      if (template.domain.includes('Sosyal')) return /sıra|oyun|akran|ortak|sosyal/.test(text);
      if (template.domain.includes('Duyusal')) return /duyusal|geçiş|ses|dokun|mola|öfke/.test(text);
      if (template.domain.includes('Özbakım')) return /tuvalet|özbakım|giyin|yemek|rutin/.test(text);
      return /eşle|dikkat|biliş|sınıfla|kart/.test(text);
    }).slice(0, 3);
  }, [allTemplates, goals, notes]);

  const handleSelectPatient = (childId: string) => {
    setSelectedChildId(childId);
    const patient = patients.find(item => item.childId === childId);
    if (!patient) return;
    setStudentName(patient.name);
    setStudentAge(patient.age ? `${patient.age} Yaş` : '');
    setDiagnosis(patient.diagnosis || '');
  };

  const buildPerformanceDraft = () => {
    const lines = [
      `${studentName || selectedPatient?.name || 'Öğrenci'} için BEP taslağı; uzman gözlemleri, aile görevleri ve platform kayıtları birlikte değerlendirilerek hazırlanmıştır.`,
    ];
    if (diagnosis) lines.push(`Eğitsel tanı/ön bilgi: ${diagnosis}.`);
    if (selectedPatient) {
      lines.push(`Son seans bilgisi: ${selectedPatient.lastSession || 'belirtilmedi'}; dijital görev durumu ${selectedPatient.tasksCompleted}/${selectedPatient.totalTasks}.`);
    }
    if (latestScreening) {
      lines.push(`Son tarama sonucu ${latestScreening.score}/20 ve risk düzeyi ${latestScreening.riskLevel === 'LOW' ? 'düşük' : latestScreening.riskLevel === 'MEDIUM' ? 'orta' : 'yüksek'} olarak kaydedilmiştir.`);
    }
    if (latestActivity) {
      lines.push(`Son aktivite: ${latestActivity.activityTitle}, ${latestActivity.score}/${latestActivity.total}. ${latestActivity.detail}`);
    }
    if (notes.length > 0) {
      const noteSummary = notes.slice(0, 3).map(note => `${note.title}${note.category ? ` (${note.category})` : ''}`).join('; ');
      lines.push(`Son gelişim notlarında öne çıkan başlıklar: ${noteSummary}.`);
    }
    lines.push('Öncelik; ölçülebilir kısa hedefler, ev genellemesi ve haftalık veri takibiyle çocuğun işlevsel bağımsızlığını artırmaktır.');
    setPerformance(lines.join('\n'));
    toast.success('Performans taslağı oluşturuldu.');
  };

  const handleAddGoal = () => {
    if (!newShortTerm || !newLongTerm) {
      toast.error('Lütfen kısa ve uzun dönem hedefleri doldurun.');
      return;
    }
    const newGoal: Goal = {
      id: Date.now().toString(),
      domain: newDomain,
      shortTerm: newShortTerm,
      longTerm: newLongTerm,
      criteria: newCriteria || '%80 başarı ile',
      method: newMethod || 'Model olma, ipucunu azaltma ve pekiştirme',
      material: newMaterial || 'Görsel destek, doğal ortam materyalleri',
      familyTask: newFamilyTask || 'Aile aynı beceriyi ev rutininde kısa tekrarlarla destekler.',
      progress: 0,
      status: 'Başlamadı',
      lastObservation: '',
    };
    setGoals([...goals, newGoal]);
    setNewShortTerm('');
    setNewLongTerm('');
    setNewCriteria('');
    setNewMethod('');
    setNewMaterial('');
    setNewFamilyTask('');
    toast.success('Hedef eklendi!');
  };

  const handleUseTemplate = (template: GoalTemplate) => {
    setNewDomain(template.domain);
    setNewLongTerm(template.longTerm);
    setNewShortTerm(template.shortTerm);
    setNewCriteria(template.criteria);
    setNewMethod(template.method);
    setNewMaterial(template.material);
    setNewFamilyTask(template.familyTask);
  };

  const handleAddTemplateGoal = (template: GoalTemplate) => {
    setGoals(prev => [
      ...prev,
      {
        id: `${Date.now()}-${template.title}`,
        domain: template.domain,
        longTerm: template.longTerm,
        shortTerm: template.shortTerm,
        criteria: template.criteria,
        method: template.method,
        material: template.material,
        familyTask: template.familyTask,
        progress: 0,
        status: 'Başlamadı',
        lastObservation: '',
      },
    ]);
    toast.success('Hazır hedef eklendi.');
  };

  const handleGoalChange = (id: string, patch: Partial<Goal>) => {
    setGoals(prev => prev.map(goal => goal.id === id ? { ...goal, ...patch } : goal));
  };

  const handleSaveTemplate = () => {
    if (!newShortTerm || !newLongTerm) {
      toast.error('Şablon kaydetmek için hedef alanlarını doldurun.');
      return;
    }
    const template: GoalTemplate = {
      title: templateName || newDomain,
      domain: newDomain,
      longTerm: newLongTerm,
      shortTerm: newShortTerm,
      criteria: newCriteria || '%80 başarı ile',
      method: newMethod || 'Model olma ve pekiştirme',
      material: newMaterial || 'Görsel destek',
      familyTask: newFamilyTask || 'Evde kısa tekrar yapılır.',
    };
    const next = [template, ...customTemplates].slice(0, 12);
    setCustomTemplates(next);
    localStorage.setItem(BEP_TEMPLATES_KEY, JSON.stringify(next));
    setTemplateName('');
    setShowTemplateModal(false);
    toast.success('Uzman hedef şablonu kaydedildi.');
  };

  const handleShareWithFamily = () => {
    if (!selectedChildId) {
      toast.error('Aileye göndermek için bir danışan seçin.');
      return;
    }
    bepReportService.create({
      childId: selectedChildId,
      studentName,
      diagnosis,
      performance,
      goals: goals as unknown as Record<string, unknown>[],
      schoolYear: `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
    }).then(saved => {
      setSharedAt(saved.sharedAt || new Date().toISOString());
      setSavedReports(prev => [saved, ...prev]);
      toast.success('BEP taslağı veritabanına kaydedildi.');
    }).catch(() => {
      toast.error('BEP raporu kaydedilemedi.');
    });
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const handleAiSuggest = async () => {
    if (!selectedChildId && !studentName) { toast.error('Önce bir danışan seçin.'); return; }
    setAiLoading(true);
    setAiSuggestions('');
    try {
      const context = [
        `Öğrenci: ${studentName}, Yaş: ${studentAge}, Tanı: ${diagnosis || 'belirtilmedi'}.`,
        notes.length > 0 ? `Son gelişim notları: ${notes.slice(0, 3).map(n => n.title + (n.content ? ': ' + n.content.slice(0, 100) : '')).join('. ')}.` : '',
        latestScreening ? `M-CHAT-R tarama skoru: ${latestScreening.score}/20, risk: ${latestScreening.riskLevel}.` : '',
        performance ? `Mevcut performans: ${performance.slice(0, 200)}.` : '',
        goals.length > 0 ? `Mevcut hedefler: ${goals.map(g => g.domain + ' - ' + g.shortTerm).join('; ')}.` : '',
      ].filter(Boolean).join(' ');

      const prompt = `Sen bir özel eğitim uzmanısın. Aşağıdaki öğrenci verisine bakarak BEP için 3 yeni, somut ve ölçülebilir hedef öner. Her hedef için şunu yaz: Alan, Kısa Dönem Hedef, Ölçüt, Yöntem. Türkçe yanıt ver, kısa ve uygulanabilir hedefler seç.\n\nÖğrenci verisi: ${context}`;

      const reply = await chatbotService.sendMessage(prompt);
      setAiSuggestions(reply);
    } catch { toast.error('AI önerisi alınamadı, lütfen tekrar deneyin.'); }
    setAiLoading(false);
  };
  
  const handleGenerateSmartGoal = async () => {
    if (!aiAssistantInput.trim()) {
      toast.error('Lütfen bir hedef veya beceri açıklaması yazın.');
      return;
    }
    setAiAssistantLoading(true);
    try {
      const prompt = `Sen otizm alanında klinik düzeyde çalışan kıdemli bir özel eğitim uzmanısın.
Kullanıcı senden şu konuda bir hedef oluşturmanı istedi: "${aiAssistantInput}".
Lütfen bu girdiyi analiz et ve tam anlamıyla SMART (Ölçülebilir, Ulaşılabilir, Zaman Sınırlı, Somut) bir eğitim hedefi yapısı çıkar.

Yanıtını tam olarak aşağıdaki etiketleri kullanarak ver. Başka hiçbir açıklama, giriş veya çıkış metni ekleme. Her etiket yeni bir satırda başlasın:

[ALAN] (Bilişsel Beceriler, Dil ve İletişim, İnce Motor Becerileri, Kaba Motor Becerileri, Özbakım Becerileri, Sosyal Beceriler, Duyusal Düzenleme, Davranış ve Uyum alanlarından en uygun olan bir tanesi)
[UZUN_DONEM] (Uzun dönemli yıllık hedef cümlesi)
[KISA_DONEM] (Kısa dönemli aylık hedef cümlesi)
[OLCUT] (Ölçülebilir kriter, örn: 5 denemenin 4'ünde bağımsız)
[YONTEM] (Özel eğitim yöntemi, örn: Ayrık denemelerle öğretim, görsel ipucu)
[MATERYAL] (Gerekli materyaller, örn: Görsel kartlar, zamanlayıcı)
[AILE_GOREVI] (Evde genelleme için ailenin yapması gereken pratik çalışma)`;

      const response = await chatbotService.sendMessage(prompt);
      
      const domainMatch = response.match(/\[ALAN\]\s*(.+)/i);
      const longTermMatch = response.match(/\[UZUN_DONEM\]\s*(.+)/i);
      const shortTermMatch = response.match(/\[KISA_DONEM\]\s*(.+)/i);
      const criteriaMatch = response.match(/\[OLCUT\]\s*(.+)/i);
      const methodMatch = response.match(/\[YONTEM\]\s*(.+)/i);
      const materialMatch = response.match(/\[MATERYAL\]\s*(.+)/i);
      const familyTaskMatch = response.match(/\[AILE_GOREVI\]\s*(.+)/i);

      if (domainMatch) {
        const parsedDomain = domainMatch[1].trim();
        const cleanDomain = DOMAINS.find(d => parsedDomain.toLowerCase().includes(d.toLowerCase())) || DOMAINS[0];
        setNewDomain(cleanDomain);
      }
      if (longTermMatch) setNewLongTerm(longTermMatch[1].trim());
      if (shortTermMatch) setNewShortTerm(shortTermMatch[1].trim());
      if (criteriaMatch) setNewCriteria(criteriaMatch[1].trim());
      if (methodMatch) setNewMethod(methodMatch[1].trim());
      if (materialMatch) setNewMaterial(materialMatch[1].trim());
      if (familyTaskMatch) setNewFamilyTask(familyTaskMatch[1].trim());

      toast.success('SMART Hedef başarıyla oluşturuldu ve forma aktarıldı!');
      setShowAiAssistantModal(false);
      setAiAssistantInput('');
    } catch {
      toast.error('AI hedef asistanı bir hata ile karşılaştı.');
    } finally {
      setAiAssistantLoading(false);
    }
  };

  const handleGenerateAiBep = async () => {
    if (!aiBepStrengths.trim() || !aiBepWeaknesses.trim()) {
      toast.error('Lütfen güçlü yanları ve zorlanılan alanları doldurun.');
      return;
    }
    setAiBepLoading(true);
    try {
      const prompt = `Sen otizm alanında uzmanlaşmış kıdemli bir özel eğitim uzmanısın.
Aşağıdaki bilgilere sahip bir öğrenci için BEP raporu hazırlamama yardımcı ol:
Öğrenci Adı: ${studentName || 'Öğrenci'}
Yaş: ${studentAge || 'belirtilmedi'}
Tanı: ${diagnosis || 'belirtilmedi'}
Güçlü Yanlar: ${aiBepStrengths}
Zorlanılan Alanlar / İhtiyaçlar: ${aiBepWeaknesses}

Yanıtını tam olarak aşağıdaki formatta ve etiketleri kullanarak ver. Başka hiçbir açıklama, giriş veya çıkış metni ekleme. Her etiket yeni satırda başlasın:

[PERFORMANS]
(Buraya detaylı, klinik düzeyde, özel eğitim terminolojisine uygun mevcut performans özeti metnini yaz)

[HEDEF_1]
Alan: (Bilişsel Beceriler, Dil ve İletişim, İnce Motor Becerileri, Kaba Motor Becerileri, Özbakım Becerileri, Sosyal Beceriler, Duyusal Düzenleme, Davranış ve Uyum alanlarından en uygun olan biri)
Uzun Dönem: (Uzun dönem hedefi)
Kısa Dönem: (Kısa dönem hedefi)
Ölçüt: (Kriter, örn: 5 denemenin 4'ünde)
Yöntem: (Kullanılacak özel eğitim yöntemi)
Materyal: (Gerekli materyaller)
Aile Görevi: (Evde genelleme için ailenin yapması gereken pratik çalışma)

[HEDEF_2]
Alan: ...
Uzun Dönem: ...
Kısa Dönem: ...
Ölçüt: ...
Yöntem: ...
Materyal: ...
Aile Görevi: ...

[HEDEF_3]
Alan: ...
Uzun Dönem: ...
Kısa Dönem: ...
Ölçüt: ...
Yöntem: ...
Materyal: ...
Aile Görevi: ...
`;

      const response = await chatbotService.sendMessage(prompt);
      
      const performanceMatch = response.match(/\[PERFORMANS\]\s*([\s\S]+?)(?=\[HEDEF_1\]|$)/i);
      if (performanceMatch) {
        setPerformance(performanceMatch[1].trim());
      }

      const newGoalsList: Goal[] = [];
      const goalRegexes = [
        /\[HEDEF_1\]\s*([\s\S]+?)(?=\[HEDEF_2\]|$)/i,
        /\[HEDEF_2\]\s*([\s\S]+?)(?=\[HEDEF_3\]|$)/i,
        /\[HEDEF_3\]\s*([\s\S]+?)$/i
      ];

      goalRegexes.forEach((regex, idx) => {
        const goalMatch = response.match(regex);
        if (goalMatch) {
          const content = goalMatch[1];
          const areaMatch = content.match(/Alan:\s*(.+)/i);
          const longMatch = content.match(/Uzun Dönem:\s*(.+)/i);
          const shortMatch = content.match(/Kısa Dönem:\s*(.+)/i);
          const criteriaMatch = content.match(/Ölçüt:\s*(.+)/i);
          const methodMatch = content.match(/Yöntem:\s*(.+)/i);
          const materialMatch = content.match(/Materyal:\s*(.+)/i);
          const familyMatch = content.match(/Aile Görevi:\s*(.+)/i);

          if (shortMatch && longMatch) {
            const parsedDomain = areaMatch ? areaMatch[1].trim() : DOMAINS[0];
            const cleanDomain = DOMAINS.find(d => parsedDomain.toLowerCase().includes(d.toLowerCase())) || DOMAINS[0];
            newGoalsList.push({
              id: `ai-${Date.now()}-${idx}`,
              domain: cleanDomain,
              longTerm: longMatch[1].trim(),
              shortTerm: shortMatch[1].trim(),
              criteria: criteriaMatch ? criteriaMatch[1].trim() : '5 denemenin 4\'ünde',
              method: methodMatch ? methodMatch[1].trim() : 'Model olma, ipucu sunma',
              material: materialMatch ? materialMatch[1].trim() : 'Görsel kartlar',
              familyTask: familyMatch ? familyMatch[1].trim() : 'Evde pratik tekrarlar',
              progress: 0,
              status: 'Başlamadı',
              lastObservation: '',
            });
          }
        }
      });

      if (newGoalsList.length > 0) {
        setGoals(prev => [...prev, ...newGoalsList]);
        toast.success(`BEP performansı dolduruldu ve ${newGoalsList.length} yeni hedef eklendi!`);
      } else {
        toast.success('BEP performansı başarıyla dolduruldu.');
      }
      setShowAiBepModal(false);
      setAiBepStrengths('');
      setAiBepWeaknesses('');
    } catch {
      toast.error('AI BEP asistanı hedefleri üretemedi, lütfen tekrar deneyin.');
    } finally {
      setAiBepLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto print:max-w-none print:m-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BEP Rapor Üretici</h1>
          <p className="text-gray-500 mt-1">Danışan bilgisi, hazır hedefler ve belge kontrolüyle BEP taslağını hızlı hazırlayın.</p>
        </div>
        {step === 2 && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft size={16} className="mr-1" /> Düzenlemeye Dön
            </Button>
            <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
              <Printer size={16} className="mr-1.5" /> PDF / Yazdır
            </Button>
            <Button variant="outline" onClick={handleShareWithFamily}>
              <Send size={16} className="mr-1.5" /> Aileye Gönder
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 print:hidden">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <AlertCircle size={16} />
          Klinik kullanım sınırı
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
          Bu ekran BEP taslağı ve eğitim hedefi hazırlamaya yardımcı olur; tıbbi tanı, tedavi veya ilaç kararı yerine geçmez. Nihai rapor yetkili uzman değerlendirmesiyle tamamlanmalıdır.
        </p>
      </div>

      {step === 1 ? (
        <div className="grid lg:grid-cols-[1fr_420px] gap-6 print:hidden">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound size={20} className="text-indigo-500" />
                  1. Danışan ve Öğrenci Bilgileri
                </CardTitle>
              </CardHeader>
              <div className="p-6 pt-0 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danışan Seçimi</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:border-indigo-500"
                    value={selectedChildId}
                    onChange={e => handleSelectPatient(e.target.value)}
                  >
                    <option value="">{patientsLoading ? 'Danışanlar yükleniyor...' : 'Manuel giriş yap'}</option>
                    {patients.map(patient => (
                      <option key={patient.childId} value={patient.childId}>
                        {patient.name} · Veli: {patient.parentName}
                      </option>
                    ))}
                  </select>
                  {selectedPatient && (
                    <p className="mt-2 text-xs text-gray-500">
                      Son seans: {selectedPatient.lastSession || 'Belirtilmedi'} · Görev durumu: {selectedPatient.tasksCompleted}/{selectedPatient.totalTasks}
                    </p>
                  )}
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Tarama</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {latestScreening ? `${latestScreening.score}/20 · ${latestScreening.riskLevel}` : contextLoading ? 'Yükleniyor' : 'Kayıt yok'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Aktivite</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {latestActivity ? `${latestActivity.activityTitle} ${latestActivity.score}/${latestActivity.total}` : contextLoading ? 'Yükleniyor' : 'Kayıt yok'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Not</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{notes.length || 0} kayıt</p>
                  </div>
                </div>
                <Input label="Öğrenci Adı Soyadı" placeholder="Örn: Can Yılmaz" value={studentName} onChange={e => setStudentName(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Yaş / Sınıf" placeholder="Örn: 7 Yaş" value={studentAge} onChange={e => setStudentAge(e.target.value)} />
                  <Input label="Eğitsel Tanı" placeholder="Örn: OSB" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Performans Özeti</label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 min-h-[120px]"
                    placeholder="Öğrencinin şu anki yapabildiklerini detaylıca yazın..."
                    value={performance}
                    onChange={e => setPerformance(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={buildPerformanceDraft} className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50/50 shadow-sm transition-all hover:-translate-y-0.5">
                      <Sparkles size={15} className="mr-1.5 text-indigo-600" /> Verilerden Taslak Oluştur
                    </Button>
                    <Button size="sm" onClick={() => setShowAiBepModal(true)} className="rounded-xl border border-indigo-600/30 text-indigo-700 bg-indigo-50 hover:bg-indigo-100/60 shadow-sm transition-all hover:-translate-y-0.5">
                      <Sparkles size={15} className="mr-1.5 text-indigo-600" /> AI BEP Asistanı
                    </Button>
                    <Button size="sm" onClick={handleAiSuggest} loading={aiLoading} className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 group">
                      <span className="relative z-10 flex items-center"><Sparkles size={15} className="mr-1.5 text-yellow-300 animate-pulse" /> AI'den Hedef Öner</span>
                    </Button>
                  </div>
                  {aiSuggestions && (
                    <div className="mt-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                      <p className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                        <Sparkles size={13} /> Gemini AI Hedef Önerileri
                      </p>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiSuggestions}</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target size={20} className="text-indigo-500" />
                  2. Hedef Ekleme
                </CardTitle>
              </CardHeader>
              <div className="p-6 pt-0 space-y-5">
                <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50 flex items-center justify-between gap-4 border border-white/20 group cursor-pointer transition-all hover:shadow-indigo-300/50 hover:-translate-y-0.5" onClick={() => setShowAiAssistantModal(true)}>
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700"></div>
                  
                  <div className="relative z-10 space-y-1.5">
                    <p className="text-base font-extrabold flex items-center gap-2 drop-shadow-sm">
                      <Sparkles size={18} className="text-yellow-300 animate-pulse" /> AI SMART Hedef Asistanı
                    </p>
                    <p className="text-sm text-indigo-100/90 font-medium max-w-[280px] leading-snug">
                      Sıradan bir fikri anında klinik düzeyde ölçülebilir bir SMART hedefe dönüştürün.
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    type="button"
                    className="relative z-10 bg-white/95 text-indigo-700 hover:bg-white font-bold shrink-0 shadow-lg border-0 transition-transform group-hover:scale-105 rounded-xl"
                  >
                    Asistanı Aç <span className="ml-1 text-lg">⚡</span>
                  </Button>
                </div>

                <div className="rounded-2xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 to-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-indigo-100 rounded-lg"><Sparkles size={16} className="text-indigo-600" /></div>
                    <p className="text-sm font-bold text-gray-900">Hazır hedef şablonları</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {allTemplates.map(template => (
                      <button
                        key={template.title}
                        type="button"
                        onClick={() => handleUseTemplate(template)}
                        className="text-left rounded-xl bg-white border border-gray-100 p-3.5 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group"
                      >
                        <p className="text-[11px] font-extrabold text-indigo-500 uppercase tracking-wider mb-1">{template.domain}</p>
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{template.title}</p>
                      </button>
                    ))}
                  </div>
                  {noteBasedTemplates.length > 0 && (
                    <div className="mt-4 border-t border-indigo-100 pt-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 mb-2">Notlardan önerilenler</p>
                      <div className="flex flex-wrap gap-2">
                        {noteBasedTemplates.map(template => (
                          <button
                            key={`note-${template.title}`}
                            type="button"
                            onClick={() => handleAddTemplateGoal(template)}
                            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-100 hover:border-indigo-300"
                          >
                            + {template.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gelişim Alanı</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={newDomain} onChange={e => setNewDomain(e.target.value)}>
                    {DOMAINS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uzun Dönem Hedef (Yıllık)</label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 min-h-[82px]"
                    placeholder="Örn: Bağımsız olarak tuvalet ihtiyacını giderir."
                    value={newLongTerm}
                    onChange={e => setNewLongTerm(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kısa Dönem Hedef (Aylık)</label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 min-h-[82px]"
                    placeholder="Örn: Hatırlatıldığında tuvalete gider."
                    value={newShortTerm}
                    onChange={e => setNewShortTerm(e.target.value)}
                  />
                </div>
                <Input label="Ölçüt / Kriter" placeholder="Örn: 4/5 denemede bağımsız (%80)" value={newCriteria} onChange={e => setNewCriteria(e.target.value)} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Yöntem" placeholder="Model olma, ipucu azaltma..." value={newMethod} onChange={e => setNewMethod(e.target.value)} />
                  <Input label="Materyal" placeholder="Görsel kart, oyuncak..." value={newMaterial} onChange={e => setNewMaterial(e.target.value)} />
                </div>
                <Input label="Aile Ev Çalışması" placeholder="Ev rutininde kısa tekrar..." value={newFamilyTask} onChange={e => setNewFamilyTask(e.target.value)} />
                
                <div className="grid sm:grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full border-dashed" onClick={handleAddGoal}>
                    <Plus size={16} className="mr-1.5" /> Bu Hedefi Ekle
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setShowTemplateModal(true)}>
                    <Save size={16} className="mr-1.5" /> Şablon Kaydet
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">Belge Durumu</p>
                      <h2 className="text-xl font-bold text-gray-900">BEP taslağı</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">{completionPercent}%</p>
                      <p className="text-xs text-gray-400">tamam</p>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-indigo-50 mt-3 overflow-hidden shadow-inner relative">
                    <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-600 transition-all duration-1000 ease-out" style={{ width: `${completionPercent}%` }}>
                      <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/30 blur-sm animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {completionItems.map(item => (
                    <div key={item.label} className={`rounded-xl border p-3 text-sm ${
                      item.done ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-500'
                    }`}>
                      <div className="flex items-center gap-2">
                        {item.done ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 size={16} className="text-indigo-500" />
                      Hedef ilerlemesi
                    </p>
                    <p className="text-sm font-bold text-indigo-600">{averageProgress}%</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${averageProgress}%` }} />
                  </div>
                  {sharedAt && <p className="mt-2 text-xs text-green-600">Aileye gönderildi: {formatDate(sharedAt)}</p>}
                </div>

                {/* Geçmiş BEP Raporları */}
                {savedReports.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-indigo-400" />
                      Kaydedilen Raporlar ({savedReports.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {savedReports.map(r => (
                        <div key={r.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{r.studentName}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {r.sharedAt ? new Date(r.sharedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              {r.diagnosis ? ` · ${r.diagnosis}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (!r.id) return;
                              bepReportService.delete(r.id)
                                .then(() => { setSavedReports(prev => prev.filter(x => x.id !== r.id)); toast.success('Rapor silindi.'); })
                                .catch(() => toast.error('Silinemedi.'));
                            }}
                            className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                            title="Raporu sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ClipboardCheck size={18} className="text-indigo-500" />
                    Eklenen Hedefler ({goals.length})
                  </h3>
                  <Button size="sm" onClick={() => setStep(2)} disabled={goals.length === 0}>
                    Önizle
                  </Button>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {goals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Henüz hedef eklenmedi.</p>
                    <div className="mt-4 grid gap-2">
                      {allTemplates.slice(0, 3).map(template => (
                        <button
                          key={template.title}
                          type="button"
                          onClick={() => handleAddTemplateGoal(template)}
                          className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
                        >
                          + {template.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  goals.map(goal => (
                    <div key={goal.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group">
                      <button 
                        onClick={() => removeGoal(goal.id)}
                        className="absolute top-3 right-3 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{goal.domain}</span>
                      <p className="font-semibold text-gray-900 mt-1 text-sm"><span className="text-gray-500 font-normal">U.D:</span> {goal.longTerm}</p>
                      <p className="text-gray-700 text-sm mt-0.5"><span className="text-gray-500">K.D:</span> {goal.shortTerm}</p>
                      <p className="text-xs text-gray-400 mt-2 bg-gray-50 inline-block px-2 py-0.5 rounded">Ölçüt: {goal.criteria}</p>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Adım Adım Başarı Haritası 🗺️</span>
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{goal.progress}%</span>
                        </div>
                        
                        <div className="relative flex items-center justify-between px-1 py-2 my-2">
                          <div className="absolute left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 top-1/2 rounded-full" />
                          <div 
                            className="absolute left-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 -translate-y-1/2 top-1/2 rounded-full transition-all duration-500" 
                            style={{ width: `${goal.progress}%` }}
                          />
                          
                          {([
                            { value: 0, emoji: '🌱', label: 'Başlangıç' },
                            { value: 25, emoji: '🔍', label: 'Farkındalık' },
                            { value: 50, emoji: '⚡', label: 'Uygulama' },
                            { value: 75, emoji: '🌟', label: 'Genelleme' },
                            { value: 100, emoji: '🏆', label: 'Bağımsızlık' }
                          ]).map(milestone => {
                            const isAchieved = goal.progress >= milestone.value;
                            return (
                              <button
                                key={milestone.value}
                                type="button"
                                onClick={() => handleGoalChange(goal.id, { progress: milestone.value })}
                                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                                  isAchieved 
                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200 ring-4 ring-indigo-50' 
                                    : 'bg-white border-2 border-gray-200 text-gray-400 hover:border-indigo-300'
                                }`}
                                title={`${milestone.label} (${milestone.value}%)`}
                              >
                                <span className="text-xs">{milestone.emoji}</span>
                              </button>
                            );
                          })}
                        </div>
                        
                        <p className="text-[11px] font-medium text-indigo-600 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50 leading-relaxed italic">
                          {goal.progress === 0 && '🌱 Yolculuk başlıyor! İlk adım her zaman en değerlisidir.'}
                          {goal.progress > 0 && goal.progress <= 30 && '🔍 Harika, farkındalık kazanılıyor. Küçük adımlarla devam!'}
                          {goal.progress > 30 && goal.progress <= 60 && '⚡ Yolu yarıladık! Uygulamalar gayet düzenli gidiyor.'}
                          {goal.progress > 60 && goal.progress <= 90 && '🌟 Harika gidiyor, beceri farklı ortamlara genelleniyor!'}
                          {goal.progress > 90 && '🏆 Tebrikler! Hedefe tam bağımsızlıkla ulaşıldı.'}
                        </p>
                      </div>
                      <select
                        value={goal.status}
                        onChange={e => handleGoalChange(goal.id, { status: e.target.value as Goal['status'] })}
                        className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                      >
                        {(['Başlamadı', 'Devam ediyor', 'Tamamlandı', 'Revize edilmeli'] as Goal['status'][]).map(status => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                      <input
                        value={goal.lastObservation}
                        onChange={e => handleGoalChange(goal.id, { lastObservation: e.target.value })}
                        placeholder="Son gözlem..."
                        className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                      />
                    </div>
                  ))
                )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-xl shadow-gray-200/50 rounded-xl p-0 mx-auto w-full overflow-hidden border border-gray-200 print:shadow-none print:border-none print:rounded-none">
          {/* Printable Area */}
          <div ref={reportRef} className="bg-white p-10 min-h-[1056px] print:p-0 print:min-h-0 text-black">
            
            <div className="border-b-2 border-black pb-4 mb-8 text-center">
              <h1 className="text-2xl font-bold mb-1 uppercase tracking-wider">Bireyselleştirilmiş Eğitim Programı (BEP)</h1>
              <p className="text-gray-600 text-sm">Eğitim Yılı: {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    <tr><td className="font-bold py-2 w-1/3 border-b border-gray-200">Öğrenci Adı:</td><td className="py-2 border-b border-gray-200">{studentName || '..............................'}</td></tr>
                    <tr><td className="font-bold py-2 border-b border-gray-200">Yaş / Sınıf:</td><td className="py-2 border-b border-gray-200">{studentAge || '..............................'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    <tr><td className="font-bold py-2 w-1/3 border-b border-gray-200">Eğitsel Tanı:</td><td className="py-2 border-b border-gray-200">{diagnosis || '..............................'}</td></tr>
                    <tr><td className="font-bold py-2 border-b border-gray-200">Tarih:</td><td className="py-2 border-b border-gray-200">{new Date().toLocaleDateString('tr-TR')}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-lg font-bold bg-gray-100 py-2 px-4 border border-black mb-4">Mevcut Performans Özeti</h2>
              <div className="border border-black p-4 min-h-[120px] text-sm whitespace-pre-wrap leading-relaxed">
                {performance || 'Öğrencinin mevcut performans düzeyi buraya yazılacaktır.'}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold bg-gray-100 py-2 px-4 border border-black mb-4">Eğitim Hedefleri</h2>
              <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-black p-3 text-left w-1/4">Gelişim Alanı</th>
                    <th className="border border-black p-3 text-left w-1/3">Uzun Dönem Hedef</th>
                    <th className="border border-black p-3 text-left w-1/3">Kısa Dönem Hedef</th>
                    <th className="border border-black p-3 text-left">Ölçüt</th>
                    <th className="border border-black p-3 text-left">İlerleme</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((g, i) => (
                    <tr key={i}>
                      <td className="border border-black p-3 font-medium">{g.domain}</td>
                      <td className="border border-black p-3">{g.longTerm}</td>
                      <td className="border border-black p-3">{g.shortTerm}</td>
                      <td className="border border-black p-3 text-xs">{g.criteria}</td>
                      <td className="border border-black p-3 text-xs">{g.progress}% · {g.status}</td>
                    </tr>
                  ))}
                  {goals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="border border-black p-8 text-center text-gray-500">Hedef bulunmamaktadır.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {goals.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold bg-gray-100 py-2 px-4 border border-black mb-4">Yöntem, Materyal ve Aile Çalışması</h2>
                <div className="space-y-4">
                  {goals.map(goal => (
                    <div key={`method-${goal.id}`} className="border border-black p-4 text-sm">
                      <p className="font-bold">{goal.domain}</p>
                      <p className="mt-2"><span className="font-semibold">Yöntem:</span> {goal.method}</p>
                      <p><span className="font-semibold">Materyal:</span> {goal.material}</p>
                      <p><span className="font-semibold">Aile çalışması:</span> {goal.familyTask}</p>
                      {goal.lastObservation && <p><span className="font-semibold">Son gözlem:</span> {goal.lastObservation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-16 pt-16 grid grid-cols-2 text-center text-sm">
              <div>
                <p className="font-bold">Özel Eğitim Uzmanı</p>
                <p className="mt-12 border-t border-black inline-block w-48 pt-2">İmza</p>
              </div>
              <div>
                <p className="font-bold">Öğrenci Velisi</p>
                <p className="mt-12 border-t border-black inline-block w-48 pt-2">İmza</p>
              </div>
            </div>

          </div>
        </div>
      )}
      <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Hedef Şablonu Kaydet">
        <div className="space-y-4">
          <Input
            label="Şablon Adı"
            placeholder="Örn: Göz teması başlangıç hedefi"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
          />
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600">
            Bu şablon uzman hesabında yerel olarak saklanır ve sonraki BEP taslaklarında hazır hedef olarak görünür.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowTemplateModal(false)}>İptal</Button>
            <Button className="flex-1" onClick={handleSaveTemplate}>Kaydet</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAiAssistantModal} onClose={() => setShowAiAssistantModal(false)} title="AI SMART Hedef Asistanı ⚡">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Geliştirmek istediğiniz beceriyi veya davranışı kısaca açıklayın *
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 min-h-[100px] bg-white text-gray-900"
              placeholder="Örn: Yemek yerken kaşık kullanmayı bağımsız yapsın ve sabırsızlanmasın."
              value={aiAssistantInput}
              onChange={e => setAiAssistantInput(e.target.value)}
            />
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 text-xs text-violet-700 leading-relaxed">
            💡 Asistanımız, yazdığınız genel isteği analiz ederek Özel Eğitim standartlarında ölçülebilir, uzun/kısa vadeli hedefler, yöntemler ve aile egzersizleri içeren tam bir SMART hedef yapısı oluşturacaktır.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setShowAiAssistantModal(false); setAiAssistantInput(''); }}>İptal</Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold" 
              onClick={handleGenerateSmartGoal}
              loading={aiAssistantLoading}
            >
              Hedef Oluştur ⚡
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAiBepModal} onClose={() => setShowAiBepModal(false)} title="AI BEP Raporu Asistanı 🪄">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Öğrencinin Güçlü Yanları *
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 min-h-[80px] bg-white text-gray-900"
              placeholder="Örn: Görsel hafızası çok iyi, nesneleri eşleştirebiliyor, yönergeleri takip ediyor."
              value={aiBepStrengths}
              onChange={e => setAiBepStrengths(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zorlanılan Alanlar / İhtiyaçlar *
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 min-h-[80px] bg-white text-gray-900"
              placeholder="Örn: Akran etkileşiminde zorlanıyor, sözel istek bildiremiyor, ses hassasiyeti var."
              value={aiBepWeaknesses}
              onChange={e => setAiBepWeaknesses(e.target.value)}
            />
          </div>
          <div className="rounded-xl bg-indigo-50 border border-indigo-100/50 p-4 text-xs text-indigo-700 leading-relaxed">
            💡 Asistanımız, girdiğiniz güçlü ve zorlanılan alanları analiz ederek profesyonel bir mevcut performans özeti yazacak ve bu alanlara yönelik ölçülebilir 3 farklı eğitim hedefini doğrudan rapora ekleyecektir.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setShowAiBepModal(false); setAiBepStrengths(''); setAiBepWeaknesses(''); }}>İptal</Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold" 
              onClick={handleGenerateAiBep}
              loading={aiBepLoading}
            >
              BEP Raporu Hazırla ✨
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
