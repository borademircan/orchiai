# Phase 5: Manual UI/UX Testing Guide

**Date**: 2025-01-27  
**Status**: 🧪 **Ready for Manual Testing**  
**Automated Testing Complete**: 50.9% (115/226 tests)  
**Manual Testing Required**: 49.1% (111/226 tests)

---

## Overview

This guide provides step-by-step instructions for completing the remaining manual UI/UX tests. Automated testing has verified visual design, navigation, responsive layout, and form structures. Manual testing is needed for form submissions, interactions, accessibility, and cross-browser compatibility.

---

## Pre-Testing Checklist

- [ ] Frontend running at `https://orchiai.com/admin`
- [ ] Backend API accessible
- [ ] Test data available (agents, models, tools, triggers)
- [ ] Browser DevTools open (F12)
- [ ] Network tab monitoring enabled

---

## Section 1: Form Submission Testing

### 1.1 Create Agent Form

**Test Steps:**
1. Navigate to `/admin/agents/new`
2. Fill in required fields:
   - Agent Name: "Test Agent Manual"
   - Instructions: "This is a test agent for manual testing"
3. Select a model from dropdown (if available)
4. Choose Memory Strategy: "Auto"
5. Set Memory Threshold: 1000
6. Check "Ask before saving memories"
7. Click "Create Agent"
8. Verify redirect to `/admin/agents`
9. Verify new agent appears in list

**Expected Results:**
- ✅ Form submits successfully
- ✅ Loading state shows during submission
- ✅ Redirects to agents list
- ✅ New agent visible in list
- ✅ Agent data matches form input

**Score**: ___/5

---

### 1.2 Edit Agent Form

**Test Steps:**
1. Navigate to `/admin/agents`
2. Click "Edit" icon on any agent
3. Verify form pre-fills with agent data
4. Change agent name
5. Update instructions
6. Change memory strategy
7. Click "Save Changes"
8. Verify redirect to agents list
9. Verify changes reflected in list

**Expected Results:**
- ✅ Form pre-fills correctly
- ✅ Changes save successfully
- ✅ Redirects after save
- ✅ Updated data visible in list

**Score**: ___/4

---

### 1.3 Delete Agent

**Test Steps:**
1. Navigate to `/admin/agents`
2. Click "Delete" icon on any agent
3. Verify confirmation modal appears
4. Click "Cancel" - verify modal closes, agent still exists
5. Click "Delete" icon again
6. Click "Delete" in confirmation modal
7. Verify agent removed from list

**Expected Results:**
- ✅ Confirmation modal appears
- ✅ Cancel works correctly
- ✅ Delete removes agent
- ✅ Loading state during deletion

**Score**: ___/4

---

### 1.4 Activate/Deactivate Agent

**Test Steps:**
1. Navigate to `/admin/agents`
2. Find an active agent
3. Click "Deactivate" icon (PowerOff)
4. Verify status changes to "Inactive"
5. Click "Activate" icon (Power)
6. Verify status changes to "Active"

**Expected Results:**
- ✅ Status toggles immediately
- ✅ Visual indicator updates
- ✅ No page refresh needed

**Score**: ___/3

---

### 1.5 Create Model Form

**Test Steps:**
1. Navigate to `/admin/models/new`
2. Fill in required fields:
   - Model Name: "Test Model"
   - Provider: "OpenAI"
   - Model ID: "gpt-4"
3. Adjust temperature slider (0.0 to 2.0)
4. Verify label updates: "Temperature: X.X"
5. Set Max Tokens: 4000
6. Select provider connection (if available)
7. Check "Model is active"
8. Click "Create Model"
9. Verify redirect and new model appears

**Expected Results:**
- ✅ Temperature slider updates label in real-time
- ✅ Form submits successfully
- ✅ All fields save correctly

**Score**: ___/4

---

### 1.6 Create Tool Form with JSON Validation

**Test Steps:**
1. Navigate to `/admin/tools/new`
2. Fill in required fields:
   - Tool Name: "Test Tool"
   - Description: "Test description"
   - Tool Type: "Custom"
   - HTTP Method: "POST"
3. Enter **invalid JSON** in Schema field:
   ```
   {
     "type": "object",
     "properties": {
       "name": "string"
     }
   ```
   (missing closing brace)
4. Click "Create Tool"
5. Verify error message appears: "Invalid JSON schema"
6. Fix JSON (add closing brace)
7. Verify error disappears
8. Click "Create Tool"
9. Verify tool created successfully

**Expected Results:**
- ✅ Invalid JSON shows error
- ✅ Error clears when fixed
- ✅ Valid JSON submits successfully

**Score**: ___/3

---

### 1.7 Create Trigger with Dynamic Forms

**Test Steps:**
1. Navigate to `/admin/triggers/new`
2. Fill in:
   - Trigger Name: "Test Chat Trigger"
   - Trigger Type: "Chat"
3. Verify "Chat Route" field appears
4. Enter route: "/test-chat"
5. Change Trigger Type to "Webhook"
6. Verify "Chat Route" disappears
7. Verify "Webhook URL" and "Secret Token" fields appear
8. Enter webhook URL: "https://example.com/webhook"
9. Change Trigger Type to "Scheduled"
10. Verify "Cron Expression" field appears
11. Enter cron: "0 0 * * *"
12. Select an agent
13. Click "Create Trigger"
14. Verify trigger created

**Expected Results:**
- ✅ Form fields change based on trigger type
- ✅ Only relevant fields visible
- ✅ All trigger types work correctly

**Score**: ___/4

---

## Section 2: Filter and Search Testing

### 2.1 Agents List Filters

**Test Steps:**
1. Navigate to `/admin/agents`
2. Use search box: Type "test"
3. Verify list filters in real-time
4. Clear search
5. Click status filter dropdown
6. Select "Active Only"
7. Verify only active agents shown
8. Select "Inactive Only"
9. Verify only inactive agents shown
10. Select "All Status"
11. Verify all agents shown

**Expected Results:**
- ✅ Search filters in real-time
- ✅ Status filter works correctly
- ✅ Filter combinations work

**Score**: ___/3

---

### 2.2 Models List Filters

**Test Steps:**
1. Navigate to `/admin/models`
2. Test provider filter (OpenAI, Anthropic, Google, Custom)
3. Test status filter (Active Only, Inactive Only)
4. Test search functionality
5. Test filter combinations

**Expected Results:**
- ✅ All filters work correctly
- ✅ Filters can be combined

**Score**: ___/3

---

### 2.3 Tools List Filters

**Test Steps:**
1. Navigate to `/admin/tools`
2. Test type filter (Seedream, Veo, CRM, Email, Social, Webhook, Custom)
3. Test status filter
4. Test search functionality

**Expected Results:**
- ✅ All filters work correctly

**Score**: ___/3

---

### 2.4 Triggers List Filters

**Test Steps:**
1. Navigate to `/admin/triggers`
2. Test type filter (Chat, Webhook, Scheduled)
3. Test status filter (Enabled, Disabled)
4. Test search functionality

**Expected Results:**
- ✅ All filters work correctly

**Score**: ___/3

---

### 2.5 Memory Inspector Filters

**Test Steps:**
1. Navigate to `/admin/memory`
2. Test agent filter
3. Test type filter (Short Term, Long Term, Summary)
4. Test "Show Expired" checkbox
5. Test search functionality

**Expected Results:**
- ✅ All filters work correctly
- ✅ Expired memories toggle works

**Score**: ___/4

---

## Section 3: Test Console

### 3.1 Execute Agent

**Test Steps:**
1. Navigate to `/admin/console`
2. Select an agent from dropdown
3. Enter message: "Hello, test message"
4. Leave Session ID empty (new session)
5. Click "Execute"
6. Verify loading state appears
7. Wait for response
8. Verify response displays
9. Verify execution time shown
10. Verify tool calls section (if any)
11. Verify consults section (if any)
12. Verify memory updates section (if any)
13. Verify debug info section

**Expected Results:**
- ✅ Agent executes successfully
- ✅ Response displays correctly
- ✅ All sections expand/collapse
- ✅ JSON formatting readable

**Score**: ___/5

---

### 3.2 Session Persistence

**Test Steps:**
1. Navigate to `/admin/console`
2. Select an agent
3. Enter message: "What is my name?"
4. Generate a session ID (e.g., "test-session-123")
5. Enter session ID
6. Click "Execute"
7. Wait for response
8. Enter another message: "What did I just ask?"
9. Use same session ID
10. Click "Execute"
11. Verify agent remembers previous conversation

**Expected Results:**
- ✅ Session ID maintains context
- ✅ Agent remembers previous messages

**Score**: ___/2

---

### 3.3 Error Handling

**Test Steps:**
1. Navigate to `/admin/console`
2. Select an agent without a model
3. Enter a message
4. Click "Execute"
5. Verify error message displays
6. Verify error styling (red background, icon)
7. Verify error message is clear

**Expected Results:**
- ✅ Error displays clearly
- ✅ Error styling is appropriate
- ✅ Error message is helpful

**Score**: ___/3

---

## Section 4: Accessibility Testing

### 4.1 Keyboard Navigation

**Test Steps:**
1. Open `/admin` in browser
2. Press `Tab` key repeatedly
3. Verify focus indicators visible
4. Verify logical tab order
5. Press `Enter` on focused buttons
6. Verify buttons activate
7. Press `Space` on focused buttons
8. Verify buttons activate
9. Press `Escape` on modals
10. Verify modals close
11. Navigate sidebar with arrow keys
12. Verify navigation works

**Expected Results:**
- ✅ All interactive elements focusable
- ✅ Focus indicators visible
- ✅ Tab order logical
- ✅ Keyboard shortcuts work

**Score**: ___/5

---

### 4.2 Screen Reader Testing

**Test Steps:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate through pages
3. Verify buttons have labels
4. Verify form inputs have labels
5. Verify error messages announced
6. Verify status changes announced
7. Verify table headers properly marked

**Expected Results:**
- ✅ Screen reader announces all elements
- ✅ Labels are descriptive
- ✅ Status changes announced

**Score**: ___/4

---

### 4.3 Color Contrast

**Test Steps:**
1. Use contrast checker tool (WebAIM)
2. Check text on background colors
3. Verify WCAG AA compliance (4.5:1 for normal text)
4. Verify WCAG AA compliance (3:1 for large text)
5. Check focus indicators
6. Check error messages

**Expected Results:**
- ✅ All text meets WCAG AA standards
- ✅ Focus indicators visible

**Score**: ___/3

---

## Section 5: Cross-Browser Testing

### 5.1 Chrome Testing

**Test Steps:**
1. Open `/admin` in Chrome
2. Test all major features
3. Verify no console errors
4. Verify layout correct
5. Verify interactions work

**Expected Results:**
- ✅ All features work
- ✅ No errors

**Score**: ___/3

---

### 5.2 Firefox Testing

**Test Steps:**
1. Open `/admin` in Firefox
2. Test all major features
3. Verify no console errors
4. Verify layout correct
5. Verify interactions work

**Expected Results:**
- ✅ All features work
- ✅ No errors

**Score**: ___/3

---

### 5.3 Safari Testing

**Test Steps:**
1. Open `/admin` in Safari
2. Test all major features
3. Verify no console errors
4. Verify layout correct
5. Verify interactions work

**Expected Results:**
- ✅ All features work
- ✅ No errors

**Score**: ___/3

---

### 5.4 Edge Testing

**Test Steps:**
1. Open `/admin` in Edge
2. Test all major features
3. Verify no console errors
4. Verify layout correct
5. Verify interactions work

**Expected Results:**
- ✅ All features work
- ✅ No errors

**Score**: ___/3

---

## Section 6: Performance Testing

### 6.1 Page Load Times

**Test Steps:**
1. Open DevTools Network tab
2. Navigate to `/admin`
3. Record load time
4. Navigate to `/admin/agents`
5. Record load time
6. Navigate to `/admin/models`
7. Record load time
8. Navigate to `/admin/tools`
9. Record load time

**Expected Results:**
- ✅ Dashboard loads < 3 seconds
- ✅ List pages load < 2 seconds
- ✅ Forms load instantly

**Score**: ___/3

---

### 6.2 API Response Times

**Test Steps:**
1. Open DevTools Network tab
2. Monitor API calls
3. Check response times
4. Verify no slow requests (> 2 seconds)

**Expected Results:**
- ✅ API responses < 1 second
- ✅ No slow requests

**Score**: ___/2

---

## Section 7: Edge Cases

### 7.1 Long Text

**Test Steps:**
1. Create agent with very long name (200+ characters)
2. Verify layout doesn't break
3. Create agent with very long instructions (5000+ characters)
4. Verify form handles correctly
5. Verify display doesn't break

**Expected Results:**
- ✅ Layout handles long text
- ✅ Text truncates or wraps appropriately

**Score**: ___/2

---

### 7.2 Special Characters

**Test Steps:**
1. Create agent with special characters: `!@#$%^&*()_+-=[]{}|;':",./<>?`
2. Verify saves correctly
3. Verify displays correctly
4. Test with emoji: 😀 🚀 ✅
5. Verify handles correctly

**Expected Results:**
- ✅ Special characters handled
- ✅ Emoji supported

**Score**: ___/2

---

### 7.3 Rapid Clicking

**Test Steps:**
1. Navigate to `/admin/agents`
2. Rapidly click "Create Agent" button multiple times
3. Verify only one form opens
4. Rapidly click "Delete" button multiple times
5. Verify only one confirmation modal opens
6. Rapidly click "Activate" button multiple times
7. Verify no duplicate actions

**Expected Results:**
- ✅ No duplicate actions
- ✅ Buttons disabled during operations

**Score**: ___/3

---

### 7.4 Browser Back/Forward

**Test Steps:**
1. Navigate: Dashboard → Agents → Create Agent
2. Click browser back button
3. Verify returns to agents list
4. Click browser forward button
5. Verify returns to create form
6. Verify form state maintained

**Expected Results:**
- ✅ Browser navigation works
- ✅ Form state maintained (if applicable)

**Score**: ___/2

---

## Section 8: Mobile Testing

### 8.1 Mobile Navigation

**Test Steps:**
1. Open `/admin` on mobile device (or resize browser to 375x667)
2. Verify hamburger menu appears
3. Click hamburger menu
4. Verify sidebar opens
5. Click overlay
6. Verify sidebar closes
7. Click close button
8. Verify sidebar closes
9. Navigate to different pages
10. Verify mobile menu works on all pages

**Expected Results:**
- ✅ Mobile menu works correctly
- ✅ Overlay closes menu
- ✅ Close button works

**Score**: ___/3

---

### 8.2 Mobile Forms

**Test Steps:**
1. Open `/admin/agents/new` on mobile
2. Verify form fits on screen
3. Verify inputs are tappable
4. Verify keyboard appears correctly
5. Fill and submit form
6. Verify works correctly

**Expected Results:**
- ✅ Forms usable on mobile
- ✅ Inputs properly sized
- ✅ Keyboard doesn't cover inputs

**Score**: ___/3

---

### 8.3 Mobile Tables

**Test Steps:**
1. Open `/admin/agents` on mobile
2. Verify table scrolls horizontally
3. Verify important columns visible
4. Verify actions accessible

**Expected Results:**
- ✅ Tables scrollable
- ✅ Important data visible

**Score**: ___/2

---

## Test Results Summary

### Section Scores

| Section | Score | Notes |
|---------|-------|-------|
| 1. Form Submission | ___/23 | |
| 2. Filter and Search | ___/16 | |
| 3. Test Console | ___/10 | |
| 4. Accessibility | ___/12 | |
| 5. Cross-Browser | ___/12 | |
| 6. Performance | ___/5 | |
| 7. Edge Cases | ___/9 | |
| 8. Mobile Testing | ___/8 | |

**Total Manual Test Score**: ___/95

---

## Combined Test Results

**Automated Tests**: 115/226 (50.9%)  
**Manual Tests**: ___/95 (___%)  
**Combined Total**: ___/226 (___%)

---

## Issues Found

Document any issues found during manual testing:

1. **Issue**: [Description]
   - **Severity**: [Critical/High/Medium/Low]
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]

---

## Recommendations

Based on manual testing results, provide recommendations for improvements:

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

---

**Testing Completed By**: _______________  
**Date**: _______________  
**Overall Assessment**: _______________

