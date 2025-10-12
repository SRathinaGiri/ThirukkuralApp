// Change the version number (e.g., v2, v3) to trigger an update for users
const staticCacheName = 'thirukkural-pwa-v6';

const assets = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './thirukkural.csv',
    './icon-512x512.png'
];

// Install event
self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(staticCacheName).then(cache => {
            console.log('caching shell assets');
            return cache.addAll(assets);
        })
    );
});

// Activate event - this removes old caches
self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== staticCacheName)
                .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch event
self.addEventListener('fetch', evt => {
    evt.respondWith(
        caches.match(evt.request).then(cacheRes => {
            return cacheRes || fetch(evt.request);
        })
    );
});
