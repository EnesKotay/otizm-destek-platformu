import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, Search, PlusCircle, Edit, Trash2, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from '@/store/toastStore';
import { Drawer } from '@/components/ui/Drawer';
import { formatDate } from '@/utils/date';
import { knowledgeService } from '@/services/knowledgeService';
import type { KnowledgeArticle } from '@/types';

export function AdminArticlesPage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Editor Drawer State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formContent, setFormContent] = useState('');

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await knowledgeService.getAll(0, 50);
      setArticles(response.content);
    } catch {
      setArticles([]);
      toast.error('Makaleler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchArticles();
  }, [fetchArticles]);

  const handleOpenEditor = (article?: KnowledgeArticle) => {
    if (article) {
      setEditingArticle(article);
      setFormTitle(article.title);
      setFormCategory(article.category || '');
      setFormContent(article.content || '');
    } else {
      setEditingArticle(null);
      setFormTitle('');
      setFormCategory('');
      setFormContent('');
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Lütfen başlık ve içerik girin');
      return;
    }

    try {
      if (editingArticle) {
        await knowledgeService.update(editingArticle.id, {
          title: formTitle,
          category: formCategory || 'Genel',
          content: formContent
        });
        toast.success('Makale güncellendi');
      } else {
        await knowledgeService.create({
          title: formTitle,
          category: formCategory || 'Genel',
          content: formContent
        });
        toast.success('Yeni makale oluşturuldu');
      }
      setIsEditorOpen(false);
      fetchArticles(); // Reload list
    } catch {
      toast.error('Makale kaydedilirken bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu makaleyi silmek istediğinize emin misiniz?')) return;
    try {
      await knowledgeService.delete(id);
      setArticles(prev => prev.filter(a => a.id !== id));
      toast.success('Makale silindi');
    } catch {
      toast.error('Makale silinemedi');
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const updated = await knowledgeService.togglePublish(id);
      setArticles(prev => prev.map(a => a.id === id ? { ...a, published: updated.published } : a));
      toast.success(updated.published ? 'Makale yayına alındı' : 'Makale taslağa çekildi');
    } catch {
      toast.error('Durum güncellenemedi');
    }
  };

  const filteredArticles = articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-indigo-600" /> İçerik Yönetimi (CMS)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Bilgi Bankası ve platform içeriklerini yönetin.</p>
        </div>
        <Button onClick={() => handleOpenEditor()} className="bg-indigo-600 hover:bg-indigo-700">
          <PlusCircle size={18} className="mr-2" /> Yeni Makale Yaz
        </Button>
      </div>

      <Card className="rounded-[28px] border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Makale Listesi</CardTitle>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Makale başlıklarında ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>
        </CardHeader>
        
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">İçerik bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredArticles.map((article) => (
                <div key={article.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50 transition-colors gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">{article.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600">
                        {article.category || 'Genel'}
                      </span>
                      <span>{formatDate(article.createdAt)}</span>
                      <span className="flex items-center gap-1"><Eye size={12}/> {article.viewCount || 0} Okunma</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span 
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${article.published ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                      onClick={() => toggleStatus(article.id)}
                    >
                      {article.published ? 'Yayında' : 'Taslak'}
                    </span>
                    
                    <div className="flex items-center ml-2 border-l border-slate-200 pl-2">
                      <button 
                        onClick={() => handleOpenEditor(article)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(article.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Editor Drawer */}
      <Drawer
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <FileText className="text-indigo-600" size={20} />
            {editingArticle ? 'Makaleyi Düzenle' : 'Yeni Makale Oluştur'}
          </div>
        }
        size="lg" // Use a wider drawer for writing
      >
        <div className="space-y-6">
          
          <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Makale Başlığı</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Dikkat çekici bir başlık girin..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white transition-all"
              >
                <option value="">Kategori Seçin</option>
                <option value="Teşhis ve Tanı">Teşhis ve Tanı</option>
                <option value="Eğitim">Eğitim</option>
                <option value="Terapiler">Terapiler</option>
                <option value="Günlük Yaşam">Günlük Yaşam</option>
              </select>
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Makale İçeriği</label>
              </div>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Makale içeriğini buraya yazın..."
                rows={12}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-y"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <Button variant="ghost" onClick={() => setIsEditorOpen(false)}>
              İptal
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}>
              <CheckCircle2 size={18} className="mr-2" />
              {editingArticle ? 'Değişiklikleri Kaydet' : 'Kaydet'}
            </Button>
          </div>

        </div>
      </Drawer>
    </>
  );
}
