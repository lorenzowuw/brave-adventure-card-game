// 把多张卡牌 svg 嵌进一个大 SVG 网格，一次渲染为单张 png，供视觉检查。
// 用法: node preview.cjs out.png id1 id2 ...
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'skill_icons');
const [, , outPath, ...ids] = process.argv;

const CW = 256, CH = 192, GAP = 12, COLS = Math.min(4, ids.length || 1);
const rows = Math.ceil(ids.length / COLS);
const W = COLS * CW + (COLS + 1) * GAP;
const H = rows * CH + (rows + 1) * GAP;

let inner = '';
ids.forEach((id, i) => {
  const p = path.join(DIR, id + '.svg');
  if (!fs.existsSync(p)) { console.log('MISS', id); return; }
  let svg = fs.readFileSync(p, 'utf8');
  // 去掉 xml 外层 <svg ...> 包裹，提取内容并包进 <svg x y>
  const col = i % COLS, row = Math.floor(i / COLS);
  const x = GAP + col * (CW + GAP), y = GAP + row * (CH + GAP);
  // 给每张 svg 唯一 id 前缀避免 defs 冲突
  svg = svg.replace(/id="bg"/g, `id="bg${i}"`).replace(/url\(#bg\)/g, `url(#bg${i})`)
           .replace(/id="glow"/g, `id="glow${i}"`).replace(/url\(#glow\)/g, `url(#glow${i})`);
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  inner += `<svg x="${x}" y="${y}" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">${body}</svg>\n`;
});

const grid = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#3a3a42"/>
${inner}</svg>`;

const r = new Resvg(grid, { fitTo: { mode: 'width', value: W } });
fs.writeFileSync(outPath, r.render().asPng());
console.log('wrote', outPath, W + 'x' + H);
