// 主构建：读取家族表 + 各角色图案库，生成全部 426 张 svg。
// artKey = 家族 root id。每个角色一个 arts 文件。
const path = require('path');
const { generate } = require('./framework.cjs');

const families = require('../../_families.json');
const skills = require('../../src/data/skills.json');
const characters = require('../../src/data/characters.json');

const skillById = Object.fromEntries(skills.map((c) => [c.id, c]));
const charColors = Object.fromEntries(characters.map((c) => [c.id, c.mainColor]));
charColors.generic = '#9fb3c8'; // 通用牌：中性蓝灰

// 合并所有角色图案库（容错：尚未创建的文件跳过）
const ART_FILES = ['ironwall', 'shadowblade', 'lifesage', 'taichimonk', 'holylight',
  'wealthmerchant', 'undeadpriest', 'armorbreaker', 'elementmage', 'omnisage',
  'combatmaster', 'frostpriest', 'thornguardian', 'special'];
const arts = {};
for (const name of ART_FILES) {
  try { Object.assign(arts, require('./arts/' + name + '.cjs')); }
  catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}

// artKey = root id
const fams = families.map((f) => ({ ...f, artKey: f.root }));

const { count, missing } = generate(fams, arts, charColors, skillById);
console.log('Generated', count, 'svg files');
if (missing.length) {
  console.log('MISSING art for', missing.length, 'families:');
  missing.forEach((m) => console.log('  ', m));
}
