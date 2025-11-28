// Quick script to check if server is running
import http from 'http';

const checkServer = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ running: true, data: json });
        } catch {
          resolve({ running: true, data: data });
        }
      });
    });

    req.on('error', () => {
      resolve({ running: false });
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ running: false, timeout: true });
    });
  });
};

checkServer().then((result) => {
  if (result.running) {
    console.log('✅ Server đang chạy tại http://localhost:3001');
    console.log('📊 Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Server KHÔNG chạy tại http://localhost:3001');
    if (result.timeout) {
      console.log('⏱️  Timeout khi kiểm tra');
    }
    console.log('');
    console.log('💡 Để khởi động server, chạy lệnh:');
    console.log('   cd server');
    console.log('   npm start');
  }
});

