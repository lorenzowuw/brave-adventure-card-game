import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.ANTHROPIC_BASE_URL || 'https://chat.q1.com/v1';
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not configured');
}

const prompt = `
原创游戏主视觉海报，16:9 横版，纯火柴人风格，暴力美学但无血腥。
画面：中央是一场极其激烈的奇幻大战，十多个彩色火柴人勇者从画面底部和两侧冲向巨型 Boss 阵营，动作夸张、有速度线、冲击波、碎石、火花、魔法轨迹。
勇者阵营要体现这些职业构想但不要照搬任何已有图片：蓝色重盾坦克、紫色暗影刺客、绿色生命贤者、橙色太极武僧、金色游侠商人、红色圣光战士、灰色破甲狂战士、紫色元素法师、蓝色冰霜祭司、绿色荆棘守卫、金色创造者。
Boss 阵营要有对应主题：巨型树精王缠绕藤蔓、遗迹机关亡灵守卫、火焰炎魔领主、冰霜巨龙、中央远景的混沌之主撕裂天空。
风格：stickman only, silhouette stick figures with simple heads and limbs, cinematic poster, high contrast, brutal kinetic composition, anime impact lines, dark fantasy, saturated rim light, epic battle, no realistic humans, no gore, no text, no logo, no UI, leave center-lower area slightly darker and less detailed for game UI readability.
`;

const response = await fetch(`${baseURL}/images/generations`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'nano-banana-2',
    prompt,
    size: '1536x864',
    response_format: 'b64_json',
  }),
});

if (!response.ok) {
  throw new Error(`Image generation failed: ${response.status} ${await response.text()}`);
}

const result = await response.json();
const b64 = result.data?.[0]?.b64_json;
if (!b64) {
  throw new Error('Image generation returned no b64_json data');
}

const outPath = path.resolve('public/assets/backgrounds/stickman_battle_generated.png');
fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
console.log(outPath);
