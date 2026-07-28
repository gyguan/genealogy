from pathlib import Path

root = Path(__file__).resolve().parents[1]
java = root / 'backend/genealogy-backend/src/main/java/com/genealogy'

# Entity: add lifecycle listener and non-null column contract.
entity = java / 'relationship/entity/RelationshipEntity.java'
text = entity.read_text(encoding='utf-8')
text = text.replace('import jakarta.persistence.Entity;\n', 'import jakarta.persistence.Entity;\nimport jakarta.persistence.EntityListeners;\n')
text = text.replace('import com.genealogy.relationship.domain.RelationshipCategoryEntityListener;\n', '')
text = text.replace('package com.genealogy.relationship.entity;\n\n', 'package com.genealogy.relationship.entity;\n\nimport com.genealogy.relationship.domain.RelationshipCategoryEntityListener;\n')
text = text.replace('@Entity\n@Table(name = "relationship")', '@Entity\n@EntityListeners(RelationshipCategoryEntityListener.class)\n@Table(name = "relationship")')
text = text.replace('    private String relationCategory;\n', '    @Column(nullable = false)\n    private String relationCategory;\n')
entity.write_text(text, encoding='utf-8')

# Repository: query canonical stored field directly.
repo = java / 'relationship/repository/RelationshipRepository.java'
text = repo.read_text(encoding='utf-8')
import re
case_pattern = re.compile(r"\s+and \(case\n\s+when r\.relationCategory is null or trim\(r\.relationCategory\) = '' then\n\s+case\n\s+when lower\(r\.relationType\) = 'spouse' then 'marriage'\n\s+when lower\(r\.relationType\) in \('adoptive','successor','out_adoption','in_adoption','dual_successor','heir_son'\) then 'ritual'\n\s+when lower\(r\.relationType\) = 'no_descendant' then 'status'\n\s+else 'blood'\n\s+end\n\s+else lower\(trim\(r\.relationCategory\)\)\n\s+end\) in :categories")
text, count = case_pattern.subn('\n              and r.relationCategory in :categories', text)
if count != 3:
    raise RuntimeError(f'expected 3 CASE expressions, replaced {count}')
repo.write_text(text, encoding='utf-8')

# Application service: delegate type/category normalization to the domain policy.
service = java / 'relationship/application/RelationshipApplicationService.java'
text = service.read_text(encoding='utf-8')
text = text.replace('import com.genealogy.relationship.dto.RelationshipConflictCheckResponse;\n', 'import com.genealogy.relationship.domain.RelationCategoryPolicy;\nimport com.genealogy.relationship.dto.RelationshipConflictCheckResponse;\n')
start = text.index('    private String normalizeType(String relationType) {')
end = text.index('    private String normalizeRitualRelationType', start)
replacement = '''    private String normalizeType(String relationType) {\n        return RelationCategoryPolicy.normalizeType(relationType);\n    }\n\n    private String normalizeCategory(String relationCategory, String relationType) {\n        return RelationCategoryPolicy.normalizeAndValidate(relationType, relationCategory);\n    }\n\n'''
text = text[:start] + replacement + text[end:]
service.write_text(text, encoding='utf-8')

# Remove temporary automation files from final branch.
Path(__file__).unlink()
workflow = root / '.github/workflows/issue-927-refactor.yml'
if workflow.exists():
    workflow.unlink()
