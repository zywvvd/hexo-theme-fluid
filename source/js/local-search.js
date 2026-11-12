/* global CONFIG, jQuery */

/**
 * 站内搜索 —— Pagefind 引擎
 *
 * 索引: hexo generate 后由 pagefind --site public 生成到 /pagefind/
 *      (package.json 的 build 脚本已串联; 只有带 data-pagefind-body 的文章页入索引)
 * 本文件: 把 fluid 搜索弹窗的查询接到 Pagefind, 结果渲染保持 fluid 原生样式
 *
 * 替代的旧实现: jQuery 加载 local-search.xml(27MB) 全量下载 + 内存子串匹配
 *
 * 分批渲染 (2026-11-12): 单词宽查询可命中数百条, 一次 DOM 全量渲染既慢又没法看。
 *   默认先渲染 PAGE_SIZE 条, 底部「加载更多」每次追加一批, 直到展示完毕。
 *   Pagefind 的 results 存根本身已全量在内存, data() 只是懒取详情——分批零额外网络成本。
 */

(function() {
  'use strict';

  var searchSelector = '#local-search-input';
  var resultSelector = '#local-search-result';
  // 索引托管: 生产走国内图床(33030, CORS 开放, 0.1s)；
  // 本地预览(:4000)走本地构建索引。判定依据 hostname 而非协议。
  var onLocalhost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var pagefindBase = onLocalhost
    ? '/pagefind'
    : 'https://uipv4.zywvvd.com:33030/HexoFiles/pagefind';
  var pagefindLoading = null;
  var debounceTimer = null;

  var PAGE_SIZE = 20;
  var state = { query: '', results: [], shown: 0 };

  function loadPagefind() {
    if (!pagefindLoading) {
      pagefindLoading = import(pagefindBase + '/pagefind.js');
    }
    return pagefindLoading;
  }

  function esc(str) {
    return jQuery('<div>').text(str == null ? '' : String(str)).html();
  }

  function itemHtml(data) {
    var title = data.meta && data.meta.title ? data.meta.title : 'Untitled';
    return (
      '<a href="' + data.url + '" class="list-group-item list-group-item-action font-weight-bolder search-list-title">' +
      esc(title) +
      '</a>' +
      '<p class="search-list-content">' + data.excerpt + '...</p>'
    );
  }

  function renderBatch($result, datas) {
    datas.forEach(function (data) {
      $result.append(itemHtml(data));
    });
  }

  function renderLoadMore($result, remaining) {
    $result.append(
      '<button type="button" class="btn btn-outline-secondary btn-block search-load-more" ' +
      'style="margin-top:12px">加载更多（还有 ' + remaining + ' 条）</button>'
    );
  }

  function showNextBatch() {
    var $result = jQuery(resultSelector);
    var next = state.results.slice(state.shown, state.shown + PAGE_SIZE);
    var pending = next.map(function (r) { return r.data(); });

    return Promise.all(pending).then(function (datas) {
      $result.find('.search-load-more').remove();
      renderBatch($result, datas);
      state.shown += datas.length;
      if (state.shown < state.results.length) {
        renderLoadMore($result, state.results.length - state.shown);
      } else {
        $result.find('.search-list-count').text(
          '共 ' + state.results.length + ' 条相关内容，已全部显示'
        );
      }
    });
  }

  function renderResults(query, results) {
    var $result = jQuery(resultSelector);
    var $input = jQuery(searchSelector);
    $result.html('');

    if (!results.length) {
      $input.addClass('invalid').removeClass('valid');
      $result.html('<div class="m-auto text-center text-muted">未找到与「' + esc(query) + '」相关的内容</div>');
      return;
    }
    $input.addClass('valid').removeClass('invalid');

    state = { query: query, results: results, shown: 0 };
    $result.html('<p class="search-list-count text-muted">共 ' + results.length + ' 条相关内容</p>');
    showNextBatch();
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
        // 按文章发布时间降序（索引侧 post.ejs 注入 data-pagefind-sort="date_sort" = 发布时间戳）
        return pagefind.search(query, { sort: { date_sort: "desc" } });
      })
      .then(function (response) {
        renderResults(query, response.results);
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
    state = { query: '', results: [], shown: 0 };
  });

  jQuery(document).on('input', searchSelector, debounceSearch);
  jQuery(document).on('click', resultSelector + ' .search-load-more', function () {
    showNextBatch().catch(function (err) {
      console.error('Load more failed:', err);
    });
  });
})();
