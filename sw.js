const CACHE_NAME = 'unique-nail-v3';

// 需要预缓存的资源
const PRE_CACHE = [
  'index.html',
  'sw.js'
];

// 安装时预缓存核心文件
self.addEventListener('install', function(e) {
  console.log('SW: 安装中...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRE_CACHE).catch(function(err) {
        console.log('SW: 预缓存部分失败:', err);
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

// 缓存策略：
// - HTML 文件：网络优先（确保总是最新代码）
// - Firebase/CDN 脚本：缓存优先（离线可用）
// - 其他：缓存优先 + 网络回退
self.addEventListener('fetch', function(e) {
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;

  var url = e.request.url;
  var isHTML = url.includes('index.html') || url.includes('test.html') || e.request.mode === 'navigate';
  var isFirebase = url.includes('firebasejs') || url.includes('gstatic.com');

  if (isHTML) {
    // HTML: 网络优先，失败时用缓存
    e.respondWith(
      fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('index.html');
        });
      })
    );
  } else if (isFirebase) {
    // Firebase CDN: 缓存优先（离线可用），失败时请求网络
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 408 });
        });
      })
    );
  } else {
    // 其他资源：缓存优先 + 网络回退
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 408 });
        });
      })
    );
  }
});
