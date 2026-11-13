/**
 * vvdpostpvuv —— 文章 PV/UV/评论数渲染
 * 数据源: pvuv 服务 (POST /poststats, 按路径名统计)
 * 由 meta-top.ejs 的 vvdpostpvuv 分支加载
 */
(function () {
  'use strict';
  var API = 'https://pvuv.zywvvd.com:61213/poststats';

  function render() {
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(window.location.pathname)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('poststats ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var box = document.getElementById('vvdpost_container_page_pvuv');
        if (!box) return;
        var pv = document.getElementById('vvdpost_value_page_pv');
        var uv = document.getElementById('vvdpost_value_page_uv');
        var cn = document.getElementById('vvdpost_value_page_cn');
        if (!pv || !uv || !cn) return;
        pv.innerText = data.pv;
        uv.innerText = data.uv;
        cn.innerText = data.cn;
        box.style.display = 'inline';
      })
      .catch(function () { /* pvuv 不可达时静默, 不影响页面 */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
