# App Versioning System

## How to Use

### Save a Version
Tell me: **"Save version [name]"** or **"Create version [name]"**
- Example: "Save version 1" or "Create version working-home-screen"
- I'll backup all your key app files with that version name

### Restore a Version
Tell me: **"Restore version [name]"**
- Example: "Restore version 1"
- I'll restore all files from that saved version

### List Versions
Tell me: **"List versions"** or **"Show my versions"**
- I'll show you all saved versions with dates and descriptions

## What Gets Backed Up

When you save a version, I backup:
- All screen files (`app/(tabs)/*.tsx`, `app/*.tsx`)
- API files (`lib/api.ts`, `lib/*.ts`)
- Components (`components/**/*`)
- Backend API routes (`/home/user/apps/web/app/api/**/*`)
- Database utilities (`/home/user/apps/web/app/api/utils/*`)
- Environment files (`.env`)
- Key config files (`app.json`, `package.json`)

## Tips

1. **Save often** - Save a version whenever you reach a working state you like
2. **Use descriptive names** - "working-homepage" is better than "v1"
3. **Before big changes** - Always save a version before trying something new
4. **List versions regularly** - Check what versions you have saved

## Storage Location

All versions are stored in: `/home/user/apps/mobile/backups/`

Each version is a timestamped folder with all your files.
