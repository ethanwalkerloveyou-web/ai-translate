/**
 * Service worker：接收 content script 的翻译请求，调用用户配置的大模型 API。
 * 使用经典（非 module）service worker + importScripts 引入公共模块，
 * 这样 content script 也能用同样的写法共享 common.js，无需打包工具。
 */
importScripts('common.js');

var Common = self.AITranslateCommon;

function jsonHeaders(extra) {
  return Object.assign({ 'Content-Type': 'application/json' }, extra || {});
}

function safeParseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}

function trimSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

/**
 * 不少模型会把思考过程直接以 <think>…</think> 的形式混在正文里返回，
 * 而不是放进单独的 reasoning_content 字段。这里把它们剥离出来，
 * 避免思考内容被当成译文显示。
 */
function splitInlineThinking(text) {
  var parts = [];
  var out = String(text || '');

  // 成对出现的思考标签
  out = out.replace(/<(think|thinking|reasoning)>([\s\S]*?)<\/\1>/gi, function (_, tag, inner) {
    parts.push(inner.trim());
    return '';
  });

  // 只有开标签、没有闭标签（输出被 max_tokens 截断）
  out = out.replace(/<(think|thinking|reasoning)>([\s\S]*)$/i, function (_, tag, inner) {
    parts.push(inner.trim());
    return '';
  });

  return { text: out.trim(), thinking: parts.join('\n\n').trim() };
}

/** 把额外参数 JSON 合并进请求体 */
function mergeExtraBody(body, rawJson, fieldLabel) {
  var raw = String(rawJson || '').trim();
  if (!raw) return body;
  var extra = safeParseJson(raw, null);
  if (!extra || typeof extra !== 'object') {
    throw new Error('“' + fieldLabel + '”不是合法的 JSON，请检查设置页面');
  }
  return Object.assign(body, extra);
}

async function extractErrorMessage(response) {
  var raw = '';
  try {
    raw = await response.text();
  } catch (e) {
    // ignore
  }
  var data = safeParseJson(raw, null);
  var message =
    (data && data.error && (data.error.message || data.error.type)) ||
    (data && data.message) ||
    raw ||
    response.statusText;
  return 'HTTP ' + response.status + '：' + (message || '请求失败');
}

async function translateOpenAI(text, systemPrompt, cfg) {
  if (!cfg.apiKey) throw new Error('请先在设置页面填写 OpenAI 兼容接口的 API Key');
  if (!cfg.model) throw new Error('请先在设置页面填写模型名称');
  if (!cfg.baseUrl) throw new Error('请先在设置页面填写 Base URL');

  var body = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ]
  };

  if (cfg.enableThinking) {
    body = mergeExtraBody(body, cfg.thinkingExtraBody, '开启思考时的附加参数');
  } else {
    // 许多模型服务端默认开启思考，必须显式发送关闭字段才会真正不思考
    body = mergeExtraBody(body, cfg.nonThinkingExtraBody, '关闭思考时的附加参数');
  }

  var response = await fetch(trimSlash(cfg.baseUrl) + '/chat/completions', {
    method: 'POST',
    headers: jsonHeaders({ Authorization: 'Bearer ' + cfg.apiKey }),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  var data = await response.json();
  var choice = data && data.choices && data.choices[0];
  var message = choice && choice.message;
  var translated = (message && message.content) || '';
  var thinking =
    (message && (message.reasoning_content || message.reasoning)) ||
    (choice && choice.reasoning_content) ||
    '';

  // 把混在正文里的 <think>…</think> 剥离出来
  var split = splitInlineThinking(translated);
  translated = split.text;
  if (!thinking && split.thinking) thinking = split.thinking;

  if (!translated) {
    if (thinking) {
      throw new Error('模型只返回了思考内容，没有译文。请调大“最大输出 Token 数”，或关闭思考模式。');
    }
    throw new Error('模型没有返回翻译结果，请检查模型名称或参数');
  }

  return {
    ok: true,
    text: translated,
    thinking: thinking ? String(thinking).trim() : '',
    model: cfg.model
  };
}

async function translateAnthropic(text, systemPrompt, cfg) {
  if (!cfg.apiKey) throw new Error('请先在设置页面填写 Anthropic API Key');
  if (!cfg.model) throw new Error('请先在设置页面填写模型名称');
  if (!cfg.baseUrl) throw new Error('请先在设置页面填写 Base URL');

  var maxTokens = cfg.maxTokens || 1024;
  var body = {
    model: cfg.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }]
  };

  if (cfg.enableThinking) {
    var budget = cfg.thinkingBudgetTokens || 2048;
    if (maxTokens <= budget) {
      body.max_tokens = budget + 512;
    }
    body.thinking = { type: 'enabled', budget_tokens: budget };
    // Anthropic 要求开启 thinking 时 temperature 必须为默认值 1（不可自定义）
    delete body.temperature;
  }

  var response = await fetch(trimSlash(cfg.baseUrl) + '/v1/messages', {
    method: 'POST',
    headers: jsonHeaders({
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    }),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  var data = await response.json();
  var blocks = (data && data.content) || [];
  var translated = blocks
    .filter(function (b) {
      return b.type === 'text';
    })
    .map(function (b) {
      return b.text;
    })
    .join('\n\n');
  var thinking = blocks
    .filter(function (b) {
      return b.type === 'thinking';
    })
    .map(function (b) {
      return b.thinking;
    })
    .join('\n\n');

  // 兼容部分中转服务把思考内容内联进正文的情况
  var split = splitInlineThinking(translated);
  translated = split.text;
  if (!thinking && split.thinking) thinking = split.thinking;

  if (!translated) {
    if (thinking) {
      throw new Error('模型只返回了思考内容，没有译文。请调大“最大输出 Token 数”，或关闭思考模式。');
    }
    throw new Error('模型没有返回翻译结果，请检查模型名称或参数');
  }

  return {
    ok: true,
    text: translated,
    thinking: thinking ? thinking.trim() : '',
    model: cfg.model
  };
}

/** profileId 为空时用当前选中的配置，传了则临时用指定的那一条 */
async function handleTranslate(text, profileId) {
  var settings = await Common.getSettings();
  var profile = Common.getProfile(settings, profileId);
  var vars = { targetLang: settings.targetLang, sourceLang: settings.sourceLang };
  var systemPrompt = Common.renderPrompt(settings.promptTemplate, vars);

  var result =
    profile.provider === 'anthropic'
      ? await translateAnthropic(text, systemPrompt, profile)
      : await translateOpenAI(text, systemPrompt, profile);

  result.profileId = profile.id;
  result.profileName = profile.name;
  return result;
}

/** 供内容脚本填充「模型切换」下拉框，只返回展示所需字段，不下发 API Key */
async function handleListProfiles() {
  var settings = await Common.getSettings();
  return {
    ok: true,
    activeProfileId: settings.activeProfileId,
    profiles: settings.profiles.map(function (profile) {
      return { id: profile.id, name: profile.name, model: profile.model, provider: profile.provider };
    })
  };
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message) return false;

  function respond(promise) {
    promise.then(sendResponse).catch(function (err) {
      sendResponse({ ok: false, error: (err && err.message) || String(err) });
    });
    return true; // 异步响应
  }

  if (message.type === 'AI_TRANSLATE_REQUEST') {
    return respond(handleTranslate(message.text, message.profileId));
  }

  if (message.type === 'AI_TRANSLATE_LIST_PROFILES') {
    return respond(handleListProfiles());
  }

  if (message.type === 'AI_TRANSLATE_SET_ACTIVE_PROFILE') {
    return respond(
      Common.saveSettings({ activeProfileId: message.profileId }).then(function () {
        return { ok: true };
      })
    );
  }

  return false;
});

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});
