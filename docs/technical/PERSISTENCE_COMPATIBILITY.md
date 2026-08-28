# Persistence compatibility

LifeOS was rebranded from NeumanOS. User-visible branding may change independently from persisted technical identifiers.

The identifiers below are intentionally retained because existing local data, browser storage, filesystem backups, or tests may depend on them. Do not rename them without a backward-compatible migration and verification against legacy data.

| Identifier | Location / purpose |
| --- | --- |
| `neumanos-db` | Main IndexedDB database in `src/services/indexedDB.ts` |
| `NeumanOSNotes` | Legacy Dexie notes database |
| `NeumanOSTasks` | Legacy Dexie tasks database |
| `NeumanOSTimeTracking` | Legacy Dexie time-tracking database |
| `NeumanOSInvoicing` | Legacy Dexie invoicing database |
| `neumanos-diagrams` | Diagrams database |
| `neumanos-file-handles` | File System Access handles used by auto-backup |
| `.neuman-backups/` | Existing automatic-backup directory |
| `neumanos-theme-vars` | Theme style element DOM id |
| `neumanos-custom-accent` | Custom accent style element DOM id |
| `neumanos-sr-announcer` | Screen-reader announcer DOM id |
| `AI Terminal` folder name | Existing notes folder matched by `AI_TERMINAL_FOLDER_NAME` |

## Backup filenames

New backups use LifeOS filenames, but cleanup/import logic must continue recognizing legacy `NeumanOS-Backup-*` and `NeumanOS-auto-*` names while existing installations may contain them.

## Migration rule

A persisted identifier may be renamed only when the change includes:

1. a backward-compatible read/migration path;
2. tests using representative legacy data;
3. backup/import/export verification where relevant;
4. a documented point at which the compatibility path may later be removed.

Git history contains the original branding migration notes; this file is the canonical current compatibility contract.
