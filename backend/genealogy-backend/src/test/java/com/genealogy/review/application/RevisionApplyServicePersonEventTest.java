package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.event.application.PersonEventApplicationService;
import com.genealogy.person.event.dto.ReplacePersonEventsRequest;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RevisionApplyServicePersonEventTest {

    private final PersonRepository personRepository = mock(PersonRepository.class);
    private final PersonEventApplicationService eventService = mock(PersonEventApplicationService.class);
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final RevisionApplyService service = new RevisionApplyService(
            personRepository,
            mock(RelationshipRepository.class),
            mock(SourceRepository.class),
            mock(BranchRepository.class),
            mock(GenSchemeRepository.class),
            mock(ImportJobRepository.class),
            mock(ImportJobRowRepository.class),
            objectMapper
    );

    RevisionApplyServicePersonEventTest() {
        service.setPersonEventApplicationService(eventService);
    }

    @Test
    void appliesPersonAndEventsFromCompositeSnapshot() throws Exception {
        PersonEntity person = new PersonEntity();
        person.setId(10L);
        person.setClanId(20L);
        person.setBranchId(30L);
        person.setName("待审核人物");
        person.setDataStatus("pending_review");

        ReplacePersonEventsRequest.PersonEventItem event = new ReplacePersonEventsRequest.PersonEventItem(
                "career",
                "任职",
                LocalDate.of(2020, 1, 1),
                "day",
                "广州",
                "担任职务",
                0
        );
        AuditRecordEntity revision = revision(
                objectMapper.writeValueAsString(new PersonRevisionSnapshot(person, List.of(event)))
        );
        LocalDateTime applyTime = LocalDateTime.of(2026, 7, 23, 10, 0);

        service.apply(revision, applyTime);

        ArgumentCaptor<PersonEntity> personCaptor = ArgumentCaptor.forClass(PersonEntity.class);
        verify(personRepository).save(personCaptor.capture());
        assertThat(personCaptor.getValue().getId()).isEqualTo(10L);
        assertThat(personCaptor.getValue().getClanId()).isEqualTo(20L);
        assertThat(personCaptor.getValue().getDataStatus()).isEqualTo("official");
        assertThat(personCaptor.getValue().getUpdatedAt()).isEqualTo(applyTime);
        verify(eventService).replaceFromRevision(
                10L,
                20L,
                "official",
                List.of(event),
                40L,
                applyTime
        );
    }

    @Test
    void rejectsPersonWithoutReplacingOfficialEvents() {
        PersonEntity existing = new PersonEntity();
        existing.setId(10L);
        existing.setDataStatus("pending_review");
        when(personRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(existing));
        AuditRecordEntity revision = revision("{}");

        service.reject(revision, LocalDateTime.of(2026, 7, 23, 11, 0));

        verify(personRepository).save(existing);
        assertThat(existing.getDataStatus()).isEqualTo("rejected");
        verify(eventService, never()).replaceFromRevision(any(), any(), any(), any(), any(), any());
    }

    private AuditRecordEntity revision(String payload) {
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setTargetType("person");
        revision.setTargetId(10L);
        revision.setClanId(20L);
        revision.setSubmitterId(40L);
        revision.setChangeType("person_update");
        revision.setNewPayload(payload);
        return revision;
    }
}
