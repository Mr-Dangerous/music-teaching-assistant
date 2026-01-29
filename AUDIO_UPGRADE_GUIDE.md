# Audio System Upgrade Guide

## What Changed?

The `AudioPlayer.js` has been upgraded from basic Web Audio API oscillators (synthetic beeps) to **Tone.js with real instrument samples**.

## Key Improvements

### Before
- ❌ Synthetic sine/triangle wave sounds
- ❌ No instrument variety
- ❌ Sounded like old computer beeps

### After
- ✅ Real recorded instrument samples
- ✅ 10 professional-quality instruments
- ✅ Automatic fallback to oscillators if loading fails
- ✅ **100% backward compatible** with existing modules

## Available Instruments

1. **Piano** - Acoustic grand piano (default)
2. **Violin** - String instrument
3. **Flute** - Woodwind instrument
4. **Cello** - Deep string instrument
5. **Saxophone** - Jazz/classical wind instrument
6. **Trumpet** - Brass instrument
7. **Trombone** - Low brass instrument
8. **Guitar** - Acoustic guitar
9. **Xylophone** - Percussion/mallet instrument
10. **Harp** - String/plucked instrument

## Testing the New Audio

1. Open `modules/audio_test.html` in your browser
2. Try different instruments from the dropdown
3. Play individual notes or test melodies
4. Listen to the difference!

## Backward Compatibility

**All existing modules work without changes!** The new AudioPlayer maintains the same API:

```javascript
// Your existing code still works:
const audioPlayer = new AudioPlayer();
audioPlayer.playComposition(composition, tempo, noteFrequencies);
audioPlayer.playNote(frequency, startTime, duration);
audioPlayer.stop();
```

## Using Different Instruments

### In Existing Modules

To change the instrument in modules like `pentatonic_composer.html`:

```javascript
// OLD (line 386):
const audioPlayer = new AudioPlayer();

// NEW - specify instrument:
const audioPlayer = new AudioPlayer('violin');  // or 'flute', 'piano', etc.
```

### Changing Instruments Dynamically

```javascript
// Switch to a different instrument at runtime:
await audioPlayer.setInstrument('saxophone');
```

### Adding Instrument Selection UI

You can add a dropdown to let users choose instruments:

```html
<select id="instrumentSelect" onchange="changeInstrument(this.value)">
    <option value="piano">Piano</option>
    <option value="violin">Violin</option>
    <option value="flute">Flute</option>
    <!-- etc. -->
</select>

<script>
async function changeInstrument(instrument) {
    await audioPlayer.setInstrument(instrument);
}
</script>
```

## How It Works

1. **Loads Tone.js from CDN** - No local files needed
2. **Downloads instrument samples** - From tonejs-instruments hosted library
3. **Converts frequencies to note names** - Your existing frequency-based code works
4. **Falls back gracefully** - If Tone.js fails, uses original oscillator method

## Modules That Use Audio

These modules will automatically benefit from the upgrade:

- ✅ `pentatonic_composer.html`
- ✅ `so_la_mi_trainer.html`
- ✅ `rhythm_dictation_trainer.html`
- ✅ Any other module using `AudioPlayer.js`

**Note:** The first time a student opens a module, there may be a ~1-2 second delay while the instrument samples download. After that, they're cached by the browser.

## Troubleshooting

### "Still hearing beeps instead of real instruments"

- Check the browser console for errors
- Make sure you have internet connection (samples load from CDN)
- The system may be in fallback mode - look for console warnings

### "Audio not playing at all"

- Modern browsers require user interaction before audio can play
- Make sure the first audio plays in response to a button click
- Check that Tone.js loaded successfully (console logs will show this)

### "Want to use offline?"

For offline use, you would need to:
1. Download Tone.js locally
2. Download the instrument samples you want
3. Update the baseUrl in AudioPlayer.js

## Future Enhancements

Possible additions:
- More instruments (bassoon, clarinet, french horn, etc.)
- Volume control
- Reverb/effects
- Custom soundfonts
- MIDI file playback

## Technical Details

**Library:** Tone.js v14.8.49
**Sample Source:** tonejs-instruments (nbrosowsky)
**Hosting:** CDN (jsDelivr for Tone.js, GitHub Pages for samples)
**Format:** MP3 samples
**License:** MIT (both Tone.js and tonejs-instruments)

## Questions?

- Tone.js Documentation: https://tonejs.github.io/
- tonejs-instruments: https://github.com/nbrosowsky/tonejs-instruments
- Test page: `modules/audio_test.html`
