/* global CONFIG, jQuery */

/**
 * 站内搜索 —— Pagefind 引擎
 *
 * 索引: hexo generate 后由 pagefind --site public 生成到 /pagefind/
 *      (package.json 的 build 脚本已串联; 只有带 data-pagefind-body 的文章页入索引)
 * 本文件: 把 fluid 搜索弹窗的查询接到 Pagefind, 结果渲染保持 fluid 原生样式
 *
 * 替代的旧实现: jQuery 加载 local-search.xml(27MB) 全量下载 + 内存子串匹配
 */

(function() {
  'use strict';

  var searchSelector = '#local-search-input';
  var resultSelector = '#local-search-result';
  var pagefindBase = (window.CONFIG && window.CONFIG.pagefind_base) || '/pagefind';
  var pagefindLoading = null;
  var debounceTimer = null;

  function loadPagefind() {
    if (!pagefindLoading) {
      pagefindLoading = import(pagefindBase + '/pagefind.js');
    }
    return pagefindLoading;
  }

  function esc(str) {
    return jQuery('<div>').text(str == null ? '' : String(str)).html();
  }

  function renderResults(query, datas) {
    var $result = jQuery(resultSelector);
    var $input = jQuery(searchSelector);
    $result.html('');

    if (!datas.length) {
      $input.addClass('invalid').removeClass('valid');
      $result.html('<div class="m-auto text-center text-muted">未找到与「' + esc(query) + '」相关的内容</div>');
      return;
    }
    $input.addClass('valid').removeClass('invalid');
    $result.html('<p class="search-list-count text-muted">找到 ' + datas.length + ' 条相关内容</p>');

    datas.forEach(function (data) {
      var title = data.meta && data.meta.title ? data.meta.title : 'Untitled';
      var item =
        '<a href="' + data.url + '" class="list-group-item list-group-item-action font-weight-bolder search-list-title">' +
        esc(title) +
        '</a>' +
        '<p class="search-list-content">' + data.excerpt + '...</p>';
      $result.append(item);
    });
  }

  function doSearch(query) {
    query = String(query || '').trim();
    var $input = jQuery(searchSelector);
    var $result = jQuery(resultSelector);
    if (!query) {
      $input.removeClass('invalid').removeClass('valid');
      $result.html('');
      return;
    }
    loadPagefind()
      .then(function (pagefind) {
        return pagefind.search(query);
      })
      .then(function (response) {
        var dataPromises = response.results.slice(0, 20).map(function (r) {
          return r.data();
        });
        return Promise.all(dataPromises);
      })
      .then(function (datas) {
        renderResults(query, datas);
      })
      .catch(function (err) {
        console.error('Pagefind search failed:', err);
      });
  }

  function debounceSearch() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(function () {
      doSearch(jQuery(searchSelector).val());
    }, 200);
  }

  var modal = jQuery('#modalSearch');
  modal.on('show.bs.modal', function () {
    loadPagefind().catch(function (err) {
      console.error('Pagefind load failed:', err);
    });
  });
  modal.on('shown.bs.modal', function () {
    jQuery(searchSelector).focus();
  });
  modal.on('hidden.bs.modal', function () {
    window.clearTimeout(debounceTimer);
    jQuery(searchSelector).val('').removeClass('invalid').removeClass('valid');
    jQuery(resultSelector).html('');
  });
  jQuery(document).on('input', searchSelector, debounceSearch);
})();
