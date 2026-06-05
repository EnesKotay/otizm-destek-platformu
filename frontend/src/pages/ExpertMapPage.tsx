import { useState, useMemo, useEffect } from 'react';
import {
  Search, MapPin, Phone, Globe, Heart, X, Info,
  Stethoscope, BookOpen, Users, Landmark, Mail,
  ExternalLink, ChevronDown, ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';

// ─── Tipler ──────────────────────────────────────────────────────────────────

type InstCategory =
  | 'university-hospital'
  | 'private-hospital'
  | 'private-rehab'
  | 'state'
  | 'ngo';

interface Institution {
  id: string;
  name: string;
  city: string;
  category: InstCategory;
  specialties: string[];
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  address?: string;
  sgkContract?: boolean;
  free?: boolean;
  ageRange?: string;
  services: string[];
  notes?: string;
}

// ─── Veri ────────────────────────────────────────────────────────────────────

const INSTITUTIONS: Institution[] = [

  // ── STK, Vakıf & Dernekler ────────────────────────────────────────────────
  { id: 'tohum', name: 'Tohum Otizm Vakfı', city: 'İstanbul', category: 'ngo', specialties: ['Otizm Eğitimi', 'Aile Desteği', 'Farkındalık'], description: 'Türkiye\'nin en köklü otizm vakfı. Okul öncesi ve okul çağı çocuklar için erken müdahale programları, aile destek grupları, öğretmen eğitimleri ve ulusal farkındalık kampanyaları yürütür.', phone: '0212 257 75 00', website: 'https://www.tohumotizm.org.tr', address: 'Etiler, Beşiktaş, İstanbul', services: ['Erken Müdahale', 'Aile Destek Grubu', 'Öğretmen Eğitimi', 'Farkındalık Kampanyaları'] },
  { id: 'otizmder', name: 'Otizm Derneği (OTİZM-DER)', city: 'Ankara', category: 'ngo', specialties: ['Hukuki Destek', 'Savunuculuk', 'Haklar'], description: 'Otizm tanılı bireylerin ve ailelerinin haklarını savunur. Hukuki rehberlik, eğitim hakkı danışmanlığı ve BEP süreci desteği sunar.', phone: '0312 430 12 78', website: 'https://www.otizmder.org.tr', email: 'info@otizmder.org.tr', services: ['Hukuki Danışmanlık', 'Hak Savunuculuğu', 'BEP Desteği', 'Aile Destek Grubu'] },
  { id: 'acev', name: 'AÇEV — Aile ve Çocuk Eğitimi Vakfı', city: 'İstanbul', category: 'ngo', specialties: ['Aile Eğitimi', 'Erken Çocukluk', 'Gelişim'], description: 'Aile eğitimi ve erken çocukluk gelişimi alanında Türkiye\'nin önde gelen sivil toplum kuruluşu. Anne-baba eğitim programları ve ev ziyareti hizmetleri sunar.', phone: '0212 281 11 54', website: 'https://www.acev.org', address: 'Levent, İstanbul', services: ['Anne-Baba Okulu', 'Ev Ziyareti Programları', 'Erken Müdahale Eğitimi'] },
  { id: 'otizm-vakfi', name: 'Türkiye Otizm Vakfı', city: 'İstanbul', category: 'ngo', specialties: ['Araştırma', 'Farkındalık', 'Aile Desteği'], description: 'Otizm spektrum bozukluğu alanında araştırma, eğitim ve farkındalık projeleri yürüten vakıf. Aile destek programları ve bilgilendirme seminerleri düzenler.', services: ['Farkındalık Eğitimleri', 'Araştırma Desteği', 'Aile Seminerleri'] },
  { id: 'engelsiz-yasam', name: 'Engelsiz Yaşam Derneği', city: 'Ankara', category: 'ngo', specialties: ['Bağımsız Yaşam', 'İstihdam', 'Haklar'], description: 'Engelli bireylerin bağımsız yaşam becerilerini kazanmaları ve istihdam edilmeleri için çalışır. Hukuki danışmanlık ve toplumsal farkındalık faaliyetleri yürütür.', services: ['Bağımsız Yaşam Eğitimi', 'İş Bulma Desteği', 'Oryantasyon', 'Hukuki Danışmanlık'] },
  { id: 'ogbd', name: 'Otizm ve Gelişimsel Bozukluklar Derneği (OGBD)', city: 'İstanbul', category: 'ngo', specialties: ['Otizm', 'Eğitim', 'Aile Desteği'], description: 'Otizm ve gelişimsel bozukluklar alanında aileleri bilgilendirmek, farkındalık oluşturmak ve destek grupları oluşturmak amacıyla kurulmuş dernek.', services: ['Aile Bilgilendirme', 'Destek Grupları', 'Seminerler'] },
  { id: 'cocuk-gelisim-der', name: 'Türkiye Çocuk Gelişimi Derneği', city: 'Ankara', category: 'ngo', specialties: ['Çocuk Gelişimi', 'Erken Müdahale', 'Eğitim'], description: 'Çocuk gelişimi uzmanlarını bir araya getiren mesleki dernek. Erken müdahale ve özel eğitim alanında rehberlik ve kaynak sağlar.', services: ['Mesleki Rehberlik', 'Kaynak Kütüphanesi', 'Uzman Yönlendirme'] },
  { id: 'ozak', name: 'Türkiye Özürlüler Araştırma Vakfı (ÖZAK)', city: 'Ankara', category: 'ngo', specialties: ['Araştırma', 'Haklar', 'Politika'], description: 'Engelli bireylerin haklarına yönelik araştırma ve savunuculuk faaliyetleri yürüten vakıf. Politika önerileri ve raporlar hazırlar.', services: ['Araştırma', 'Savunuculuk', 'Politika Geliştirme'] },
  { id: 'engelli-hak-fed', name: 'Türkiye Engelli Hakları Federasyonu', city: 'Ankara', category: 'ngo', specialties: ['Hak Savunuculuğu', 'Politika', 'Hukuki Destek'], description: 'Engelli bireylerin haklarını savunan çatı federasyonu. Yasal düzenlemelerin takibi ve hak ihlali bildirimi konularında destek verir.', services: ['Hak Savunuculuğu', 'Hukuki Danışmanlık', 'İtiraz Desteği'] },
  { id: 'erg', name: 'Eğitim Reformu Girişimi (ERG)', city: 'İstanbul', category: 'ngo', specialties: ['Eğitim Politikası', 'Kaynaştırma', 'Araştırma'], description: 'Türkiye\'de eğitim politikasını araştıran ve kapsayıcı eğitim için savunuculuk yapan sivil toplum kuruluşu. Kaynaştırma eğitimi alanında önemli raporlar yayımlar.', website: 'https://www.egitimreformugirisimi.org', services: ['Araştırma Raporları', 'Politika Önerileri', 'Kapsayıcı Eğitim Savunuculuğu'] },

  // ── Üniversite Hastaneleri — İstanbul ────────────────────────────────────
  { id: 'cerrahpasa', name: 'İÜ-Cerrahpaşa — Çocuk Psikiyatri', city: 'İstanbul', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB Tanı', 'Nörogelişim'], description: 'Türkiye\'nin en köklü tıp fakültelerinden biri. OSB tanı süreci ve nörogelişimsel bozukluklar konusunda köklü deneyime sahip çocuk psikiyatri kliniği.', phone: '0212 414 30 00', address: 'Cerrahpaşa, Fatih, İstanbul', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Tanı', 'İlaç Yönetimi', 'Psikolojik Değerlendirme', 'Nöropsikiyatri'] },
  { id: 'marmara-u', name: 'Marmara Üniversitesi — Çocuk Psikiyatri', city: 'İstanbul', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB', 'Anksiyete'], description: 'İstanbul\'un önemli üniversite hastanelerinden biri. Çocuk ve ergen psikiyatrisi alanında güçlü akademik kadroya sahip; OSB tanı ve izleminde deneyimli.', phone: '0216 625 45 45', address: 'Pendik, İstanbul', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Tanı', 'Psikiyatrik Değerlendirme', 'Bilişsel Testler', 'Terapi'] },
  { id: 'sbu-haseki', name: 'Sağlık Bilimleri Üniversitesi Haseki EAH — Çocuk Psikiyatri', city: 'İstanbul', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'SBÜ bünyesindeki Haseki Eğitim ve Araştırma Hastanesi\'nde aktif çocuk psikiyatri polikliniği. SGK anlaşmalı ve erişilebilir konumda.', phone: '0212 529 44 00', address: 'Fatih, İstanbul', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'İlaç Yönetimi'] },
  { id: 'sbu-bakirköy', name: 'SBÜ Bakırköy Prof. Dr. Mazhar Osman Ruh Sağlığı EAH', city: 'İstanbul', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'Ergen Psikiyatri', 'OSB'], description: 'Türkiye\'nin en büyük psikiyatri referans merkezlerinden biri. Çocuk ve ergen psikiyatri birimi ile gelişimsel bozukluklar alanında kapsamlı hizmet sunar.', phone: '0212 543 65 65', address: 'Bakırköy, İstanbul', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Nöropsikiyatri', 'Aile Danışmanlığı'] },
  { id: 'koc-u', name: 'Koç Üniversitesi Hastanesi — Çocuk Nöroloji', city: 'İstanbul', category: 'private-hospital', specialties: ['Çocuk Nöroloji', 'Epilepsi', 'Nörogelişim'], description: 'Modern altyapısı ve uzman kadrosuyla çocuk nöroloji ve nörogelişim alanında öne çıkan özel üniversite hastanesi.', phone: '0212 311 40 00', website: 'https://www.kuh.ku.edu.tr', address: 'Davutpaşa, Zeytinburnu, İstanbul', sgkContract: false, ageRange: '0–18 yaş', services: ['Çocuk Nöroloji', 'EEG', 'MRI', 'Nöropsikiyatri'] },

  // ── Üniversite Hastaneleri — Ankara ──────────────────────────────────────
  { id: 'hacettepe', name: 'Hacettepe Üniversitesi — Çocuk Psikiyatri', city: 'Ankara', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'ADOS Değerlendirme', 'Nörogelişim'], description: 'Çocuk psikiyatri alanında Türkiye\'nin başlıca referans merkezi. ADOS-2 ve ADI-R ile kapsamlı standart OSB değerlendirmesi yapar; araştırma ve uygulama birlikte yürütülür.', phone: '0312 305 50 00', website: 'https://hastane.hacettepe.edu.tr', address: 'Sıhhiye, Çankaya, Ankara', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Tanı', 'ADOS-2', 'ADI-R', 'İlaç Tedavisi', 'Aile Eğitimi'] },
  { id: 'hacettepe-sbl', name: 'Hacettepe — Sağlık Bilimleri Fakültesi', city: 'Ankara', category: 'university-hospital', specialties: ['Ergoterapi', 'Dil-Konuşma Terapisi', 'Fizyoterapi'], description: 'Türkiye\'nin en güçlü ergoterapi, dil-konuşma terapisi ve fizyoterapi bölümlerine ev sahipliği yapar. OSB dahil nörogelişimsel bozuklukları olan çocuklara terapi verilir.', phone: '0312 305 15 59', address: 'Hacettepe Kampüsü, Altındağ, Ankara', sgkContract: true, ageRange: '0–18 yaş', services: ['Ergoterapi', 'Dil-Konuşma Terapisi', 'Duyu Bütünleme', 'Fizyoterapi'] },
  { id: 'ankara-u', name: 'Ankara Üniversitesi — Çocuk Psikiyatri', city: 'Ankara', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB', 'Öğrenme Güçlüğü'], description: 'Köklü tıp fakültesinin çocuk psikiyatri kliniği; OSB, DEHB ve öğrenme güçlüğü alanında tanı ve tedavi hizmetleri sunar.', phone: '0312 508 20 00', address: 'Cebeci, Mamak, Ankara', sgkContract: true, ageRange: '0–18 yaş', services: ['Psikiyatrik Değerlendirme', 'Bilişsel Test', 'Terapi', 'İlaç Yönetimi'] },
  { id: 'gazi-u', name: 'Gazi Üniversitesi — Çocuk Nöroloji & Psikiyatri', city: 'Ankara', category: 'university-hospital', specialties: ['Çocuk Nöroloji', 'Epilepsi', 'OSB', 'Nörogelişim'], description: 'Nörogelişimsel bozuklukların tanı ve takibinde güçlü bir referans merkezi. Çocuk nöroloji ve psikiyatri birimleri birlikte çalışmaktadır.', phone: '0312 202 50 00', address: 'Beşevler, Yenimahalle, Ankara', sgkContract: true, ageRange: '0–18 yaş', services: ['EEG', 'MRI', 'Çocuk Nöroloji', 'Çocuk Psikiyatri', 'Nöropsikoloji'] },
  { id: 'bayindir', name: 'Bayındır Hastanesi — Çocuk Nöroloji', city: 'Ankara', category: 'private-hospital', specialties: ['Çocuk Nöroloji', 'Çocuk Psikiyatri', 'OSB'], description: 'Ankara\'nın köklü özel hastanelerinden biri. Çocuk nöroloji ve psikiyatri alanında deneyimli uzman kadrosuyla hizmet verir.', phone: '0312 287 90 00', address: 'Kavaklıdere, Çankaya, Ankara', sgkContract: false, ageRange: '0–18 yaş', services: ['Çocuk Nöroloji', 'Çocuk Psikiyatri', 'EEG', 'Nöropsikoloji'] },
  { id: 'guven', name: 'Güven Hastanesi — Çocuk Sağlığı', city: 'Ankara', category: 'private-hospital', specialties: ['Çocuk Gelişimi', 'Çocuk Nöroloji'], description: 'Ankara\'nın köklü özel hastanelerinden Güven Hastanesi\'nde çocuk sağlığı ve nöroloji poliklinikleri faaliyet göstermektedir.', phone: '0312 457 27 27', address: 'Kavaklidere, Çankaya, Ankara', sgkContract: false, ageRange: '0–18 yaş', services: ['Çocuk Nöroloji', 'Gelişimsel Değerlendirme'] },

  // ── Üniversite Hastaneleri — İzmir ───────────────────────────────────────
  { id: 'ege-u', name: 'Ege Üniversitesi — Çocuk Psikiyatri', city: 'İzmir', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB Tanı', 'DEHB'], description: 'Ege Bölgesi\'nin referans çocuk psikiyatri merkezi. OSB tanı ve izlemi konusunda uzmanlaşmış akademik kadrosuyla kapsamlı hizmet sunar.', phone: '0232 390 10 10', address: 'Bornova, İzmir', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Tanı', 'ADOS-2', 'Çocuk Psikiyatri', 'Psikolojik Test'] },
  { id: 'deu', name: 'Dokuz Eylül Üniversitesi — Çocuk Psikiyatri', city: 'İzmir', category: 'university-hospital', specialties: ['OSB Tanı', 'Çocuk Psikiyatri', 'Nörogelişim'], description: 'OSB tanı ve izleminde standart ölçüm araçlarını kullanan, deneyimli akademik kadroya sahip çocuk psikiyatri kliniği.', phone: '0232 412 12 12', address: 'İnciraltı, Balçova, İzmir', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Değerlendirme', 'ADOS-2', 'ADI-R', 'Aile Danışmanlığı'] },
  { id: 'celal-bayar', name: 'Manisa Celal Bayar Üniversitesi — Çocuk Psikiyatri', city: 'Manisa', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Ege bölgesinin iç kesimlerinde önemli bir referans merkezi. Çocuk psikiyatri kliniği OSB ve diğer nörogelişimsel bozuklukların tanı ve tedavisinde hizmet vermektedir.', phone: '0236 233 96 00', address: 'Yunusemre, Manisa', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Psikoloji'] },
  { id: 'pamukkale-u', name: 'Pamukkale Üniversitesi — Çocuk Psikiyatri', city: 'Denizli', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB'], description: 'Denizli ve çevresi için önemli referans hastane. Çocuk ve ergen psikiyatrisi alanında tanı ve tedavi hizmetleri sunmaktadır.', phone: '0258 296 50 00', address: 'Kınıklı, Pamukkale, Denizli', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Psikoloji'] },

  // ── Üniversite Hastaneleri — Bursa & Marmara ─────────────────────────────
  { id: 'uludag', name: 'Uludağ Üniversitesi — Çocuk Psikiyatri', city: 'Bursa', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Öğrenme Güçlüğü'], description: 'Bursa bölgesinin referans çocuk psikiyatri merkezi. OSB, DEHB ve öğrenme güçlüğü alanında kapsamlı tanı ve tedavi hizmetleri sunar.', phone: '0224 295 00 00', address: 'Görükle, Nilüfer, Bursa', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Değerlendirme', 'Çocuk Psikiyatri', 'Psikoloji', 'Dil-Konuşma Terapisi'] },
  { id: 'trakya-u', name: 'Trakya Üniversitesi — Çocuk Psikiyatri', city: 'Edirne', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Trakya Bölgesi\'nin tek üniversite hastanesi. Çocuk psikiyatri birimi OSB ve diğer gelişimsel bozukluklar için tanı ve izlem hizmeti vermektedir.', phone: '0284 235 76 41', address: 'Merkez, Edirne', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Aile Danışmanlığı'] },
  { id: 'balikesir-u', name: 'Balıkesir Üniversitesi — Çocuk Psikiyatri', city: 'Balıkesir', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB'], description: 'Balıkesir ve çevresi için çocuk psikiyatri hizmetleri sunan üniversite hastanesi.', phone: '0266 612 14 00', address: 'Bigadiç Yolu, Balıkesir', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Psikoloji'] },
  { id: 'kocaeli-u', name: 'Kocaeli Üniversitesi — Çocuk Psikiyatri', city: 'Kocaeli', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB'], description: 'Kocaeli ve çevre illeri için referans çocuk psikiyatri merkezi. Nörogelişimsel bozukluklar alanında tanı ve tedavi hizmetleri sunar.', phone: '0262 303 70 70', address: 'Umuttepe, İzmit, Kocaeli', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Nöropsikoloji'] },
  { id: 'sakarya-u', name: 'Sakarya Üniversitesi — Çocuk Psikiyatri', city: 'Sakarya', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Sakarya ve çevresi için önemli referans merkezi. Çocuk psikiyatri alanında tanı ve tedavi hizmetleri verilmektedir.', phone: '0264 295 40 00', address: 'Erenler, Sakarya', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB', 'Psikoloji'] },

  // ── Üniversite Hastaneleri — Akdeniz ─────────────────────────────────────
  { id: 'akdeniz', name: 'Akdeniz Üniversitesi — Çocuk Psikiyatri', city: 'Antalya', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB'], description: 'Akdeniz Bölgesi\'nin referans çocuk psikiyatri merkezi. OSB tanı ve izleminde deneyimli kadrosuyla kapsamlı hizmet sunar.', phone: '0242 249 60 00', address: 'Konyaaltı, Antalya', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Değerlendirme', 'Çocuk Psikiyatri', 'Psikoloji', 'Aile Terapisi'] },
  { id: 'cukurova', name: 'Çukurova Üniversitesi — Çocuk Psikiyatri', city: 'Adana', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Güney Türkiye\'nin en büyük üniversite hastanelerinden biri. Çocuk psikiyatri kliniği OSB ve diğer nörogelişimsel bozuklukların tanı ve tedavisinde etkin rol oynar.', phone: '0322 338 63 84', address: 'Balcalı, Sarıçam, Adana', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Tanı', 'Psikiyatrik Değerlendirme', 'İlaç Yönetimi'] },
  { id: 'mersin-u', name: 'Mersin Üniversitesi — Çocuk Psikiyatri', city: 'Mersin', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB'], description: 'Mersin ve çevresi için referans çocuk psikiyatri merkezi. Nörogelişimsel bozukluklar alanında tanı ve tedavi hizmetleri verilmektedir.', phone: '0324 241 00 00', address: 'Çiftlikköy, Yenişehir, Mersin', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Psikoloji'] },
  { id: 'hatay-mku', name: 'İskenderun Teknik Üniversitesi — Defne Devlet Hastanesi', city: 'Hatay', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB'], description: 'Hatay bölgesinde çocuk psikiyatri ve nörogelişimsel bozukluklar alanında hizmet veren hastane.', phone: '0326 227 10 00', address: 'Antakya, Hatay', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Psikoloji'] },
  { id: 'sdu', name: 'Süleyman Demirel Üniversitesi — Çocuk Psikiyatri', city: 'Isparta', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB'], description: 'Isparta ve Göller Bölgesi için referans çocuk psikiyatri merkezi. Nörogelişimsel bozuklukların tanı ve takibinde hizmet vermektedir.', phone: '0246 232 95 00', address: 'Merkez, Isparta', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Nöropsikoloji'] },

  // ── Üniversite Hastaneleri — İç Anadolu ──────────────────────────────────
  { id: 'selcuk', name: 'Selçuk Üniversitesi — Çocuk Nöroloji & Psikiyatri', city: 'Konya', category: 'university-hospital', specialties: ['Çocuk Nöroloji', 'Çocuk Psikiyatri', 'OSB'], description: 'İç Anadolu bölgesinin önemli üniversite hastanelerinden biri. Çocuk nöroloji ve psikiyatri birimleri koordineli şekilde hizmet vermektedir.', phone: '0332 224 40 00', address: 'Selçuklu, Konya', sgkContract: true, ageRange: '0–18 yaş', services: ['EEG', 'Çocuk Nöroloji', 'Çocuk Psikiyatri', 'OSB Değerlendirme'] },
  { id: 'erciyes', name: 'Erciyes Üniversitesi — Çocuk Psikiyatri', city: 'Kayseri', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB'], description: 'Orta Anadolu\'nun referans çocuk psikiyatri merkezi. OSB ve DEHB tanı ile tedavisinde deneyimli akademik kadroya sahiptir.', phone: '0352 207 66 66', address: 'Melikgazi, Kayseri', sgkContract: true, ageRange: '0–18 yaş', services: ['OSB Tanı', 'Çocuk Psikiyatri', 'Psikoloji', 'Aile Danışmanlığı'] },
  { id: 'ogu', name: 'Eskişehir Osmangazi Üniversitesi — Çocuk Psikiyatri', city: 'Eskişehir', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB'], description: 'Eskişehir ve çevresi için referans merkezi. Çocuk psikiyatri kliniği nörogelişimsel bozukluklar alanında aktif hizmet vermektedir.', phone: '0222 239 29 79', address: 'Odunpazarı, Eskişehir', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB', 'Aile Danışmanlığı'] },
  { id: 'cumhuriyet-u', name: 'Sivas Cumhuriyet Üniversitesi — Çocuk Psikiyatri', city: 'Sivas', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Sivas ve çevresi için referans çocuk psikiyatri merkezi. Nörogelişimsel bozukluklar alanında tanı ve tedavi hizmetleri sunmaktadır.', phone: '0346 258 00 00', address: 'Merkez, Sivas', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Psikoloji'] },

  // ── Üniversite Hastaneleri — Karadeniz ────────────────────────────────────
  { id: 'ktu', name: 'Karadeniz Teknik Üniversitesi — Çocuk Psikiyatri', city: 'Trabzon', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Doğu Karadeniz\'in referans çocuk psikiyatri merkezi. OSB ve nörogelişimsel bozukluklar alanında tanı ve izlem hizmetleri verir.', phone: '0462 377 50 00', address: 'Ortahisar, Trabzon', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Psikoloji'] },
  { id: 'omu', name: 'Ondokuz Mayıs Üniversitesi — Çocuk Psikiyatri', city: 'Samsun', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Orta Karadeniz\'in referans hastanesi. Çocuk ve ergen psikiyatri kliniği OSB başta olmak üzere nörogelişimsel bozukluklar için hizmet vermektedir.', phone: '0362 312 19 19', address: 'Atakum, Samsun', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Aile Danışmanlığı'] },
  { id: 'rize-u', name: 'Recep Tayyip Erdoğan Üniversitesi — Çocuk Psikiyatri', city: 'Rize', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB'], description: 'Doğu Karadeniz kıyı şeridinde çocuk psikiyatri ve nörogelişimsel bozukluklar alanında hizmet veren üniversite hastanesi.', phone: '0464 213 04 97', address: 'Merkez, Rize', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Psikoloji'] },
  { id: 'beu', name: 'Bülent Ecevit Üniversitesi — Çocuk Psikiyatri', city: 'Zonguldak', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'DEHB'], description: 'Batı Karadeniz bölgesi için önemli referans hastane. Çocuk psikiyatri kliniği OSB ve diğer nörogelişimsel bozuklukları için hizmet vermektedir.', phone: '0372 261 21 00', address: 'Kozlu, Zonguldak', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Psikoloji'] },
  { id: 'aibu', name: 'Abant İzzet Baysal Üniversitesi — Çocuk Psikiyatri', city: 'Bolu', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB'], description: 'Bolu ve çevresi için çocuk psikiyatri hizmetleri sunan üniversite hastanesi.', phone: '0374 253 46 56', address: 'Merkez, Bolu', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Aile Danışmanlığı'] },

  // ── Üniversite Hastaneleri — Doğu & Güneydoğu ────────────────────────────
  { id: 'gaziantep-u', name: 'Gaziantep Üniversitesi — Çocuk Psikiyatri', city: 'Gaziantep', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Güneydoğu Anadolu bölgesinin referans çocuk psikiyatri merkezi. OSB ve nörogelişimsel bozukluklar alanında kapsamlı değerlendirme yapılmaktadır.', phone: '0342 360 60 60', address: 'Şehitkamil, Gaziantep', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'İlaç Yönetimi'] },
  { id: 'harran-u', name: 'Harran Üniversitesi — Çocuk Psikiyatri', city: 'Şanlıurfa', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB'], description: 'Güneydoğu Anadolu\'da çocuk psikiyatri hizmetleri veren üniversite hastanesi. OSB tanı ve takibi için başvurulabilecek bölgesel referans merkezi.', phone: '0414 318 30 00', address: 'Osmanbey, Haliliye, Şanlıurfa', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Psikoloji'] },
  { id: 'dicle', name: 'Dicle Üniversitesi — Çocuk Psikiyatri', city: 'Diyarbakır', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Güneydoğu Türkiye\'nin önemli referans üniversite hastanelerinden biri. Çocuk ve ergen psikiyatri kliniği nörogelişimsel bozukluklar alanında aktif hizmet vermektedir.', phone: '0412 248 80 01', address: 'Sur, Diyarbakır', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Psikolojik Test'] },
  { id: 'firat-u', name: 'Fırat Üniversitesi — Çocuk Psikiyatri', city: 'Elazığ', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Doğu Anadolu\'nun önemli referans merkezlerinden biri. Çocuk psikiyatri kliniği OSB dahil nörogelişimsel bozuklukların tanı ve tedavisinde hizmet vermektedir.', phone: '0424 233 35 55', address: 'Merkez, Elazığ', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Psikoloji'] },
  { id: 'atauni', name: 'Atatürk Üniversitesi — Çocuk Psikiyatri', city: 'Erzurum', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'Nörogelişim', 'OSB'], description: 'Doğu Anadolu\'nun en büyük üniversite hastanesi ve bölgenin başlıca çocuk psikiyatri referans merkezi. OSB ve nörogelişimsel bozukluklar alanında kapsamlı hizmet sunar.', phone: '0442 344 68 00', address: 'Yakutiye, Erzurum', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB', 'Nöroloji', 'Psikolojik Test'] },
  { id: 'inonu', name: 'İnönü Üniversitesi — Çocuk Psikiyatri', city: 'Malatya', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB', 'Nörogelişim'], description: 'Doğu Anadolu için önemli referans merkezi. Çocuk psikiyatri birimi OSB başta olmak üzere nörogelişimsel bozuklukların tanı ve takibini yapar.', phone: '0422 341 06 60', address: 'Battalgazi, Malatya', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Değerlendirme', 'Psikoloji'] },
  { id: 'van-yyu', name: 'Van Yüzüncü Yıl Üniversitesi — Çocuk Psikiyatri', city: 'Van', category: 'university-hospital', specialties: ['Çocuk Psikiyatri', 'OSB'], description: 'Van ve Doğu Anadolu\'nun uzak kesimlerinde yaşayan aileler için ulaşılabilir referans çocuk psikiyatri merkezi.', phone: '0432 215 07 35', address: 'Tuşba, Van', sgkContract: true, ageRange: '0–18 yaş', services: ['Çocuk Psikiyatri', 'OSB Tanı', 'Psikoloji'] },

  // ── Özel Hastaneler ───────────────────────────────────────────────────────
  { id: 'acibadem', name: 'Acıbadem Hastaneleri — Çocuk Gelişim', city: 'İstanbul', category: 'private-hospital', specialties: ['Çocuk Gelişimi', 'Erken Müdahale', 'Nörogelişim'], description: 'Birden fazla şubesiyle İstanbul\'da çok disiplinli erken müdahale ve çocuk gelişim programları sunan özel hastane zinciri. Ergoterapi, dil-konuşma ve psikoloji hizmetleri birlikte verilmektedir.', phone: '0216 500 43 00', website: 'https://www.acibadem.com.tr', sgkContract: false, ageRange: '0–12 yaş', services: ['Erken Müdahale', 'Dil-Konuşma Terapisi', 'Ergoterapi', 'Psikoloji'] },
  { id: 'anadolu', name: 'Anadolu Sağlık Merkezi — Çocuk Nöroloji', city: 'Kocaeli', category: 'private-hospital', specialties: ['Çocuk Nöroloji', 'Çocuk Psikiyatri', 'Nörogelişim'], description: 'Johns Hopkins Medicine iş birliğiyle çalışan, uluslararası standartlarda hizmet veren özel hastane. Çocuk nöroloji ve gelişim alanlarında kapsamlı tanı yapılmaktadır.', phone: '0262 678 55 55', website: 'https://www.anadolusaglik.org', address: 'Gebze, Kocaeli', sgkContract: false, ageRange: '0–18 yaş', services: ['Çocuk Nöroloji', 'MRI', 'EEG', 'Nöropsikiyatri'] },
  { id: 'medicana', name: 'Medicana Hastaneleri — Çocuk Sağlığı', city: 'İstanbul', category: 'private-hospital', specialties: ['Çocuk Nöroloji', 'Çocuk Gelişimi'], description: 'İstanbul\'da birden fazla şubesi bulunan özel hastane zincirinin çocuk sağlığı ve nöroloji birimleri kapsamlı değerlendirme hizmetleri sunmaktadır.', phone: '0212 444 44 84', website: 'https://www.medicana.com.tr', sgkContract: false, ageRange: '0–18 yaş', services: ['Çocuk Nöroloji', 'Gelişimsel Değerlendirme', 'EEG'] },
  { id: 'medical-park', name: 'Medical Park Hastaneleri — Çocuk Nöroloji', city: 'İstanbul', category: 'private-hospital', specialties: ['Çocuk Nöroloji', 'Çocuk Psikiyatri'], description: 'Türkiye genelinde yaygın şube ağına sahip özel hastane zinciri. Çocuk nöroloji ve psikiyatri poliklinikleri çeşitli şubelerde hizmet vermektedir.', phone: '0850 200 10 00', website: 'https://www.medicalpark.com.tr', sgkContract: false, ageRange: '0–18 yaş', services: ['Çocuk Nöroloji', 'Çocuk Psikiyatri', 'EEG', 'MRI'] },
  { id: 'florence', name: 'Florence Nightingale Hastanesi — Çocuk Nöroloji', city: 'İstanbul', category: 'private-hospital', specialties: ['Çocuk Nöroloji', 'Epilepsi', 'Nörogelişim'], description: 'İstanbul\'un köklü özel hastanelerinden biri. Çocuk nöroloji birimi epilepsi ve nörogelişimsel bozukluklar alanında uzmanlaşmıştır.', phone: '0212 224 49 50', website: 'https://www.fnhastanesi.com.tr', address: 'Şişli, İstanbul', sgkContract: false, ageRange: '0–18 yaş', services: ['Çocuk Nöroloji', 'EEG', 'MRI', 'Nöropsikiyatri'] },
  { id: 'american-hospital', name: 'American Hospital — Çocuk Sağlığı', city: 'İstanbul', category: 'private-hospital', specialties: ['Çocuk Nöroloji', 'Çocuk Gelişimi'], description: 'Uluslararası standartlarda hizmet veren, JCI akreditasyonlu özel hastane. Çocuk nöroloji ve gelişim poliklinikleri kapsamlı değerlendirme yapmaktadır.', phone: '0212 444 37 77', address: 'Nişantaşı, Şişli, İstanbul', sgkContract: false, ageRange: '0–18 yaş', services: ['Çocuk Nöroloji', 'Gelişimsel Değerlendirme', 'Nöropsikiyatri'] },

  // ── Özel Rehabilitasyon Merkezleri ────────────────────────────────────────
  { id: 'tohum-egitim', name: 'Tohum Otizm Eğitim Merkezi', city: 'İstanbul', category: 'private-rehab', specialties: ['ABA Terapisi', 'Özel Eğitim', 'Dil-Konuşma Terapisi'], description: 'Tohum Otizm Vakfı bünyesinde faaliyet gösteren özel eğitim ve terapi merkezi. ABA temelli bireysel ve grup programları, oyun terapisi ve aile eğitimleri sunulmaktadır.', phone: '0212 257 75 00', website: 'https://www.tohumotizm.org.tr', address: 'Etiler, Beşiktaş, İstanbul', sgkContract: false, ageRange: '2–12 yaş', services: ['ABA Terapisi', 'Dil-Konuşma Terapisi', 'Özel Eğitim', 'Oyun Terapisi', 'Aile Eğitimi'] },
  { id: 'meb-rehab', name: 'MEB Onaylı Özel Eğitim & Rehabilitasyon Merkezleri', city: 'Tüm İller', category: 'private-rehab', specialties: ['Özel Eğitim', 'ABA Terapisi', 'Dil-Konuşma Terapisi', 'Ergoterapi'], description: 'MEB lisanslı özel eğitim ve rehabilitasyon merkezleri, RAM yönlendirmesi ve SGK onayıyla terapi ücretlerini kısmen devletten karşılayabilir. İlinizdeki merkezlere RAM üzerinden ulaşabilirsiniz.', website: 'https://orgm.meb.gov.tr', sourceLabel: 'MEB Özel Eğitim', sourceUrl: 'https://orgm.meb.gov.tr', sgkContract: true, services: ['Özel Eğitim', 'ABA Terapisi', 'Dil-Konuşma Terapisi', 'Ergoterapi', 'BEP Hazırlama'], notes: 'Önce RAM\'a başvurun; RAM onayı ve SGK ilişkilendirmesi tamamlandıktan sonra merkez seçimi yapılır.' },
  { id: 'ozel-egitim-ankara', name: 'Ankara Özel Eğitim Merkezleri', city: 'Ankara', category: 'private-rehab', specialties: ['ABA', 'Dil-Konuşma', 'Ergoterapi', 'Özel Eğitim'], description: 'Ankara\'da MEB onaylı çok sayıda özel eğitim ve rehabilitasyon merkezi bulunmaktadır. RAM yönlendirmesi ile SGK desteğinden yararlanılabilir.', services: ['ABA Terapisi', 'Dil-Konuşma Terapisi', 'Ergoterapi', 'Sosyal Beceri Grubu', 'Aile Eğitimi'], sgkContract: true, notes: 'Ankara İl MEB veya RAM üzerinden ilçenizdeki lisanslı merkezlere ulaşabilirsiniz.' },
  { id: 'ozel-egitim-izmir', name: 'İzmir Özel Eğitim Merkezleri', city: 'İzmir', category: 'private-rehab', specialties: ['ABA', 'Dil-Konuşma', 'Ergoterapi', 'Özel Eğitim'], description: 'İzmir\'de MEB onaylı özel eğitim ve rehabilitasyon merkezleri kapsamlı terapi hizmetleri sunmaktadır. SGK ile anlaşmalı merkezler RAM yönlendirmesiyle tercih edilebilir.', services: ['ABA Terapisi', 'Dil-Konuşma Terapisi', 'Ergoterapi', 'BEP Hazırlama'], sgkContract: true, notes: 'İzmir RAM\'ına başvurarak ilçenizdeki lisanslı merkezlere yönlendirilmeyi talep edebilirsiniz.' },
  { id: 'ozel-egitim-bursa', name: 'Bursa Özel Eğitim Merkezleri', city: 'Bursa', category: 'private-rehab', specialties: ['Özel Eğitim', 'Dil-Konuşma', 'ABA'], description: 'Bursa\'da MEB onaylı özel eğitim ve rehabilitasyon merkezleri bulunmaktadır. RAM yönlendirmesi ve SGK onayıyla terapi desteği alınabilir.', services: ['Özel Eğitim', 'Dil-Konuşma Terapisi', 'ABA', 'Ergoterapi'], sgkContract: true },
  { id: 'ozel-egitim-antalya', name: 'Antalya Özel Eğitim Merkezleri', city: 'Antalya', category: 'private-rehab', specialties: ['Özel Eğitim', 'Dil-Konuşma', 'ABA'], description: 'Antalya\'da MEB onaylı özel eğitim ve rehabilitasyon merkezleri bulunmaktadır. RAM yönlendirmesi ile ulaşılabilir.', services: ['Özel Eğitim', 'Dil-Konuşma Terapisi', 'ABA', 'Sosyal Beceri Eğitimi'], sgkContract: true },

  // ── Devlet Kurumları ──────────────────────────────────────────────────────
  { id: 'ram', name: 'RAM — Rehberlik ve Araştırma Merkezleri', city: 'Tüm İller', category: 'state', free: true, specialties: ['Eğitsel Değerlendirme', 'BEP', 'Kaynaştırma', 'Özel Eğitim Yönlendirme'], description: 'Tüm illerde MEB bünyesinde faaliyet gösterir. OSB tanısı alan çocuklar için eğitsel değerlendirme, uygun okul/program yönlendirmesi ve BEP koordinasyonu yapan ilk başvuru noktasıdır. Hizmetlerin tamamı ücretsizdir.', website: 'https://orgm.meb.gov.tr', sourceLabel: 'MEB Özel Eğitim', sourceUrl: 'https://orgm.meb.gov.tr', services: ['Eğitsel Değerlendirme', 'BEP Koordinasyonu', 'Kaynaştırma Yönlendirme', 'Özel Eğitim Merkezi Yönlendirme', 'Aile Danışmanlığı', 'Psikolojik Destek'], notes: 'Tanı sonrası ilk adım RAM\'dır. İlçenizdeki RAM\'a tanı belgenizle başvurun.' },
  { id: 'cozummer', name: 'ÇÖZÜM-MER — Engelli Aile Destek Merkezi', city: 'Tüm İller', category: 'state', free: true, specialties: ['Aile Desteği', 'Sosyal Hizmet', 'Hak Danışmanlığı', 'Yönlendirme'], description: 'Aile ve Sosyal Hizmetler Bakanlığı\'na bağlı merkezler. Engelli bireylere ve ailelerine ücretsiz sosyal hizmet, haklar konusunda bilgilendirme ve kurumlar arası yönlendirme yapar.', phone: '183', website: 'https://www.aile.gov.tr', sourceLabel: 'Aile Bakanlığı', sourceUrl: 'https://www.aile.gov.tr', services: ['Ücretsiz Danışmanlık', 'Sosyal Yardım Yönlendirme', 'Hak Bilgilendirme', 'Bakım Ücreti Başvurusu'], notes: 'ALO 183\'ü arayarak sosyal destek ve yönlendirme alabilirsiniz. Ücretsizdir.' },
  { id: 'sgk', name: 'SGK — Sosyal Güvenlik Kurumu', city: 'Tüm İller', category: 'state', free: true, specialties: ['Sağlık Hakları', 'Rehabilitasyon Desteği', 'İlaç Ödemesi'], description: 'OSB tanılı çocukların özel eğitim ve rehabilitasyon merkezi giderlerini RAM yönlendirmesi sonrası belirli limitler dahilinde karşılar. İlaç ve terapötik hizmet ödemeleri yapılır.', phone: '170', website: 'https://www.sgk.gov.tr', services: ['Rehabilitasyon Gideri Karşılama', 'İlaç Ödemesi', 'Sağlık Kurulu Raporu Takibi'], notes: 'Önce RAM yönlendirmesi, ardından SGK anlaşmalı bir merkez seçimi gereklidir. Limitler her yıl güncellenir.' },
  { id: 'aile-bakanlik', name: 'Aile ve Sosyal Hizmetler Bakanlığı', city: 'Tüm İller', category: 'state', free: true, specialties: ['Bakım Ücreti', 'Sosyal Yardım', 'Aile Desteği'], description: 'Ağır engellilik raporuna sahip bireylere evde bakım ücreti öder. Sosyal yardım programları ve aile destek hizmetleri sunar. İl müdürlükleri üzerinden başvuru yapılır.', phone: '183', website: 'https://www.aile.gov.tr', sourceLabel: 'Aile Bakanlığı', sourceUrl: 'https://www.aile.gov.tr', services: ['Evde Bakım Ücreti', 'Sosyal Yardım', 'Aile Danışmanlığı', 'Engelli Kimlik Kartı Başvurusu'] },
  { id: 'meb-ozel-egitim', name: 'MEB Özel Eğitim ve Rehberlik Hizmetleri GM', city: 'Tüm İller', category: 'state', free: true, specialties: ['Özel Eğitim Politikası', 'BEP', 'Kaynaştırma Standardı'], description: 'Özel eğitim hizmetlerini düzenleyen MEB biriminin web sitesinde kaynaştırma, BEP ve özel eğitim merkezlerine ilişkin güncel mevzuat, rehber belgeler ve başvuru bilgileri yer almaktadır.', website: 'https://orgm.meb.gov.tr', services: ['Mevzuat Bilgisi', 'BEP Rehberleri', 'Kaynaştırma Standartları', 'Öğretmen Eğitim Materyalleri'] },
  { id: 'iskur', name: 'İŞKUR', city: 'Tüm İller', category: 'state', free: true, specialties: ['Engelli İstihdamı', 'Mesleki Eğitim', 'Kariyer Danışmanlığı'], description: 'Engelli bireylerin istihdamını destekleyen devlet kurumu. Mesleki eğitim, iş ve meslek danışmanlığı, iş bulma ve korumalı işyeri destekleri sağlar.', phone: '170', website: 'https://www.iskur.gov.tr', services: ['İş ve Meslek Danışmanlığı', 'Mesleki Eğitim Kursları', 'İşe Yerleştirme', 'Korumalı İşyeri Desteği'] },
  { id: 'cimer', name: 'CİMER — Cumhurbaşkanlığı İletişim Merkezi', city: 'Tüm İller', category: 'state', free: true, specialties: ['Şikayet', 'Başvuru', 'Hak Arama'], description: 'Devlet kurumlarına yönelik şikayet ve başvuruların iletildiği merkezi platform. Eğitim hakkı ihlalleri, BEP uygulanmaması, kaynaştırma reddi gibi sorunlarda başvurulabilir.', phone: '150', website: 'https://www.cimer.gov.tr', sourceLabel: 'CİMER', sourceUrl: 'https://www.cimer.gov.tr', services: ['Şikayet Bildirimi', 'Başvuru Takibi', 'Kamu Kurumu Şikayeti'] },
  { id: 'ombudsman', name: 'Kamu Denetçiliği Kurumu (Ombudsman)', city: 'Ankara', category: 'state', free: true, specialties: ['Hak Arama', 'İdari Şikayet', 'Hukuki Yol'], description: 'İdari işlemler hakkındaki şikayetleri inceleyen bağımsız devlet kurumu. RAM veya MEB kararlarına itiraz, BEP ihlali gibi durumlarda başvurulabilir.', website: 'https://www.ombudsman.gov.tr', phone: '0312 465 22 00', services: ['İdari Şikayet İnceleme', 'Bağımsız Denetim', 'Tavsiye Kararı'] },
];

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const CAT_META: Record<InstCategory, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  'university-hospital': { label: 'Üniversite Hastanesi', color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Stethoscope },
  'private-hospital':    { label: 'Özel Hastane',         color: 'text-teal-700',   bg: 'bg-teal-100',   icon: Stethoscope },
  'private-rehab':       { label: 'Rehabilitasyon',       color: 'text-indigo-700', bg: 'bg-indigo-100', icon: BookOpen },
  state:                 { label: 'Devlet Kurumu',         color: 'text-green-700',  bg: 'bg-green-100',  icon: Landmark },
  ngo:                   { label: 'STK & Vakıf',          color: 'text-orange-700', bg: 'bg-orange-100', icon: Users },
};

const EXPERT_MAP_LAST_UPDATED = 'Haziran 2026';

const EXPERT_MAP_SOURCES = [
  { label: 'MEB Özel Eğitim', url: 'https://orgm.meb.gov.tr' },
  { label: 'MHRS', url: 'https://www.mhrs.gov.tr' },
  { label: 'Aile Bakanlığı', url: 'https://www.aile.gov.tr' },
  { label: 'SGK', url: 'https://www.sgk.gov.tr' },
  { label: 'CİMER', url: 'https://www.cimer.gov.tr' },
];

const CATEGORY_SOURCE_FALLBACK: Partial<Record<InstCategory, { label: string; url: string }>> = {
  'university-hospital': { label: 'MHRS / kurum kaydı', url: 'https://www.mhrs.gov.tr' },
  'private-rehab': { label: 'MEB Özel Eğitim', url: 'https://orgm.meb.gov.tr' },
  state: { label: 'Resmi kurum kaynağı', url: 'https://www.turkiye.gov.tr' },
};

function getSourceLink(inst: Institution) {
  const fallback = CATEGORY_SOURCE_FALLBACK[inst.category];
  const url = inst.sourceUrl || inst.website || fallback?.url;
  if (!url) return null;
  return {
    label: inst.sourceLabel || (inst.website ? 'Kurum web sitesi' : fallback?.label || 'Kaynak'),
    url,
  };
}

type TabKey = 'all' | 'hospital' | 'rehab' | 'state' | 'ngo' | 'favorites';
type SortKey = 'default' | 'az' | 'city';

const TABS: { key: TabKey; label: string; cats?: InstCategory[] }[] = [
  { key: 'all',       label: 'Tümü' },
  { key: 'hospital',  label: 'Hastaneler',        cats: ['university-hospital', 'private-hospital'] },
  { key: 'rehab',     label: 'Rehabilitasyon',    cats: ['private-rehab'] },
  { key: 'state',     label: 'Devlet Kurumları',  cats: ['state'] },
  { key: 'ngo',       label: 'STK & Vakıflar',    cats: ['ngo'] },
  { key: 'favorites', label: 'Favoriler' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Varsayılan' },
  { key: 'az',      label: 'A → Z' },
  { key: 'city',    label: 'Şehre Göre' },
];

const CITIES = [
  'Tümü',
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Adana', 'Antalya', 'Konya',
  'Gaziantep', 'Kayseri', 'Eskişehir', 'Samsun', 'Trabzon', 'Diyarbakır',
  'Erzurum', 'Kocaeli', 'Sakarya', 'Edirne', 'Manisa', 'Denizli', 'Mersin',
  'Malatya', 'Elazığ', 'Van', 'Sivas', 'Zonguldak', 'Rize', 'Bolu',
  'Isparta', 'Hatay', 'Balıkesir', 'Şanlıurfa', 'Tüm İller',
];

const FAV_KEY = 'expert_map_favorites';
const loadFavs = (): string[] => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } };
const saveFavs = (ids: string[]) => localStorage.setItem(FAV_KEY, JSON.stringify(ids));

// ─── Küçük bileşenler ─────────────────────────────────────────────────────────

function CatBadge({ cat }: { cat: InstCategory }) {
  const m = CAT_META[cat];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
      <Icon size={10} />{m.label}
    </span>
  );
}

function FavBtn({ id, favs, toggle }: { id: string; favs: string[]; toggle: (id: string) => void }) {
  const on = favs.includes(id);
  return (
    <button
      onClick={e => { e.stopPropagation(); toggle(id); }}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${on ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
    >
      <Heart size={14} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

// ─── Kart ─────────────────────────────────────────────────────────────────────

function InstCard({ inst, favs, toggle, onClick }: {
  inst: Institution; favs: string[]; toggle: (id: string) => void; onClick: () => void;
}) {
  const m = CAT_META[inst.category];
  const Icon = m.icon;
  const source = getSourceLink(inst);
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.bg}`}>
          <Icon size={16} className={m.color} />
        </div>
        <FavBtn id={inst.id} favs={favs} toggle={toggle} />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{inst.name}</h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <MapPin size={11} />
          <span>{inst.city === 'Tüm İller' ? 'Türkiye Geneli' : inst.city}</span>
          {inst.ageRange && <><span>·</span><span>{inst.ageRange}</span></>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CatBadge cat={inst.category} />
        {inst.free && (
          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Ücretsiz</span>
        )}
        {inst.sgkContract === true && !inst.free && (
          <span className="text-[11px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">SGK</span>
        )}
        {source && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={10} />Kaynaklı
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{inst.description}</p>

      {(inst.phone || inst.website || source) && (
        <div className="flex gap-2 flex-wrap mt-auto pt-1">
          {inst.phone && (
            <a href={`tel:${inst.phone}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors">
              <Phone size={11} />{inst.phone}
            </a>
          )}
          {inst.website && (
            <a href={inst.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors">
              <Globe size={11} />Web
            </a>
          )}
          {source && source.url !== inst.website && (
            <a href={source.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors">
              <ExternalLink size={11} />Kaynak
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Detay Modalı ─────────────────────────────────────────────────────────────

function DetailModal({ inst, onClose, favs, toggle }: {
  inst: Institution; onClose: () => void; favs: string[]; toggle: (id: string) => void;
}) {
  const m = CAT_META[inst.category];
  const Icon = m.icon;
  const source = getSourceLink(inst);
  return (
    <Modal isOpen onClose={onClose} title="" className="max-w-xl">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${m.bg}`}>
            <Icon size={22} className={m.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-gray-900 leading-snug">{inst.name}</h2>
              <FavBtn id={inst.id} favs={favs} toggle={toggle} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <CatBadge cat={inst.category} />
              {inst.free && (
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ Ücretsiz</span>
              )}
              {inst.sgkContract === true && !inst.free && (
                <span className="text-[11px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">✓ SGK Anlaşmalı</span>
              )}
              {inst.sgkContract === false && (
                <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">SGK yok</span>
              )}
              {source && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} />Kaynak doğrulandı
                </span>
              )}
            </div>
          </div>
        </div>

        {(inst.address || inst.ageRange) && (
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {inst.address && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" />{inst.address}</span>}
            {inst.ageRange && <span className="font-medium text-indigo-600">{inst.ageRange}</span>}
          </div>
        )}

        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{inst.description}</p>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Uzmanlık Alanları</p>
          <div className="flex flex-wrap gap-1.5">
            {inst.specialties.map(s => (
              <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sunulan Hizmetler</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {inst.services.map(s => (
              <span key={s} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />{s}
              </span>
            ))}
          </div>
        </div>

        {(inst.phone || inst.website || inst.email || source) && (
          <div className="flex flex-wrap gap-2">
            {inst.phone && (
              <a href={`tel:${inst.phone}`} className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors font-medium">
                <Phone size={14} />{inst.phone}
              </a>
            )}
            {inst.email && (
              <a href={`mailto:${inst.email}`} className="flex items-center gap-2 text-sm bg-gray-50 text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
                <Mail size={14} />{inst.email}
              </a>
            )}
            {inst.website && (
              <a href={inst.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
                <ExternalLink size={14} />Web Sitesi
              </a>
            )}
            {source && source.url !== inst.website && (
              <a href={source.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm bg-slate-50 text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                <ExternalLink size={14} />{source.label}
              </a>
            )}
          </div>
        )}

        {inst.notes && (
          <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{inst.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Nereden başlamalıyım? Banner ─────────────────────────────────────────────

const GUIDE_STEPS = [
  { id: 'step-1', step: '1', title: 'Çocuk Psikiyatristi Tanısı', desc: 'Hastanelerin çocuk psikiyatrisi bölümlerinden Sağlık Kurulu Raporu (ÇÖZGER) alınması özel eğitimin yasal zeminidir.', color: 'from-blue-50 to-sky-50 border-sky-100', num: 'bg-sky-600' },
  { id: 'step-2', step: '2', title: 'RAM Eğitsel Değerlendirme', desc: 'Tanı belgenizle ilçenizdeki Rehberlik ve Araştırma Merkezi\'ne (RAM) başvurun. Ücretsiz eğitsel değerlendirme ve yönlendirme raporu çıkartın.', color: 'from-indigo-50 to-indigo-50/50 border-indigo-100', num: 'bg-indigo-600' },
  { id: 'step-3', step: '3', title: 'Devlet Ödeneği & SGK Onayı', desc: 'RAM raporuyla devlet destekli (aylık 8 seans bireysel, 4 seans grup) ücretsiz özel eğitim alma hakkınız aktifleşir.', color: 'from-purple-50 to-fuchsia-50/30 border-purple-100', num: 'bg-purple-600' },
  { id: 'step-4', step: '4', title: 'Terapi ve Rehabilitasyon', desc: 'SGK anlaşmalı MEB onaylı özel eğitim merkezine kaydolun; çocuğunuzun gelişimine uygun ABA, Ergoterapi ve Konuşma Terapisi planlayın.', color: 'from-emerald-50 to-teal-50 border-emerald-100', num: 'bg-emerald-600' },
];

function StartGuide() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('expert_map_checklist_progress') || '[]');
    } catch {
      return [];
    }
  });

  const [showCalculator, setShowCalculator] = useState(false);
  const [sessionPrice, setSessionPrice] = useState('800');

  const toggleStep = (id: string) => {
    const next = progress.includes(id) ? progress.filter(x => x !== id) : [...progress, id];
    setProgress(next);
    localStorage.setItem('expert_map_checklist_progress', JSON.stringify(next));
    if (next.length === GUIDE_STEPS.length) {
      toast.success('🎉 Tüm yasal adımları başarıyla tamamladınız.');
    }
  };

  const calculatedSavings = useMemo(() => {
    const price = Number(sessionPrice) || 0;
    const monthly = price * 8;
    const yearly = monthly * 12;
    return { monthly, yearly };
  }, [sessionPrice]);

  return (
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-amber-50/70 to-orange-50/30 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-amber-100/55 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-sm">
            🧭
          </div>
          <div>
            <p className="text-sm font-extrabold text-amber-950 tracking-tight">Devlet Destekli Özel Eğitim Yol Haritası</p>
            <p className="text-xs text-amber-700/90 font-medium">İlk kez tanı aldıysanız — Adım adım yasal ve klinik haklar rehberi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {progress.length > 0 && (
            <span className="text-xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
              {progress.length}/{GUIDE_STEPS.length} Adım
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-amber-600 shrink-0" /> : <ChevronDown size={16} className="text-amber-600 shrink-0" />}
        </div>
      </button>
      
      {open && (
        <div className="px-5 pb-5 border-t border-amber-200/60 pt-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-amber-800 font-bold">
              <span>İlerleme Seviyeniz</span>
              <span>%{Math.round((progress.length / GUIDE_STEPS.length) * 100)}</span>
            </div>
            <div className="h-2 bg-amber-100/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${(progress.length / GUIDE_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {GUIDE_STEPS.map((s) => {
              const isDone = progress.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggleStep(s.id)}
                  className={`group flex gap-3.5 p-4 rounded-2xl border-2 text-left cursor-pointer transition-all duration-300 ${
                    isDone
                      ? 'bg-white border-green-500 shadow-sm opacity-90'
                      : 'bg-white/80 backdrop-blur-sm border-gray-100 hover:border-amber-300 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-2xl ${isDone ? 'bg-green-500 text-white' : `${s.num} text-white`} text-xs font-extrabold flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-105`}>
                    {isDone ? '✓' : s.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-extrabold tracking-tight transition-colors ${isDone ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                      {s.title}
                    </p>
                    <p className="text-[11px] leading-relaxed text-gray-500 mt-1">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 flex-wrap pt-2 border-t border-amber-200/40">
            <button
              onClick={() => setShowCalculator(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-xs font-bold shadow-sm cursor-pointer"
            >
              📊 SGK Tasarruf Hesaplayıcı
            </button>
            <a
              href="https://orgm.meb.gov.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-amber-200 text-amber-950 hover:bg-amber-100/30 transition-all text-xs font-bold shadow-sm"
            >
              🔗 Resmi MEB Özel Eğitim Sayfası
            </a>
          </div>
        </div>
      )}

      {/* SGK Calculator Modal */}
      <Modal isOpen={showCalculator} onClose={() => setShowCalculator(false)} title="SGK Devlet Ödeneği Hesaplayıcı" className="max-w-md">
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-5 rounded-2xl shadow-sm text-center">
            <p className="text-xs font-bold tracking-wider uppercase opacity-85">Aylık Devlet Yardımı (8 Seans)</p>
            <p className="text-3xl font-black mt-1 font-mono">+{calculatedSavings.monthly.toLocaleString('tr-TR')} TL</p>
            <p className="text-[10px] opacity-75 mt-1">Yıllık toplam devlet desteği: <strong>{calculatedSavings.yearly.toLocaleString('tr-TR')} TL</strong></p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
              Seans Başı Ortalama Özel Eğitim Ücreti (TL)
            </label>
            <input
              type="number"
              value={sessionPrice}
              onChange={e => setSessionPrice(e.target.value)}
              placeholder="Örn: 800"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
            />
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-500 leading-relaxed space-y-2">
            <p>💡 <strong>Nasıl Çalışır?</strong></p>
            <p>Türkiye'de çocuk psikiyatristi tanısı ve RAM raporu alan her çocuk için devlet, <strong>ayda 8 seans bireysel özel eğitim ve 4 seans grup eğitim ücretini</strong> doğrudan rehabilitasyon merkezine öder.</p>
            <p>Yukarıdaki hesaplama, ortalama özel ders/seans maliyetine göre cebinizden çıkmayıp devlet tarafından finanse edilen toplam maddi kazanımı gösterir.</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowCalculator(false)} className="w-full bg-indigo-600 hover:bg-indigo-700">Anladım</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function ExpertMapPage() {
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('Tümü');
  const [onlySgk, setOnlySgk] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [favs, setFavs] = useState<string[]>(() => loadFavs());

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
    setFavs(next);
    saveFavs(next);
    toast.success(favs.includes(id) ? 'Favorilerden çıkarıldı.' : '❤️ Favorilere eklendi.');
  };

  // Reset page to 1 on filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [search, filterCity, activeTab, onlySgk, sortKey]);

  // Filtre + sıralama
  const filtered = useMemo(() => {
    const tab = TABS.find(t => t.key === activeTab);
    return INSTITUTIONS.filter(inst => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || inst.name.toLowerCase().includes(q)
        || inst.city.toLowerCase().includes(q)
        || inst.specialties.some(s => s.toLowerCase().includes(q))
        || inst.services.some(s => s.toLowerCase().includes(q));
      const matchCity = filterCity === 'Tümü' || inst.city === filterCity || inst.city === 'Tüm İller';
      const matchCat = !tab?.cats || tab.cats.includes(inst.category);
      const matchFav = activeTab !== 'favorites' || favs.includes(inst.id);
      const matchSgk = !onlySgk || inst.sgkContract === true || inst.free === true;
      return matchSearch && matchCity && matchCat && matchFav && matchSgk;
    });
  }, [search, filterCity, activeTab, favs, onlySgk]);

  const visible = useMemo(() => {
    const list = [...filtered];
    if (sortKey === 'az') list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    if (sortKey === 'city') list.sort((a, b) => a.city.localeCompare(b.city, 'tr'));
    return list;
  }, [filtered, sortKey]);

  const totalPages = Math.ceil(visible.length / ITEMS_PER_PAGE);

  const paginatedVisible = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visible.slice(start, start + ITEMS_PER_PAGE);
  }, [visible, currentPage]);

  // Sekme sayıları
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: 0, hospital: 0, rehab: 0, state: 0, ngo: 0, favorites: 0 };
    INSTITUTIONS.forEach(inst => {
      const matchSearch = !search || inst.name.toLowerCase().includes(search.toLowerCase()) || inst.city.toLowerCase().includes(search.toLowerCase());
      const matchCity = filterCity === 'Tümü' || inst.city === filterCity || inst.city === 'Tüm İller';
      const matchSgk = !onlySgk || inst.sgkContract === true || inst.free === true;
      if (!matchSearch || !matchCity || !matchSgk) return;
      counts.all++;
      if (inst.category === 'university-hospital' || inst.category === 'private-hospital') counts.hospital++;
      if (inst.category === 'private-rehab') counts.rehab++;
      if (inst.category === 'state') counts.state++;
      if (inst.category === 'ngo') counts.ngo++;
      if (favs.includes(inst.id)) counts.favorites++;
    });
    return counts;
  }, [search, filterCity, favs, onlySgk]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      <PageOnboarding
        pageId="expert_map"
        title="Kurum Rehberine Hoş Geldiniz"
        description="Türkiye genelindeki üniversite hastaneleri, özel hastaneler, rehabilitasyon merkezleri, devlet kurumları ve sivil toplum kuruluşlarını keşfedin."
        steps={[
          {
            icon: <Search size={20} />,
            title: "Kurum Arayın",
            description: "Kategori, şehir veya kurum adına göre filtreleme yaparak en uygun seçenekleri bulun."
          },
          {
            icon: <MapPin size={20} />,
            title: "Detayları İnceleyin",
            description: "Kurumların sunduğu hizmetleri, yaş aralıklarını ve SGK anlaşmalarını görüntüleyin."
          },
          {
            icon: <Heart size={20} />,
            title: "Favorilere Ekleyin",
            description: "Size uygun olan kurumları favorilerinize ekleyerek daha sonra kolayca ulaşın."
          }
        ]}
      />

      {/* Başlık */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurum Rehberi</h1>
          <p className="text-gray-500 mt-1">{INSTITUTIONS.length} kurum — Türkiye geneli hastaneler, merkezler ve sivil toplum kuruluşları</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600 font-medium">
            <Info size={11} className="text-gray-400" />Son güncelleme: {EXPERT_MAP_LAST_UPDATED}
          </span>
          <p className="text-[11px] text-gray-400 mt-1">Kaynak: resmi kurum ve kurum web siteleri</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={12} />Doğrulanmış kaynaklar
        </span>
        {EXPERT_MAP_SOURCES.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
          >
            {source.label}<ExternalLink size={11} />
          </a>
        ))}
      </div>

      {/* Nereden başlamalıyım? */}
      <StartGuide />

      {/* Arama + Şehir + SGK toggle + Sıralama */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Kurum, şehir, uzmanlık veya hizmet ara..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
          <div className={`relative flex items-center rounded-xl border transition-colors ${filterCity !== 'Tümü' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
            <MapPin size={14} className={`absolute left-3 pointer-events-none shrink-0 ${filterCity !== 'Tümü' ? 'text-indigo-500' : 'text-gray-400'}`} />
            <select
              value={filterCity} onChange={e => setFilterCity(e.target.value)}
              className={`pl-8 pr-8 py-2.5 text-sm focus:outline-none bg-transparent appearance-none cursor-pointer font-medium ${filterCity !== 'Tümü' ? 'text-indigo-700' : 'text-gray-600'}`}
            >
              <option value="Tümü">Tüm Şehirler</option>
              {CITIES.filter(c => c !== 'Tümü').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className={`absolute right-2.5 pointer-events-none ${filterCity !== 'Tümü' ? 'text-indigo-400' : 'text-gray-400'}`} />
            {filterCity !== 'Tümü' && (
              <button
                onClick={() => setFilterCity('Tümü')}
                className="absolute right-6 text-indigo-400 hover:text-indigo-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* SGK toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={onlySgk}
              onClick={() => setOnlySgk(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${onlySgk ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${onlySgk ? 'translate-x-4' : ''}`} />
            </button>
            <span className={`text-sm font-medium ${onlySgk ? 'text-green-700' : 'text-gray-600'}`}>
              Sadece SGK / Ücretsiz
            </span>
          </label>

          {/* Sıralama */}
          <select
            value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none bg-white text-gray-600"
          >
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => {
          const count = tabCounts[tab.key];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {tab.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                isActive
                  ? 'bg-white/20 text-white'
                  : tab.key === 'favorites' && count > 0
                    ? 'bg-red-50 text-red-500'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sonuçlar */}
      {visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">{activeTab === 'favorites' ? '❤️' : '🔍'}</p>
          <p className="font-semibold text-gray-700">
            {activeTab === 'favorites' ? 'Henüz favori eklenmedi' : 'Sonuç bulunamadı'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'favorites'
              ? 'Kartlardaki ❤️ ikonuna tıklayarak favorilere ekleyebilirsiniz.'
              : 'Arama veya filtre kriterlerini değiştirin.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedVisible.map(inst => (
              <InstCard key={inst.id} inst={inst} favs={favs} toggle={toggleFav} onClick={() => setSelectedInst(inst)} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 mt-6">
              <p className="text-xs text-gray-500 font-medium">
                Toplam <span className="font-semibold text-gray-800">{visible.length}</span> kurum arasından{' '}
                <span className="font-semibold text-gray-800">
                  {Math.min(visible.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-
                  {Math.min(visible.length, currentPage * ITEMS_PER_PAGE)}
                </span>{' '}
                arası gösteriliyor
              </p>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 hover:border-indigo-300 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white transition-all cursor-pointer select-none"
                >
                  Önceki
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  const isActive = currentPage === page;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 hover:border-indigo-300 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white transition-all cursor-pointer select-none"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        Bilgiler genel rehber amaçlıdır. Randevu için kurumları doğrudan arayın.
      </p>

      {selectedInst && (
        <DetailModal inst={selectedInst} onClose={() => setSelectedInst(null)} favs={favs} toggle={toggleFav} />
      )}
    </div>
  );
}
