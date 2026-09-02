# AIRA Switcher

Switch between **Bitrazer, Demora, Torcido and Scooper** using your own AIRA backup.

## [Open the browser tool](https://tracelistener.github.io/aira-switcher/)

Nothing to install. Your files stay in your browser.

## Use it

1. Select your unit’s `AIRA_MODULAR_ROM.BIN` and `ROMINFO.TXT` backup files.
2. Choose a model.
3. Download the ZIP, extract it, and follow the tool’s installation instructions.

Copy only the two files inside `install/` to the AIRAMODULAR drive. Safely eject, disconnect USB, and press GRF6 when prompted by the unit. **Keep power connected until restoration finishes.** Keep the original backup and `recovery/` files on your computer.

## Before you start

- Experimental: tested on **one Scooper with firmware 1.05 build 0493**. Other units are not independently verified; unsupported firmware is blocked.
- Use a backup from the **same physical unit**. Firmware and personal backups are not included here.
- Restoring rewrites boot code and saved settings. A power failure can require hardware repair.
- Saved patches are preserved. Initialize the selected model in Customizer if needed.

Unlike the Circuit uploader, this tool **does not send firmware over MIDI**. It prepares files for the tested USB-drive restore procedure. Single-update BIN support is not yet tested or enabled.

Need to make a backup, check compatibility, or inspect the code? See [technical documentation](TECHNICAL.md).

Unofficial project; not affiliated with Roland. No source-code license has been selected. Do not upload firmware or personal backups to this repository.
