import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // 30 saniyede 50 kullanıcıya çık
    { duration: '1m', target: 50 },   // 1 dakika boyunca 50 kullanıcıda kal
    { duration: '30s', target: 0 },   // 30 saniyede 0 kullanıcıya in
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // %95'lik gecikme 500ms altında olmalı
  },
};

const BASE_URL = 'http://localhost:8080/api';

export default function () {
  // Actuator health endpoint'ine yük testi yapalım
  const res = http.get(`http://localhost:8080/actuator/health`);
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  sleep(1);
}
