# AI 划词翻译

一个 Chrome 浏览器插件（Manifest V3）：选中网页上的文字，用你自己配置的大模型进行翻译。

## 功能

- **划词翻译**：选中文字后，可在设置里选择「点击图标再翻译」或「划词后立即翻译」。
- **两种模型接口**：
  - OpenAI 兼容接口（OpenAI、DeepSeek、Qwen、Moonshot/Kimi、各类中转服务等，只需 Base URL + API Key + 模型名）。
  - Anthropic 官方 Messages API（原生支持 `thinking` 扩展思考）。
- **思考模式开关**：开启后，Anthropic 会带上官方 `thinking` 参数；OpenAI 兼容接口则合并你自定义的「思考附加参数」JSON（不同服务商字段不同，如 DeepSeek 的 `enable_thinking`、OpenAI o 系列的 `reasoning_effort`），翻译结果卡片里可展开查看思考过程。
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
