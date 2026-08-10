(function () {
  var Common = window.AITranslateCommon;

  var els = {
    tabs: document.querySelectorAll('.tab'),
    panels: {
      model: document.getElementById('tab-model'),
      translate: document.getElementById('tab-translate'),
      backup: document.getElementById('tab-backup'),
      about: document.getElementById('tab-about')
    },

    profileList: document.getElementById('profileList'),
    addProfileBtn: document.getElementById('addProfileBtn'),
    duplicateProfileBtn: document.getElementById('duplicateProfileBtn'),
    deleteProfileBtn: document.getElementById('deleteProfileBtn'),
    profileName: document.getElementById('profileName'),

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

    exportWithKeys: document.getElementById('exportWithKeys'),
    exportBtn: document.getElementById('exportBtn'),
    exportResult: document.getElementById('exportResult'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    importResult: document.getElementById('importResult'),

    saveBtn: document.getElementById('saveBtn'),
    saveStatus: document.getElementById('saveStatus')
  };

  // 编辑区展示的接口类型跟随当前选中的配置；选中即启用，所以 activeId 同时是「使用中」和「编辑中」
  var state = {
    profiles: [],
    activeId: '',
    provider: 'openai',
    triggerMode: 'click'
  };

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

  function currentProfile() {
    return Common.findProfile({ profiles: state.profiles }, state.activeId);
  }

  function setProvider(provider) {
    state.provider = provider === 'anthropic' ? 'anthropic' : 'openai';
    els.providerSegmented.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-provider') === state.provider);
    });
    els.panelOpenai.classList.toggle('active', state.provider === 'openai');
    els.panelAnthropic.classList.toggle('active', state.provider === 'anthropic');
  }

  els.providerSegmented.addEventListener('click', function (e) {
    var btn = e.target.closest('.seg-btn');
    if (!btn) return;
    var provider = btn.getAttribute('data-provider');
    if (provider === state.provider) return;

    setProvider(provider);
    // 换协议时把 Base URL 从上一个默认值切成新协议的默认值，避免地址对不上
    var input = provider === 'anthropic' ? els.anthropicBaseUrl : els.openaiBaseUrl;
    if (!input.value.trim()) input.value = Common.PROVIDER_PRESETS[provider].baseUrl;
    syncEditorToProfile();
    renderProfileList();
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

  /* ---------------- 模型配置列表 ---------------- */

  function profileSummary(profile) {
    var label = Common.PROVIDER_PRESETS[profile.provider].label;
    return profile.model ? label + ' · ' + profile.model : label + ' · 未填写模型名称';
  }

  function renderProfileList() {
    els.profileList.innerHTML = '';

    state.profiles.forEach(function (profile) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'profile-item' + (profile.id === state.activeId ? ' active' : '');
      item.setAttribute('data-id', profile.id);

      var radio = document.createElement('span');
      radio.className = 'profile-radio';

      var main = document.createElement('span');
      main.className = 'profile-main';
      var name = document.createElement('strong');
      name.textContent = profile.name;
      var sub = document.createElement('small');
      sub.textContent = profileSummary(profile);
      main.appendChild(name);
      main.appendChild(sub);

      item.appendChild(radio);
      item.appendChild(main);

      if (profile.id === state.activeId) {
        var badge = document.createElement('span');
        badge.className = 'profile-badge';
        badge.textContent = '使用中';
        item.appendChild(badge);
      }
      if (!profile.apiKey) {
        var warn = document.createElement('span');
        warn.className = 'profile-warn';
        warn.textContent = '缺 Key';
        warn.title = '这条配置还没有填写 API Key';
        item.appendChild(warn);
      }

      els.profileList.appendChild(item);
    });

    els.deleteProfileBtn.disabled = state.profiles.length < 2;
    els.deleteProfileBtn.title = els.deleteProfileBtn.disabled ? '至少要保留一条配置' : '';
  }

  els.profileList.addEventListener('click', function (e) {
    var item = e.target.closest('.profile-item');
    if (!item) return;
    selectProfile(item.getAttribute('data-id'));
  });

  /** 把编辑区的表单内容写回 state 中当前那条配置 */
  function syncEditorToProfile() {
    var profile = currentProfile();
    if (!profile) return;

    profile.provider = state.provider;
    profile.enableThinking = els.enableThinking.checked;
    profile.maxTokens = parseInt(els.maxTokens.value, 10) || 1024;

    if (state.provider === 'anthropic') {
      profile.baseUrl = els.anthropicBaseUrl.value.trim();
      profile.apiKey = els.anthropicApiKey.value.trim();
      profile.model = els.anthropicModel.value.trim();
      profile.thinkingBudgetTokens = parseInt(els.anthropicThinkingBudget.value, 10) || 2048;
    } else {
      profile.baseUrl = els.openaiBaseUrl.value.trim();
      profile.apiKey = els.openaiApiKey.value.trim();
      profile.model = els.openaiModel.value.trim();
      profile.thinkingExtraBody = els.openaiThinkingExtra.value.trim();
      profile.nonThinkingExtraBody = els.openaiNonThinkingExtra.value.trim();
    }

    // 名称留空时回落到模型名，避免列表里出现空白项
    profile.name =
      els.profileName.value.trim() || profile.model || Common.PROVIDER_PRESETS[profile.provider].label;
  }

  function fillEditor(profile) {
    if (!profile) return;
    els.profileName.value = profile.name || '';
    setProvider(profile.provider);

    var presets = Common.PROVIDER_PRESETS;
    var isAnthropic = profile.provider === 'anthropic';

    // 另一个协议的面板填默认值，切过去时不至于是空的
    els.openaiBaseUrl.value = isAnthropic ? presets.openai.baseUrl : profile.baseUrl || '';
    els.openaiApiKey.value = isAnthropic ? '' : profile.apiKey || '';
    els.openaiModel.value = isAnthropic ? '' : profile.model || '';
    els.openaiThinkingExtra.value = profile.thinkingExtraBody || '';
    els.openaiNonThinkingExtra.value = profile.nonThinkingExtraBody || '';

    els.anthropicBaseUrl.value = isAnthropic ? profile.baseUrl || '' : presets.anthropic.baseUrl;
    els.anthropicApiKey.value = isAnthropic ? profile.apiKey || '' : '';
    els.anthropicModel.value = isAnthropic ? profile.model || '' : '';
    els.anthropicThinkingBudget.value = profile.thinkingBudgetTokens || 2048;

    els.enableThinking.checked = !!profile.enableThinking;
    els.maxTokens.value = profile.maxTokens || 1024;

    refreshThinkingSubFields();
  }

  function selectProfile(id) {
    if (!id || id === state.activeId) return;
    syncEditorToProfile();
    state.activeId = id;
    renderProfileList();
    fillEditor(currentProfile());
    els.testResult.textContent = '';
    els.testResult.className = 'test-result';
  }

  // 名称改了就实时更新列表，不用等保存
  els.profileName.addEventListener('input', function () {
    var profile = currentProfile();
    if (!profile) return;
    profile.name = els.profileName.value.trim() || profile.model || Common.PROVIDER_PRESETS[profile.provider].label;
    renderProfileList();
  });

  function addProfileFrom(source, nameSuffix) {
    syncEditorToProfile();
    var patch = source ? JSON.parse(JSON.stringify(source)) : {};
    patch.id = '';
    if (source) patch.name = (source.name || '') + nameSuffix;
    var profile = Common.createProfile(patch);
    if (!source) profile.name = '新配置 ' + (state.profiles.length + 1);

    state.profiles.push(profile);
    state.activeId = profile.id;
    renderProfileList();
    fillEditor(profile);
    els.profileName.focus();
    els.profileName.select();
  }

  els.addProfileBtn.addEventListener('click', function () {
    addProfileFrom(null, '');
  });

  els.duplicateProfileBtn.addEventListener('click', function () {
    var profile = currentProfile();
    if (!profile) return;
    addProfileFrom(profile, ' 副本');
  });

  els.deleteProfileBtn.addEventListener('click', function () {
    if (state.profiles.length < 2) return;
    var profile = currentProfile();
    if (!profile) return;
    if (!window.confirm('确定删除配置「' + profile.name + '」吗？该操作在保存后生效。')) return;

    var index = state.profiles.indexOf(profile);
    state.profiles.splice(index, 1);
    var next = state.profiles[Math.min(index, state.profiles.length - 1)];
    state.activeId = next.id;
    renderProfileList();
    fillEditor(next);
  });

  /* ---------------- 读取 / 保存 ---------------- */

  function fillForm(settings) {
    state.profiles = settings.profiles;
    state.activeId = settings.activeProfileId;

    renderProfileList();
    fillEditor(currentProfile());

    setTriggerMode(settings.triggerMode);
    els.targetLang.value = settings.targetLang || '';
    els.sourceLang.value = settings.sourceLang || '';
    els.promptTemplate.value = settings.promptTemplate || Common.DEFAULT_PROMPT;
  }

  function collectPatch() {
    syncEditorToProfile();
    return {
      profiles: state.profiles,
      activeProfileId: state.activeId,
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

  function setResult(el, text, kind) {
    el.textContent = text;
    el.className = 'test-result' + (kind ? ' ' + kind : '');
  }

  function save() {
    var err = validateThinkingJson();
    if (err) {
      showSaveStatus(err, true);
      return Promise.reject(new Error(err));
    }
    return Common.saveSettings(collectPatch()).then(function (saved) {
      // 保存时后台会补全字段（比如自动生成的 id），用返回值刷新一次界面
      state.profiles = saved.profiles;
      state.activeId = saved.activeProfileId;
      renderProfileList();
      showSaveStatus('已保存 ✓', false);
      return saved;
    });
  }

  els.saveBtn.addEventListener('click', function () {
    save().catch(function () {});
  });

  els.testBtn.addEventListener('click', function () {
    var err = validateThinkingJson();
    if (err) {
      setResult(els.testResult, err, 'err');
      return;
    }

    els.testBtn.disabled = true;
    setResult(els.testResult, '', '');

    save()
      .then(function () {
        setResult(els.testResult, '正在测试翻译“Hello, world!”…', '');
        return new Promise(function (resolve) {
          chrome.runtime.sendMessage({ type: 'AI_TRANSLATE_REQUEST', text: 'Hello, world!' }, resolve);
        });
      })
      .then(function (response) {
        els.testBtn.disabled = false;
        if (!response || !response.ok) {
          setResult(els.testResult, '测试失败：' + ((response && response.error) || '未知错误'), 'err');
          return;
        }
        var extra = response.thinking ? '（模型已返回思考过程）' : '';
        setResult(els.testResult, '连接成功 ✓ 译文：' + response.text + extra, 'ok');
      })
      .catch(function () {
        els.testBtn.disabled = false;
      });
  });

  /* ---------------- 导入 / 导出 ---------------- */

  function timestampSlug() {
    var d = new Date();
    function pad(n) {
      return n < 10 ? '0' + n : String(n);
    }
    return (
      d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes())
    );
  }

  els.exportBtn.addEventListener('click', function () {
    // 先落盘再导出，保证导出的是界面上当前看到的内容
    save()
      .then(function (saved) {
        var includeApiKeys = els.exportWithKeys.checked;
        var payload = Common.buildExport(saved, { includeApiKeys: includeApiKeys });
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'ai-translate-settings-' + timestampSlug() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);

        setResult(
          els.exportResult,
          '已导出 ' + saved.profiles.length + ' 条模型配置' + (includeApiKeys ? '（含 API Key）' : '（不含 API Key）'),
          'ok'
        );
      })
      .catch(function (e) {
        setResult(els.exportResult, '导出失败：' + ((e && e.message) || '未知错误'), 'err');
      });
  });

  els.importBtn.addEventListener('click', function () {
    els.importFile.click();
  });

  els.importFile.addEventListener('change', function () {
    var file = els.importFile.files && els.importFile.files[0];
    if (!file) return;
    // 允许连续导入同一个文件
    els.importFile.value = '';

    var reader = new FileReader();
    reader.onerror = function () {
      setResult(els.importResult, '读取文件失败', 'err');
    };
    reader.onload = function () {
      var settings;
      try {
        settings = Common.parseImport(JSON.parse(String(reader.result)));
      } catch (e) {
        var msg = e instanceof SyntaxError ? '文件不是合法的 JSON' : (e && e.message) || '解析失败';
        setResult(els.importResult, '导入失败：' + msg, 'err');
        return;
      }

      var withKeys = settings.profiles.filter(function (p) {
        return !!p.apiKey;
      }).length;
      var confirmed = window.confirm(
        '将导入 ' +
          settings.profiles.length +
          ' 条模型配置（其中 ' +
          withKeys +
          ' 条带 API Key），并覆盖当前的全部设置。\n\n确定继续吗？'
      );
      if (!confirmed) {
        setResult(els.importResult, '已取消导入', '');
        return;
      }

      // 覆盖式导入：先清空再写入，避免残留旧配置
      Common.saveSettings(settings)
        .then(function (saved) {
          fillForm(saved);
          switchTab('model');
          setResult(els.importResult, '导入成功 ✓ 共 ' + saved.profiles.length + ' 条模型配置', 'ok');
          showSaveStatus('配置已导入 ✓', false);
        })
        .catch(function (e) {
          setResult(els.importResult, '导入失败：' + ((e && e.message) || '写入设置出错'), 'err');
        });
    };
    reader.readAsText(file);
  });

  Common.getSettings().then(fillForm);
})();
