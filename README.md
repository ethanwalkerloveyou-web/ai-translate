# AI 划词翻译

一个 Chrome 浏览器插件（Manifest V3）：选中网页上的文字，用你自己配置的大模型进行翻译。

## 功能

- **划词翻译**：选中文字后，可在设置里选择「点击图标再翻译」或「划词后立即翻译」。
- **两种模型接口**：
  - OpenAI 兼容接口（OpenAI、DeepSeek、Qwen、Moonshot/Kimi、各类中转服务等，只需 Base URL + API Key + 模型名）。
  - Anthropic 官方 Messages API（原生支持 `thinking` 扩展思考）。
- **思考模式开关**：开关分别对应「开启思考时的附加参数」和「关闭思考时的附加参数」两组 JSON，均带常见服务商的一键预设，翻译卡片里可展开查看思考过程。

  > ⚠️ **注意**：Qwen3、GLM、豆包等模型在**服务端默认开启思考**。只是「不发送思考参数」并不能关掉它，必须在「关闭思考时的附加参数」里显式发送关闭字段（如 `{"enable_thinking": false}`），点预设按钮即可填入。OpenAI 官方接口留空即可；DeepSeek 官方则靠模型名区分（`deepseek-reasoner` 一定思考，`deepseek-chat` 不思考）。

- **自动剥离内联思考**：部分模型会把思考过程以 `<think>…</think>` 混在正文里返回，插件会自动把它们从译文中剥离，放进折叠的思考区，保证译文干净。
- **自定义翻译 Prompt**：支持 `{{targetLang}}` / `{{sourceLang}}` 变量。
- **设置页面**：分标签（模型与 Key / 翻译与交互 / 关于），带一键测试连接。
- **隐私**：API Key 和所有设置只保存在浏览器本地 `chrome.storage.sync`，翻译请求由插件后台直接发送到你填写的 Base URL，不经过任何第三方中转服务器。

## 本地安装（开发者模式加载）

1. 打开 Chrome，访问 `chrome://extensions`。
2. 右上角打开「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目根目录（包含 `manifest.json` 的目录）。
4. 安装后点击工具栏里的插件图标，会打开设置页面：
   - 选择接口类型（OpenAI 兼容 / Anthropic），填入 Base URL、API Key、模型名称。
   - 如需思考模式，打开「思考模式」开关并按需配置附加参数/思考预算。
   - 切到「翻译与交互」配置触发方式、目标语言、翻译 Prompt。
   - 点击「测试连接」验证配置是否可用，最后点击「保存设置」。
5. 在任意网页上选中文字即可使用。

## 目录结构

```
manifest.json       插件清单（MV3）
common.js           公共模块：默认设置 / 存储读写 / prompt 渲染
background.js       Service worker：调用大模型 API（OpenAI 兼容 / Anthropic）
content.js           内容脚本：Shadow DOM 注入划词图标与翻译卡片
options/
  options.html       设置页面
  options.css        设置页面样式
  options.js         设置页面逻辑
icons/               插件图标
```
