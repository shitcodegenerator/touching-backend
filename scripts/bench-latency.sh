#!/usr/bin/env bash
# 比較兩個後端部署的回應時間（搬遷 PoC 用）
# 用法：scripts/bench-latency.sh <base_url> [次數]
#   例：scripts/bench-latency.sh https://touching-develop.zeabur.app 20
#
# 輸出兩個數字，用中位數（p50）與 p90：
#   server = 首位元組時間 - 連線就緒時間 ≈ 後端處理 + 查資料庫（排除網路建連）
#   total  = 使用者實際感受到的總時間（含從本機到機房的網路）
set -euo pipefail

BASE="${1:?需要 base url}"
N="${2:-20}"
PATHS=(
  "/api/health"
  "/api/land-post/public?page=1&limit=12"
  "/api/land-post/public/stats"
)

percentile() { # $1=p (0-100)，從 stdin 讀數字
  sort -n | awk -v p="$1" '{a[NR]=$1} END {i=int((NR*p/100)+0.5); if(i<1)i=1; printf "%.0f", a[i]*1000}'
}

for path in "${PATHS[@]}"; do
  url="${BASE}${path}"
  # 暖機：排除冷啟動與 DB 連線建立
  for _ in 1 2 3; do curl -s -o /dev/null "$url"; done

  server=(); total=()
  for _ in $(seq "$N"); do
    read -r pre ttfb tot code < <(curl -s -o /dev/null \
      -w '%{time_pretransfer} %{time_starttransfer} %{time_total} %{http_code}\n' "$url")
    server+=("$(awk -v a="$ttfb" -v b="$pre" 'BEGIN{print a-b}')")
    total+=("$tot")
  done

  printf '%-42s HTTP %s  server p50=%sms p90=%sms  total p50=%sms p90=%sms\n' \
    "$path" "$code" \
    "$(printf '%s\n' "${server[@]}" | percentile 50)" \
    "$(printf '%s\n' "${server[@]}" | percentile 90)" \
    "$(printf '%s\n' "${total[@]}" | percentile 50)" \
    "$(printf '%s\n' "${total[@]}" | percentile 90)"
done
