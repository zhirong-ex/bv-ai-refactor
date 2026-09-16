# design/cache 目录约定

与 `modao-output/.exports/` 同级角色：**Agent 可读的本地产物**，减少重复拉蓝湖。

```text
design/
  bindings.md
  assets/                    # 最终进 Android res 的切图（compose-write 阶段按需复制）
  cache/
    device-search/
      urls_codex             # 版本文件夹、画板名、URL、DS-xx 映射
      DS-01/
        meta.json
        preview.png
        schema.json
        slices/              # 可选
      DS-02/
        ...
```

## meta.json 示例

```json
{
  "id": "DS-01",
  "module": "device-search",
  "lanhu_name": "device- 新增设备",
  "lanhu_url": "https://lanhuapp.com/web/#/item/project/detailDetach?pid=...&image_id=...",
  "version_folder": "1.4.6",
  "fetched_at": "2026-08-25T09:00:00Z",
  "mcp": "lanhu",
  "error": null
}
```

## schema.json

- 存 MCP 返回的图层树 / CSS 标注 / design tokens（原样或精简）
- **bv-compose-write** 实现 UI 时**优先读此文件**，不反查 Android

## urls_codex 示例（TSV）

```text
version	folder_name	lanhu_url	ds_id
1.4.6	device- 新增设备	https://...	DS-01
1.4.6	device- Apple tv提示…	https://...	DS-05
```

## 增量更新

- 仅改某一画板：`@bv-design-bind 仅补拉 DS-05` → 只更新对应子目录
- 蓝湖改版：重拉 preview + schema，bindings 状态回 `todo`

## .gitignore 建议

```gitignore
# 若 preview 体积大，可只提交 schema + urls_codex，preview 本地拉
# design/cache/**/preview.png
```

团队自行决定 preview 是否入库；**schema + urls_codex + bindings 建议入库**。
