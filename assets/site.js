(function () {
  var tabs = document.querySelectorAll('[data-tab]');
  if (!tabs.length) return;
  var groups = document.querySelectorAll('[data-group]');
  function show(name) {
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-tab') === name)); });
    groups.forEach(function (g) { g.hidden = g.getAttribute('data-group') !== name; });
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { show(t.getAttribute('data-tab')); });
  });
  show('sites');
})();
