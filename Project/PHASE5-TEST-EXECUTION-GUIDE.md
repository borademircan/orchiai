# Phase 5.1 Test Execution Guide
## Step-by-Step Testing Instructions

**Date**: 2025-01-27  
**Phase**: 5.1 Frontend Foundation  
**Estimated Time**: 60-90 minutes

---

## Overview

This guide provides step-by-step instructions to execute all tests for Phase 5.1. Follow these steps in order.

**Test Types:**
1. ✅ Automated Tests (5 minutes)
2. ✅ Manual Technical Tests (20 minutes)
3. ✅ User Acceptance Tests (30-45 minutes)
4. ✅ Documentation (10 minutes)

---

## Prerequisites Check

### Step 0: Verify Environment

Before starting, ensure you have:

- [x] Terminal/Command line access
- [x] Modern web browser (Chrome/Edge recommended)
- [x] Node.js 20+ installed
- [ ] Backend code available
- [ ] Frontend code available

**Quick Check:**
```bash
cd /var/www/www.orchiai.com
node --version  # Should show v20.x or higher
npm --version   # Should show v10.x or higher
```

---

## PART 1: Automated Tests (5 minutes)

### Step 1: Start Backend Server

**Purpose**: Backend must be running for connectivity tests.

**Action:**
```bash
cd /var/www/www.orchiai.com
npm run backend:dev
```

**Expected Result:**
- Server starts on `http://localhost:3001`
- You see: "Server running on port 3001"
- No errors in terminal

**✅ Checkpoint**: Backend server is running

**Note**: Keep this terminal open. Server should keep running.

---

### Step 2: Run Automated Test Script

**Purpose**: Verify project structure, dependencies, and build.

**Action:**
```bash
# Open a NEW terminal window/tab
cd /var/www/www.orchiai.com
./scripts/test-frontend-phase5-1.sh
```

**Expected Result:**
```
==========================================
Orchi AI - Phase 5.1 Frontend Foundation Test
==========================================

=== Test Suite 1: Next.js Setup ===
  [1] Testing: Project structure ... PASS
  [2] Testing: Dependencies installed ... PASS/WARN
  [3] Testing: TypeScript configuration ... PASS
  [4] Testing: Build compilation ... PASS

=== Test Suite 2: File Structure ===
  [5] Testing: API client exists ... PASS
  [6] Testing: Layout components exist ... PASS
  [7] Testing: Dashboard page exists ... PASS
  [8] Testing: React Query providers exist ... PASS

=== Test Suite 3: Backend Connectivity ===
  [9] Testing: Backend server running ... PASS
  [10] Testing: API endpoint accessible ... PASS

=== Test Suite 4: Dependencies Check ===
  [11-16] All dependencies ... PASS

Test Summary
Total Tests: 16
Passed: 15-16
Failed: 0
Warnings: 0-1

All critical tests passed!
```

**✅ Checkpoint**: Automated tests pass (15-16/16)

**If Tests Fail:**
- Check error messages
- Verify backend is running
- Run `cd packages/frontend && npm install` if dependencies missing
- Fix issues before proceeding

---

## PART 2: Manual Technical Tests (20 minutes)

### Step 3: Start Frontend Development Server

**Purpose**: Start frontend for manual testing.

**Action:**
```bash
# In a NEW terminal window/tab
cd /var/www/www.orchiai.com
npm run frontend:dev
```

**Expected Result:**
- Server starts on `http://localhost:3000`
- You see: "Ready in X seconds"
- No errors in terminal

**✅ Checkpoint**: Frontend server is running

**Note**: Keep this terminal open. Server should keep running.

---

### Step 4: Open Browser and DevTools

**Purpose**: Prepare browser for testing.

**Action:**
1. Open your web browser (Chrome/Edge recommended)
2. Press **F12** (or **Ctrl+Shift+I** / **Cmd+Option+I** on Mac) to open DevTools
3. Arrange DevTools:
   - **Console** tab (to see errors)
   - **Network** tab (to see API calls)
   - **Elements** tab (to inspect HTML)

**Expected Result:**
- Browser opens
- DevTools visible
- Console tab shows no errors (yet)

**✅ Checkpoint**: Browser and DevTools ready

---

### Step 5: Test Initial Page Load

**Purpose**: Verify page loads and redirects correctly.

**Action:**
1. Navigate to: `http://localhost:3000`
2. Observe what happens
3. Check the URL in address bar
4. Check Console tab for errors

**Expected Result:**
- ✅ Page automatically redirects to `/admin`
- ✅ URL changes to `http://localhost:3000/admin`
- ✅ Dashboard page loads
- ✅ No errors in Console tab
- ✅ Page loads within 2-3 seconds

**✅ Checkpoint**: Initial page load works

**If Issues:**
- Check Console for errors
- Verify frontend server is running
- Check Network tab for failed requests

---

### Step 6: Test Layout Components

**Purpose**: Verify sidebar, header, and layout render correctly.

**Action:**
1. On the Dashboard page, observe:
   - **Left Side**: Sidebar with navigation items
   - **Top**: Header bar
   - **Center**: Dashboard content area

2. Check sidebar navigation items:
   - Dashboard
   - Agents
   - Models
   - Tools
   - Triggers
   - Connections
   - Memory
   - Test Console

3. Verify:
   - Icons display next to each menu item
   - "Dashboard" item is highlighted (blue background)
   - Layout looks balanced and professional

**Expected Result:**
- ✅ Sidebar visible on left (~256px wide)
- ✅ Header visible at top
- ✅ All navigation items visible with icons
- ✅ Active item (Dashboard) highlighted
- ✅ Layout looks professional

**✅ Checkpoint**: Layout components render correctly

---

### Step 7: Test Navigation

**Purpose**: Verify navigation between pages works.

**Action:**
1. Click "Agents" in sidebar
2. Observe URL and page
3. Click "Models" in sidebar
4. Click "Tools"
5. Click "Triggers"
6. Click "Connections"
7. Click "Memory"
8. Click "Test Console"
9. Click "Dashboard" to return

**Expected Result:**
- ✅ Each click changes URL (e.g., `/admin/agents`)
- ✅ Active menu item highlights (blue background)
- ✅ Page transitions smoothly
- ✅ No page reload errors
- ✅ Browser back button works
- ✅ Browser forward button works

**Note**: Most pages will show 404 (Not Found) - this is **EXPECTED** as they're not built yet. The important thing is that navigation works.

**✅ Checkpoint**: Navigation works correctly

---

### Step 8: Test Dashboard Page

**Purpose**: Verify dashboard displays data and stats.

**Action:**
1. Navigate to Dashboard (`/admin`)
2. Observe the stats cards at the top:
   - Total Agents
   - Active Agents
   - Models
   - Tools
3. Check Network tab in DevTools:
   - Look for API call to `/api/v1/agents`
   - Check response status (should be 200)
   - Check response time
4. Verify:
   - Stats cards display with icons
   - Numbers show (or 0 if no data)
   - Layout is clean and organized

**Expected Result:**
- ✅ Dashboard page displays
- ✅ 4 stats cards visible
- ✅ Icons display in cards
- ✅ API call made to backend
- ✅ Data displays (or shows 0 if no agents)
- ✅ No errors in Console

**✅ Checkpoint**: Dashboard displays correctly

**If No Data Shows:**
- Check Network tab - is API call successful?
- Check Console for errors
- Verify backend has data (can test with: `curl http://localhost:3001/api/v1/agents`)

---

### Step 9: Test API Integration

**Purpose**: Verify frontend connects to backend API.

**Action:**
1. Open Network tab in DevTools
2. Refresh Dashboard page (F5)
3. Look for network requests:
   - Find request to `/api/v1/agents`
   - Click on it to see details
4. Check:
   - **Status**: Should be 200 (OK)
   - **Response**: Should show JSON data
   - **Time**: Should be < 1 second
5. Check Console tab for any errors

**Expected Result:**
- ✅ API call visible in Network tab
- ✅ Status code is 200
- ✅ Response contains JSON data
- ✅ Response time acceptable (< 1 second)
- ✅ No CORS errors
- ✅ No console errors

**✅ Checkpoint**: API integration works

**If API Fails:**
- Check backend is running
- Check URL is correct (`http://localhost:3001`)
- Check CORS settings (if error mentions CORS)

---

### Step 10: Test Responsive Design

**Purpose**: Verify layout adapts to different screen sizes.

**Action:**

**Desktop Test:**
1. Make browser window full screen (1920x1080 or similar)
2. Observe layout
3. Verify sidebar and content area are balanced

**Tablet Test:**
1. Press **Ctrl+Shift+M** (Windows) or **Cmd+Shift+M** (Mac) to toggle device emulation
2. Select "iPad" or set to 768x1024
3. Observe layout changes
4. Check stats cards (should be 2 columns)

**Mobile Test:**
1. In device emulation, select "iPhone" or set to 375x667
2. Observe layout changes
3. Check stats cards (should be 1 column, stacked)
4. Test navigation (sidebar may be hidden/collapsible)

**Expected Result:**
- ✅ Desktop: Layout balanced, 4-column grid
- ✅ Tablet: Layout adapts, 2-column grid
- ✅ Mobile: Layout adapts, 1-column stack
- ✅ No horizontal scrolling
- ✅ Text remains readable
- ✅ Navigation accessible

**✅ Checkpoint**: Responsive design works

---

### Step 11: Test Error Handling

**Purpose**: Verify interface handles errors gracefully.

**Action:**
1. **Stop backend server** (go to backend terminal, press Ctrl+C)
2. Refresh Dashboard page (F5)
3. Observe:
   - Does page still load?
   - Are there error messages?
   - Check Console for errors
   - Check Network tab for failed requests
4. **Restart backend server** (run `npm run backend:dev` again)
5. Refresh Dashboard page
6. Verify data loads again

**Expected Result:**
- ✅ Page still loads when backend down
- ✅ Error handled gracefully (no crash)
- ✅ Console shows informative errors (for developers)
- ✅ Page recovers when backend restarts
- ✅ Data loads again after restart

**✅ Checkpoint**: Error handling works

---

## PART 3: User Acceptance Tests (30-45 minutes)

### Step 12: First-Time User Experience

**Purpose**: Test experience from a new user's perspective.

**Action:**
1. Close browser completely
2. Open browser in **Incognito/Private mode** (fresh session)
3. Navigate to `http://localhost:3000`
4. **Observe as if you're seeing it for the first time:**
   - How long does it take to load?
   - Is the layout clear?
   - Can you understand what this is?
   - Does it look professional?

**Questions to Answer:**
- [ ] Is the initial load time acceptable? (Yes/No)
- [ ] Is the layout clear and intuitive? (Yes/No)
- [ ] Does the design look professional? (Yes/No)
- [ ] Can you identify this is an admin dashboard? (Yes/No)

**✅ Checkpoint**: First impression is positive

---

### Step 13: Visual Design Review

**Purpose**: Evaluate visual design and aesthetics.

**Action:**
1. Navigate to Dashboard
2. **Observe and evaluate:**
   - Color scheme (professional? pleasant?)
   - Typography (readable? well-sized?)
   - Spacing and padding (balanced?)
   - Icons (clear? appropriate?)
   - Overall visual hierarchy

**Questions to Answer:**
- [ ] Does the design look professional? (Yes/No)
- [ ] Are colors pleasant and not overwhelming? (Yes/No)
- [ ] Is text easy to read? (Yes/No)
- [ ] Are icons helpful and clear? (Yes/No)
- [ ] Does it match your expectations? (Yes/No)

**✅ Checkpoint**: Visual design is acceptable

---

### Step 14: Usability Testing

**Purpose**: Test if the interface is easy to use.

**Action:**
1. **Navigation Test:**
   - Can you easily find different sections?
   - Is the active page clearly indicated?
   - Are navigation transitions smooth?

2. **Information Test:**
   - Can you understand what each section is for?
   - Are labels clear?
   - Is information organized well?

3. **Interaction Test:**
   - Are buttons/links easy to click?
   - Do hover states work?
   - Is feedback clear?

**Questions to Answer:**
- [ ] Is navigation intuitive? (Yes/No)
- [ ] Can you easily find what you need? (Yes/No)
- [ ] Are interactions smooth? (Yes/No)
- [ ] Is the interface easy to use? (Yes/No)

**✅ Checkpoint**: Interface is usable

---

### Step 15: Browser Compatibility

**Purpose**: Test in different browsers.

**Action:**
1. **Test in Chrome/Edge** (if not already)
2. **Test in Firefox:**
   - Open Firefox
   - Navigate to `http://localhost:3000`
   - Compare appearance and functionality
3. **Test in Safari** (if available):
   - Open Safari
   - Navigate to `http://localhost:3000`
   - Compare appearance and functionality

**Questions to Answer:**
- [ ] Does it work the same in all browsers? (Yes/No)
- [ ] Are there any browser-specific issues? (Yes/No)
- [ ] Which browser do you prefer? (Chrome/Firefox/Safari)

**✅ Checkpoint**: Works in major browsers

---

### Step 16: Accessibility Testing

**Purpose**: Test basic accessibility features.

**Action:**
1. **Keyboard Navigation:**
   - Press **Tab** key repeatedly
   - Observe focus indicators (outline around elements)
   - Press **Enter** or **Space** to activate
   - Try navigating with keyboard only

2. **Visual Checks:**
   - Is text readable?
   - Is color contrast adequate?
   - Are focus indicators visible?

**Questions to Answer:**
- [ ] Can you navigate with keyboard only? (Yes/No)
- [ ] Are focus indicators clear? (Yes/No)
- [ ] Is text readable? (Yes/No)
- [ ] Are colors distinguishable? (Yes/No)

**✅ Checkpoint**: Basic accessibility works

---

## PART 4: Documentation (10 minutes)

### Step 17: Document Test Results

**Purpose**: Record test results and findings.

**Action:**
1. Open: `Project/PHASE5-FRONTEND-TEST-RESULTS.md`
2. Update the test results section
3. Document:
   - Which tests passed
   - Which tests failed
   - Any issues found
   - User feedback

**Template:**
```markdown
## Test Execution Summary

**Date**: [Today's Date]
**Tester**: [Your Name]
**Environment**: Development

### Results Summary

| Test Suite | Status | Notes |
|------------|--------|-------|
| Automated Tests | ✅ Pass | 15/16 passed |
| Initial Page Load | ✅ Pass | Works correctly |
| Layout Components | ✅ Pass | All render correctly |
| Navigation | ✅ Pass | All links work |
| Dashboard | ✅ Pass | Data displays |
| API Integration | ✅ Pass | Connects to backend |
| Responsive Design | ✅ Pass | Works on all sizes |
| Error Handling | ✅ Pass | Handles errors gracefully |
| Visual Design | ✅ Pass | Professional appearance |
| Browser Compatibility | ✅ Pass | Works in Chrome/Firefox |
| Accessibility | ✅ Pass | Keyboard navigation works |

### Issues Found

[Document any issues here]

### User Feedback

[Document user feedback here]
```

**✅ Checkpoint**: Test results documented

---

### Step 18: Create Test Report

**Purpose**: Create a summary test report.

**Action:**
1. Review all test results
2. Create summary:
   - Total tests executed
   - Pass/fail counts
   - Critical issues
   - Recommendations

**Report Template:**
```markdown
# Phase 5.1 Test Execution Report

**Date**: [Date]
**Tester**: [Name]

## Summary
- Total Tests: X
- Passed: X
- Failed: X
- Warnings: X

## Status: ✅ PASS / ❌ FAIL

## Critical Issues
[None / List issues]

## Recommendations
[Next steps]
```

**✅ Checkpoint**: Test report created

---

## Final Checklist

Before considering testing complete, verify:

- [ ] All automated tests passed
- [ ] All manual technical tests completed
- [ ] All user acceptance tests completed
- [ ] Test results documented
- [ ] Issues documented (if any)
- [ ] Test report created
- [ ] Ready to proceed to Phase 5.2

---

## Troubleshooting

### Common Issues

**Issue**: Backend server won't start
- **Solution**: Check if port 3001 is already in use
- **Command**: `lsof -i :3001` (Linux/Mac) or `netstat -ano | findstr :3001` (Windows)

**Issue**: Frontend server won't start
- **Solution**: Check if port 3000 is already in use
- **Command**: `lsof -i :3000` (Linux/Mac) or `netstat -ano | findstr :3000` (Windows)

**Issue**: API calls fail with CORS error
- **Solution**: Check backend CORS configuration
- **Check**: Backend should allow `http://localhost:3000`

**Issue**: Page shows 404 for navigation links
- **Solution**: This is **EXPECTED** - pages not built yet in Phase 5.1
- **Note**: Navigation should still work, just pages don't exist yet

**Issue**: No data shows on dashboard
- **Solution**: Check backend has data
- **Test**: `curl http://localhost:3001/api/v1/agents`

---

## Quick Reference

### Test URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Dashboard: http://localhost:3000/admin

### Commands
```bash
# Start backend
npm run backend:dev

# Start frontend
npm run frontend:dev

# Run automated tests
./scripts/test-frontend-phase5-1.sh

# Check backend health
curl http://localhost:3001/health
```

### Browser Shortcuts
- **F12**: Open DevTools
- **Ctrl+Shift+M**: Toggle device emulation
- **F5**: Refresh page
- **Tab**: Navigate with keyboard

---

## Next Steps

After completing all tests:

1. **Review Test Results**: Go through all findings
2. **Fix Critical Issues**: Address any failures
3. **Document Findings**: Update test reports
4. **Proceed to Phase 5.2**: Start building individual admin pages

---

**Test Execution Guide Status**: ✅ **Ready for Use**  
**Estimated Total Time**: 60-90 minutes  
**Last Updated**: 2025-01-27

