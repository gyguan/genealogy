# Imports API Contract

Standard person import paths:

```text
POST /api/v1/clans/{clanId}/imports/persons/preview
POST /api/v1/clans/{clanId}/imports/persons
```

Legacy person import paths:

```text
POST /api/v1/clans/{clanId}/imports/persons.csv/preview
POST /api/v1/clans/{clanId}/imports/persons.csv
```

Standard relationship import paths:

```text
POST /api/v1/clans/{clanId}/imports/relationships/preview
POST /api/v1/clans/{clanId}/imports/relationships
```

Legacy relationship import paths:

```text
POST /api/v1/clans/{clanId}/imports/relations.csv/preview
POST /api/v1/clans/{clanId}/imports/relations.csv
```

New frontend code should use extensionless resource paths. File type should be determined by uploaded file metadata and parser capability, not by the URL suffix.
