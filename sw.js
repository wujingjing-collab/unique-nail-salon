const CACHE_NAME = 'unique-nail-v2';

// 需要预缓存的资源
const PRE_CACHE = [
  'index.html',
  'test.html',
  'sw.js'
];

// 安装时预缓存核心文件
self.addEventListener('install', function(e) {
  console.log('SW: 安装中...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRE_CACHE).catch(function(err) {
        console.log('SW: 预缓存部分失败 (可能是网络问题):', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', function(e) {
  console.log('SW: 激活中...');
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
          .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// 缓存策略：缓存优先 + 网络回退
self.addEventListener('fetch', function(e) {
  // 跳过非 HTTP(S) 请求
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      // 有缓存直接用缓存（速度最快，且支持离线）
      if (cached) return cached;

      // 没缓存就请求网络
      return fetch(e.request).then(function(response) {
        // 只缓存成功的 GET 请求
        if (response && response.status === 200 && e.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // 完全离线且无缓存：导航请求返回主页
        if (e.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        // 其他请求静默失败
        return new Response('', { status: 408 });
      });
    })
  );
});
