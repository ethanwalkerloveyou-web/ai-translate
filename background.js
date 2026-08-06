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

async function translateOpenAI(text, systemPrompt, settings) {
  var cfg = settings.openai;
  if (!cfg.apiKey) throw new Error('请先在设置页面填写 OpenAI 兼容接口的 API Key');
  if (!cfg.model) throw new Error('请先在设置页面填写模型名称');
  if (!cfg.baseUrl) throw new Error('请先在设置页面填写 Base URL');

  var body = {
    model: cfg.model,
    max_tokens: settings.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ]
  };

  if (settings.enableThinking && cfg.thinkingExtraBody) {
    var extra = safeParseJson(cfg.thinkingExtraBody, null);
    if (extra && typeof extra === 'object') {
      body = Object.assign(body, extra);
    } else {
      throw new Error('“思考附加参数”不是合法的 JSON，请检查设置页面');
    }
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

  if (!translated) throw new Error('模型没有返回翻译结果，请检查模型名称或参数');

  return {
    ok: true,
    text: translated.trim(),
    thinking: thinking ? String(thinking).trim() : '',
    model: cfg.model
  };
}

async function translateAnthropic(text, systemPrompt, settings) {
  var cfg = settings.anthropic;
  if (!cfg.apiKey) throw new Error('请先在设置页面填写 Anthropic API Key');
  if (!cfg.model) throw new Error('请先在设置页面填写模型名称');
  if (!cfg.baseUrl) throw new Error('请先在设置页面填写 Base URL');

  var maxTokens = settings.maxTokens || 1024;
  var body = {
    model: cfg.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }]
  };

  if (settings.enableThinking) {
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

  if (!translated) throw new Error('模型没有返回翻译结果，请检查模型名称或参数');

  return {
    ok: true,
    text: translated.trim(),
    thinking: thinking ? thinking.trim() : '',
    model: cfg.model
  };
}

async function handleTranslate(text) {
  var settings = await Common.getSettings();
  var vars = { targetLang: settings.targetLang, sourceLang: settings.sourceLang };
  var systemPrompt = Common.renderPrompt(settings.promptTemplate, vars);

  if (settings.provider === 'anthropic') {
    return translateAnthropic(text, systemPrompt, settings);
  }
  return translateOpenAI(text, systemPrompt, settings);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message) return false;

  if (message.type === 'AI_TRANSLATE_REQUEST') {
    handleTranslate(message.text)
      .then(sendResponse)
      .catch(function (err) {
        sendResponse({ ok: false, error: (err && err.message) || String(err) });
      });
    return true; // 异步响应
  }

  return false;
});

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});
