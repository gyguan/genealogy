from pathlib import Path


def ensure(path: str, marker: str, addition: str) -> None:
    file = Path(path)
    text = file.read_text()
    if addition.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"merge-resolution marker missing in {path}: {marker!r}")
    file.write_text(text.replace(marker, marker + addition, 1))


review_repo = "backend/genealogy-backend/src/main/java/com/genealogy/review/repository/ReviewTaskRepository.java"
ensure(review_repo, "import java.util.Optional;\n", "import java.util.List;\nimport java.util.UUID;\n")
ensure(
    review_repo,
    "    Optional<ReviewTaskEntity> findFirstByRevisionIdOrderByReviewLevelAsc(Long revisionId);\n",
    "\n    List<ReviewTaskEntity> findByTraceIdOrderByCreatedAtAscIdAsc(UUID traceId);\n",
)

revision_repo = "backend/genealogy-backend/src/main/java/com/genealogy/review/repository/RevisionRepository.java"
ensure(revision_repo, "import java.util.Optional;\n", "import java.util.UUID;\n")
ensure(
    revision_repo,
    "    Optional<RevisionEntity> findByIdAndTargetType(Long id, String targetType);\n",
    "\n    Optional<RevisionEntity> findByTraceId(UUID traceId);\n",
)
