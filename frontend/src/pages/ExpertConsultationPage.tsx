import { useState } from 'react';
import {
  Users, Search, Plus, MessageSquare, Clock, Shield, X,
  FileText, CheckCircle, Tag, Eye, User
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useAuthStore } from '@/store/authStore';

type CaseStatus = 'open' | 'resolved' | 'archived';

interface ConsultationCase {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: CaseStatus;
  authorName: string;
  authorTitle: string;
  createdAt: string;
  repliesCount: number;
}

const MOCK_CASES: ConsultationCase[] = [
  {
    id: '1',
    title: '4 Yaş OSB - Yoğun Ekolali ve Yönerge Takibi Eksikliği',
    description: 'Vakamızda 4 yaşında erkek çocuk, yoğun gecikmiş ekolali gözlemleniyor. Yönerge takibi %20 seviyelerinde. Floortime ile ilerlemeye çalışıyoruz ancak aile katılımında zorluk yaşıyoruz. Benzer vakalarda nasıl bir yaklaşım sergilediniz?',
    tags: ['Floortime', 'Ekolali', 'İletişim'],
    status: 'open',
    authorName: 'Ayşe Yılmaz',
    authorTitle: 'Dil ve Konuşma Terapisti',
    createdAt: '2 saat önce',
    repliesCount: 3
  },
  {
    id: '2',
    title: 'Beslenme Reddi - Dokunsal Hassasiyet',
    description: '3.5 yaşında kız çocuğu, katı gıda reddi var. Duyu bütünleme seanslarında oral motor egzersizlere başladık ancak çok direnç gösteriyor. Ev programı için farklı stratejiler öneren var mı?',
    tags: ['Duyu Bütünleme', 'Ergoterapi', 'Beslenme'],
    status: 'open',
    authorName: 'Mehmet Demir',
    authorTitle: 'Ergoterapist',
    createdAt: '5 saat önce',
    repliesCount: 7
  },
  {
    id: '3',
    title: 'Öfke Nöbetleri ve ABA Modifikasyonu',
    description: 'Ortam değişikliğinde aşırı ağlama ve kendine zarar verme davranışı. Aile dışarı çıkamıyor. Fonksiyonel analiz tamamlandı. Kaçınma kaynaklı olduğu düşünülüyor.',
    tags: ['ABA', 'Davranış Problemi'],
    status: 'resolved',
    authorName: 'Zeynep Kaya',
    authorTitle: 'Özel Eğitim Uzmanı',
    createdAt: '1 gün önce',
    repliesCount: 12
  }
];

export function ExpertConsultationPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ConsultationCase | null>(null);

  // New Case Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = () => {
    // Mock create
    setShowNewModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  const filteredCases = MOCK_CASES.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchTab = activeTab === 'all' || c.status === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-2">
      <PageOnboarding
        pageId="expert_consultation"
        title="Uzman Konsültasyon Odası"
        description="Diğer uzmanlarla vakalarınızı tartışın, multidisipliner yaklaşımlar geliştirin ve bilgi alışverişinde bulunun. Bu alan sadece uzmanlara özeldir."
        steps={[
          {
            icon: <Shield size={20} />,
            title: "Güvenli Alan",
            description: "Sadece doğrulanmış uzmanların erişebildiği bu alanda meslektaşlarınızla fikir alışverişi yapın.",
          },
          {
            icon: <Users size={20} />,
            title: "Multidisipliner Yaklaşım",
            description: "Ergoterapist, DKT, Özel Eğitimci gibi farklı disiplinlerden uzmanlardan vakalarınız için görüş alın.",
          },
        ]}
      />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-purple-600" />
            Vaka Danışma Odası
          </h1>
          <p className="text-gray-500 mt-1">Uzmanlar arası multidisipliner vaka değerlendirme ağı</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus size={16} className="mr-2" />
          Yeni Vaka Danış
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex gap-1 w-full md:w-auto p-1 bg-gray-50 rounded-xl">
          {(['all', 'open', 'resolved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full md:w-auto ${
                activeTab === tab
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'all' ? 'Tüm Vakalar' : tab === 'open' ? 'Açık Tartışmalar' : 'Çözülenler'}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Vaka veya etiket ara..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredCases.map(c => (
          <Card key={c.id} className="p-0 overflow-hidden hover:border-purple-200 transition-colors cursor-pointer group" onClick={() => setSelectedCase(c)}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    {c.status === 'open' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase">
                        <Clock size={10} /> Tartışmaya Açık
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 uppercase">
                        <CheckCircle size={10} /> Çözüldü / Kapalı
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{c.title}</h3>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                  <span className="text-xs font-semibold text-gray-900">{c.authorName}</span>
                  <span className="text-[10px] text-purple-600 font-medium">{c.authorTitle}</span>
                  <span className="text-[10px] text-gray-400 mt-1">{c.createdAt}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                {c.description}
              </p>

              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="flex flex-wrap gap-2">
                  {c.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                  <span className="flex items-center gap-1.5 hover:text-purple-600 transition-colors">
                    <MessageSquare size={14} /> {c.repliesCount} Görüş
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredCases.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search size={24} className="text-purple-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Vaka bulunamadı</h3>
            <p className="text-sm text-gray-500 mt-1">Arama kriterlerinize uygun sonuç yok.</p>
          </div>
        )}
      </div>

      {/* New Case Modal */}
      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Yeni Vaka Danış" className="max-w-2xl">
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex gap-3 text-sm text-purple-800">
            <Shield className="shrink-0 text-purple-600 mt-0.5" size={18} />
            <p>
              <strong>Uyarı:</strong> Vaka detaylarını paylaşırken KVKK gereği çocuğun ve ailenin kimliğini açık edecek (isim, soyisim, fotoğraf vb.) bilgileri maskelemeye özen gösteriniz.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Vaka Özeti (Başlık)</label>
            <input 
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Örn: 4 Yaş OSB Yoğun Ekolali" 
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Detaylar ve Gözlemler</label>
            <textarea 
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
              rows={5}
              placeholder="Vaka hikayesi, uygulanan yöntemler, yaşanılan zorluk ve uzmanlardan beklenen görüş..." 
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Etiketler</label>
            <input 
              placeholder="Virgülle ayırın (Örn: Floortime, ABA, Ergoterapi)" 
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNewModal(false)}>İptal</Button>
            <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700 text-white">Vakayı Yayınla</Button>
          </div>
        </div>
      </Modal>

      {/* View Case Modal */}
      <Modal isOpen={!!selectedCase} onClose={() => setSelectedCase(null)} title="Vaka Detayı" className="max-w-3xl">
        {selectedCase && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedCase.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-purple-600" />
                  {selectedCase.authorName} <span className="text-xs text-gray-400">({selectedCase.authorTitle})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {selectedCase.createdAt}
                </span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-700">
              <p>{selectedCase.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {selectedCase.tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  <Tag size={12} /> {t}
                </span>
              ))}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <h4 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={16} className="text-purple-600" />
                Uzman Görüşleri ({selectedCase.repliesCount})
              </h4>
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-3">Bu vaka için tartışma alanı mock veridir.</p>
                <textarea 
                  rows={3} 
                  placeholder="Uzman görüşünüzü buraya yazın..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-colors resize-none mb-2"
                />
                <div className="flex justify-end">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">Görüş Bildir</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
