# Schedulator

Generates a rotation schedule and exports it as an `.ics` calendar file.

## Setup

```bash
bun install
```

## Usage

```bash
bun run src/index.ts [options]
```

| Flag | Long form | Default | Description |
| --- | --- | --- | --- |
| `-g` | `--generate` | — | Create a `schedule.json` template and exit |
| `-s` | `--schedule` | `./schedule.json` | Path to the input schedule file |
| `-o` | `--out` | `./out/rotated.ics` | Path for the output `.ics` file |
| `-h` | `--help` | — | Show usage info |

## Workflow

1. Run with `-g` to generate a `schedule.json` template.
2. Fill in your engagements (city + show dates).
3. Run without `-g` to generate the rotated `.ics` file.
4. Import the `.ics` into Google Calendar (one time).
5. For mid-season changes, edit Google Calendar directly — don't re-run the script.

See [NOTES.md](NOTES.md) for rotation rules, data types, and timezone lookup behavior.
