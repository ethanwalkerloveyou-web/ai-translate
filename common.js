/**
 * 公共模块：默认设置、模型配置（profile）管理、存储读写、导入导出、prompt 渲染。
 * 以经典 <script> 方式被 background.js / content.js / options.js 共同引入，
 * 通过全局变量 AITranslateCommon 暴露。
 */
(function (global) {
  var STORAGE_KEY = 'aiTranslateSettings';

  // 导出文件的标识与版本，导入时据此识别
  var EXPORT_FORMAT = 'ai-translate-settings';
  var EXPORT_VERSION = 1;

  var DEFAULT_PROMPT =
    '你是一个专业、简洁的翻译引擎。\n' +
    '将用户输入的文本翻译成{{targetLang}}。\n' +
    '如果原文本身已经是{{targetLang}}，则翻译成{{sourceLang}}。\n' +
    '只输出翻译结果本身，不要添加任何解释、注音、引号或前后缀。';

  /** 单条模型配置的字段与默认值 */
  var PROFILE_DEFAULTS = {
    id: '',
    name: '',
    // 'openai' | 'anthropic'
    provider: 'openai',
    baseUrl: '',
    apiKey: '',
    model: '',

    // 开启思考时合并进请求体的额外字段（JSON 字符串，仅 openai），
    // 例如百炼 Qwen3: {"enable_thinking": true}，OpenAI o系列: {"reasoning_effort": "medium"}
    thinkingExtraBody: '{\n  "reasoning_effort": "medium"\n}',
    // 关闭思考时合并进请求体的额外字段（JSON 字符串，仅 openai）。
    // 很多模型（Qwen3、GLM、豆包等）服务端默认开启思考，必须显式关闭才会生效；
    // 留空表示不发送任何字段（OpenAI 官方接口保持留空即可）。
    nonThinkingExtraBody: '',
    // 仅 anthropic
    thinkingBudgetTokens: 2048,

    // 思考模式与输出长度按配置各自保存，方便不同模型用不同策略
    enableThinking: false,
    maxTokens: 1024
  };

  var PROVIDER_PRESETS = {
    openai: { label: 'OpenAI 兼容', baseUrl: 'https://api.openai.com/v1' },
    anthropic: { label: 'Anthropic 原生', baseUrl: 'https://api.anthropic.com' }
  };

  function newProfileId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function normalizeProvider(provider) {
    return provider === 'anthropic' ? 'anthropic' : 'openai';
  }

  function toPositiveInt(value, fallback) {
    var n = parseInt(value, 10);
    return isFinite(n) && n > 0 ? n : fallback;
  }

  /** 用给定字段构造一条完整的模型配置，缺失字段回落到默认值 */
  function createProfile(patch) {
    var src = patch && typeof patch === 'object' ? patch : {};
    var out = {};

    Object.keys(PROFILE_DEFAULTS).forEach(function (key) {
      var v = src[key];
      out[key] = v === undefined || v === null ? PROFILE_DEFAULTS[key] : v;
    });

    out.provider = normalizeProvider(out.provider);
    out.id = String(out.id || '') || newProfileId();
    out.baseUrl = String(out.baseUrl || '').trim() || PROVIDER_PRESETS[out.provider].baseUrl;
    out.apiKey = String(out.apiKey || '');
    out.model = String(out.model || '').trim();
    out.name = String(out.name || '').trim() || out.model || PROVIDER_PRESETS[out.provider].label;
    out.thinkingExtraBody = String(out.thinkingExtraBody || '');
    out.nonThinkingExtraBody = String(out.nonThinkingExtraBody || '');
    out.thinkingBudgetTokens = toPositiveInt(out.thinkingBudgetTokens, 2048);
    out.maxTokens = toPositiveInt(out.maxTokens, 1024);
    out.enableThinking = !!out.enableThinking;

    return out;
  }

  /** 清洗配置列表：过滤非法项、补全字段、消除重复 id，至少保留一条 */
  function normalizeProfiles(list) {
    var seen = {};
    var out = [];

    (Array.isArray(list) ? list : []).forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var profile = createProfile(item);
      if (seen[profile.id]) profile.id = newProfileId();
      seen[profile.id] = true;
      out.push(profile);
    });

    if (!out.length) out.push(createProfile({ id: 'default' }));
    return out;
  }

  var DEFAULTS = {
    profiles: [createProfile({ id: 'default' })],
    activeProfileId: 'default',

    promptTemplate: DEFAULT_PROMPT,
    targetLang: '中文',
    sourceLang: '英文',

    // 'immediate' | 'click'
    triggerMode: 'click',

    // 弹出卡片主题：'auto' | 'light' | 'dark'
    theme: 'auto'
  };

  // v0.1 的旧结构：provider + openai/anthropic + 顶层 enableThinking/maxTokens
  var LEGACY_KEYS = ['provider', 'openai', 'anthropic', 'enableThinking', 'maxTokens'];

  /**
   * 把旧结构升级成多配置结构。
   * 旧版只有 openai / anthropic 两套固定配置，这里各转成一条 profile，
   * 并把原来选中的那套设为当前使用。
   */
  function migrate(stored) {
    if (!stored || typeof stored !== 'object') return {};
    if (Array.isArray(stored.profiles) && stored.profiles.length) return stored;

    var hasLegacy = LEGACY_KEYS.some(function (key) {
      return stored[key] !== undefined;
    });
    if (!hasLegacy) return stored;

    var out = Object.assign({}, stored);
    var activeProvider = normalizeProvider(stored.provider);
    var profiles = [];

    ['openai', 'anthropic'].forEach(function (provider) {
      var cfg = stored[provider];
      var configured = cfg && typeof cfg === 'object' && (cfg.apiKey || cfg.model);
      // 没配过的那一套就不用迁移了，除非它正是当前选中的
      if (!configured && provider !== activeProvider) return;

      profiles.push(
        createProfile({
          id: provider,
          name: PROVIDER_PRESETS[provider].label,
          provider: provider,
          baseUrl: cfg && cfg.baseUrl,
          apiKey: cfg && cfg.apiKey,
          model: cfg && cfg.model,
          thinkingExtraBody: cfg && cfg.thinkingExtraBody,
          nonThinkingExtraBody: cfg && cfg.nonThinkingExtraBody,
          thinkingBudgetTokens: cfg && cfg.thinkingBudgetTokens,
          enableThinking: stored.enableThinking,
          maxTokens: stored.maxTokens
        })
      );
    });

    out.profiles = profiles;
    out.activeProfileId = activeProvider;
    LEGACY_KEYS.forEach(function (key) {
      delete out[key];
    });
    return out;
  }

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

  /** 补全并校正一份完整设置：配置列表合法、activeProfileId 必然指向存在的配置 */
  function normalizeSettings(raw) {
    var merged = deepMerge(DEFAULTS, migrate(raw));
    LEGACY_KEYS.forEach(function (key) {
      delete merged[key];
    });

    merged.profiles = normalizeProfiles(merged.profiles);
    if (!findProfile(merged, merged.activeProfileId)) {
      merged.activeProfileId = merged.profiles[0].id;
    }
    return merged;
  }

  function findProfile(settings, id) {
    var list = (settings && settings.profiles) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  /** 取当前使用的模型配置；传 id 则优先取指定的那条 */
  function getProfile(settings, id) {
    return findProfile(settings, id) || findProfile(settings, settings.activeProfileId) || settings.profiles[0];
  }

  function getSettings() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(STORAGE_KEY, function (result) {
        resolve(normalizeSettings((result && result[STORAGE_KEY]) || {}));
      });
    });
  }

  function saveSettings(patch) {
    return getSettings().then(function (current) {
      var merged = normalizeSettings(deepMerge(current, patch));
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

  /**
   * 打包成可下载的备份对象。
   * includeApiKeys 为 false 时清空所有 Key，方便把配置分享给别人。
   */
  function buildExport(settings, options) {
    var includeApiKeys = !options || options.includeApiKeys !== false;
    var data = normalizeSettings(JSON.parse(JSON.stringify(settings || {})));

    if (!includeApiKeys) {
      data.profiles.forEach(function (profile) {
        profile.apiKey = '';
      });
    }

    return {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      includeApiKeys: includeApiKeys,
      settings: data
    };
  }

  /**
   * 解析导入的 JSON（已 JSON.parse 过的对象）。
   * 既接受本插件导出的备份文件，也接受直接手写的设置对象；
   * 旧版本导出的文件会自动升级成多配置结构。
   */
  function parseImport(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('文件内容不是合法的配置 JSON');
    }
    if (raw.format && raw.format !== EXPORT_FORMAT) {
      throw new Error('这不是「AI 划词翻译」的配置文件');
    }

    var payload = raw.settings && typeof raw.settings === 'object' ? raw.settings : raw;
    var looksLikeSettings =
      Array.isArray(payload.profiles) ||
      LEGACY_KEYS.some(function (key) {
        return payload[key] !== undefined;
      });
    if (!looksLikeSettings) {
      throw new Error('文件里没有找到模型配置');
    }

    return normalizeSettings(payload);
  }

  function renderPrompt(template, vars) {
    return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '';
    });
  }

  global.AITranslateCommon = {
    STORAGE_KEY: STORAGE_KEY,
    EXPORT_FORMAT: EXPORT_FORMAT,
    EXPORT_VERSION: EXPORT_VERSION,
    DEFAULTS: DEFAULTS,
    DEFAULT_PROMPT: DEFAULT_PROMPT,
    PROFILE_DEFAULTS: PROFILE_DEFAULTS,
    PROVIDER_PRESETS: PROVIDER_PRESETS,
    createProfile: createProfile,
    normalizeProfiles: normalizeProfiles,
    normalizeSettings: normalizeSettings,
    findProfile: findProfile,
    getProfile: getProfile,
    getSettings: getSettings,
    saveSettings: saveSettings,
    buildExport: buildExport,
    parseImport: parseImport,
    renderPrompt: renderPrompt,
    deepMerge: deepMerge
  };
})(typeof self !== 'undefined' ? self : this);
