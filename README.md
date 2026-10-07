# HomeLab Recovery Kit — free evaluation demo

An offline planner for people who run Proxmox VE, Docker Compose, a NAS or several home services. It helps list components, record dependencies and turn those entries into a suggested recovery order and a printable handoff. This repository contains the **limited demo**, not the complete paid toolkit.

**Status:** evaluation prototype. This is a commercial project in development; the complete kit is being tested before sale. AI assisted with development and documentation, and the project owner reviews the result.

## Try it online

[Open the live demo](https://pagisoft.github.io/homelab-recovery-kit-demo/). GitHub Pages serves the static app; the entries you type stay in your browser page and are not uploaded by the app. Use fictional data for a first look. Download the repository to use the demo without an internet connection.

## Try the demo

1. Use GitHub's **Code → Download ZIP**, then extract the archive. Open `index.html` from the extracted folder in a current desktop browser. No installation, server, account or internet connection is needed.
2. Choose **Load example** to inspect fictional entries. For your own trial, use fictional names and addresses. Add at least two systems and a dependency.
3. Review the recovery order and warnings. Use **Print / save PDF** and **Download kit JSON** if you want to keep your trial. The page does not save automatically.

The app does not create backups, verify their integrity or perform a restore. Its order depends on what you enter. Do not put passwords, recovery codes, private keys or other secrets into the app. Exported JSON is not encrypted and may reveal infrastructure details.

## What the complete kit adds

The current full review candidate adds a device and address inventory, backup-job matrix, incident log, editable worksheets, Proxmox and Docker Compose recovery guides, printable equipment labels, two detailed fictional examples and a four-page field guide. The complete kit is **not** in this public repository. There is no purchase link yet.

## Independent pilot

**Start small:** take a 10-minute look at the live demo. Load the example, edit and save one fictional component, download and re-import the JSON, then inspect print preview. Tell us which step was confusing, whether another person could follow the order, and what important outage detail is missing.

To volunteer for the full pilot or send short feedback, email **info@pagisoft.pl** with the subject **HomeLab pilot**. Mention only your broad setup (Proxmox, Docker Compose or NAS) and browser. A GitHub account is optional. We use your message to arrange this evaluation and reply; it does not subscribe you to marketing. Please do not send secrets, configurations or backup files.

We are seeking **8–10 people who actually maintain a homelab** to test the complete kit. The exercise takes about 45–60 minutes, can use fictional data, and asks for candid feedback. There is no purchase requirement or need to share configurations or backup files. Start with [the pilot instructions](PILOT.md). To volunteer, open **Issues → New issue → Pilot tester application**. GitHub issues are public, so do not post an email address or private infrastructure details. We will arrange private delivery separately with selected volunteers.

Please report defects using fictional data. The [evaluation permission](EVALUATION_LICENSE.md) applies to this demo only. The complete kit has separate customer terms.
