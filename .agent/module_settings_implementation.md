# Module Settings Persistence Implementation Summary

## Overview
Successfully implemented a system for modules to remember their settings across different students during a session.

## What Was Changed

### 1. Main App (`js/app.js`)
- Added `this.moduleSettings = {}` to store settings per module path
- Updated message listener to handle `taskmodule:settings` messages
- Added three new methods:
  - `handleModuleResponse()` - Processes module responses
  - `handleModuleSettings()` - Saves module settings
  - `getModuleSettings()` - Retrieves saved settings

### 2. Module Loader (`js/module-loader.js`)
- Modified `loadModule()` to retrieve saved settings
- Updated the `taskmodule:init` message to include `savedSettings` parameter

### 3. Example Module (`modules/so_la_mi_trainer.html`)
- Updated `TaskModule.init()` to accept `savedSettings` parameter
- Modified init to restore settings if provided (and not in practice mode)
- Added `saveSettings()` function to send settings to parent
- Updated setting change functions to call `saveSettings()`:
  - `saveFirstNote()` - saves when first note setting changes
  - `toggleNoteCount()` - saves when note count changes

## How It Works

1. **When a student starts a module:**
   - Module loader checks if settings exist for that module path
   - Passes saved settings in the `taskmodule:init` message
   - Module.init() restores the settings

2. **When settings change:**
   - Module calls `saveSettings()`
   - Sends `taskmodule:settings` message to parent with current settings
   - Parent app stores settings in `this.moduleSettings[modulePath]`

3. **Next student:**
   - When next student loads the same module, they get the same settings
   - Practice mode always gets default settings (no saved settings passed)

## Configuration for Each Module

### Settings to Save
Modules should save settings that affect quiz/activity configuration:
- `so_la_mi_trainer`: firstNote, numberOfNotes
- `interval_trainer`: (future) interval range, auto-advance setting
- Other modules: any user-configurable settings

### Settings NOT to Save
- Student responses/answers
- Visual preferences (these can vary per student)
- Temporary UI states

## Updating Other Modules

To add settings persistence to a module:

1. **Update TaskModule.init():**
```javascript
init(context, savedSettings) {
    this.context = context;
    
    // Restore settings (except in practice mode)
    if (savedSettings && context.studentId !== 'practice') {
        if (savedSettings.settingName !== undefined) {
            settingName = savedSettings.settingName;
        }
    }
}
```

2. **Add saveSettings() function:**
```javascript
function saveSettings() {
    const settings = {
        settingName: settingName,
        anotherSetting: anotherSetting
    };
    
    const modulePath = window.location.pathname.split('/').pop();
    
    window.parent.postMessage({
        type: 'taskmodule:settings',
        modulePath: modulePath,
        settings: settings
    }, '*');
}
```

3. **Call saveSettings() when settings change:**
```javascript
function updateSetting() {
    // ... update logic ...
    saveSettings();  // Add this line
}
```

## Benefits

- **Consistency:** All students in a class session get the same activity configuration
- **Efficiency:** Teacher sets preferences once, applies to all students
- **Flexibility:** Practice mode always uses defaults for testing
- **Session-based:** Settings clear when page reloads (no persistent storage clutter)

## Testing

Test cases:
1. ✓ Change setting → Next student has same setting
2. ✓ Practice mode → Uses default settings
3. ✓ Page reload → Settings reset to defaults
4. ✓ Different modules → Settings are per-module (not shared)

