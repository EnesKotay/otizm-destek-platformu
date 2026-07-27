import type { UserRole } from '@/config/roleAccess';
import { TUTORIAL_VIDEOS, type TutorialVideo } from '@/data/tutorialVideos';

type TutorialRouteVideo = {
  match: string;
  videoId: string;
};

const TUTORIAL_ROUTE_VIDEOS: Record<UserRole, readonly TutorialRouteVideo[]> = {
  PARENT: [
    { match: '/kullanici-rehberi', videoId: '03' },
    { match: '/anasayfa', videoId: '04' },
    { match: '/cocuklarim', videoId: '05' },
    { match: '/gunluk-takip', videoId: '06' },
    { match: '/gelisim-paneli', videoId: '08' },
    { match: '/tedavi', videoId: '09' },
    { match: '/gorevler', videoId: '10' },
    { match: '/rutinler', videoId: '10' },
    { match: '/notlar', videoId: '11' },
    { match: '/takvim', videoId: '11' },
    { match: '/acil-kart', videoId: '11' },
    { match: '/uzmanlar', videoId: '12' },
    { match: '/randevular', videoId: '12' },
    { match: '/mesajlar', videoId: '13' },
    { match: '/ayarlar', videoId: '13' },
    { match: '/topluluk', videoId: '14' },
    { match: '/forum', videoId: '14' },
    { match: '/gruplar', videoId: '14' },
    { match: '/dertlesme-duvari', videoId: '14' },
    { match: '/benzer-aileler', videoId: '14' },
    { match: '/bulusmalar', videoId: '14' },
    { match: '/haftalik-soru', videoId: '14' },
    { match: '/bilgi-bankasi', videoId: '15' },
    { match: '/kriz-rehberi', videoId: '15' },
    { match: '/yardim', videoId: '15' },
  ],
  EXPERT: [
    { match: '/kullanici-rehberi', videoId: '03' },
    { match: '/anasayfa', videoId: '16' },
    { match: '/danisanlarim', videoId: '16' },
    { match: '/cocuklarim', videoId: '16' },
    { match: '/randevular', videoId: '17' },
    { match: '/gorevler', videoId: '18' },
    { match: '/notlar', videoId: '18' },
    { match: '/bep-raporu', videoId: '19' },
    { match: '/mesajlar', videoId: '20' },
    { match: '/bilgi-bankasi', videoId: '20' },
    { match: '/forum', videoId: '20' },
    { match: '/gruplar', videoId: '20' },
    { match: '/ayarlar', videoId: '20' },
    { match: '/yardim', videoId: '03' },
  ],
  ADMIN: [
    { match: '/kullanici-rehberi', videoId: '03' },
    { match: '/admin/analytics', videoId: '21' },
    { match: '/anasayfa', videoId: '21' },
    { match: '/admin/experts', videoId: '22' },
    { match: '/admin/users', videoId: '22' },
    { match: '/admin/content', videoId: '23' },
    { match: '/admin/reports', videoId: '23' },
    { match: '/forum', videoId: '23' },
    { match: '/gruplar', videoId: '23' },
    { match: '/bilgi-bankasi', videoId: '23' },
    { match: '/mesajlar', videoId: '01' },
    { match: '/admin/auditlog', videoId: '24' },
    { match: '/admin/settings', videoId: '24' },
    { match: '/yardim', videoId: '03' },
  ],
  TEACHER: [
    { match: '/kullanici-rehberi', videoId: '03' },
    { match: '/anasayfa', videoId: '01' },
    { match: '/mesajlar', videoId: '03' },
    { match: '/bilgi-bankasi', videoId: '03' },
    { match: '/gruplar', videoId: '03' },
    { match: '/forum', videoId: '03' },
    { match: '/ayarlar', videoId: '03' },
    { match: '/yardim', videoId: '03' },
  ],
};

function routeMatches(pathname: string, match: string) {
  return pathname === match || pathname.startsWith(`${match}/`);
}

export function getTutorialVideoForRoute(role: UserRole, pathname: string): TutorialVideo | null {
  const routeVideo = TUTORIAL_ROUTE_VIDEOS[role].find((item) => routeMatches(pathname, item.match));
  if (!routeVideo) return null;
  return TUTORIAL_VIDEOS.find((video) => video.id === routeVideo.videoId) ?? null;
}
