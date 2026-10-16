/**
 * 自动试玩脚本 — 在浏览器控制台注入运行
 * 用法: agent-browser eval "$(cat auto-play.js); autoPlay('角色名').then(r => JSON.stringify(r))"
 */
async function autoPlay(charName, maxTurns = 200) {
  const results = { character: charName, victory: 0, defeat: 0, attempts: 0 };

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function findBtn(textPattern) {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (!b.disabled && b.textContent.includes(textPattern)) return b;
    }
    return null;
  }

  function findAllBtn(textPattern) {
    return [...document.querySelectorAll('button')].filter(
      b => !b.disabled && b.textContent.includes(textPattern)
    );
  }

  async function waitForScreen(patterns, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const txt = document.body.innerText;
      for (const p of patterns) {
        if (txt.includes(p)) return p;
      }
      await sleep(200);
    }
    return null;
  }

  async function playBattle(maxTurns) {
    for (let turn = 0; turn < maxTurns; turn++) {
      const txt = document.body.innerText;
      if (txt.includes('胜利') || txt.includes('冒险失败') ||
          txt.includes('选择奖励') || txt.includes('击败了')) {
        return 'won';
      }
      if (txt.includes('冒险失败') || txt.includes('倒在了冒险')) {
        return 'lost';
      }

      // 先打所有可用的攻击牌
      let played = true;
      while (played) {
        played = false;
        // 按优先级：攻击 > 防御 > 回复
        const attacks = findAllBtn('伤害');
        const attackBtns = attacks.filter(b => !b.textContent.includes('金币不足') && !b.textContent.includes('能量不足'));

        if (attackBtns.length > 0) {
          attackBtns[0].click();
          await sleep(300);
          played = true;
          continue;
        }

        // 如果 HP 较低打防御
        if (txt.includes('HP') && parseInt(txt.match(/HP(\d+)/)?.[1] ?? '999') < 10) {
          const defenses = findAllBtn('护甲');
          if (defenses.length > 0) {
            defenses[0].click();
            await sleep(300);
            played = true;
            continue;
          }
          const heals = findAllBtn('回复');
          if (heals.length > 0) {
            heals[0].click();
            await sleep(300);
            played = true;
            continue;
          }
        }
      }

      // 结束回合
      const endBtn = findBtn('结束回合');
      if (endBtn) { endBtn.click(); await sleep(500); }
    }
    return 'timeout';
  }

  async function runAttempt() {
    results.attempts++;

    // 选角色
    await sleep(500);
    let btn = findBtn(charName);
    if (!btn) { results.defeat++; return; }
    btn.click();
    await sleep(800);

    // 主循环
    for (let step = 0; step < 30; step++) {
      const txt = document.body.innerText;

      // 检查是否结束
      if (txt.includes('冒险胜利') || txt.includes('再来一次') && txt.includes('冒险胜利')) {
        results.victory++;
        return;
      }
      if (txt.includes('冒险失败') || txt.includes('倒在了冒险')) {
        results.defeat++;
        return;
      }

      // 战斗
      if (txt.includes('手牌') || (txt.includes('结束回合') && txt.includes('HP'))) {
        const result = await playBattle(200);
        if (result === 'won') { results.victory++; return; }
        if (result === 'lost') { results.defeat++; return; }
        continue;
      }

      // 奖励选卡 — 选第一个或跳过
      if (txt.includes('选择奖励')) {
        const rewards = findAllBtn('伤害').filter(b => b.textContent.length < 30);
        if (rewards.length > 0) { rewards[0].click(); await sleep(400); }
        else { const skip = findBtn('跳过'); if (skip) { skip.click(); await sleep(400); } }
        continue;
      }

      // 事件 — 选第一个选项
      if (txt.includes('伸出援手') || txt.includes('选项')) {
        const choiceBtns = [...document.querySelectorAll('button')].filter(
          b => !b.disabled && b.offsetParent !== null && !b.textContent.includes('关闭')
        );
        if (choiceBtns.length > 0) { choiceBtns[0].click(); await sleep(400); }
        continue;
      }
      // 事件通用
      if (document.querySelector('.event-panel')) {
        const btns = document.querySelectorAll('.choice-btn');
        if (btns.length > 0) { btns[0].click(); await sleep(400); continue; }
      }

      // 商店 — 离开
      if (txt.includes('商店') && txt.includes('金币')) {
        const leave = findBtn('离开商店');
        if (leave) { leave.click(); await sleep(400); }
        continue;
      }

      // 休息 — 回血 + 选祝福 + 离开
      if (txt.includes('休息营地') || txt.includes('回复')) {
        const heal = findBtn('回复');
        if (heal) { heal.click(); await sleep(300); }
        const blessing = findBtn('先发制人');
        if (blessing) { blessing.click(); await sleep(300); }
        else {
          const leave = findBtn('继续前进');
          if (leave) { leave.click(); await sleep(300); }
        }
        continue;
      }

      // 祭坛/焚卡 — 离开
      if (txt.includes('祭坛') || txt.includes('焚卡')) {
        const btns = [...document.querySelectorAll('button')];
        const leave = btns.find(b => b.textContent.includes('离开'));
        if (leave) { leave.click(); await sleep(400); }
        continue;
      }

      // 地图 — 点第一个战斗/可点击节点
      const mapBtns = [...document.querySelectorAll('.map-view button')]
        .filter(b => !b.disabled && b.offsetParent !== null);
      if (mapBtns.length > 0) {
        // 优先点战斗/精英/Boss
        const combat = mapBtns.find(b =>
          b.textContent.includes('战斗') || b.textContent.includes('精英') ||
          b.textContent.includes('Boss') || b.textContent.includes('祭坛')
        );
        if (combat) { combat.click(); await sleep(600); }
        else { mapBtns[0].click(); await sleep(600); }
        continue;
      }

      await sleep(300);
    }

    // 超时算失败
    results.defeat++;
  }

  return runAttempt().then(() => results);
}
