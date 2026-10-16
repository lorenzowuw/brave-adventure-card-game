/**
 * 绿幕替换脚本 v3 — 强力去绿 + 更丰富背景
 *
 * 运行: node scripts/chroma-key-replace.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENCOUNTERS_DIR = path.join(__dirname, '..', 'public/assets/encounters');
const MAP_NODES_DIR = path.join(__dirname, '..', 'public/assets/map_nodes');

const AREA_MAP = {
  // 战斗 encounter 怪物
  'forest_wolf.png':    'forest',
  'forest_treant.png':  'forest',
  'forest_shadow.png':  'forest',
  'ruins_golem.png':    'ruins',
  'ruins_ghost.png':    'ruins',
  'flame_imp.png':      'flame',
  'flame_lava_beast.png': 'flame',
  'frost_wraith.png':   'frost',
  // 地图节点图标
  'battle.png':         'map',
  'burn_altar.png':     'map',
  'elite.png':          'map',
  'event.png':          'map',
  'rest.png':           'map',
  'reward.png':         'map',
  'shop.png':           'map',
  'skill_altar.png':    'map',
};

// ============ 背景生成 ============

function generateBackground(width, height, area) {
  const canvas = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const noise1 = Math.sin(nx * 37.7 + ny * 53.1) * 0.5 + 0.5;
      const noise2 = Math.sin(nx * 71.3 + ny * 29.7) * 0.5 + 0.5;
      const noise = noise1 * 0.6 + noise2 * 0.4;
      let r, g, b;

      switch (area) {
        case 'forest': {
          const baseR = 8 + ny * 25;
          const baseG = 20 + ny * 30 + noise * 8;
          const baseB = 5 + ny * 12;
          const trunk = (Math.abs(Math.sin(nx * 9 + 0.3)) < 0.07 ? 1 : 0)
                     || (Math.abs(Math.sin(nx * 4.5 + 3.1)) < 0.04 ? 1 : 0)
                     || (Math.abs(Math.sin(nx * 6.3 + 1.7)) < 0.05 ? 1 : 0);
          const sunRay = Math.max(0, Math.sin(nx * 3 + ny * 5) * 0.5 + 0.3);
          const moss = ny > 0.85 ? noise * 15 : 0;
          r = baseR * (1 - trunk * 0.6) + sunRay * 20 + moss * 5;
          g = (baseG + moss) * (1 - trunk * 0.5) + sunRay * 15;
          b = baseB * (1 - trunk * 0.4) + sunRay * 8;
          break;
        }
        case 'ruins': {
          const baseR = 110 + ny * 30 + noise * 5;
          const baseG = 95 + ny * 25 + noise * 5;
          const baseB = 75 + ny * 15 + noise * 3;
          const brickPattern = (Math.floor(nx * 8) + Math.floor(ny * 6)) % 2 === 0 ? 1 : 0;
          const mortar = 0.92 + brickPattern * 0.08;
          const pillar = Math.abs(Math.sin(nx * 5 + 0.5)) < 0.08 ? 1 : 0;
          const warmLight = Math.max(0, Math.sin(nx * 2) * 0.3 + 0.7) * Math.max(0, 1 - ny * 0.5);
          r = (baseR * mortar + 180 * pillar * 0.3) * (1 + warmLight * 0.15);
          g = (baseG * mortar + 160 * pillar * 0.3) * (1 + warmLight * 0.1);
          b = (baseB * mortar + 120 * pillar * 0.3) * (1 + warmLight * 0.05);
          break;
        }
        case 'flame': {
          const baseR = 30 + ny * 15 + noise * 10;
          const baseG = 3 + ny * 5 + noise * 3;
          const baseB = 2 + ny * 2;
          const lavaWave = Math.sin(nx * 7 + ny * 3 + 1.5) * 0.5 + 0.5;
          const lavaChannel = lavaWave > 0.85 ? 1 : 0;
          const heatGlow = Math.max(0, 1 - Math.abs(ny - 0.7) * 2) * 0.6
                         + Math.max(0, 1 - Math.abs(nx - 0.5) * 1.5) * 0.2;
          const ember = Math.abs(Math.sin(nx * 53 + ny * 37)) > 0.997 ? 1 :
                        Math.abs(Math.sin(nx * 41 + ny * 59 + 0.7)) > 0.998 ? 1 : 0;
          r = baseR + lavaChannel * 180 + heatGlow * 120 + ember * 255;
          g = baseG + lavaChannel * 60 + heatGlow * 30 + ember * 180;
          b = baseB + lavaChannel * 10 + heatGlow * 5 + ember * 50;
          break;
        }
        case 'frost': {
          const baseR = 15 + ny * 35 + noise * 5;
          const baseG = 25 + ny * 50 + noise * 5;
          const baseB = 55 + ny * 55 + noise * 8;
          const sparkle = (Math.sin(nx * 14 + ny * 9) * Math.sin(ny * 11 - nx * 6) > 0.75) ? 1 : 0;
          const icicle = Math.abs(Math.sin(nx * 6 + 2.1)) < 0.05 ? 1 : 0;
          const coldMist = Math.sin(ny * 2.5 + nx * 3.2) * 0.3 + 0.4;
          r = baseR + sparkle * 60 + icicle * 20 + coldMist * 15;
          g = baseG + sparkle * 80 + icicle * 30 + coldMist * 20;
          b = baseB + sparkle * 100 + icicle * 50 + coldMist * 25;
          const ceilingGlow = Math.max(0, 1 - ny * 3) * 0.3;
          r += ceilingGlow * 40;
          g += ceilingGlow * 60;
          b += ceilingGlow * 80;
          break;
        }
        case 'map': {
          // 羊皮纸/旧地图纹理
          const parchmentR = 190 + noise * 25 + ny * 15;
          const parchmentG = 160 + noise * 20 + ny * 20;
          const parchmentB = 110 + noise * 15 + ny * 10;
          // 地图网格线（极淡）
          const gridLine = (Math.abs(Math.sin(nx * 16)) < 0.02 || Math.abs(Math.sin(ny * 12)) < 0.02) ? 0.92 : 1;
          // 边缘烧焦/暗角
          const vignette = 1 - 0.3 * Math.max(0, Math.pow(Math.abs(nx - 0.5) * 1.6, 3) + Math.pow(Math.abs(ny - 0.5) * 1.6, 3));
          // 浅色污渍/水渍
          const stain1 = Math.exp(-((nx - 0.3) ** 2 + (ny - 0.4) ** 2) * 40);
          const stain2 = Math.exp(-((nx - 0.7) ** 2 + (ny - 0.6) ** 2) * 60);
          const stain = (stain1 + stain2) * 0.08;
          r = parchmentR * gridLine * vignette + stain * 30;
          g = parchmentG * gridLine * vignette + stain * 20;
          b = parchmentB * gridLine * vignette + stain * 10;
          break;
        }
      }
      row.push({
        r: Math.max(0, Math.min(255, Math.round(r))),
        g: Math.max(0, Math.min(255, Math.round(g))),
        b: Math.max(0, Math.min(255, Math.round(b))),
      });
    }
    canvas.push(row);
  }
  return canvas;
}

// ============ Chroma-Key v3 ============

const KEY_R = 0, KEY_G = 255, KEY_B = 0;
const THRESHOLD = 90;          // 绿幕判定阈值
const DESPILL_RANGE = 50;      // 去绿边过渡范围

function colorDist(r, g, b) {
  return Math.sqrt((r - KEY_R) ** 2 + (g - KEY_G) ** 2 + (b - KEY_B) ** 2);
}

/**
 * v3 核心改进:
 * 1. 纯绿幕区域 → 完全替换成背景 (不混合)
 * 2. 边缘抗锯齿区 → 用频域去绿 (spill suppression)
 * 3. 怪物本体 → 不做任何修改
 */
function compositePixel(pr, pg, pb, pa, bgR, bgG, bgB) {
  const dist = colorDist(pr, pg, pb);

  // 绿色通道占比过高（绿色溢出）也需要处理
  const greenRatio = pg / Math.max(pr + pg + pb, 1);

  if (dist < THRESHOLD) {
    // 【绿幕区域】完全替换为背景，不做任何混合
    return { r: bgR, g: bgG, b: bgB, a: 255 };
  }

  if (dist < THRESHOLD + DESPILL_RANGE) {
    // 【边缘过渡区】去绿边处理
    // 强度随距离增加递减
    const strength = 1 - (dist - THRESHOLD) / DESPILL_RANGE;

    // 去绿：减少绿色通道，同时补偿红色和蓝色
    const avgOther = (pr + pb) / 2;
    const cleanG = pg * (1 - strength * 0.8) + avgOther * (strength * 0.8);

    return {
      r: Math.round(pr),
      g: Math.round(Math.max(0, Math.min(255, cleanG))),
      b: Math.round(pb),
      a: pa,
    };
  }

  // 【怪物本体】完全保留
  return { r: pr, g: pg, b: pb, a: pa };
}

// ============ 主流程 ============

async function main() {
  console.log('🟢 绿幕替换脚本 v3\n');

  // 要处理的目录列表
  const dirs = [
    { path: ENCOUNTERS_DIR, label: 'encounters' },
    { path: MAP_NODES_DIR, label: 'map_nodes' },
  ];

  const bgCache = {};

  for (const dir of dirs) {
    const files = fs.readdirSync(dir.path)
      .filter(f => f.endsWith('.png') && !f.endsWith('.bak.png'))
      .sort();

    console.log(`\n📂 ${dir.label}/ 目录 (${files.length} 个文件)`);

    for (const file of files) {
      const area = AREA_MAP[file];
      if (!area) {
        console.log(`  ⚠️  ${file} — 未定义区域，跳过`);
        continue;
      }

      const inputPath = path.join(dir.path, file);
      const bakPath = inputPath + '.bak';

      // 备份原图
      if (!fs.existsSync(bakPath)) {
        fs.copyFileSync(inputPath, bakPath);
        console.log(`  💾 备份: ${file}.bak`);
      }

      const sourceBuffer = fs.readFileSync(bakPath);
      const meta = await sharp(sourceBuffer).metadata();
      const { width, height } = meta;
      console.log(`  🎨 ${file} (${width}×${height}) → [${area}]`);

      if (!bgCache[area]) {
        console.log(`    🏔️  生成「${area}」背景...`);
        bgCache[area] = generateBackground(width, height, area);
      }
      const background = bgCache[area];

      const raw = await sharp(sourceBuffer).ensureAlpha().raw().toBuffer();
      const out = Buffer.alloc(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const pr = raw[i], pg = raw[i + 1], pb = raw[i + 2], pa = raw[i + 3];
          const bg = background[y][x];
          const result = compositePixel(pr, pg, pb, pa, bg.r, bg.g, bg.b);
          out[i] = result.r;
          out[i + 1] = result.g;
          out[i + 2] = result.b;
          out[i + 3] = result.a;
        }
      }

      const outBuf = await sharp(out, { raw: { width, height, channels: 4 } })
        .png()
        .toBuffer();

      fs.writeFileSync(inputPath, outBuf);
      console.log(`    ✅ 完成`);
    }
  }

  console.log('\n🎉 绿幕替换完成！原图备份在 .png.bak');
}

main().catch(err => { console.error('❌ 错误:', err); process.exit(1); });
