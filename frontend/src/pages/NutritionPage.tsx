import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Search, X, Apple, Pencil, BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { nutritionApiService } from '@/services/nutritionApiService';
import { toast } from '@/store/toastStore';

type FoodStatus = 'accepted' | 'refused' | 'preferred' | 'allergic' | 'intolerant' | 'trying';

interface FoodItem {
  id: string;
  childId: string;
  name: string;
  category: string;
  status: FoodStatus;
  texture: string;
  color: string;
  temperature: string;
  notes: string;
  trialCount: number;
  lastTried?: string;
  createdAt: string;
}

interface MealLog {
  id: string;
  childId: string;
  date: string;
  mealType: string;
  foods: string;
  amountEaten: string;
  mood: string;
  notes: string;
  createdAt: string;
}

interface DietInfo {
  childId: string;
  gfcfDiet: boolean;
  sugarFree: boolean;
  dairyFree: boolean;
  glutenFree: boolean;
  soyFree: boolean;
  eggFree: boolean;
  otherDiet: string;
  notes: string;
}

const FOOD_CATEGORIES = ['Tahıllar', 'Sebze', 'Meyve', 'Et / Tavuk / Balık', 'Süt Ürünleri', 'Baklagiller', 'Atıştırmalık', 'İçecek', 'Tatlı', 'Diğer'];
const TEXTURES = ['', 'Sıvı', 'Püre', 'Yumuşak', 'Normal', 'Sert', 'Gevrek', 'Yapışkan'];
const TEMPERATURES = ['', 'Soğuk', 'Oda Sıcaklığı', 'Ilık', 'Sıcak'];
const MEAL_TYPES = ['Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Ara Öğün', 'Atıştırmalık'];
const MEAL_MOODS = ['😄 İstekle', '🙂 Normal', '😐 İsteksiz', '😕 Zorla', '😢 Ret'];

const STATUS_CONFIG: Record<FoodStatus, { label: string; color: string; bg: string }> = {
  preferred:  { label: '❤️ Tercih Edilen', color: 'text-green-700',  bg: 'bg-green-100' },
  accepted:   { label: '✅ Yiyor',         color: 'text-blue-700',   bg: 'bg-blue-100' },
  trying:     { label: '🔄 Deneniyor',     color: 'text-yellow-700', bg: 'bg-yellow-100' },
  refused:    { label: '❌ Yemiyor',       color: 'text-red-700',    bg: 'bg-red-100' },
  intolerant: { label: '⚠️ İntolerans',   color: 'text-orange-700', bg: 'bg-orange-100' },
  allergic:   { label: '🚨 Alerjik',      color: 'text-red-800',    bg: 'bg-red-200' },
};

function emptyDiet(childId: string): DietInfo {
  return { childId, gfcfDiet: false, sugarFree: false, dairyFree: false, glutenFree: false, soyFree: false, eggFree: false, otherDiet: '', notes: '' };
}

const EMPTY_FOOD = { name: '', category: 'Tahıllar', status: 'accepted' as FoodStatus, texture: '', color: '', temperature: '', notes: '', trialCount: 0 };
const EMPTY_MEAL = { date: new Date().toISOString().split('T')[0], mealType: 'Kahvaltı', foods: '', amountEaten: '', mood: '🙂 Normal', notes: '' };

export function NutritionPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [diet, setDiet] = useState<DietInfo | null>(null);
  const [tab, setTab] = useState<'foods' | 'meals' | 'diet'>('foods');
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [foodForm, setFoodForm] = useState({ ...EMPTY_FOOD });
  const [mealForm, setMealForm] = useState({ ...EMPTY_MEAL });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FoodStatus | ''>('');
  const [filterCat, setFilterCat] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!children.length) childService.getAll().then(setChildren).catch(() => {}); }, []);
  useEffect(() => { if (!selectedChild && children.length) setSelectedChild(children[0]); }, [children, selectedChild, setSelectedChild]);
  useEffect(() => {
    if (!selectedChildId) return;
    nutritionApiService.getFoods(selectedChildId).then(data =>
      setFoods(data.map(f => ({ ...f, status: (f.accepted ? 'accepted' : 'refused') as FoodStatus, texture: '', color: '', temperature: '', notes: '', trialCount: 0 })))
    ).catch(() => {});
    nutritionApiService.getMeals(selectedChildId).then(data =>
      setMeals(data.map(m => ({ ...m, amountEaten: '', notes: m.notes || '' })).sort((a, b) => b.date.localeCompare(a.date)))
    ).catch(() => {});
    nutritionApiService.getDiet(selectedChildId).then(data =>
      setDiet(data ?? emptyDiet(selectedChildId))
    ).catch(() => setDiet(emptyDiet(selectedChildId)));
  }, [selectedChildId]);

  const openAddFood = () => { setEditingFood(null); setFoodForm({ ...EMPTY_FOOD }); setShowFoodModal(true); };
  const openEditFood = (f: FoodItem) => { setEditingFood(f); setFoodForm({ name: f.name, category: f.category, status: f.status, texture: f.texture, color: f.color, temperature: f.temperature, notes: f.notes, trialCount: f.trialCount }); setShowFoodModal(true); };

  const handleSaveFood = async () => {
    if (!foodForm.name.trim()) { toast.error('Besin adı zorunlu.'); return; }
    try {
      const created = await nutritionApiService.addFood(selectedChildId, { name: foodForm.name, accepted: foodForm.status !== 'refused', category: foodForm.category });
      const item: FoodItem = { ...created, status: created.accepted ? 'accepted' : 'refused' as FoodStatus, texture: '', color: '', temperature: '', notes: '', trialCount: 0 };
      setFoods(prev => [item, ...prev]);
      setShowFoodModal(false);
      toast.success('Besin kaydedildi.');
    } catch { toast.error('Kaydedilemedi.'); }
  };

  const handleSaveMeal = async () => {
    if (!mealForm.foods.trim()) { toast.error('Yenilen besin alanı zorunlu.'); return; }
    try {
      const created = await nutritionApiService.addMeal(selectedChildId, { date: mealForm.date, mealType: mealForm.mealType, foods: [mealForm.foods], mood: mealForm.mood });
      const meal: MealLog = { ...created, amountEaten: '', notes: '' };
      setMeals(prev => [meal, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setShowMealModal(false);
      toast.success('Öğün kaydedildi.');
    } catch { toast.error('Kaydedilemedi.'); }
  };

  const handleDeleteFood = async (id: string) => {
    try {
      await nutritionApiService.deleteFood(id);
      setFoods(prev => prev.filter(f => f.id !== id));
      setDeleteId(null);
      toast.success('Silindi.');
    } catch { toast.error('Silinemedi.'); }
  };

  const saveDietInfo = async () => {
    if (!diet) return;
    try {
      const saved = await nutritionApiService.saveDiet(selectedChildId, diet);
      setDiet({ ...saved, childId: saved.childId ?? selectedChildId, otherDiet: saved.otherDiet ?? '', notes: saved.notes ?? '' });
      toast.success('Diyet bilgileri kaydedildi.');
    } catch { toast.error('Kaydedilemedi.'); }
  };

  const filteredFoods = useMemo(() => foods.filter(f => {
    const q = search.toLowerCase();
    return (!q || f.name.toLowerCase().includes(q)) && (!filterStatus || f.status === filterStatus) && (!filterCat || f.category === filterCat);
  }), [foods, search, filterStatus, filterCat]);

  const foodsByStatus = useMemo(() => {
    const groups: Partial<Record<FoodStatus, FoodItem[]>> = {};
    filteredFoods.forEach(f => { if (!groups[f.status]) groups[f.status] = []; groups[f.status]!.push(f); });
    return groups;
  }, [filteredFoods]);

  const stats = useMemo(() => ({
    accepted: foods.filter(f => f.status === 'accepted' || f.status === 'preferred').length,
    refused: foods.filter(f => f.status === 'refused').length,
    allergic: foods.filter(f => f.status === 'allergic' || f.status === 'intolerant').length,
    trying: foods.filter(f => f.status === 'trying').length,
  }), [foods]);

  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="nutrition"
        title="Beslenme & Gıda Takibine Hoş Geldiniz"
        description="Çocuğunuzun yeme alışkanlıklarını, diyet kısıtlamalarını ve öğünlerini takip edin."
        steps={[
          {
            icon: <Apple size={20} />,
            title: "Besin Listesi",
            description: "Çocuğunuzun kabul ettiği veya reddettiği besinleri kaydedin."
          },
          {
            icon: <BarChart2 size={20} />,
            title: "Öğün Günlüğü",
            description: "Günlük olarak hangi öğünde ne yediğini ve duygu durumunu takip edin."
          }
        ]}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beslenme & Gıda Takibi</h1>
          <p className="text-gray-500 mt-1">Kabul edilen, reddedilen besinler ve öğün günlüğü</p>
        </div>
        <div className="flex gap-2">
          {tab === 'foods' && <Button onClick={openAddFood}><Plus size={15} className="mr-1" />Besin Ekle</Button>}
          {tab === 'meals' && <Button onClick={() => { setEditingMeal(null); setMealForm({ ...EMPTY_MEAL }); setShowMealModal(true); }}><Plus size={15} className="mr-1" />Öğün Ekle</Button>}
          {tab === 'diet' && <Button onClick={saveDietInfo}><Plus size={15} className="mr-1" />Kaydet</Button>}
        </div>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button key={c.id} onClick={() => setSelectedChild(c)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${selectedChildId === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!selectedChildId ? (
        <EmptyState icon={<Apple size={28} />} title="Çocuk bulunamadı" description="Önce Çocuklarım sayfasından profil ekleyin." />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Kabul', value: stats.accepted, color: 'text-green-600' },
              { label: 'Reddediyor', value: stats.refused, color: 'text-red-600' },
              { label: 'Deniyor', value: stats.trying, color: 'text-yellow-600' },
              { label: 'Alerjik', value: stats.allergic, color: 'text-orange-600' },
            ].map(s => (
              <Card key={s.label} className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {([['foods', 'Besin Listesi'], ['meals', 'Öğün Günlüğü'], ['diet', 'Diyet Bilgileri']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* FOODS TAB */}
          {tab === 'foods' && (
            <>
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-40">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Besin ara..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FoodStatus | '')}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                  <option value="">Tüm Durumlar</option>
                  {(Object.entries(STATUS_CONFIG) as [FoodStatus, typeof STATUS_CONFIG[FoodStatus]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                  <option value="">Tüm Kategoriler</option>
                  {FOOD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                {(search || filterStatus || filterCat) && (
                  <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterCat(''); }}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-500 cursor-pointer">
                    <X size={14} />Temizle
                  </button>
                )}
              </div>

              {filteredFoods.length === 0 ? (
                <EmptyState icon={<Apple size={28} />} title="Besin bulunamadı" description={foods.length === 0 ? 'İlk besini ekleyin.' : 'Arama kriterine uygun besin yok.'}
                  action={foods.length === 0 ? <Button onClick={openAddFood}><Plus size={14} className="mr-1" />Besin Ekle</Button> : undefined} />
              ) : (
                <div className="space-y-4">
                  {(Object.entries(STATUS_CONFIG) as [FoodStatus, typeof STATUS_CONFIG[FoodStatus]][]).map(([status, cfg]) => {
                    const items = foodsByStatus[status];
                    if (!items?.length) return null;
                    return (
                      <div key={status}>
                        <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2`}>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-gray-400 font-normal">{items.length} besin</span>
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {items.map(food => (
                            <div key={food.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{food.name}</p>
                                <p className="text-xs text-gray-500">{food.category}</p>
                                {(food.texture || food.temperature) && (
                                  <p className="text-xs text-gray-400 mt-0.5">{[food.texture, food.temperature].filter(Boolean).join(' · ')}</p>
                                )}
                                {food.notes && <p className="text-xs text-gray-500 mt-1 italic">{food.notes}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => openEditFood(food)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><Pencil size={12} /></button>
                                <button onClick={() => setDeleteId(food.id)} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* MEALS TAB */}
          {tab === 'meals' && (
            <div className="space-y-3">
              {meals.length === 0 ? (
                <EmptyState icon={<Apple size={28} />} title="Öğün kaydı yok" description="İlk öğün kaydını ekleyin."
                  action={<Button onClick={() => { setEditingMeal(null); setMealForm({ ...EMPTY_MEAL }); setShowMealModal(true); }}><Plus size={14} className="mr-1" />Öğün Ekle</Button>} />
              ) : (
                meals.map(meal => (
                  <div key={meal.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-gray-500">{new Date(meal.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{meal.mealType}</span>
                        <span className="text-xs">{meal.mood}</span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium">{meal.foods}</p>
                      {meal.amountEaten && <p className="text-xs text-gray-500">Miktar: {meal.amountEaten}</p>}
                      {meal.notes && <p className="text-xs text-gray-500 italic mt-0.5">{meal.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditingMeal(meal); setMealForm({ date: meal.date, mealType: meal.mealType, foods: meal.foods, amountEaten: meal.amountEaten, mood: meal.mood, notes: meal.notes }); setShowMealModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><Pencil size={13} /></button>
                      <button onClick={() => { nutritionApiService.deleteMeal(meal.id).then(() => { setMeals(prev => prev.filter(m => m.id !== meal.id)); toast.success('Silindi.'); }).catch(() => toast.error('Silinemedi.')); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* DIET TAB */}
          {tab === 'diet' && diet && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-2xl">
              <h2 className="font-bold text-gray-900">Diyet & Kısıtlamalar</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['gfcfDiet', 'GF/CF Diyet (Glutensiz & Kazeinsiz)'],
                  ['glutenFree', 'Glutensiz'],
                  ['dairyFree', 'Süt Ürünsüz'],
                  ['sugarFree', 'Şekersiz'],
                  ['soyFree', 'Soyasız'],
                  ['eggFree', 'Yumurtasız'],
                ] as [keyof DietInfo, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={diet[key] as boolean} onChange={e => setDiet(d => d ? { ...d, [key]: e.target.checked } : d)}
                      className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diğer Kısıtlamalar</label>
                <input value={diet.otherDiet} onChange={e => setDiet(d => d ? { ...d, otherDiet: e.target.value } : d)}
                  placeholder="Örn: Feingold diyeti, ketojenik..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea value={diet.notes} onChange={e => setDiet(d => d ? { ...d, notes: e.target.value } : d)}
                  rows={3} placeholder="Diyetisyen notları, beslenme hedefleri..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
              <Button onClick={saveDietInfo} className="w-full">Diyet Bilgilerini Kaydet</Button>
            </div>
          )}
        </>
      )}

      {/* Food Modal */}
      <Modal isOpen={showFoodModal} onClose={() => setShowFoodModal(false)} title={editingFood ? 'Besini Düzenle' : 'Besin Ekle'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Besin Adı *</label>
            <input value={foodForm.name} onChange={e => setFoodForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Elma, Tavuk çorbası..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select value={foodForm.category} onChange={e => setFoodForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                {FOOD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum *</label>
              <select value={foodForm.status} onChange={e => setFoodForm(f => ({ ...f, status: e.target.value as FoodStatus }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                {(Object.entries(STATUS_CONFIG) as [FoodStatus, typeof STATUS_CONFIG[FoodStatus]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doku Tercihi</label>
              <select value={foodForm.texture} onChange={e => setFoodForm(f => ({ ...f, texture: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                {TEXTURES.map(t => <option key={t} value={t}>{t || 'Belirtilmemiş'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sıcaklık Tercihi</label>
              <select value={foodForm.temperature} onChange={e => setFoodForm(f => ({ ...f, temperature: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                {TEMPERATURES.map(t => <option key={t} value={t}>{t || 'Belirtilmemiş'}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Renk / Görünüm Hassasiyeti</label>
            <input value={foodForm.color} onChange={e => setFoodForm(f => ({ ...f, color: e.target.value }))}
              placeholder="Örn: Yeşil rengi sevmiyor..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea value={foodForm.notes} onChange={e => setFoodForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowFoodModal(false)} className="flex-1">İptal</Button>
            <Button onClick={handleSaveFood} className="flex-1">Kaydet</Button>
          </div>
        </div>
      </Modal>

      {/* Meal Modal */}
      <Modal isOpen={showMealModal} onClose={() => setShowMealModal(false)} title={editingMeal ? 'Öğünü Düzenle' : 'Öğün Ekle'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
              <input type="date" value={mealForm.date} onChange={e => setMealForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Öğün</label>
              <select value={mealForm.mealType} onChange={e => setMealForm(f => ({ ...f, mealType: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                {MEAL_TYPES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yenilen Besinler *</label>
            <textarea value={mealForm.foods} onChange={e => setMealForm(f => ({ ...f, foods: e.target.value }))}
              rows={3} placeholder="Ne yedi? Detaylı yazın..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeme Durumu</label>
            <div className="flex gap-2 flex-wrap">
              {MEAL_MOODS.map(m => (
                <button key={m} type="button" onClick={() => setMealForm(f => ({ ...f, mood: m }))}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-all cursor-pointer ${mealForm.mood === m ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yenen Miktar</label>
            <input value={mealForm.amountEaten} onChange={e => setMealForm(f => ({ ...f, amountEaten: e.target.value }))}
              placeholder="Örn: Tabağın yarısını bitirdi"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea value={mealForm.notes} onChange={e => setMealForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowMealModal(false)} className="flex-1">İptal</Button>
            <Button onClick={handleSaveMeal} className="flex-1">Kaydet</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} title="Besini sil?" message="Bu kayıt kalıcı olarak silinecek."
        confirmLabel="Evet, sil" variant="danger"
        onConfirm={() => deleteId && handleDeleteFood(deleteId)} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
