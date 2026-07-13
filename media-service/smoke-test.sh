#!/usr/bin/env bash
set -euo pipefail

set -a
source /opt/recetitas-media/media.env
set +a

tmp_dir="$(mktemp -d)"
test_user="test-video-codex-$$"
storage_dir="/var/lib/recetitas-media/${test_user}"

cleanup() {
  rm -rf -- "$tmp_dir"
  if [[ "$(readlink -f "$storage_dir" 2>/dev/null || true)" == "/var/lib/recetitas-media/${test_user}" ]]; then
    rm -rf -- "$storage_dir"
  fi
}
trap cleanup EXIT

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc=duration=2:size=320x240:rate=15" \
  -c:v libx264 -pix_fmt yuv420p "$tmp_dir/short.mp4"

short_status="$(curl -sS -o "$tmp_dir/short.json" -w '%{http_code}' \
  -X POST \
  -H "Authorization: Bearer ${UPLOAD_TOKEN}" \
  -H "Content-Type: video/mp4" \
  -H "X-User-Id: ${test_user}" \
  --data-binary "@$tmp_dir/short.mp4" \
  http://127.0.0.1:3004/upload)"
[[ "$short_status" == "201" ]]

short_file="$(find "$storage_dir" -maxdepth 1 -type f -name '*.mp4' -print -quit)"
short_duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$short_file")"

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "color=black:duration=36:size=64x64:rate=1" \
  -c:v libx264 -pix_fmt yuv420p "$tmp_dir/long.mp4"

long_status="$(curl -sS -o "$tmp_dir/long.json" -w '%{http_code}' \
  -X POST \
  -H "Authorization: Bearer ${UPLOAD_TOKEN}" \
  -H "Content-Type: video/mp4" \
  -H "X-User-Id: ${test_user}" \
  --data-binary "@$tmp_dir/long.mp4" \
  http://127.0.0.1:3004/upload)"
[[ "$long_status" == "422" ]]
grep -q 'video_too_long' "$tmp_dir/long.json"
curl -fsS https://media-recetitas.hex-rp.com/health >/dev/null

printf 'short_status=%s short_duration=%s long_status=%s public_health=ok\n' \
  "$short_status" "$short_duration" "$long_status"
