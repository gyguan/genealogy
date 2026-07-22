from pathlib import Path
import re


def normalize_frontend_anchors() -> None:
    source = Path('frontend/genealogy-web/src/features/sources/sourceLibraryService.ts')
    text = source.read_text(encoding='utf-8')
    text, count = re.subn(
        r'export type BranchOption = \{\s*id\?: number;\s*branchName\?: string;\s*branchPath\?: string;\s*\};',
        'export type BranchOption = {\n    id?: number;\n    branchName?: string;\n    branchPath?: string;\n  };',
        text,
        count=1,
    )
    if count != 1:
        raise RuntimeError('unable to normalize BranchOption declaration')
    text, count = re.subn(
        r'export async function listBranches\(clanId: string\) \{\s*return toRows<BranchOption>\(await apiClient\.get\(`/clans/\$\{clanId\}/branches`\)\);\s*\}',
        'export async function listBranches(clanId: string) {\n    return toRows<BranchOption>(await apiClient.get(`/clans/${clanId}/branches`));\n  }',
        text,
        count=1,
    )
    if count != 1:
        raise RuntimeError('unable to normalize listBranches function')
    source.write_text(text, encoding='utf-8')

    person_edit = Path('frontend/genealogy-web/src/features/persons/PersonEditPage.tsx')
    text = person_edit.read_text(encoding='utf-8')
    text, count = re.subn(
        r"function isOfficialGenerationScheme\(scheme: any\) \{\s*const status = String\(scheme\.dataStatus \|\| scheme\.status \|\| scheme\.verificationStatus \|\| ''\)\.toLowerCase\(\);\s*return \['official', 'active', 'approved'\]\.includes\(status\);\s*\}",
        "function isOfficialGenerationScheme(scheme: any) {\n    const status = String(scheme.dataStatus || scheme.status || scheme.verificationStatus || '').toLowerCase();\n    return ['official', 'active', 'approved'].includes(status);\n  }",
        text,
        count=1,
    )
    if count != 1:
        raise RuntimeError('unable to normalize person edit helper')
    person_edit.write_text(text, encoding='utf-8')


def run_original_patch() -> None:
    workflow = Path('.github/workflows/issue-708-implementation.yml').read_text(encoding='utf-8')
    start = "          cat > /tmp/patch_issue708.py <<'PY'\n"
    end = "\n          PY\n          python /tmp/patch_issue708.py"
    body = workflow.split(start, 1)[1].split(end, 1)[0]
    body = '\n'.join(line[10:] if line.startswith('          ') else line for line in body.splitlines())
    exec(compile(body + '\n', 'issue-708-generated-patch.py', 'exec'), {})


def update_culture_target_validator() -> None:
    path = Path('backend/genealogy-backend/src/main/java/com/genealogy/culture/application/CultureSourceBindingTargetValidationService.java')
    text = path.read_text(encoding='utf-8')
    if 'import com.genealogy.branch.repository.BranchRepository;' not in text:
        text = text.replace(
            'import com.genealogy.common.exception.BusinessException;',
            'import com.genealogy.branch.repository.BranchRepository;\n'
            'import com.genealogy.clan.repository.ClanRepository;\n'
            'import com.genealogy.common.exception.BusinessException;',
            1,
        )
    if 'import com.genealogy.person.repository.PersonRepository;' not in text:
        text = text.replace(
            'import com.genealogy.generation.repository.GenerationWordRepository;',
            'import com.genealogy.generation.repository.GenerationWordRepository;\n'
            'import com.genealogy.person.repository.PersonRepository;\n'
            'import com.genealogy.relationship.repository.RelationshipRepository;',
            1,
        )
    pattern = re.compile(
        r'GenerationWordRepository generationWordRepository,\s*'
        r'GenerationSchemeRepository generationSchemeRepository,\s*'
        r'CultureTargetGovernanceRegistry targetRegistry\s*'
        r'\) \{\s*super\(generationWordRepository, generationSchemeRepository\);',
        re.S,
    )
    replacement = '''GenerationWordRepository generationWordRepository,
            GenerationSchemeRepository generationSchemeRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            BranchRepository branchRepository,
            ClanRepository clanRepository,
            CultureTargetGovernanceRegistry targetRegistry
    ) {
        super(generationWordRepository, generationSchemeRepository, personRepository, relationshipRepository, branchRepository, clanRepository);'''
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise RuntimeError('culture source validation constructor anchor missing')
    path.write_text(text, encoding='utf-8')


if __name__ == '__main__':
    normalize_frontend_anchors()
    run_original_patch()
    update_culture_target_validator()
