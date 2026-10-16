#!/bin/bash
# 角色通关率基准测试
CHARACTERS=("铁壁守卫" "影刃刺客" "生命贤者" "太极武僧" "游侠商人" "圣光战士")
ATTEMPTS=3
URL="http://127.0.0.1:5173"
SESSION="bench"
RESULTS_FILE="benchmark_results.json"

echo "=== 角色通关率基准测试 ==="
echo "角色: ${CHARACTERS[*]}"
echo "每角色 $ATTEMPTS 局"
echo ""

echo "[" > $RESULTS_FILE
first_char=true

for char in "${CHARACTERS[@]}"; do
  wins=0
  losses=0

  echo "--- $char ---"

  for ((i=1; i<=ATTEMPTS; i++)); do
    agent-browser --session $SESSION reload > /dev/null 2>&1
    sleep 0.5

    result=$(agent-browser --session $SESSION eval "$(cat auto-play.js); autoPlay('$char', 300).then(r => JSON.stringify(r));" 2>/dev/null | grep -v '^$' | tail -1)

    if echo "$result" | grep -q '"victory":1'; then
      echo "  第$i 局: ✅ 胜利"
      wins=$((wins + 1))
    else
      echo "  第$i 局: ❌ 失败"
      losses=$((losses + 1))
    fi

    sleep 0.3
  done

  pct=$((wins * 100 / ATTEMPTS))
  echo "  → $char 胜率: $wins/$ATTEMPTS ($pct%)"
  echo ""

  if [ "$first_char" = true ]; then
    first_char=false
  else
    echo "," >> $RESULTS_FILE
  fi
  echo "{\"character\":\"$char\",\"wins\":$wins,\"losses\":$losses,\"total\":$ATTEMPTS,\"winrate\":$pct}" >> $RESULTS_FILE
done

echo "]" >> $RESULTS_FILE

echo "=== 最终排行 ==="
cat $RESULTS_FILE
