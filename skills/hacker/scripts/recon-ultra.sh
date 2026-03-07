#!/usr/bin/env bash

# IronClaw-Zero: Recon Ultra
# Usage: ./recon-ultra.sh <target_domain>

TARGET=$1

if [ -z "$TARGET" ]; then
    echo "[-] Error: No target specified."
    echo "Usage: $0 <target_domain>"
    exit 1
fi

echo "[+] Starting IronClaw-Zero Recon-Ultra on: $TARGET"
echo "[+] Time: $(date -u)"
echo "--------------------------------------------------------"

OUT="recon-ultra-out.json"

cat <<EOF > $OUT
{
  "target": "$TARGET",
  "status": "Scanning",
  "dns_records": [],
  "ports_open": [],
  "technologies": []
}
EOF

# Fast DNS check
if command -v dig >/dev/null 2>&1; then
    A_RECORDS=$(dig +short A "$TARGET" | head -n 3 | paste -sd "," -)
    jq ".dns_records += [\"$A_RECORDS\"]" $OUT > tmp.json && mv tmp.json $OUT
fi

# Quick Port Scan (Fallback to curl if nmap missing)
if command -v nmap >/dev/null 2>&1; then
    PORTS=$(nmap -F -T4 "$TARGET" | grep "^[0-9]" | cut -d '/' -f 1 | paste -sd "," -)
    jq ".ports_open += [\"$PORTS\"]" $OUT > tmp.json && mv tmp.json $OUT
else
    # basic 80/443 test
    if curl -s -m 2 -I "http://$TARGET" > /dev/null; then
        jq ".ports_open += [\"80\"]" $OUT > tmp.json && mv tmp.json $OUT
    fi
    if curl -s -m 2 -I "https://$TARGET" > /dev/null; then
        jq ".ports_open += [\"443\"]" $OUT > tmp.json && mv tmp.json $OUT
    fi
fi

# Basic Tech Detection (curl headers)
SERVER_HEADER=$(curl -s -I -m 3 "http://$TARGET" | grep -i "^Server:" | awk '{print $2}' | tr -d '\r')
if [ ! -z "$SERVER_HEADER" ]; then
    jq ".technologies += [\"Server: $SERVER_HEADER\"]" $OUT > tmp.json && mv tmp.json $OUT
fi

jq ".status = \"Completed\"" $OUT > tmp.json && mv tmp.json $OUT

echo "\n[+] Recon-Ultra JSON Output:"
cat $OUT
echo ""
echo "--------------------------------------------------------"
