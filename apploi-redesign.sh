#!/bin/bash
# Apploi Brand Redesign - Color Swap Script
# Run from /tmp/calendly-alt

echo "🎨 Applying Apploi brand redesign..."

# ==========================================
# 1. Copy redesigned core components
# ==========================================
echo "  → Copying redesigned Sidebar, MobileHeader, Layout..."
# (These should already be copied before running this script)

# ==========================================
# 2. Swap blue → teal across all dashboard pages & components
# ==========================================
echo "  → Swapping blue → teal in dashboard pages..."

# Files to process (excludes Sidebar/MobileHeader/layout which are already redesigned)
FILES=(
  "src/app/dashboard/bookings/BookingsClient.tsx"
  "src/app/dashboard/meeting-types/page.tsx"
  "src/app/dashboard/settings/page.tsx"
  "src/app/dashboard/analytics/page.tsx"
  "src/app/dashboard/availability/page.tsx"
  "src/app/dashboard/integration/page.tsx"
  "src/app/dashboard/team/page.tsx"
  "src/app/dashboard/error.tsx"
  "src/components/AvailabilityEditor.tsx"
  "src/components/SignOutButton.tsx"
  "src/app/dashboard/page.tsx"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    # Primary button: blue-600 → teal-600
    sed -i '' 's/bg-blue-600/bg-teal-600/g' "$f"
    sed -i '' 's/hover:bg-blue-700/hover:bg-teal-700/g' "$f"
    
    # Light backgrounds: blue-50 → teal-50
    sed -i '' 's/bg-blue-50/bg-teal-50/g' "$f"
    sed -i '' 's/bg-blue-100/bg-teal-100/g' "$f"
    
    # Text colors
    sed -i '' 's/text-blue-700/text-teal-700/g' "$f"
    sed -i '' 's/text-blue-600/text-teal-600/g' "$f"
    sed -i '' 's/text-blue-500/text-teal-500/g' "$f"
    sed -i '' 's/text-blue-400/text-teal-400/g' "$f"
    
    # Borders & focus rings
    sed -i '' 's/border-blue-500/border-teal-500/g' "$f"
    sed -i '' 's/border-blue-600/border-teal-600/g' "$f"
    sed -i '' 's/focus:border-blue-500/focus:border-teal-500/g' "$f"
    sed -i '' 's/focus:ring-blue-500/focus:ring-teal-500/g' "$f"
    sed -i '' 's/ring-blue-500/ring-teal-500/g' "$f"
    
    echo "    ✓ $f"
  else
    echo "    ⚠ $f not found, skipping"
  fi
done

# ==========================================
# 3. Update candidate-facing booking pages
# ==========================================
echo "  → Updating candidate booking pages..."

BOOKING_FILES=$(find src/app/\[username\] -name "*.tsx" 2>/dev/null)
for f in $BOOKING_FILES; do
  if [ -f "$f" ]; then
    sed -i '' 's/bg-blue-600/bg-teal-600/g' "$f"
    sed -i '' 's/hover:bg-blue-700/hover:bg-teal-700/g' "$f"
    sed -i '' 's/bg-blue-50/bg-teal-50/g' "$f"
    sed -i '' 's/bg-blue-100/bg-teal-100/g' "$f"
    sed -i '' 's/text-blue-700/text-teal-700/g' "$f"
    sed -i '' 's/text-blue-600/text-teal-600/g' "$f"
    sed -i '' 's/text-blue-500/text-teal-500/g' "$f"
    sed -i '' 's/border-blue-500/border-teal-500/g' "$f"
    sed -i '' 's/focus:border-blue-500/focus:border-teal-500/g' "$f"
    sed -i '' 's/focus:ring-blue-500/focus:ring-teal-500/g' "$f"
    echo "    ✓ $f"
  fi
done

# ==========================================
# 4. Update the main page background
# ==========================================
echo "  → Warming up background colors..."
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    # Swap cold gray-50 background hints to warmer tone where used as page bg
    # (This is subtle - mainly affects sub-components)
    sed -i '' 's/bg-gray-50\/80/bg-\[#F8F6F3\]\/80/g' "$f"
  fi
done

# ==========================================
# 5. Update the login/home page
# ==========================================
echo "  → Updating login page..."
if [ -f "src/app/page.tsx" ]; then
  sed -i '' 's/bg-blue-600/bg-teal-600/g' "src/app/page.tsx"
  sed -i '' 's/hover:bg-blue-700/hover:bg-teal-700/g' "src/app/page.tsx"
  sed -i '' 's/text-blue-600/text-teal-600/g' "src/app/page.tsx"
  sed -i '' 's/bg-blue-50/bg-teal-50/g' "src/app/page.tsx"
  sed -i '' 's/text-blue-700/text-teal-700/g' "src/app/page.tsx"
  echo "    ✓ src/app/page.tsx"
fi

echo ""
echo "✅ Apploi brand redesign complete!"
echo ""
echo "Changes applied:"
echo "  • Dark forest green sidebar (#0B2522 → #003D37)"
echo "  • Teal primary color (replaces generic blue)"
echo "  • Green CTA accents (#00D08A)"
echo "  • Warm cream background (#F8F6F3)"
echo "  • Candidate booking pages updated"
echo ""
echo "Ready to commit and push!"
