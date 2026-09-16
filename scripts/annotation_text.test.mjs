import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyListHierarchy,
  formatAnnotationBodyHtml,
  normalizeAnnotationText,
} from './annotation_text.mjs';

test('applyListHierarchy indents letter items under numbered lists', () => {
  const input = [
    '1. 具体权限：Manifest.permission.SYSTEM_ALERT_WINDOW',
    '2. 具体情况：带我们自己Mirror功能的app，该权限没法请求到时，小概率造成黑屏',
    'a. 在安卓15以上没请求到',
    'b. 安卓11-15 部分情况请求不到',
    '3. 修改方案（具体可以问问童老师）：',
  ].join('\n');
  const out = applyListHierarchy(input);
  assert.match(out, /^1\. 具体权限/);
  assert.match(out, /\n2\. 具体情况/);
  assert.match(out, /\n\ta\. 在安卓15以上/);
  assert.match(out, /\n\tb\. 安卓11-15/);
  assert.match(out, /\n3\. 修改方案/);
});

test('applyListHierarchy indents roman items under letter lists', () => {
  const input = [
    '2. 设备显示样式调整',
    'a. 设备名称+设备适配协议',
    'b. 可展示的协议',
    'I. 新Samsung：Miracast',
    'II.',
    'Fire TV设备：FireTV',
  ].join('\n');
  const out = applyListHierarchy(input);
  assert.match(out, /\n\ta\. 设备名称/);
  assert.match(out, /\n\tb\. 可展示的协议/);
  assert.match(out, /\n\t\tI\. 新Samsung/);
  assert.match(out, /\n\t\tII\./);
  assert.match(out, /\n\t\tFire TV设备：FireTV/);
});

test('normalizeAnnotationText preserves nested list indent', () => {
  const input = '「逻辑」\n1. 点击开始连接\n\ta. 5s内不可点击';
  const out = normalizeAnnotationText(input);
  assert.match(out, /^「逻辑」/);
  assert.match(out, /\n1\. 点击开始连接/);
  assert.match(out, /\n\ta\. 5s内不可点击/);
});

test('formatAnnotationBodyHtml renders nested items with padding', () => {
  const html = formatAnnotationBodyHtml('1. 一级\n\ta. 二级');
  assert.match(html, /1\. 一级<br>/);
  assert.match(html, /padding-left:2em/);
  assert.match(html, /a\. 二级/);
});

test('formatAnnotationBodyHtml renders mirror-permission nested items', () => {
  const body = normalizeAnnotationText(
    '【镜像权限底层库bug】\n\n需要开发自行排查一下\n\n1. 具体权限：Manifest.permission.SYSTEM_ALERT_WINDOW\n2. 具体情况：带我们自己Mirror功能的app，该权限没法请求到时，小概率造成黑屏\na. 在安卓15以上没请求到\nb. 安卓11-15 部分情况请求不到\n3. 修改方案（具体可以问问童老师）：',
  );
  const html = formatAnnotationBodyHtml(body);
  assert.match(html, /2\. 具体情况.*<br>/);
  assert.match(html, /padding-left:2em.*a\. 在安卓15以上/);
  assert.match(html, /padding-left:2em.*b\. 安卓11-15/);
});

test('formatAnnotationBodyHtml does not include deleted requirement text', () => {
  const body = '1. 点击开始连接时，我们不知道电视是否开启了password';
  const html = formatAnnotationBodyHtml(body);
  assert.doesNotMatch(html, /如果电视是已经打开password/);
});
