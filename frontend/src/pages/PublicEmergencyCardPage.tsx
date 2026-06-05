import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, Phone, Heart, User } from 'lucide-react';
import { emergencyCardService } from '@/services/emergencyCardService';
import type { EmergencyProfile } from '@/pages/EmergencyCardPage';

export function PublicEmergencyCardPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    emergencyCardService.getPublic(id)
      .then(data => {
        if (data) setProfile(data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 flex-col gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Acil durum kartı yükleniyor...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-red-100">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Profil Bulunamadı</h1>
          <p className="text-gray-500 text-sm">Bu acil durum profili mevcut değil veya silinmiş olabilir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldAlert size={120} />
          </div>
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0 z-10">
            <ShieldAlert size={40} className="text-red-600" />
          </div>
          <div className="z-10">
            <p className="text-xs font-bold tracking-widest uppercase text-red-200 mb-1">OTİZM TIBBİ KİMLİK KARTI</p>
            <h1 className="text-3xl font-extrabold mb-2">{profile.childName}</h1>
            <p className="text-sm text-red-50">{profile.diagnosisInfo}</p>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-red-50 border-b border-red-100 p-4 flex flex-wrap gap-2 justify-center">
          {profile.selfInjury && <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Öz-Zarar Davranışı</span>}
          {profile.wandering && <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Kaçma Riski</span>}
          {profile.nonVerbal && <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Sözel İletişim Yok</span>}
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Kan Grubu: {profile.bloodType || 'Bilinmiyor'}</span>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          
          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-amber-500" /> Önemli Talimatlar
            </h2>
            <p className="text-amber-800 text-sm font-medium">Lütfen çocuğa sakin ve düşük ses tonuyla yaklaşın. Göz temasına zorlamayın ve ani fiziksel temaslardan kaçının.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Phone size={18} className="text-blue-500" /> Acil İletişim
              </h3>
              
              {profile.contactName1 && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">{profile.contactRelation1}</p>
                  <p className="font-bold text-gray-900">{profile.contactName1}</p>
                  <a href={`tel:${profile.contactPhone1}`} className="text-blue-600 font-medium text-sm hover:underline">{profile.contactPhone1}</a>
                </div>
              )}
              
              {profile.contactName2 && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">{profile.contactRelation2}</p>
                  <p className="font-bold text-gray-900">{profile.contactName2}</p>
                  <a href={`tel:${profile.contactPhone2}`} className="text-blue-600 font-medium text-sm hover:underline">{profile.contactPhone2}</a>
                </div>
              )}
            </div>

            {/* Medical Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Heart size={18} className="text-red-500" /> Tıbbi Bilgiler
              </h3>
              
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Alerjiler</p>
                <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded-lg">{profile.allergies || 'Bilinen alerjisi yok'}</p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Düzenli İlaçlar</p>
                <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded-lg">{profile.medications || 'Düzenli ilaç kullanmıyor'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">İletişim Seviyesi</p>
                <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded-lg">{profile.communicationLevel || 'Sözel iletişim yok'}</p>
              </div>
            </div>
          </div>

          {/* Behavioral Info */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <User size={18} className="text-purple-500" /> Davranışsal Rehberlik
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm font-bold text-red-800 mb-2">Tetikleyiciler (Kaçınılmalı)</p>
                <p className="text-sm text-red-700">{profile.triggersList || 'Belirtilmedi'}</p>
              </div>
              
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm font-bold text-emerald-800 mb-2">Sakinleştirme Stratejileri</p>
                <p className="text-sm text-emerald-700">{profile.calmingStrategies || 'Belirtilmedi'}</p>
              </div>
            </div>

            {profile.avoidList && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-sm font-bold text-orange-800 mb-2">Kesinlikle Yapılmaması Gerekenler</p>
                <p className="text-sm text-orange-700">{profile.avoidList}</p>
              </div>
            )}
            
            {profile.specialInstructions && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-sm font-bold text-indigo-800 mb-2">Özel Talimatlar</p>
                <p className="text-sm text-indigo-700">{profile.specialInstructions}</p>
              </div>
            )}
          </div>

        </div>
      </div>
      
      <div className="text-center mt-8 text-xs text-gray-400">
        <p>Bu profil Otizm Destek Platformu üzerinden oluşturulmuştur.</p>
      </div>
    </div>
  );
}
