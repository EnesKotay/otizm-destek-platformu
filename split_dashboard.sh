#!/bin/bash
cd /Users/eneskotay/Development/Otizm/frontend/src/pages

# 1. AdminDashboard.tsx
cp DashboardPage.tsx AdminDashboard.tsx
sed -i '' 's/export function DashboardPage/export function AdminDashboard/g' AdminDashboard.tsx
# Remove lines 889 to 2497, keeping the last bracket on 2498 (Wait, 2498 is '}', 2499 is empty)
sed -i '' '889,2497d' AdminDashboard.tsx
# Remove line 718 (if (user?.role === 'ADMIN') {)
sed -i '' '718d' AdminDashboard.tsx

# 2. ExpertDashboard.tsx
cp DashboardPage.tsx ExpertDashboard.tsx
sed -i '' 's/export function DashboardPage/export function ExpertDashboard/g' ExpertDashboard.tsx
# Remove PARENT (1659-2497)
sed -i '' '1659,2497d' ExpertDashboard.tsx
# Remove ADMIN (718-890)
sed -i '' '718,890d' ExpertDashboard.tsx
# Now the 'if (user?.role === EXPERT)' line has shifted up by 173 lines (890 - 718 + 1).
# 891 - 173 = 718. So line 718 is now the 'if' statement for EXPERT.
# Let's just use sed to remove that line and the last closing brace before the final brace.
# Actually, a simpler way is to just leave the if statements in!
# If we leave `if (user?.role === 'EXPERT')` in, it will still work perfectly because `user.role` IS Expert when this component is rendered.
# But then it might return `undefined` if we delete the PARENT code which was the fallback!
# Wait, if we delete PARENT code, and `user.role` is EXPERT, the EXPERT block returns early. So the rest of the function doesn't matter!
# We just need to replace the PARENT code with a dummy return for safety, or just remove the if statement.
