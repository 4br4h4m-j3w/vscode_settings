# JSON Compact Prettier
## A formatter for JSON Files
This extension adds formatting for .json and .jsonc files

## Features
- Indetentation Size
- Max Line Length
- Bracket Spacing
- Always Open Keys

## Installation
Install through VS Code extensions. Search for JSON Compact Prettier

[Visual Studio Code Market Place: JSON Compact Prettier](https://marketplace.visualstudio.com/items?itemName=gamemodeone.json-compact-prettier)

Can also be installed in VS Code: Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter.

```
code --install-extension gamemodeone.json-compact-prettier
```

### Setting as JSON Formatter

To use JSON Compact Prettier as the default formatter for JSON Files in your VSCode Settings

```JSON
"[json]": { "editor.defaultFormatter": "GamemodeOne.json-compact-prettier" },
```

```JSON
"[jsonc]": { "editor.defaultFormatter": "GamemodeOne.json-compact-prettier" },
```

```JSON
"[json][jsonc]": { "editor.defaultFormatter": "GamemodeOne.json-compact-prettier" },
```

## Usage

### Using Command Palette (CMD/CTRL + Shift + P)

```
1. CMD + Shift + P -> Compact Prettify JSON
```

### Format On Save
JSON Compact Prettier respects the `editor.formatOnSave` setting.
You can turn on format-on-save on a per-language basis by scoping the setting:

```JSON
"[json][jsonc]": { "editor.formatOnSave": true, "editor.defaultFormatter": "GamemodeOne.json-compact-prettier" },
```