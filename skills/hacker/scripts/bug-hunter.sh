#!/usr/bin/env bash

# IronClaw-Zero: Advanced Bug Bounty Recon & Surface Mapping Wrapper
# Usage: ./bug-hunter.sh <target_domain>

TARGET=$1

if [ -z "$TARGET" ]; then
    echo "[-] Error: No target specified."
    echo "Usage: $0 <target_domain>"
    exit 1
fi

echo "[+] Starting IronClaw-Zero Bug Hunter Recon on: $TARGET"
echo "[+] $(date -u)"
echo "=========================================================="

# Create output directory
OUTDIR="/tmp/recon_${TARGET//[^a-zA-Z0-9.-]/_}"
mkdir -p "$OUTDIR"
echo "[*] Output directory: $OUTDIR"

# 1. Subdomain Enumeration (Mock/Fallback to basic curl if tools missing)
echo "\n[*] Phase 1: Subdomain Enumeration"
if command -v subfinder >/dev/null 2>&1; then
    subfinder -d "$TARGET" -silent > "$OUTDIR/subdomains.txt"
else
    echo "[-] subfinder not found. Skipping advanced enum. Recording base target."
    echo "$TARGET" > "$OUTDIR/subdomains.txt"
    echo "www.$TARGET" >> "$OUTDIR/subdomains.txt"
fi
echo "[+] Found $(wc -l < "$OUTDIR/subdomains.txt") subdomains."

# 2. Probing Alive Hosts
echo "\n[*] Phase 2: HTTP Probing"
if command -v httpx >/dev/null 2>&1; then
    cat "$OUTDIR/subdomains.txt" | httpx -silent -title -tech-detect -status-code > "$OUTDIR/alive.txt"
else
    echo "[-] httpx not found. Falling back to basic curl checks."
    > "$OUTDIR/alive.txt"
    while read -r sub; do
        if curl -s -m 3 -I "http://$sub" > /dev/null; then
            echo "http://$sub [200 OK]" >> "$OUTDIR/alive.txt"
        elif curl -s -m 3 -I "https://$sub" > /dev/null; then
            echo "https://$sub [200 OK]" >> "$OUTDIR/alive.txt"
        fi
    done < "$OUTDIR/subdomains.txt"
fi

# 3. Basic Nmap Port Scan on Primary Target
echo "\n[*] Phase 3: Fast Port Scanning (Top 100)"
if command -v nmap >/dev/null 2>&1; then
    nmap -F -T4 --open "$TARGET" -oN "$OUTDIR/ports.txt" > /dev/null
    cat "$OUTDIR/ports.txt" | grep "^[0-9]"
else
    echo "[-] nmap not found."
fi

# 4. Consolidate Output for IronCliw consumption
echo "\n=========================================================="
echo "[+] Recon Summary (JSON Format for Agent Consumption)"
cat <<EOF
{
  "target": "$TARGET",
  "recon_dir": "$OUTDIR",
  "alive_hosts": $(wc -l < "$OUTDIR/alive.txt" | tr -d ' '),
  "preview": $(head -n 5 "$OUTDIR/alive.txt" | jq -R . | jq -s .)
}
EOF
echo "=========================================================="
echo "[+] Recon completed."
