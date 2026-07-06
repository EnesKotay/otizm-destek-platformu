import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // 30 saniyede 50 kullanıcıya çık
    { duration: '1m', target: 50 },   // 1 dakika boyunca 50 eşzamanlı WebSocket bağlantısı
    { duration: '30s', target: 0 },
  ],
};

const WS_URL = 'ws://localhost:8080/ws/websocket'; // Spring Boot SockJS/STOMP endpoint

export default function () {
  const url = WS_URL;
  const params = { tags: { my_tag: 'websocket-test' } };

  const response = ws.connect(url, params, function (socket) {
    socket.on('open', function () {
      console.log('connected');
      // Send a dummy STOMP message if needed, or just stay connected
      // socket.send('CONNECT\naccept-version:1.1,1.0\n\n\0');
    });

    socket.setTimeout(function () {
      console.log('closing connection after 10 seconds');
      socket.close();
    }, 10000); // 10 saniye açık tut ve kapat
  });

  check(response, { 'status is 101': (r) => r && r.status === 101 });
  sleep(1);
}
