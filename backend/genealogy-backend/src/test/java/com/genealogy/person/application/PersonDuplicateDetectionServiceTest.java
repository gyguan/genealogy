package com.genealogy.person.application;

import com.genealogy.person.dto.PersonDuplicateCheckRequest;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PersonDuplicateDetectionServiceTest {

    @Test
    void typedAndLegacyEntrypointsShareTheSameCandidates() {
        PersonRepository repository = mock(PersonRepository.class);
        PersonEntity candidate = new PersonEntity();
        candidate.setId(9L);
        candidate.setClanId(1L);
        candidate.setBranchId(2L);
        candidate.setName("张三");
        candidate.setGenerationNo(5);
        candidate.setGenerationWord("德");
        candidate.setBirthDate(LocalDate.of(1980, 1, 1));
        candidate.setGender("male");
        candidate.setDataStatus("official");
        when(repository.findDuplicateCandidates(
                any(), any(), any(), any(), any(), any(), anyInt()
        )).thenReturn(List.of(candidate));

        PersonDuplicateDetectionService service = new PersonDuplicateDetectionService(repository);
        PersonDuplicateQuery query = PersonDuplicateQuery.of(
                1L, 2L, "张三", 5, "德", LocalDate.of(1980, 1, 1)
        );

        PersonDuplicateResult typed = service.detect(query);
        var legacy = service.check(new PersonDuplicateCheckRequest(
                1L, 2L, "张三", 5, "德", LocalDate.of(1980, 1, 1)
        ));

        assertThat(typed.duplicated()).isTrue();
        assertThat(typed.riskLevel()).isEqualTo(PersonDuplicateResult.RiskLevel.HIGH);
        assertThat(typed.matchedFields()).containsExactlyInAnyOrder(
                "name", "branchId", "generationNo", "generationWord", "birthDate"
        );
        assertThat(typed.candidates()).hasSize(legacy.candidates().size());
        assertThat(legacy.duplicated()).isTrue();
    }
}
