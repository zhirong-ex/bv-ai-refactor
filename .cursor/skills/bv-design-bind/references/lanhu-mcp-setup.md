# 蓝湖 MCP 一次性配置

目标：**用户只维护项目 stage 链接**；Agent 通过 MCP 列画板、读标注、下预览图。

完整说明亦见 [`docs/bv-skills-guide.md`](../../../docs/bv-skills-guide.md) §5「蓝湖 MCP 安装」。

---

## 方案 A：@star_work/lanhu-mcp（推荐）

### 1. 安装（规格仓本地）

```bash
cd <规格仓根目录>
mkdir -p .cursor/tools/lanhu-mcp && cd .cursor/tools/lanhu-mcp
npm init -y
npm install @star_work/lanhu-mcp
```

入口：`.cursor/tools/lanhu-mcp/node_modules/@star_work/lanhu-mcp/dist/index.js`

### 2. Playwright Chromium

lanhu-mcp 依赖 **chromium-1234**：

```bash
cd .cursor/tools/lanhu-mcp
PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright \
  node ./node_modules/playwright/cli.js install chromium
```

### 3. Cursor `~/.cursor/mcp.json`

与 `modao-prototype` 并列，server 名 **`lanhu`**：

```json
{
  "mcpServers": {
    "lanhu": {
      "command": "node",
      "args": [
        "<规格仓绝对路径>/.cursor/tools/lanhu-mcp/node_modules/@star_work/lanhu-mcp/dist/index.js"
      ],
      "env": {
        "CHROME_PATH": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "PLAYWRIGHT_BROWSERS_PATH": "/Users/<你>/Library/Caches/ms-playwright"
      }
    }
  }
}
```

**修改后重启 Cursor**。Agent 命名空间：**`user-lanhu`**。

### 4. 首次登录

```text
调用 lanhu_login 登录蓝湖
```

Cookie：`~/.lanhu-mcp/cookie.json`（勿提交 git）。

### 5. 验证

| 步骤 | 调用 | 预期 |
|------|------|------|
| 解析 | `lanhu_resolve_link` + stage URL（`tid` + `pid`） | 返回 teamId、projectId |
| 列画板 | `lanhu_get_design` 同一 URL，**不传 image_id** | 返回 `designs[]` |
| 单页 | `lanhu_get_design` / `lanhu_get_screenshot` + `image_id` | schema / preview |

**链接**：须 `tid=`，非 `teamId=`。

### 6. bv-design-bind 工具映射

| 工步 | MCP 工具 |
|------|----------|
| 解析链接 | `lanhu_resolve_link` |
| 列画板 | `lanhu_get_design`（无 image_id） |
| 预览图 | `lanhu_get_screenshot` |
| 标注/schema | `lanhu_get_design`（有 image_id） |
| 切图 | `lanhu_download_slices` |

---

## 方案 B：givenge/lanhu-mcp（Chrome 插件）

适合不想管 Cookie、愿在浏览器打开画板的场景。见 [givenge/lanhu-mcp](https://github.com/givenge/lanhu-mcp) README。

---

## 方案 C：LANHU_COOKIE + 脚本（无 MCP）

参考 [oyjt/lanhu-design](https://github.com/oyjt/lanhu-design)。可将脚本 vendoring 到 `.cursor/skills/bv-design-bind/scripts/`（按需）。

---

## 安全

- Cookie 文件勿提交仓库
- 规格仓 `design/cache/` 只存预览/schema，不含 Cookie

---

## 故障排查

| 现象 | 处理 |
|------|------|
| 命名空间无 `user-lanhu` | 检查 `mcp.json`、重启 Cursor |
| 缺少 tid | URL 中 `teamId` → `tid` |
| Playwright 找不到 chromium-1234 | §2 安装命令 |
| 403 / Cookie 失效 | `lanhu_login` |
| 并行 install 锁冲突 | 等另一安装结束或删 `playwright/__dirlock` 后重试 |
