if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    const basePath = window.location.pathname.startsWith('/kirsh_vault') ? '/kirsh_vault' : '';
    navigator.serviceWorker
      .register(`${basePath}/service-worker.js`)
      .then(function (registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(function (error) {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}
