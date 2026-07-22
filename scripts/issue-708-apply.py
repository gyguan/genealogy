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


def update_source_validation_test() -> None:
    path = Path('backend/genealogy-backend/src/test/java/com/genealogy/source/application/SourceBindingTargetValidationServiceTest.java')
    path.write_text('''package com.genealogy.source.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SourceBindingTargetValidationServiceTest {

    @Mock private GenerationWordRepository generationWordRepository;
    @Mock private GenerationSchemeRepository generationSchemeRepository;
    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private ClanRepository clanRepository;

    private SourceBindingTargetValidationService service;

    @BeforeEach
    void setUp() {
        service = new SourceBindingTargetValidationService(
                generationWordRepository,
                generationSchemeRepository,
                personRepository,
                relationshipRepository,
                branchRepository,
                clanRepository
        );
    }

    @Test
    void validateShouldAcceptGenerationWordFromExplicitlyApprovedScheme() {
        GenerationWordEntity word = generationWord(100L, 200L);
        GenerationSchemeEntity scheme = generationScheme(200L, 1L, "approved");
        when(generationWordRepository.findById(100L)).thenReturn(Optional.of(word));
        when(generationSchemeRepository.findByIdAndClanId(200L, 1L)).thenReturn(Optional.of(scheme));

        assertThatCode(() -> service.validate(1L, "generation_word", 100L)).doesNotThrowAnyException();
    }

    @Test
    void validateShouldRejectGenerationWordFromDraftScheme() {
        GenerationWordEntity word = generationWord(100L, 200L);
        GenerationSchemeEntity scheme = generationScheme(200L, 1L, "draft");
        when(generationWordRepository.findById(100L)).thenReturn(Optional.of(word));
        when(generationSchemeRepository.findByIdAndClanId(200L, 1L)).thenReturn(Optional.of(scheme));

        assertThatThrownBy(() -> service.validate(1L, "generation_word", 100L))
                .hasMessageContaining("字辈方案审核通过后才能绑定来源资料");
    }

    @Test
    void validateShouldAcceptOfficialPerson() {
        PersonEntity person = new PersonEntity();
        person.setId(300L);
        person.setClanId(1L);
        person.setDataStatus("official");
        when(personRepository.findByIdAndDeletedAtIsNull(300L)).thenReturn(Optional.of(person));

        assertThatCode(() -> service.validate(1L, "person", 300L)).doesNotThrowAnyException();
    }

    @Test
    void validateShouldRejectDraftPerson() {
        PersonEntity person = new PersonEntity();
        person.setId(300L);
        person.setClanId(1L);
        person.setDataStatus("draft");
        when(personRepository.findByIdAndDeletedAtIsNull(300L)).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.validate(1L, "person", 300L))
                .hasMessageContaining("人物审核通过后才能绑定来源资料");
    }

    @Test
    void validateShouldAcceptOfficialRelationship() {
        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setId(400L);
        relationship.setClanId(1L);
        relationship.setDataStatus("official");
        when(relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(400L, 1L))
                .thenReturn(Optional.of(relationship));

        assertThatCode(() -> service.validate(1L, "relationship", 400L)).doesNotThrowAnyException();
    }

    @Test
    void validateShouldRejectDraftBranch() {
        BranchEntity branch = new BranchEntity();
        branch.setId(500L);
        branch.setClanId(1L);
        branch.setStatus("draft");
        when(branchRepository.findByIdAndClanId(500L, 1L)).thenReturn(Optional.of(branch));

        assertThatThrownBy(() -> service.validate(1L, "branch", 500L))
                .hasMessageContaining("支派审核通过后才能绑定来源资料");
    }

    @Test
    void validateShouldAcceptClanContainerTarget() {
        when(clanRepository.existsById(1L)).thenReturn(true);
        assertThatCode(() -> service.validate(1L, "clan", 1L)).doesNotThrowAnyException();
    }

    private GenerationWordEntity generationWord(Long id, Long schemeId) {
        GenerationWordEntity word = new GenerationWordEntity();
        word.setId(id);
        word.setSchemeId(schemeId);
        word.setGenerationNo(18);
        word.setWord("永");
        return word;
    }

    private GenerationSchemeEntity generationScheme(Long id, Long clanId, String status) {
        GenerationSchemeEntity scheme = new GenerationSchemeEntity();
        scheme.setId(id);
        scheme.setClanId(clanId);
        scheme.setSchemeName("黄氏通用字辈");
        scheme.setStatus(status);
        return scheme;
    }
}
''', encoding='utf-8')


if __name__ == '__main__':
    normalize_frontend_anchors()
    run_original_patch()
    update_culture_target_validator()
    update_source_validation_test()
