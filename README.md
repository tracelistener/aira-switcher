# AIRA Switcher

Switch between **Bitrazer, Demora, Torcido and Scooper** using your own AIRA backup.

## [Open the browser tool](https://tracelistener.github.io/aira-switcher/)

Nothing to install. Your files stay in your browser.

## Use it

### Make your backup first

1. Disconnect USB and turn the unit off.
2. Hold **GRF 6** while powering on, then release it.
3. Press **GRF 5 ten times**, then connect USB.
4. Open **AIRAMODULAR → BACKUP**. Copy `AIRA_MODULAR_ROM.BIN` and `ROMINFO.TXT` to your computer and keep them safe.
5. Safely eject and disconnect USB. Restart normally when finished.

If BACKUP does not appear, stop; do not start an update or substitute factory reset.

### Choose your model

1. Select your unit’s `AIRA_MODULAR_ROM.BIN` and `ROMINFO.TXT` backup files.
2. Choose a model.
3. Download the ZIP, extract it, and follow the tool’s installation instructions.

Copy only the two files inside `install/` to the AIRAMODULAR drive. Safely eject, disconnect USB, and press GRF6 when prompted by the unit. **Keep power connected until restoration finishes.** Keep the original backup and `recovery/` files on your computer.

## Before you start

- **v1.05 build 0493:** tested on one Scooper.
- **v1.05 build 0491:** reported working by the project owner; also covered by offline package tests and exact code/layout checks.
- Other units are not independently verified; unknown firmware is blocked. The tool preserves the input build, including any existing bugs.
- Use a backup from the **same physical unit**. Firmware and personal backups are not included here.
- Restoring rewrites boot code and saved settings. A power failure can require hardware repair.
- Saved patches are preserved. Initialize the selected model in Customizer if needed.

Unlike the Circuit uploader, this tool **does not send firmware over MIDI**. It prepares files for the tested USB-drive restore procedure. Single-update BIN support is not yet tested or enabled.

Need to make a backup, check compatibility, or inspect the code? See [technical documentation](TECHNICAL.md).

Unofficial project; not affiliated with Roland. No source-code license has been selected. Do not upload firmware or personal backups to this repository.
