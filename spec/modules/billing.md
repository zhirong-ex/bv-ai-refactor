# billing — 去广告 VIP（一次性购买）

> 行为主本：`zhongnan1.5.3/docs/ai/existing-logic/billing.md`  
> 冲突：`docs/ai/existing-logic/ads-billing.md`  
> 产品：墨刀 v1.1.3「小额付费」；**非周期订阅**

## 设计引用

| alias | DS | 场景 |
|-------|-----|------|
| DS:billing-serious | DS-01 | SERIOUS 购买页 |
| DS:billing-funny | DS-02 | FUNNY 购买页 |
| DS:billing-funny-loading | DS-02-alt | 价格 loading（FUNNY） |
| DS:billing-restore-success | DS-03 | Restore 成功 Toast |
| DS:billing-restore-failed | DS-03-alt | Restore 失败 Toast |

缓存：`design/cache/billing/`（见 `design/bindings.md`）

## 页面

- 购买页全屏；`home_page` / `setting` / `mirror_tutorial` 入队
- Restore：设置 + 购买页内链

## 文案（I18N）

- `string_remove_ads`、`string_one_time_payment_of`、`string_one_hamburger_of`
- `string_restore*`、`string_purchase_success`、`string_payment_failure`

## 配置（CFG）

- `miracast_enable_purchase_remove_ad`
- `miracast_remove_ad_price_1/2`、`miracast_remove_ad_page_style`
