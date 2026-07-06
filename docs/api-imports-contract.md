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

Person import mapping query/form parameters:

```text
autoMapping=true|false
nameIndex=0
genderIndex=1
generationNoIndex=2
generationWordIndex=3
branchIdIndex=-1
birthDateIndex=4
isLivingIndex=5
branchId={currentBranchId}
confirmDuplicates=true|false
```

Rules:

```text
1. When autoMapping=true, backend first maps by header aliases such as 姓名, 性别, 代次, 字辈, 出生日期, 是否在世.
2. If a header alias is missing, backend falls back to the explicit zero-based column indexes.
3. When autoMapping=false, backend uses the explicit zero-based column indexes directly.
4. If branchId is missing in the uploaded file, backend uses the branchId parameter as the default branch.
5. confirmDuplicates is passed into PersonCreateRequest.confirmDuplicate during actual import.
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
