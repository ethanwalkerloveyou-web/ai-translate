/**
 * 内容脚本：监听划词，展示翻译图标/卡片。
 * 所有 UI 挂载在 Shadow DOM 内，避免样式被宿主页面污染或污染宿主页面。
 */
(function () {
  if (window.__aiTranslateContentLoaded) return;
  window.__aiTranslateContentLoaded = true;

  var Common = window.AITranslateCommon;

  var ICON_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 5h9M8 3v2m3.5 0c-.6 3.2-2.4 6-5.5 8" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M6 9c1 1.6 2.6 2.9 4.5 3.7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M14 21l3.5-9 3.5 9M15.1 18h4.8" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var CSS_TEXT =
    ':host{all:initial;}' +
    '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;}' +
    '.ai-tr-icon{position:fixed;top:0;left:0;width:30px;height:30px;border-radius:999px;border:none;cursor:pointer;' +
    'background:linear-gradient(135deg,#6366f1,#a855f7);box-shadow:0 4px 14px rgba(99,102,241,.45);' +
    'display:flex;align-items:center;justify-content:center;z-index:2147483647;' +
    'opacity:0;pointer-events:none;transform:translateY(4px) scale(.9);' +
    'transition:opacity .12s ease,transform .12s ease;}' +
    '.ai-tr-icon.show{opacity:1;pointer-events:auto;transform:translateY(0) scale(1);}' +
    '.ai-tr-icon:hover{filter:brightness(1.08);}' +
    '.ai-tr-icon:active{transform:scale(.92);}' +
    '.ai-tr-card{position:fixed;top:0;left:0;width:340px;max-width:92vw;max-height:70vh;' +
    'background:#ffffff;color:#1f2430;border-radius:16px;overflow:hidden;' +
    'box-shadow:0 12px 32px rgba(15,23,42,.18),0 0 0 1px rgba(15,23,42,.06);' +
    'display:flex;flex-direction:column;z-index:2147483647;' +
    'opacity:0;pointer-events:none;transform:translateY(6px);' +
    'transition:opacity .14s ease,transform .14s ease;}' +
    '.ai-tr-card.show{opacity:1;pointer-events:auto;transform:translateY(0);}' +
    // 页头同时是拖动把手
    '.ai-tr-head{display:flex;align-items:center;gap:8px;padding:10px 12px;' +
    'background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;flex:none;' +
    'cursor:move;user-select:none;-webkit-user-select:none;touch-action:none;}' +
    '.ai-tr-card.dragging{transition:none;}' +
    '.ai-tr-card.dragging .ai-tr-head{cursor:grabbing;}' +
    '.ai-tr-head-title{font-size:12.5px;font-weight:600;flex:1;display:flex;align-items:center;gap:6px;opacity:.95;}' +
    '.ai-tr-close{width:20px;height:20px;border-radius:6px;border:none;background:rgba(255,255,255,.18);' +
    'color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;' +
    'transition:background .12s ease;}' +
    '.ai-tr-close:hover{background:rgba(255,255,255,.32);}' +
    '.ai-tr-body{padding:12px 14px;overflow-y:auto;font-size:14px;line-height:1.6;flex:1 1 auto;}' +
    '.ai-tr-result{white-space:pre-wrap;word-break:break-word;color:#1f2430;}' +
    '.ai-tr-loading{display:flex;align-items:center;gap:8px;color:#6b7280;font-size:13px;}' +
    '.ai-tr-error{color:#dc2626;font-size:13px;line-height:1.5;white-space:pre-wrap;}' +
    '.ai-tr-spinner{width:14px;height:14px;border-radius:50%;border:2px solid #c7ceff;border-top-color:#6366f1;' +
    'animation:ai-tr-spin .7s linear infinite;flex:none;}' +
    '@keyframes ai-tr-spin{to{transform:rotate(360deg);}}' +
    '.ai-tr-foot{border-top:1px solid #eef0f4;padding:8px 14px;display:flex;align-items:center;' +
    'justify-content:space-between;gap:8px;flex:none;background:#fafafe;}' +
    '.ai-tr-think-toggle{border:none;background:none;color:#6366f1;font-size:12px;cursor:pointer;padding:0;' +
    'display:none;align-items:center;gap:4px;}' +
    '.ai-tr-think-toggle:hover{text-decoration:underline;}' +
    '.ai-tr-copy{border:none;background:none;color:#6b7280;font-size:12px;cursor:pointer;padding:0;flex:none;}' +
    '.ai-tr-copy:hover{color:#374151;}' +
    // 模型切换下拉框，做成一段不起眼的说明文字的样子
    '.ai-tr-model{margin-left:auto;max-width:150px;border:none;background:transparent;color:#9ca3af;' +
    'font-size:11px;font-family:inherit;padding:2px 4px;border-radius:6px;cursor:pointer;outline:none;' +
    'text-align:right;text-align-last:right;}' +
    '.ai-tr-model:hover{background:#eef0f4;color:#4b5563;}' +
    '.ai-tr-model:disabled{cursor:default;background:transparent;color:#9ca3af;}' +
    '.ai-tr-think{display:none;white-space:pre-wrap;font-size:12.5px;line-height:1.55;color:#6b7280;' +
    'background:#f6f7fb;border-top:1px dashed #e5e7eb;padding:10px 14px;max-height:160px;overflow-y:auto;}' +
    '.ai-tr-think.open{display:block;}';

  var host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.zIndex = '2147483647';
  (document.documentElement || document.body).appendChild(host);

  var shadow = host.attachShadow({ mode: 'open' });
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS_TEXT;
  shadow.appendChild(styleEl);

  var iconBtn = document.createElement('button');
  iconBtn.type = 'button';
  iconBtn.className = 'ai-tr-icon';
  iconBtn.setAttribute('aria-label', 'AI 划词翻译');
  iconBtn.innerHTML = ICON_SVG;
  shadow.appendChild(iconBtn);

  var card = document.createElement('div');
  card.className = 'ai-tr-card';
  card.innerHTML =
    '<div class="ai-tr-head">' +
    '<span class="ai-tr-head-title">' + ICON_SVG + ' AI 划词翻译</span>' +
    '<button type="button" class="ai-tr-close" aria-label="关闭">✕</button>' +
    '</div>' +
    '<div class="ai-tr-body"></div>' +
    '<div class="ai-tr-foot">' +
    '<button type="button" class="ai-tr-think-toggle">查看思考过程 ▾</button>' +
    '<select class="ai-tr-model" title="切换模型"></select>' +
    '<button type="button" class="ai-tr-copy">复制</button>' +
    '</div>' +
    '<div class="ai-tr-think"></div>';
  shadow.appendChild(card);

  var elHead = card.querySelector('.ai-tr-head');
  var elClose = card.querySelector('.ai-tr-close');
  var elBody = card.querySelector('.ai-tr-body');
  var elThinkToggle = card.querySelector('.ai-tr-think-toggle');
  var elThink = card.querySelector('.ai-tr-think');
  var elModel = card.querySelector('.ai-tr-model');
  var elCopy = card.querySelector('.ai-tr-copy');

  var pendingAnchor = null;
  var pendingText = '';
  var lastResultText = '';
  // 卡片里正在翻译的原文与所用的模型配置，切换模型时原地重译
  var currentText = '';
  var currentProfileId = '';
  // 请求序号，用来丢弃切换模型后返回的过期响应
  var translateSeq = 0;
  // 图标「应该」显示（选区仍然有效）；实际是否可见还取决于锚点是否在视口内
  var iconWanted = false;
  // 鼠标松开处的页面坐标，滚动时据此重新计算锚点
  var pendingPoint = null;

  function eventInsideHost(e) {
    var path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    return path.indexOf(host) !== -1;
  }

  function hideIcon() {
    iconWanted = false;
    iconBtn.classList.remove('show');
  }

  function hideCard() {
    card.classList.remove('show');
    elThink.classList.remove('open');
  }

  function hideAll() {
    hideIcon();
    hideCard();
  }

  function scrollOffset() {
    return {
      x: window.scrollX || window.pageXOffset || 0,
      y: window.scrollY || window.pageYOffset || 0
    };
  }

  /** 锚点以页面坐标保存，用时换算成视口坐标，这样滚动后依然能贴着原文。 */
  function toViewportAnchor(pageAnchor) {
    if (!pageAnchor) return null;
    var s = scrollOffset();
    return {
      x: pageAnchor.x - s.x,
      top: pageAnchor.top - s.y,
      bottom: pageAnchor.bottom - s.y
    };
  }

  function anchorInViewport(viewAnchor) {
    return !!viewAnchor && viewAnchor.bottom > 0 && viewAnchor.top < window.innerHeight;
  }

  /**
   * 以锚点为中心摆放元素。anchor 为视口坐标 { x, top, bottom }：
   *   x       —— 水平锚点（优先取鼠标松开处），元素在其左右居中
   *   top/bot —— 垂直避让区间（光标所在那一行文字），元素放在它下方，放不下则放上方
   * 注意用 offsetWidth/offsetHeight 而不是 getBoundingClientRect()，
   * 因为隐藏态的 CSS transform（scale/translate）会让后者量出错误尺寸。
   */
  function positionElement(el, anchor) {
    if (!anchor) return;
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    var margin = 8;
    var gap = 8;

    var x = anchor.x - w / 2;
    var y = anchor.bottom + gap;

    if (y + h > window.innerHeight - margin) {
      var above = anchor.top - gap - h;
      y = above >= margin ? above : Math.max(margin, window.innerHeight - h - margin);
    }

    x = Math.max(margin, Math.min(x, window.innerWidth - w - margin));
    y = Math.max(margin, y);

    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
  }

  /**
   * 保持元素当前位置，只把它夹回视口内。
   * 用于内容高度变化（翻译结果渲染完、展开思考过程）或窗口尺寸变化时，
   * 避免卡片跳回锚点位置。
   */
  function clampIntoViewport(el) {
    var margin = 8;
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    var x = parseFloat(el.style.left) || 0;
    var y = parseFloat(el.style.top) || 0;

    x = Math.max(margin, Math.min(x, Math.max(margin, window.innerWidth - w - margin)));
    y = Math.max(margin, Math.min(y, Math.max(margin, window.innerHeight - h - margin)));

    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
  }

  /** 在选区的各行矩形中，挑出离鼠标最近的一行；没有鼠标位置时取末行。 */
  function pickLineRect(range, point) {
    var rects = [];
    var list = range.getClientRects ? range.getClientRects() : null;
    for (var i = 0; list && i < list.length; i++) {
      if (list[i].width > 0 || list[i].height > 0) rects.push(list[i]);
    }
    if (!rects.length) {
      var bounding = range.getBoundingClientRect();
      return bounding && (bounding.width > 0 || bounding.height > 0) ? bounding : null;
    }
    if (!point) return rects[rects.length - 1];

    var best = rects[0];
    var bestScore = Infinity;
    for (var j = 0; j < rects.length; j++) {
      var r = rects[j];
      var dy = point.y < r.top ? r.top - point.y : point.y > r.bottom ? point.y - r.bottom : 0;
      var dx = point.x < r.left ? r.left - point.x : point.x > r.right ? point.x - r.right : 0;
      // 先比垂直距离（行的归属），同一行内再比水平距离
      var score = dy * 1000 + dx;
      if (score < bestScore) {
        bestScore = score;
        best = r;
      }
    }
    return best;
  }

  /** point 为鼠标松开的视口坐标 {x, y}，可为空（如键盘选词）。 */
  function getSelectionInfo(point) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    var text = sel.toString().trim();
    if (!text) return null;
    var range = sel.getRangeAt(0);
    var lineRect = pickLineRect(range, point);
    if (!lineRect) return null;

    // 水平方向贴着鼠标；垂直方向同时避开光标所在行和光标本身
    var anchor = point
      ? {
          x: point.x,
          top: Math.min(lineRect.top, point.y),
          bottom: Math.max(lineRect.bottom, point.y)
        }
      : { x: lineRect.right, top: lineRect.top, bottom: lineRect.bottom };

    // 转成页面坐标保存，滚动后仍可换算出正确的视口位置
    var s = scrollOffset();
    anchor.x += s.x;
    anchor.top += s.y;
    anchor.bottom += s.y;

    return { text: text, anchor: anchor };
  }

  function showIcon(pageAnchor) {
    iconWanted = true;
    positionElement(iconBtn, toViewportAnchor(pageAnchor));
    iconBtn.classList.add('show');
  }

  function buildLoading() {
    var wrap = document.createElement('div');
    wrap.className = 'ai-tr-loading';
    var spinner = document.createElement('span');
    spinner.className = 'ai-tr-spinner';
    wrap.appendChild(spinner);
    wrap.appendChild(document.createTextNode('正在翻译…'));
    return wrap;
  }

  function renderError(msg) {
    elBody.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'ai-tr-error';
    wrap.textContent = msg;
    elBody.appendChild(wrap);
    elThinkToggle.style.display = 'none';
    elCopy.style.display = 'none';
  }

  function renderResult(response) {
    elBody.innerHTML = '';
    var p = document.createElement('div');
    p.className = 'ai-tr-result';
    p.textContent = response.text;
    elBody.appendChild(p);
    lastResultText = response.text;
    elCopy.style.display = 'inline';

    if (response.thinking) {
      elThinkToggle.style.display = 'inline-flex';
      elThink.textContent = response.thinking;
    } else {
      elThinkToggle.style.display = 'none';
      elThink.textContent = '';
    }
  }

  /** 把后台返回的模型配置列表填进下拉框 */
  function renderProfileOptions(list, activeId) {
    elModel.innerHTML = '';
    (list || []).forEach(function (profile) {
      var option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      // 名称和模型名不一样时，鼠标悬停能看到真正调用的模型
      option.title = profile.model ? profile.name + '（' + profile.model + '）' : profile.name;
      elModel.appendChild(option);
    });
    if (activeId) elModel.value = activeId;
    // 只有一条配置时没得可切，禁用避免误点
    elModel.disabled = !list || list.length < 2;
    elModel.title = elModel.disabled ? '当前模型' : '点击切换模型';
  }

  function refreshProfiles() {
    chrome.runtime.sendMessage({ type: 'AI_TRANSLATE_LIST_PROFILES' }, function (response) {
      if (chrome.runtime.lastError || !response || !response.ok) return;
      currentProfileId = response.activeProfileId;
      renderProfileOptions(response.profiles, response.activeProfileId);
    });
  }

  /** 用指定配置翻译 currentText，不改动卡片位置（切换模型时原地重译） */
  function runTranslation(profileId) {
    var requestId = ++translateSeq;
    elBody.innerHTML = '';
    elBody.appendChild(buildLoading());
    elThink.textContent = '';
    elThink.classList.remove('open');
    elThinkToggle.style.display = 'none';
    elCopy.style.display = 'none';

    var payload = { type: 'AI_TRANSLATE_REQUEST', text: currentText };
    if (profileId) payload.profileId = profileId;

    chrome.runtime.sendMessage(payload, function (response) {
      // 期间又切了一次模型，丢弃过期的响应
      if (requestId !== translateSeq) return;

      if (chrome.runtime.lastError) {
        renderError(chrome.runtime.lastError.message);
      } else if (!response || !response.ok) {
        renderError((response && response.error) || '翻译失败，请稍后重试');
      } else {
        if (response.profileId) {
          currentProfileId = response.profileId;
          elModel.value = response.profileId;
        }
        renderResult(response);
      }
      // 内容加载后卡片高度会变，就地夹回视口即可，不要跳回锚点
      clampIntoViewport(card);
    });
  }

  function openCardAndTranslate(text, pageAnchor) {
    currentText = text;
    card.classList.add('show');
    // 卡片只在打开时按锚点定位一次，之后固定在屏幕上，页面滚动和重译都不再牵动它
    positionElement(card, toViewportAnchor(pageAnchor));
    refreshProfiles();
    runTranslation(currentProfileId);
  }

  iconBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    hideIcon();
    openCardAndTranslate(pendingText, pendingAnchor);
  });

  elClose.addEventListener('click', function (e) {
    e.stopPropagation();
    hideCard();
  });

  elThinkToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    elThink.classList.toggle('open');
    clampIntoViewport(card);
  });

  // 切换模型：记住选择（下次划词沿用），并用新模型原地重译当前这段
  elModel.addEventListener('change', function (e) {
    e.stopPropagation();
    var profileId = elModel.value;
    if (!profileId || profileId === currentProfileId) return;
    currentProfileId = profileId;
    chrome.runtime.sendMessage({ type: 'AI_TRANSLATE_SET_ACTIVE_PROFILE', profileId: profileId }, function () {
      void chrome.runtime.lastError;
    });
    if (currentText) runTranslation(profileId);
  });

  // 拖动：按住页头移动卡片，过程中直接夹在视口内，松手不会回弹
  var drag = null;

  elHead.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    // 关闭按钮不参与拖动
    if (e.target && e.target.closest && e.target.closest('.ai-tr-close')) return;
    // 阻止默认行为，避免拖动时把页面上的选区清掉
    e.preventDefault();
    drag = {
      pointerId: e.pointerId,
      offsetX: e.clientX - (parseFloat(card.style.left) || 0),
      offsetY: e.clientY - (parseFloat(card.style.top) || 0)
    };
    card.classList.add('dragging');
    if (elHead.setPointerCapture) elHead.setPointerCapture(e.pointerId);
  });

  elHead.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    card.style.left = Math.round(e.clientX - drag.offsetX) + 'px';
    card.style.top = Math.round(e.clientY - drag.offsetY) + 'px';
    clampIntoViewport(card);
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (elHead.releasePointerCapture && elHead.hasPointerCapture(e.pointerId)) {
      elHead.releasePointerCapture(e.pointerId);
    }
    drag = null;
    card.classList.remove('dragging');
  }

  elHead.addEventListener('pointerup', endDrag);
  elHead.addEventListener('pointercancel', endDrag);

  elCopy.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!lastResultText) return;
    navigator.clipboard.writeText(lastResultText).then(function () {
      var original = elCopy.textContent;
      elCopy.textContent = '已复制';
      setTimeout(function () {
        elCopy.textContent = original;
      }, 1200);
    });
  });

  document.addEventListener(
    'mousedown',
    function (e) {
      if (eventInsideHost(e)) return;
      hideAll();
    },
    true
  );

  document.addEventListener(
    'mouseup',
    function (e) {
      if (eventInsideHost(e)) return;
      // 记录鼠标松开的位置：按钮要贴着它出现，而不是贴着整段选区的外接矩形
      var point = { x: e.clientX, y: e.clientY };
      var s = scrollOffset();
      setTimeout(function () {
        var info = getSelectionInfo(point);
        if (!info) {
          hideIcon();
          return;
        }
        pendingAnchor = info.anchor;
        pendingPoint = { x: point.x + s.x, y: point.y + s.y };
        pendingText = info.text;
        Common.getSettings().then(function (settings) {
          // 用户可能在等待期间又清空了选区
          var current = getSelectionInfo(point);
          if (!current || current.text !== pendingText) return;
          if (settings.triggerMode === 'immediate') {
            hideIcon();
            openCardAndTranslate(pendingText, pendingAnchor);
          } else {
            showIcon(pendingAnchor);
          }
        });
      }, 0);
    },
    true
  );

  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key === 'Escape') hideAll();
    },
    true
  );

  var syncQueued = false;

  /**
   * 页面滚动/窗口尺寸变化时的跟随逻辑：
   * - 小图标锚在原文上，跟着原文一起移动；原文滚出视口就先隐藏，滚回来再出现。
   * - 翻译卡片是阅读面板，保持在屏幕原处不动，只在越界时夹回视口，
   *   这样滚动页面时可以继续看译文（关闭仍然用叉号、点击空白处或 Esc）。
   */
  function syncPositions() {
    if (iconWanted && pendingPoint) {
      // 按当前选区重新计算锚点，这样页面内部的滚动容器也能正确跟随
      var s = scrollOffset();
      var info = getSelectionInfo({ x: pendingPoint.x - s.x, y: pendingPoint.y - s.y });
      if (!info || info.text !== pendingText) {
        hideIcon();
      } else {
        pendingAnchor = info.anchor;
        var viewAnchor = toViewportAnchor(pendingAnchor);
        if (anchorInViewport(viewAnchor)) {
          positionElement(iconBtn, viewAnchor);
          iconBtn.classList.add('show');
        } else {
          // 原文滚出视口就先藏起来，滚回来会重新出现
          iconBtn.classList.remove('show');
        }
      }
    }
    if (card.classList.contains('show')) {
      clampIntoViewport(card);
    }
  }

  function queueSync(e) {
    // 卡片内部（Shadow DOM）的滚动不该影响外部定位
    if (e && eventInsideHost(e)) return;
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(function () {
      syncQueued = false;
      syncPositions();
    });
  }

  window.addEventListener('scroll', queueSync, true);
  window.addEventListener('resize', queueSync);
})();
