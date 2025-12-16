# Smartboard Teaching Assistant - TODO List

## High Priority Issues

### Text Task Display Sizing
**Status:** Not Working
**Problem:** Short text strings (e.g., "2+2=?") appear tiny in the task display area despite CSS clamp() attempts.

**What's Been Tried:**
- CSS `clamp(32px, 8vw, 120px)` - text still tiny
- CSS `clamp(48px, 20vw, 240px)` - still not working

**Next Steps to Try:**
1. Use container-based sizing with CSS Container Queries (`cqw` units)
2. Implement JavaScript-based dynamic font calculation:
   - Measure container width
   - Measure text length
   - Calculate optimal font size to fill available space
3. Use `vmin` or `vmax` units instead of `vw`
4. Apply `font-size` directly to the container with different units

**File Location:** `styles.css` line 457-472 (`.task-text-display`)
**Related File:** `js/app.js` - `displayTaskText()` method

---

## Feature Requests

_(Add any future feature requests here)_

---

## Known Bugs

### Context Menu - Mouse Long-Click Not Working
**Status:** Partial - Works on smartboard/touch, not working with mouse long-click
**Problem:** Student roster context menu (long-press feature) works perfectly on smartboard/touchscreen but does not trigger with a long mouse click.

**What Works:**
- ✅ Long-press on touchscreen/smartboard (800ms hold)
- ✅ Context menu display and interaction
- ✅ All three menu options (Absent, Forgot Instrument, Earned Stool)
- ✅ Visual indicators (❌ ⭐) appear correctly
- ✅ Data saves to results.csv

**What Doesn't Work:**
- ❌ Long-click with regular mouse (holding mouse button down for 800ms)

**File Location:** `js/app.js` lines 649-698 (student button event handlers)
**Related:** Context menu implementation starting at line 788

---

## Completed Items

- ✅ Implement grade-based folder structure for tasks
- ✅ Add fullscreen mode for 16:9 displays
- ✅ Create side-by-side layout (task left, response right)
- ✅ Support for `artifact_1_question_type` (picture vs string)
- ✅ Support for `artifact_1_input_type` (multiple_choice, free_type)
- ✅ Multiple choice button spawning with variable options
- ✅ Free-type keyboard capture
- ✅ Auto-save functionality with File System Access API
