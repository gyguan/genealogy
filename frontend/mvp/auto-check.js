window.addEventListener('DOMContentLoaded', function () {
  var box = document.getElementById('message');
  var baseInput = document.getElementById('api-base');
  function show(text, error) {
    if (!box) return;
    box.className = 'message' + (error ? ' error' : '');
    box.innerText = text;
  }
  function check(context) {
    var base = (baseInput && baseInput.value ? baseInput.value : 'http://localhost:8080/api/v1').replace(/\/$/, '');
    fetch(base + '/health')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        show('后端连接正常：' + context + '\nAPI: ' + base);
      })
      .catch(function (err) {
        show('后端连接失败：' + context + '\n' + err.message, true);
      });
  }
  check('页面加载');
  document.querySelectorAll('.nav').forEach(function (btn) {
    btn.addEventListener('click', function () {
      check('进入菜单 ' + btn.innerText);
    });
  });
});
