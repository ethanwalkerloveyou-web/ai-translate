(function () {
  var Common = window.AITranslateCommon;

  var els = {
    tabs: document.querySelectorAll('.tab'),
    panels: {
      model: document.getElementById('tab-model'),
      translate: document.getElementById('tab-translate'),
      about: document.getElementById('tab-about')
    },

    providerSegmented: document.getElementById('providerSegmented'),
    panelOpenai: document.getElementById('panel-openai'),
    panelAnthropic: document.getElementById('panel-anthropic'),

    openaiBaseUrl: document.getElementById('openaiBaseUrl'),
    openaiApiKey: document.getElementById('openaiApiKey'),
    openaiModel: document.getElementById('openaiModel'),
    openaiThinkingExtra: document.getElementById('openaiThinkingExtra'),
    openaiThinkingField: document.getElementById('openaiThinkingField'),
    openaiNonThinkingExtra: document.getElementById('openaiNonThinkingExtra'),
    openaiNonThinkingField: document.getElementById('openaiNonThinkingField'),

    anthropicBaseUrl: document.getElementById('anthropicBaseUrl'),
    anthropicApiKey: document.getElementById('anthropicApiKey'),
    anthropicModel: document.getElementById('anthropicModel'),
    anthropicThinkingBudget: document.getElementById('anthropicThinkingBudget'),
    anthropicThinkingField: document.getElementById('anthropicThinkingField'),

    enableThinking: document.getElementById('enableThinking'),
    maxTokens: document.getElementById('maxTokens'),

    triggerSegmented: document.getElementById('triggerSegmented'),
    targetLang: document.getElementById('targetLang'),
    sourceLang: document.getElementById('sourceLang'),
    promptTemplate: document.getElementById('promptTemplate'),
    resetPrompt: document.getElementById('resetPrompt'),

    testBtn: document.getElementById('testBtn'),
    testResult: document.getElementById('testResult'),

    saveBtn: document.getElementById('saveBtn'),
    saveStatus: document.getElementById('saveStatus')
  };

  var state = { provider: 'openai', triggerMode: 'click' };

  function switchTab(name) {
    els.tabs.forEach(function (btn) {
      var active = btn.getAttribute('data-tab') === name;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    Object.keys(els.panels).forEach(function (key) {
      els.panels[key].classList.toggle('active', key === name);
    });
  }

  els.tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  function setProvider(provider) {
    state.provider = provider;
    els.providerSegmented.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-provider') === provider);
    });
    els.panelOpenai.classList.toggle('active', provider === 'openai');
    els.panelAnthropic.classList.toggle('active', provider === 'anthropic');
  }

  els.providerSegmented.addEventListener('click', function (e) {
    var btn = e.target.closest('.seg-btn');
    if (!btn) return;
    setProvider(btn.getAttribute('data-provider'));
  });

  function setTriggerMode(mode) {
    state.triggerMode = mode;
    els.triggerSegmented.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-trigger') === mode);
    });
  }

  els.triggerSegmented.addEventListener('click', function (e) {
    var btn = e.target.closest('.seg-btn');
    if (!btn) return;
    setTriggerMode(btn.getAttribute('data-trigger'));
  });

  function refreshThinkingSubFields() {
    var on = els.enableThinking.checked;
    // 开启思考相关的字段在开时可用，关闭思考的字段则相反
    els.openaiThinkingField.classList.toggle('enabled', on);
    els.anthropicThinkingField.classList.toggle('enabled', on);
    els.openaiNonThinkingField.classList.toggle('enabled', !on);
  }

  els.enableThinking.addEventListener('change', refreshThinkingSubFields);

  // 附加参数的一键预设
  document.querySelectorAll('.presets').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var target = document.getElementById(group.getAttribute('data-target'));
      if (!target) return;
      var val = btn.getAttribute('data-val');
      target.value = val ? JSON.stringify(JSON.parse(val), null, 2) : '';
    });
  });

  document.querySelectorAll('.toggle-visibility').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-target'));
      if (!target) return;
      var showing = target.type === 'text';
      target.type = showing ? 'password' : 'text';
      btn.textContent = showing ? '显示' : '隐藏';
    });
  });

  els.resetPrompt.addEventListener('click', function () {
    els.promptTemplate.value = Common.DEFAULT_PROMPT;
  });

  function fillForm(settings) {
    setProvider(settings.provider);
    setTriggerMode(settings.triggerMode);

    els.openaiBaseUrl.value = settings.openai.baseUrl || '';
    els.openaiApiKey.value = settings.openai.apiKey || '';
    els.openaiModel.value = settings.openai.model || '';
    els.openaiThinkingExtra.value = settings.openai.thinkingExtraBody || '';
    els.openaiNonThinkingExtra.value = settings.openai.nonThinkingExtraBody || '';

    els.anthropicBaseUrl.value = settings.anthropic.baseUrl || '';
    els.anthropicApiKey.value = settings.anthropic.apiKey || '';
    els.anthropicModel.value = settings.anthropic.model || '';
    els.anthropicThinkingBudget.value = settings.anthropic.thinkingBudgetTokens || 2048;

    els.enableThinking.checked = !!settings.enableThinking;
    els.maxTokens.value = settings.maxTokens || 1024;

    els.targetLang.value = settings.targetLang || '';
    els.sourceLang.value = settings.sourceLang || '';
    els.promptTemplate.value = settings.promptTemplate || Common.DEFAULT_PROMPT;

    refreshThinkingSubFields();
  }

  function collectPatch() {
    return {
      provider: state.provider,
      openai: {
        baseUrl: els.openaiBaseUrl.value.trim(),
        apiKey: els.openaiApiKey.value.trim(),
        model: els.openaiModel.value.trim(),
        thinkingExtraBody: els.openaiThinkingExtra.value.trim(),
        nonThinkingExtraBody: els.openaiNonThinkingExtra.value.trim()
      },
      anthropic: {
        baseUrl: els.anthropicBaseUrl.value.trim(),
        apiKey: els.anthropicApiKey.value.trim(),
        model: els.anthropicModel.value.trim(),
        thinkingBudgetTokens: parseInt(els.anthropicThinkingBudget.value, 10) || 2048
      },
      enableThinking: els.enableThinking.checked,
      maxTokens: parseInt(els.maxTokens.value, 10) || 1024,
      triggerMode: state.triggerMode,
      targetLang: els.targetLang.value.trim() || '中文',
      sourceLang: els.sourceLang.value.trim() || '英文',
      promptTemplate: els.promptTemplate.value
    };
  }

  function validateThinkingJson() {
    if (state.provider !== 'openai') return null;
    var fields = [
      { el: els.openaiThinkingExtra, label: '开启思考时的附加参数' },
      { el: els.openaiNonThinkingExtra, label: '关闭思考时的附加参数' }
    ];
    for (var i = 0; i < fields.length; i++) {
      var raw = fields[i].el.value.trim();
      if (!raw) continue;
      try {
        JSON.parse(raw);
      } catch (e) {
        return '“' + fields[i].label + '”不是合法的 JSON，请检查格式';
      }
    }
    return null;
  }

  var saveStatusTimer = null;
  function showSaveStatus(text, isError) {
    els.saveStatus.textContent = text;
    els.saveStatus.style.color = isError ? 'var(--danger)' : 'var(--success)';
    clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(function () {
      els.saveStatus.textContent = '';
    }, 2500);
  }

  function save() {
    var err = validateThinkingJson();
    if (err) {
      showSaveStatus(err, true);
      return Promise.reject(new Error(err));
    }
    return Common.saveSettings(collectPatch()).then(function () {
      showSaveStatus('已保存 ✓', false);
    });
  }

  els.saveBtn.addEventListener('click', function () {
    save().catch(function () {});
  });

  els.testBtn.addEventListener('click', function () {
    var err = validateThinkingJson();
    if (err) {
      els.testResult.textContent = err;
      els.testResult.className = 'test-result err';
      return;
    }

    els.testBtn.disabled = true;
    els.testResult.textContent = '';
    els.testResult.className = 'test-result';

    save()
      .then(function () {
        els.testResult.textContent = '正在测试翻译“Hello, world!”…';
        return new Promise(function (resolve) {
          chrome.runtime.sendMessage({ type: 'AI_TRANSLATE_REQUEST', text: 'Hello, world!' }, resolve);
        });
      })
      .then(function (response) {
        els.testBtn.disabled = false;
        if (!response || !response.ok) {
          els.testResult.textContent = '测试失败：' + ((response && response.error) || '未知错误');
          els.testResult.className = 'test-result err';
          return;
        }
        var extra = response.thinking ? '（模型已返回思考过程）' : '';
        els.testResult.textContent = '连接成功 ✓ 译文：' + response.text + extra;
        els.testResult.className = 'test-result ok';
      })
      .catch(function () {
        els.testBtn.disabled = false;
      });
  });

  Common.getSettings().then(fillForm);
})();
