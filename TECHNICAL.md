# AIRA Personality Switcher

A small, accessible, dependency-free HTML/JavaScript utility for **local full-ROM inspection** and **experimental personality restore-package preparation**. No firmware, personal backups, or calibration data are bundled. No server, telemetry, account, automatic USB writes, or remote firmware downloads.

This changes a stored Product value within the input firmware. It does **not** install a different version or add new DSP code.

## Open it

Keep `index.html`, `style.css`, `core.js`, and `app.js` together. Open `index.html` in a modern browser. If SHA-256 is unavailable in the local-file context, serve this folder on localhost (for example `python -m http.server 8765 --bind 127.0.0.1`) and visit `http://127.0.0.1:8765`. HTTPS static hosting such as GitHub Pages is also possible; ROM processing remains in the browser.

1. Select your own `AIRA_MODULAR_ROM.BIN` and its original `ROMINFO.TXT`.
2. Both files are checked automatically. Review the detected model; the optional Technical details section contains compatibility and SHA-256 information. The model selector appears only when validation passes.
3. Choose a different personality and acknowledge the risk.
4. Download and extract the ZIP **on the computer**, never directly on the updater drive.
5. Read `READ-ME-FIRST.txt`. Only the two files inside `install/` belong at the updater drive root. Keep `recovery/` and the archive off the device. Never stage both packages together.

The UI includes the observed manual restore workflow. It cannot confirm the connected device, cable state, successful eject, LEDs, power stability, or an actual flash. A generated ZIP is not a successful conversion.

## Compatibility: not universal

The inspector accepts arbitrary inputs within its file-size limit, identifies the known full-ROM container, validates record boundaries, compressed checksums, decompression, code fingerprints, and Product metadata. It does **not** depend on an individual owner's complete ROM hash. Different patch/configuration bytes outside code and Product metadata are preserved from the input.

Conversion is enabled only for:

- a 2 MiB full-ROM backup, not a vendor updater file or USERAREA backup;
- the validated boot and updater code fingerprints;
- application build 0491 or 0493's exact known decompressed fingerprint;
- original `ROMINFO.TXT` equal to `0000,0495,4096` followed by CRLF;
- exactly one complete Product record matching the validated layout anywhere in the two-sector Product span.

Build 0491 supports experimental package generation, not a claim of hardware validation. Its updater is byte-identical after decompression to the captured 0493 updater, and application bytes `[0xD7D6, 0xD8B0)` containing the Product getter/setter implementation are identical. Tests combine the exact official 0491 application record with a captured 0493 ROM **in memory only**: this synthetic fixture is not a real 0491 backup. Tests cover model conversion, exact reverse conversion, unchanged code, corruption rejection, and warning propagation. No 0491 hardware restore or backup capture has been verified. A build-specific warning is shown before download and included in the manifest and archive instructions. Firmware version and existing bugs are preserved.

Unknown builds, altered code, torn records, multiple-record histories, unusual metadata, and potential sequence wraparound are blocked. There is deliberately no force button. A version string alone is not sufficient.

All four personalities and a return to Scooper were observed on **one Scooper running 1.05 build 0493**. Other hardware units, including native Bitrazer/Demora/Torcido units, are not independently validated. A compatible-file result does not establish universal hardware safety.

## Risk and preservation

- The candidate changes exactly one byte: the Product value (1 Bitrazer, 2 Demora, 3 Torcido, 4 Scooper).
- The restore still erases/programs **496 sectors, including boot code**, covering `[0, 0x1F0000)`. The last 64 KiB of the physical device are not restored by this metadata.
- Power interruption can require hardware repair. A backup does not guarantee recovery if boot code is damaged.
- Use a fresh backup from the **same physical unit** only. Never apply someone else's full ROM. This utility does not verify hardware ownership or identity.
- Patches and calibration/configuration bytes in the input image are left unchanged. The restore reinstates the input snapshot within its range, not any newer device changes. This is not a promise that analog behavior is identical across personalities.
- The recovery folder holds the exact input image, not factory firmware. Restoration can overwrite more recent settings. The excluded final 64 KiB remain as they are on the device.
- This utility does **not** initialize model defaults. Initialize the chosen model in Customizer if required, then keep a separate fresh backup to preserve that initialized snapshot.
- Verify MIDI identity, full-ROM readback and low-volume audio behavior after any restore. LED patterns alone do not prove success.

The former `0320,0320,4096` Product-only approach is **not supported**: the ordinary updater validates a code signature at a nonzero restore start, so a Product-record-only range is rejected. Do not bypass those checks.

## Backup gesture observed on the test unit

With USB disconnected, hold GRF6 at power-on and release it. Press GRF5 ten times **before** connecting USB. The enumerated drive exposed `BACKUP/AIRA_MODULAR_ROM.BIN` and `BACKUP/ROMINFO.TXT`. Copy both to the computer. This is an undocumented gesture observed on the tested updater, not a universal instruction for unknown firmware. Do not substitute a factory reset or experiment with button chords blindly.

## Development and tests

No install or build step. Node.js 20+ and Python 3 are used only for tests:

```sh
node --check core.js
node --check app.js
node test.cjs
```

Private integration fixtures can be supplied as `node test.cjs /path/to/research/outputs`. The optional tests compare generated packages against all four captured ROMs, exercise reverse conversion, and verify preservation of other data. These tests read files outside this project; never commit them. ZIPs are checked in memory by Python's independent `zipfile` implementation. `PYTHON` may specify the Python executable.

To run the additional synthetic 0491 tests, append the path to the official build-0491 updater as a second argument. The test verifies its exact SHA-256 before use. Firmware is never written to disk by these tests or included in the repository.

Native file controls, radio buttons, keyboard focus indicators, labeled inputs, live status announcements, a skip link, responsive layout, and forced-colors borders are provided. Browser visual QA and assistive-technology testing are not yet performed.

An optional read-only WebMCP inspection-report tool is feature-detected. It exposes no file selection, package generation, or hardware operation. Its browser integration is not yet verified.

## GitHub publishing

This repository contains **only the tool source**, never the surrounding research workspace. `.gitignore` excludes ROMs, ZIPs, generated manifests, and restore metadata. Do not attach firmware or personal backups to issues or pull requests. This is not a public firmware distribution.

No affiliation with or endorsement by Roland. Firmware rights remain with their owners. This repository does not grant rights to redistribute firmware. No source-code license has been selected yet.
