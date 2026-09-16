import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LanhuApiClient } from '@star_work/lanhu-mcp/dist/core/api.js';
import { parseSketchJson } from '@star_work/lanhu-mcp/dist/core/parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_ROOT = path.resolve(__dirname, '../../../design/cache/mirror-flow');
const PID = '537f6e5a-6555-4108-8771-28d5f167d8ae';
const TID = '7e6fd821-1dab-4f48-8c32-80325d496c49';

const mappings = [
  ['DS-01', '957b6771-2436-4d9e-940d-bf97f609efa6', 'Tutorial'],
  ['DS-01-unfold', '558c4ca6-b861-4ca5-825d-3d1813e5afd0', 'Tutorial-unfold'],
  ['DS-02', '8dde88e4-2af0-43c1-9679-85d9a27e3490', 'miracast'],
  ['DS-03', '4719a634-1554-40a1-a15c-19f08e5eaac6', 'miracast-lg'],
  ['DS-03-alt-touch', '096b122f-5693-4b98-8252-eb795b56eb4f', 'miracast-lg-touch'],
  ['DS-04', '61937fe9-735d-4a74-9dca-c31ccee62045', 'fire tv'],
  ['DS-04-alt-gray', '5f8dea09-987c-4bb1-8b74-3d1d3176f7c4', 'fire tv-置灰'],
  ['DS-04-alt-v2', 'f1ca79bd-d036-4a3c-9f6d-53293eadbcdb', 'fire tv2'],
  ['DS-05', 'd785631c-1e36-4ae5-8497-72f344286fd1', 'web'],
  ['DS-05-alt-volume', '33d6e7b8-e654-41fe-b481-1a42251ca9cb', 'web-音量'],
  ['DS-06', '38f49f18-b99b-47fb-ab35-875814bb4620', 'mirror_loading'],
  ['DS-06-alt', '92217760-b637-44d6-b533-2540b3ff4894', 'miracast-loading'],
  ['DS-07', '84493a88-f2ab-446a-a10d-8c784f44e660', 'miracast-lg-弹窗'],
  ['DS-08', 'd19143cc-5040-47a3-a7e9-63a399c95fdb', 'fire tv弹窗'],
  ['DS-09', '3128b6fd-53ea-44bc-b42e-2a3a1550f002', 'miracast-下载提示弹窗'],
  ['DS-10', 'f2fd8045-e0fc-4229-9102-e7476c6de46c', 'record_remind'],
  ['DS-11', 'f03b1ddd-66b0-4a09-b2e1-bda4abc606ea', 'miracast-native'],
  ['DS-12', '2967c8ed-4c1c-4bca-912f-4485ead8c308', 'miracast-lg-native'],
  ['DS-13', '63f4cd48-96e1-4224-af86-3e39143f9629', 'fire tv-native'],
  ['DS-14', 'a198efa7-9385-4a0f-a866-532c25f033a5', 'google cast-start-native'],
  ['DS-15', '5d1e0c58-e403-48e2-812d-fc7b68613aa9', 'google cast-stop-native'],
];

const api = new LanhuApiClient();
const fetchedAt = new Date().toISOString();

for (const [dsId, imageId, name] of mappings) {
  const dir = path.join(CACHE_ROOT, dsId);
  const schemaPath = path.join(dir, 'schema.json');
  const metaPath = path.join(dir, 'meta.json');
  const lanhuUrl = `https://lanhuapp.com/web/#/item/project/stage?pid=${PID}&tid=${TID}&image_id=${imageId}`;

  try {
    const { sketchData, sliceScale, isFigma } = await api.getDesignJson(PID, imageId, TID);
    const nodes = parseSketchJson(sketchData, { isFigma, sliceScale });
    fs.writeFileSync(schemaPath, JSON.stringify({ sliceScale, isFigma, nodes }, null, 2));

    const meta = {
      id: dsId,
      module: 'mirror-flow',
      lanhu_name: name,
      lanhu_image_id: imageId,
      lanhu_url: lanhuUrl,
      version_folder: '1.4.2+',
      compose_target: 'presentation/screen/mirrorflow/',
      fetched_at: fetchedAt,
      mcp: 'lanhu',
      error: null,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log(`OK ${dsId} ${name}`);
  } catch (err) {
    const meta = {
      id: dsId,
      module: 'mirror-flow',
      lanhu_name: name,
      lanhu_image_id: imageId,
      lanhu_url: lanhuUrl,
      version_folder: '1.4.2+',
      compose_target: 'presentation/screen/mirrorflow/',
      fetched_at: fetchedAt,
      mcp: 'lanhu',
      error: String(err?.message ?? err),
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.error(`FAIL ${dsId} ${name}: ${err?.message ?? err}`);
  }
}
