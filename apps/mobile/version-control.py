#!/usr/bin/env python3
import os
import shutil
import json
from datetime import datetime
from pathlib import Path

BACKUP_DIR = "/home/user/apps/mobile/backups"
MANIFEST_PATH = f"{BACKUP_DIR}/versions.json"
MOBILE_ROOT = "/home/user/apps/mobile"
WEB_ROOT = "/home/user/apps/web"

# Files and directories to backup
BACKUP_PATHS = [
    # Mobile app
    ("mobile", "app"),
    ("mobile", "lib"),
    ("mobile", "components"),
    ("mobile", "assets"),
    ("mobile", ".env"),
    ("mobile", "app.json"),
    ("mobile", "package.json"),
    # Backend
    ("web", "app/api"),
    ("web", ".env"),
]

def load_manifest():
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r') as f:
            return json.load(f)
    return {"versions": [], "created": datetime.now().isoformat()}

def save_manifest(manifest):
    with open(MANIFEST_PATH, 'w') as f:
        json.dump(manifest, f, indent=2)

def save_version(version_name, description=""):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    version_dir = f"{BACKUP_DIR}/{version_name}_{timestamp}"

    os.makedirs(version_dir, exist_ok=True)

    backed_up = []
    for root_type, path in BACKUP_PATHS:
        root = MOBILE_ROOT if root_type == "mobile" else WEB_ROOT
        src = os.path.join(root, path)

        if os.path.exists(src):
            dst = os.path.join(version_dir, root_type, path)
            os.makedirs(os.path.dirname(dst), exist_ok=True)

            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)

            backed_up.append(f"{root_type}/{path}")

    manifest = load_manifest()
    manifest["versions"].append({
        "name": version_name,
        "timestamp": timestamp,
        "datetime": datetime.now().isoformat(),
        "description": description,
        "directory": version_dir,
        "files": backed_up
    })
    save_manifest(manifest)

    return version_dir, backed_up

def restore_version(version_name):
    manifest = load_manifest()

    # Find the version
    version = None
    for v in manifest["versions"]:
        if v["name"] == version_name:
            version = v
            break

    if not version:
        return None, f"Version '{version_name}' not found"

    version_dir = version["directory"]
    if not os.path.exists(version_dir):
        return None, f"Version directory not found: {version_dir}"

    restored = []
    for root_type, path in BACKUP_PATHS:
        root = MOBILE_ROOT if root_type == "mobile" else WEB_ROOT
        src = os.path.join(version_dir, root_type, path)
        dst = os.path.join(root, path)

        if os.path.exists(src):
            # Remove destination if it exists
            if os.path.exists(dst):
                if os.path.isdir(dst):
                    shutil.rmtree(dst)
                else:
                    os.remove(dst)

            # Copy from backup
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if os.path.isdir(src):
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)

            restored.append(f"{root_type}/{path}")

    return version_dir, restored

def list_versions():
    manifest = load_manifest()
    return manifest["versions"]

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python version-control.py save <version_name> [description]")
        print("  python version-control.py restore <version_name>")
        print("  python version-control.py list")
        sys.exit(1)

    command = sys.argv[1]

    if command == "save":
        if len(sys.argv) < 3:
            print("Error: Version name required")
            sys.exit(1)

        version_name = sys.argv[2]
        description = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""

        version_dir, files = save_version(version_name, description)
        print(f"✅ Saved version '{version_name}'")
        print(f"📁 Location: {version_dir}")
        print(f"📝 Backed up {len(files)} paths")

    elif command == "restore":
        if len(sys.argv) < 3:
            print("Error: Version name required")
            sys.exit(1)

        version_name = sys.argv[2]
        result, data = restore_version(version_name)

        if result:
            print(f"✅ Restored version '{version_name}'")
            print(f"📝 Restored {len(data)} paths")
        else:
            print(f"❌ Error: {data}")

    elif command == "list":
        versions = list_versions()
        if not versions:
            print("No versions saved yet")
        else:
            print(f"\n📦 Saved Versions ({len(versions)})\n")
            for v in versions:
                print(f"  • {v['name']}")
                print(f"    Date: {v['datetime'][:19]}")
                if v.get('description'):
                    print(f"    Description: {v['description']}")
                print(f"    Files: {len(v['files'])} paths")
                print()

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
