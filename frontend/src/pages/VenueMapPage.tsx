import { useEffect, useState } from 'react';
import { MapPin, Star, Plus, Volume2, Sun, Users } from 'lucide-react';
import { venueService, type Venue, type VenueReview } from '@/services/venueService';
import { Button } from '@/components/ui/Button';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { toast } from '@/store/toastStore';

export function VenueMapPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<VenueReview[]>([]);
  const [loading, setLoading] = useState(true);

  // New review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    noiseLevel: 3, lightLevel: 3, crowdLevel: 3, comments: ''
  });

  useEffect(() => {
    venueService.getAll().then(setVenues).finally(() => setLoading(false));
  }, []);

  const handleSelectVenue = (v: Venue) => {
    setSelectedVenue(v);
    setShowReviewForm(false);
    venueService.getReviews(v.id).then(setReviews);
  };

  const handleSubmitReview = async () => {
    if (!selectedVenue) return;
    try {
      const newReview = await venueService.addReview(selectedVenue.id, {
        venueId: selectedVenue.id,
        ...reviewForm
      });
      setReviews(prev => [...prev, newReview]);
      setShowReviewForm(false);
      setReviewForm({ noiseLevel: 3, lightLevel: 3, crowdLevel: 3, comments: '' });
      toast.success('Değerlendirmeniz eklendi!');
      
      // Update local venue score mock
      venueService.getAll().then(setVenues);
    } catch {
      toast.error('Değerlendirme eklenemedi.');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="venue-map"
        title="Duyusal Dostu Mekan Haritası"
        description="Otizmli bireyler için uygun, gürültü ve kalabalık seviyesi düşük mekanları keşfedin."
        steps={[
          { icon: <MapPin size={20} />, title: "Mekanları İnceleyin", description: "Çevrenizdeki duyusal dostu mekanları görün." },
          { icon: <Star size={20} />, title: "Deneyiminizi Paylaşın", description: "Gittiğiniz mekanları oylayarak diğer ailelere yardımcı olun." }
        ]}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duyusal Dostu Mekanlar</h1>
          <p className="text-gray-500 mt-1">Aileler tarafından değerlendirilmiş mekanlar</p>
        </div>
        <Button onClick={() => toast.info('Haritada yeni mekan ekleme yakında eklenecek!')}><Plus size={16} className="mr-2" />Yeni Mekan Ekle</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3">Yakındaki Mekanlar</h2>
            {venues.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Henüz mekan eklenmemiş.</p>
            ) : (
              <div className="space-y-3">
                {venues.map(v => (
                  <div key={v.id} onClick={() => handleSelectVenue(v)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedVenue?.id === v.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-primary-200 bg-white'}`}>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900 text-sm">{v.name}</h3>
                      <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium">{v.category}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{v.address || v.description}</p>
                    
                    {v.avgNoiseLevel > 0 && (
                      <div className="flex gap-3 mt-3">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium" title="Ses Seviyesi (5 = Çok Sessiz)">
                          <Volume2 size={12} className={v.avgNoiseLevel >= 4 ? 'text-green-500' : 'text-orange-400'} /> {v.avgNoiseLevel.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium" title="Işık Seviyesi (5 = Göz Yormayan)">
                          <Sun size={12} className={v.avgLightLevel >= 4 ? 'text-green-500' : 'text-orange-400'} /> {v.avgLightLevel.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium" title="Kalabalık (5 = Tenha)">
                          <Users size={12} className={v.avgCrowdLevel >= 4 ? 'text-green-500' : 'text-orange-400'} /> {v.avgCrowdLevel.toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-[300px] bg-gray-100 relative flex items-center justify-center">
            {/* Mock Map Placeholder */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
            <div className="z-10 text-center">
              <MapPin size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 font-medium">Harita Görünümü (Demo)</p>
              <p className="text-xs text-gray-400 mt-1">Sadece geliştirme aşaması önizlemesi.</p>
            </div>
            {selectedVenue && (
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white">
                <h3 className="font-bold text-gray-900">{selectedVenue.name}</h3>
                <p className="text-sm text-gray-600">{selectedVenue.address}</p>
              </div>
            )}
          </div>

          {selectedVenue ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><Star size={18} className="text-yellow-500" /> Değerlendirmeler</h2>
                <Button variant="outline" size="sm" onClick={() => setShowReviewForm(!showReviewForm)}>
                  {showReviewForm ? 'İptal' : 'Değerlendirme Ekle'}
                </Button>
              </div>

              {showReviewForm && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ses Seviyesi (1-5)</label>
                      <input type="range" min="1" max="5" value={reviewForm.noiseLevel} onChange={e => setReviewForm({...reviewForm, noiseLevel: +e.target.value})} className="w-full" />
                      <div className="flex justify-between text-[10px] text-gray-500"><span>Çok Gürültülü</span><span>Çok Sessiz</span></div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Işık Seviyesi (1-5)</label>
                      <input type="range" min="1" max="5" value={reviewForm.lightLevel} onChange={e => setReviewForm({...reviewForm, lightLevel: +e.target.value})} className="w-full" />
                      <div className="flex justify-between text-[10px] text-gray-500"><span>Çok Parlak</span><span>Göz Yormayan</span></div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Kalabalık (1-5)</label>
                      <input type="range" min="1" max="5" value={reviewForm.crowdLevel} onChange={e => setReviewForm({...reviewForm, crowdLevel: +e.target.value})} className="w-full" />
                      <div className="flex justify-between text-[10px] text-gray-500"><span>Çok Kalabalık</span><span>Tenha</span></div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Yorumunuz</label>
                    <textarea value={reviewForm.comments} onChange={e => setReviewForm({...reviewForm, comments: e.target.value})} className="w-full text-sm p-2 rounded-lg border border-gray-200" rows={2} placeholder="Mekan hakkındaki deneyimleriniz..."></textarea>
                  </div>
                  <Button onClick={handleSubmitReview} className="w-full">Gönder</Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Bu mekan için henüz değerlendirme yapılmamış.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r, i) => (
                    <div key={i} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex gap-4 mb-2 text-xs font-medium text-gray-600 bg-gray-50 p-2 rounded-lg inline-flex">
                        <span className="flex items-center gap-1"><Volume2 size={12}/> {r.noiseLevel}/5</span>
                        <span className="flex items-center gap-1"><Sun size={12}/> {r.lightLevel}/5</span>
                        <span className="flex items-center gap-1"><Users size={12}/> {r.crowdLevel}/5</span>
                      </div>
                      <p className="text-sm text-gray-800">{r.comments}</p>
                      {r.createdAt && <p className="text-[10px] text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
              <MapPin size={32} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-800 mb-1">Mekan Seçin</h3>
              <p className="text-sm text-gray-500">Değerlendirmeleri görmek için listeden bir mekan seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
