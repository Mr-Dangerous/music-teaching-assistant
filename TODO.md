# TODO List

## Boomwhacker Song Save/Load Feature

### Status: NOT WORKING
- **UI**: ✅ Buttons correctly positioned in header (inline with Assign buttons)
- **Message Flow**: ✅ Complete message chain working (module ↔ parent)
- **Save Functionality**: ❌ NOT WORKING - needs investigation

### What Works:
1. Save button prompts for song name
2. Message chain confirmed via console logs:
   - `[MODULE saveSong]` - Button clicked
   - `[PARENT] Received requestSongName` - Parent receives request
   - `[PARENT] User entered song name` - Name entered
   - `[PARENT] Sent songName back to module` - Name sent back
   - `[MODULE saveSongWithName]` - Module receives name
   - `[PARENT] Received saveBoomwhackerSong` - Parent receives save request
   - `[saveBoomwhackerSong]` - Save function called

### What Doesn't Work:
- File is not actually being saved to `data/boomwhacker_songs.csv`
- No error shown, no success notification
- Likely issue: `fileManager.saveFileToFolder()` may not have permission or may not work for dynamically created files

### Next Steps to Debug:
1. Check if `fileManager.saveFileToFolder()` is actually being called (add more logging)
2. Check if method returns error (try/catch may be swallowing it)
3. May need to use different approach:
   - Download file and ask user to manually place it in data folder
   - Use a different file API
   - Store in localStorage as fallback

### Related Files:
- `modules/boomwhacker_assigner.html` - Module with save/load UI
- `js/app.js` - Parent message handlers and `saveBoomwhackerSong()` method
- `js/file-manager.js` - File system API wrapper

### Version History:
- v1.1.0: Initial implementation
- v1.1.6: Moved buttons to header
- v1.1.7: Fixed to use `saveFileToFolder()` instead of non-existent `writeFile()`
- v1.1.8: Re-added missing message handlers, added trace logging
