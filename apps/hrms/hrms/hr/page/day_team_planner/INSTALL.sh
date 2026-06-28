#!/bin/bash
# Run this from your frappe-bench root as the frappe user
# Usage: bash install_day_team_planner.sh <site-name>
# Example: bash install_day_team_planner.sh 79.72.76.67

SITE=${1:-79.72.76.67}
HRMS_APP=~/frappe-bench/apps/hrms/hrms/hr/page

echo "=== Step 1: Copy new page files ==="
mkdir -p $HRMS_APP/day_team_planner
cp day_team_planner.js   $HRMS_APP/day_team_planner/
cp day_team_planner.py   $HRMS_APP/day_team_planner/
cp day_team_planner.json $HRMS_APP/day_team_planner/

echo "=== Step 2: Migrate (registers new page) ==="
cd ~/frappe-bench
bench --site $SITE migrate

echo "=== Step 3: Delete old monthly-shift-plan page from DB ==="
bench --site $SITE console <<'EOF'
try:
    frappe.delete_doc('Page', 'monthly-shift-plan', ignore_missing=True, force=True)
    frappe.db.commit()
    print("Old page deleted")
except Exception as e:
    print(f"Could not delete old page (may not exist): {e}")
EOF

echo "=== Step 4: Clear cache ==="
bench --site $SITE clear-cache
bench restart

echo ""
echo "Done! Open: http://$SITE/desk#day-team-planner"
echo ""
echo "You can also manually delete the old page directory:"
echo "  rm -rf $HRMS_APP/monthly_shift_plan"
