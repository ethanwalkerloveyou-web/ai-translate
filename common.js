/**
 * 公共模块：默认设置、存储读写、prompt 渲染。
 * 以经典 <script> 方式被 background.js / content.js / options.js 共同引入，
 * 通过全局变量 AITranslateCommon 暴露。
 */
(function (global) {
  var STORAGE_KEY = 'aiTranslateSettings';

  var DEFAULT_PROMPT =
    '你是一个专业、简洁的翻译引擎。\n' +
    '将用户输入的文本翻译成{{targetLang}}。\n' +
    '如果原文本身已经是{{targetLang}}，则翻译成{{sourceLang}}。\n' +
    '只输出翻译结果本身，不要添加任何解释、注音、引号或前后缀。';

  var DEFAULTS = {
    // 'openai' | 'anthropic'
    provider: 'openai',

    openai: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: '',
      // 开启思考时合并进请求体的额外字段（JSON 字符串），
      // 例如百炼 Qwen3: {"enable_thinking": true}，OpenAI o系列: {"reasoning_effort": "medium"}
      thinkingExtraBody: '{\n  "reasoning_effort": "medium"\n}',
      // 关闭思考时合并进请求体的额外字段（JSON 字符串）。
      // 很多模型（Qwen3、GLM、豆包等）服务端默认开启思考，必须显式关闭才会生效；
      // 留空表示不发送任何字段（OpenAI 官方接口保持留空即可）。
      nonThinkingExtraBody: ''
    },

    anthropic: {
      baseUrl: 'https://api.anthropic.com',
      apiKey: '',
      model: '',
      thinkingBudgetTokens: 2048
    },

    enableThinking: false,
    maxTokens: 1024,

    promptTemplate: DEFAULT_PROMPT,
    targetLang: '中文',
    sourceLang: '英文',

    // 'immediate' | 'click'
    triggerMode: 'click',

    // 弹出卡片主题：'auto' | 'light' | 'dark'
    theme: 'auto'
  };

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== 'object') return base;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(patch).forEach(function (key) {
      var pv = patch[key];
      var bv = base ? base[key] : undefined;
      if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object') {
        out[key] = deepMerge(bv, pv);
      } else {
        out[key] = pv;
      }
    });
    return out;
  }

  function getSettings() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(STORAGE_KEY, function (result) {
        var stored = (result && result[STORAGE_KEY]) || {};
        resolve(deepMerge(DEFAULTS, stored));
      });
    });
  }

  function saveSettings(patch) {
    return getSettings().then(function (current) {
      var merged = deepMerge(current, patch);
      return new Promise(function (resolve, reject) {
        var toStore = {};
        toStore[STORAGE_KEY] = merged;
        chrome.storage.sync.set(toStore, function () {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(merged);
          }
        });
      });
    });
  }

  function renderPrompt(template, vars) {
    return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '';
    });
  }

  global.AITranslateCommon = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULTS: DEFAULTS,
    DEFAULT_PROMPT: DEFAULT_PROMPT,
    getSettings: getSettings,
    saveSettings: saveSettings,
    renderPrompt: renderPrompt,
    deepMerge: deepMerge
  };
})(typeof self !== 'undefined' ? self : this);
