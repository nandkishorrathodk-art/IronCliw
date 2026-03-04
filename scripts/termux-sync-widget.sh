#!/data/data/com.termux/files/usr/bin/bash
# Ironcliw OAuth Sync Widget
# Syncs Claude Code tokens to Ironcliw on l36 server
# Place in ~/.shortcuts/ on phone for Termux:Widget

termux-toast "Syncing Ironcliw auth..."

# Run sync on l36 server
SERVER="${IRONCLIW_SERVER:-${IRONCLIW_SERVER:-l36}}"
RESULT=$(ssh "$SERVER" '/home/admin/Ironcliw/scripts/sync-claude-code-auth.sh' 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    # Extract expiry time from output
    EXPIRY=$(echo "$RESULT" | grep "Token expires:" | cut -d: -f2-)

    termux-vibrate -d 100
    termux-toast "Ironcliw synced! Expires:${EXPIRY}"

    # Optional: restart Ironcliw service
    ssh "$SERVER" 'systemctl --user restart Ironcliw' 2>/dev/null
else
    termux-vibrate -d 300
    termux-toast "Sync failed: ${RESULT}"
fi

