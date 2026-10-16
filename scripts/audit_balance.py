#!/usr/bin/env python3
"""Audit game data for balance issues."""

import json
from collections import defaultdict

with open(r'C:\myPrograms\card-game\src\data\skills.json', 'r', encoding='utf-8') as f:
    skills = json.load(f)

with open(r'C:\myPrograms\card-game\src\data\characters.json', 'r', encoding='utf-8') as f:
    characters = json.load(f)

with open(r'C:\myPrograms\card-game\src\data\enemies.json', 'r', encoding='utf-8') as f:
    enemies = json.load(f)

# Build lookup maps
skill_map = {s['id']: s for s in skills}
char_map = {c['id']: c for c in characters}
enemy_map = {e['id']: e for e in enemies}

print("=" * 80)
print("AUDIT REPORT: 勇者大冒险 Game Data Balance")
print("=" * 80)

# ==========================================
# 1. upgradeTo chain integrity
# ==========================================
print("\n## 1. 升级链完整性检查")
print("-" * 40)
broken_refs = []
for s in skills:
    upg = s.get('upgradeTo')
    if upg:
        if upg not in skill_map:
            broken_refs.append((s['id'], upg))
        else:
            target = skill_map[upg]
            # Check tier increases
            if target['tier'] <= s['tier']:
                print(f"  警告: {s['id']} (tier={s['tier']}) -> {upg} (tier={target['tier']}) 等级未提升")

if broken_refs:
    for src, dst in broken_refs:
        print(f"  [严重] 断裂引用: {src} 指向不存在的ID: {dst}")
else:
    print("  所有 upgradeTo 引用均有效。")

# ==========================================
# 2. Check for cards that upgrade but lose stats
# ==========================================
print("\n## 2. 升级链数值衰减检查")
print("-" * 40)

def get_attack_value(eff):
    """Get base damage from effect."""
    d = eff.get('damage', 0)
    # For multi-hit, compute total
    mult = eff.get('damageMultiplier', 1)
    return d * mult

def get_defense_value(eff):
    return eff.get('armor', 0)

def get_heal_value(eff):
    return eff.get('heal', 0)

downgrade_issues = []
for s in skills:
    upg = s.get('upgradeTo')
    if upg and upg in skill_map:
        t = skill_map[upg]
        # Compare attack
        s_atk = get_attack_value(s['effect'])
        t_atk = get_attack_value(t['effect'])
        if s_atk > t_atk and s['type'] == t['type'] and s['type'] in ('attack',):
            downgrade_issues.append((s['id'], s['cost'], s_atk, upg, t['cost'], t_atk, "攻击力"))
        # Compare defense
        s_def = get_defense_value(s['effect'])
        t_def = get_defense_value(t['effect'])
        if s_def > t_def and s['type'] == t['type'] and s['cost'] == t['cost']:
            downgrade_issues.append((s['id'], s['cost'], s_def, upg, t['cost'], t_def, "护甲"))
        # Compare heal
        s_heal = get_heal_value(s['effect'])
        t_heal = get_heal_value(t['effect'])
        if s_heal > t_heal and s['type'] == t['type']:
            downgrade_issues.append((s['id'], s['cost'], s_heal, upg, t['cost'], t_heal, "治疗"))

# Filter: only report if same cost or lower cost, and stat drops significantly
significant_downgrades = []
for item in downgrade_issues:
    src_id, src_cost, src_val, dst_id, dst_cost, dst_val, stat_name = item
    # Skip if cost decreases (it's a trade-off)
    if dst_cost < src_cost:
        continue
    # Only report if value drops by > 20%
    if src_val > 0 and dst_val > 0:
        ratio = dst_val / src_val
        if ratio < 0.8:
            significant_downgrades.append(item)

# Special cases to ignore (cost change makes it intentional)
filtered = []
for item in significant_downgrades:
    src_id, src_cost, src_val, dst_id, dst_cost, dst_val, stat_name = item
    # ironwall_bash_1->ironwall_bash_2: cost 2->1 intentionally trades stats for lower cost
    if src_id == 'ironwall_bash_1' and dst_id == 'ironwall_bash_2':
        continue
    filtered.append(item)

if filtered:
    for item in filtered:
        src_id, src_cost, src_val, dst_id, dst_cost, dst_val, stat_name = item
        print(f"  [注意] {src_id}(cost={src_cost},{stat_name}={src_val}) -> {dst_id}(cost={dst_cost},{stat_name}={dst_val}) 数值下降")
else:
    print("  未发现异常数值衰减（排除有意降低费用的升级链）。")

# ==========================================
# 3. White->Green->Blue->Purple->Orange->Red upgrade progression
# ==========================================
print("\n## 3. 升级链每级提升检查")
print("-" * 40)
# Check each character's card upgrade chain
char_upgrade_chains = defaultdict(list)
for s in skills:
    bind = s.get('characterBind', 'generic')
    if bind != 'generic':
        char_upgrade_chains[bind].append(s)

# For each starting card (tier 1, white), trace the chain
for char_id in char_map:
    if char_id == 'developer':
        continue
    # Find all chains by following upgradeTo
    start_cards = [s for s in skills if s.get('characterBind') == char_id and s.get('tier') == 1 and s.get('rarity') == 'white']
    for start in start_cards:
        chain = [start]
        curr = start
        while curr.get('upgradeTo') and curr['upgradeTo'] in skill_map:
            curr = skill_map[curr['upgradeTo']]
            chain.append(curr)
        # Check each step has some numeric improvement
        for i in range(len(chain) - 1):
            prev = chain[i]
            curr = chain[i+1]
            p_eff = prev['effect']
            c_eff = curr['effect']
            # Basic check: at least one numeric value increased
            all_keys = set(list(p_eff.keys()) + list(c_eff.keys()))
            improved = False
            for k in all_keys:
                if k in ('applyStatus', 'damageMultiplier', 'target'):
                    continue
                pv = p_eff.get(k, 0)
                cv = c_eff.get(k, 0)
                if isinstance(pv, (int, float)) and isinstance(cv, (int, float)):
                    if cv > pv:
                        improved = True
            if not improved and curr.get('cost') == prev.get('cost') and 'damageMultiplier' not in p_eff:
                print(f"  [注意] 升级链 {prev['id']} -> {curr['id']} 可能无数值提升（rarity: {prev['rarity']}->{curr['rarity']}, cost: {prev['cost']}->{curr['cost']}）")

# ==========================================
# 4. Compare same-rarity, same-cost cards
# ==========================================
print("\n## 4. 同稀有度同费用数值对比")
print("-" * 40)

# Group by (rarity, cost, type)
groups = defaultdict(list)
for s in skills:
    if s.get('characterBind') == 'developer':
        continue
    g = (s['rarity'], s['cost'], s['type'])
    groups[g].append(s)

for (rarity, cost, stype), cards in sorted(groups.items()):
    if len(cards) < 2:
        continue
    damages = [get_attack_value(c['effect']) for c in cards]
    armors = [get_defense_value(c['effect']) for c in cards]
    heals = [get_heal_value(c['effect']) for c in cards]

    if stype == 'attack' and len(damages) >= 2:
        max_d = max(damages)
        min_d = min(damages)
        avg_d = sum(damages) / len(damages)
        # Report if one card is > 50% above average for same cost/rarity
        for c, d in zip(cards, damages):
            if d > 0 and avg_d > 0:
                ratio = d / avg_d
                if ratio > 1.5:
                    print(f"  [注意] {c['id']}({c['characterBind']}): 伤害{d} 超出同组平均({avg_d:.0f}) {ratio:.0%}")
                elif ratio < 0.7:
                    print(f"  [注意] {c['id']}({c['characterBind']}): 伤害{d} 低于同组平均({avg_d:.0f}) {ratio:.0%}")

    if stype == 'defense' and len(armors) >= 2:
        max_a = max(armors); min_a = min(armors)
        avg_a = sum(armors) / len(armors)
        for c, a in zip(cards, armors):
            if a > 0 and avg_a > 0:
                ratio = a / avg_a
                if ratio > 1.5:
                    print(f"  [注意] {c['id']}({c['characterBind']}): 护甲{a} 超出同组平均({avg_a:.0f}) {ratio:.0%}")

    if stype == 'heal' and len(heals) >= 2:
        avg_h = sum(heals) / len(heals)
        for c, h in zip(cards, heals):
            if h > 0 and avg_h > 0:
                ratio = h / avg_h
                if ratio > 1.5:
                    print(f"  [注意] {c['id']}({c['characterBind']}): 治疗{h} 超出同组平均({avg_h:.0f}) {ratio:.0%}")

# ==========================================
# 5. Status effect value/duration sanity
# ==========================================
print("\n## 5. Status Effect 数值合理性")
print("-" * 40)
status_values = defaultdict(list)
for s in skills:
    eff = s['effect']
    for key in ('applyStatus',):
        st = eff.get(key)
        if st:
            if isinstance(st, dict):
                status_values[st['type']].append((st['value'], st.get('duration', 1), s['id'], s['rarity']))
            elif isinstance(st, list):
                for sub in st:
                    status_values[sub['type']].append((sub['value'], sub.get('duration', 1), s['id'], s['rarity']))

for stype, vals in sorted(status_values.items()):
    if len(vals) < 3:
        continue
    values = [v[0] for v in vals]
    max_v = max(values)
    min_v = min(values)
    avg_v = sum(values) / len(values)
    if max_v > avg_v * 3:
        extremes = [(v, d, sid, r) for v, d, sid, r in vals if v > avg_v * 3]
        for v, d, sid, r in extremes:
            print(f"  [注意] {stype} 数值异常高: {sid}({r}) value={v}, 平均={avg_v:.1f}")
    if min_v > 0 and avg_v > 0 and max_v / min_v > 5:
        print(f"  [信息] {stype} 数值跨度大: min={min_v}, max={max_v}, 平均={avg_v:.1f}")

# Check empower values on player - these stack with passives
empowers = [(s['id'], s['rarity'], s['effect'].get('applyStatus', {}).get('value', 0))
            for s in skills if s['effect'].get('applyStatus', {}).get('type') == 'empower'
            and s['effect']['applyStatus'].get('target') == 'player']
if empowers:
    empowers.sort(key=lambda x: x[2])
    max_emp = max(e[2] for e in empowers)
    min_emp = min(e[2] for e in empowers)
    print(f"  玩家强化(empower)数值范围: {min_emp}-{max_emp}")

# ==========================================
# 6. Enemies balance
# ==========================================
print("\n## 6. 敌人数据合理性")
print("-" * 40)
for e in enemies:
    tier = e['tier']
    hp = e['hp']
    energy = e['energy']

    # Check normal enemy HP/attack progression by area
    attacks = [i for i in e['intents'] if i['type'] == 'attack']
    if attacks:
        max_attack = max(a['value'] for a in attacks)
    else:
        max_attack = 0

    defends = [i for i in e['intents'] if i['type'] == 'defense']
    max_defense = max((d['value'] for d in defends), default=0)

    # Check if boss HP seems balanced vs player base HP
    if tier == 'boss':
        # Ironwall has 23 base HP, shadowblade has 12
        player_min_hp = min(c['baseHp'] for c in characters if c['id'] != 'developer')
        player_max_hp = max(c['baseHp'] for c in characters if c['id'] != 'developer')
        boss_hp = hp
        # Boss should be killable in ~5-8 turns with average damage
        print(f"  {e['id']}: HP={hp}, 攻击max={max_attack}, 护甲max={max_defense}, 能量={energy}")

    # Check phase threshold
    pt = e.get('phaseThreshold')
    if pt is not None:
        pi = e.get('phaseIntents', [])
        if not pi:
            print(f"  [注意] {e['id']} 设置了 phaseThreshold={pt} 但无 phaseIntents")
        if pi:
            pi_attacks = [i for i in pi if i['type'] == 'attack']
            if pi_attacks:
                pi_max = max(a['value'] for a in pi_attacks)
                if attacks and pi_max <= max_attack:
                    print(f"  [注意] {e['id']}: 阶段转换后攻击({pi_max})未高于阶段前({max_attack})")

# ==========================================
# 7. damageMultiplier / damageToAll balance
# ==========================================
print("\n## 7. 连击与群伤平衡性")
print("-" * 40)
multi_hit_cards = [s for s in skills if s['effect'].get('damageMultiplier', 1) > 1]
for s in multi_hit_cards:
    dmg = s['effect']['damage']
    mult = s['effect']['damageMultiplier']
    total = dmg * mult
    cost = s['cost']
    rarity = s['rarity']
    # Compare to single-hit cards of same cost/rarity
    comparable = [x for x in skills if x['rarity'] == rarity and x['cost'] == cost
                  and x['type'] == 'attack' and x['effect'].get('damageMultiplier', 1) == 1
                  and x['id'] != s['id']]
    if comparable:
        avg_single = sum(get_attack_value(x['effect']) for x in comparable) / len(comparable)
        ratio = total / avg_single
        if ratio > 1.3:
            print(f"  [注意] {s['id']}: 连击总伤{total} 高于同组平均{avg_single:.0f}(+{((ratio-1)*100):.0f}%)")
        elif ratio < 0.8:
            print(f"  [注意] {s['id']}: 连击总伤{total} 低于同组平均{avg_single:.0f}({ratio:.0%})")

# ==========================================
# 8. Effect vs Description mismatch
# ==========================================
print("\n## 8. Effect与Description一致性")
print("-" * 40)
# Check for effects not mentioned in description
for s in skills:
    eff = s['effect']
    desc = s.get('description', '')
    # Check key fields
    checks = [
        ('damage', '伤害', '造成'),
        ('armor', '护甲', '获得'),
        ('heal', '生命', '恢复'),
        ('drawCards', '抽', '抽'),
        ('energyGain', '能量', '能量'),
        ('goldGain', '金币', '金币'),
        ('goldCost', '消耗', '消耗'),
    ]
    for key, cn_term, _ in checks:
        if key in eff and eff[key] and cn_term not in desc:
            print(f"  [注意] {s['id']}: 有{key}={eff[key]}但描述未提及 \"{cn_term}\"")

    # Check status effect mentions
    st = eff.get('applyStatus')
    if st:
        if isinstance(st, dict):
            st_type = st['type']
            st_cn = {'bleed': '流血', 'poison': '中毒', 'burn': '灼烧', 'weak': '虚弱',
                     'fragile': '脆弱', 'paralyze': '麻痹', 'regen': '再生', 'empower': '强化'}.get(st_type, st_type)
            if st_cn not in desc:
                print(f"  [注意] {s['id']}: 施加状态{st_type}但描述未提及")
        elif isinstance(st, list):
            for sub in st:
                st_type = sub['type']
                st_cn = {'bleed': '流血', 'poison': '中毒', 'burn': '灼烧', 'weak': '虚弱',
                         'fragile': '脆弱', 'paralyze': '麻痹', 'regen': '再生', 'empower': '强化'}.get(st_type, st_type)
                if st_cn not in desc:
                    print(f"  [注意] {s['id']}: 施加状态{st_type}但描述未提及")

# ==========================================
# 9. Economy card balance
# ==========================================
print("\n## 9. 经济卡数值模型")
print("-" * 40)
economy_cards = [s for s in skills if s.get('type') in ('economy',) or
                 s['effect'].get('goldCost') or s['effect'].get('goldGain')]
for s in economy_cards:
    gc = s['effect'].get('goldCost', 0)
    gg = s['effect'].get('goldGain', 0)
    net = gg - gc
    damage = s['effect'].get('damage', 0)
    armor = s['effect'].get('armor', 0)
    draw = s['effect'].get('drawCards', 0)
    energy = s['effect'].get('energyGain', 0)

    if gc > 0 and gg > 0:
        profit_pct = (gg - gc) / gc * 100
        if profit_pct < 20:
            print(f"  [注意] {s['id']}({s['rarity']}): 消费{gc}得{gg}, 利润率{profit_pct:.0f}%, 偏低")
        elif profit_pct > 100:
            print(f"  [信息] {s['id']}({s['rarity']}): 消费{gc}得{gg}, 利润率{profit_pct:.0f}%, 高收益")

    if gc > 0 and damage > 0:
        dmg_per_gold = damage / gc
        # Compare to typical values
        if dmg_per_gold < 0.8:
            print(f"  [注意] {s['id']}: 每金币伤害比{dmg_per_gold:.2f}偏低")

# ==========================================
# 10. Character passive balance
# ==========================================
print("\n## 10. 角色被动技能评估")
print("-" * 40)
for c in characters:
    pid = c['id']
    if pid == 'developer':
        continue
    hp = c['baseHp']
    energy = c['baseEnergy']
    desc = c.get('passiveDescription', '')
    print(f"  {c['name']}({pid}): HP={hp}, 能量={energy}, 被动={desc}")

print("\n" + "=" * 80)
print("审计完成")
print("=" * 80)
