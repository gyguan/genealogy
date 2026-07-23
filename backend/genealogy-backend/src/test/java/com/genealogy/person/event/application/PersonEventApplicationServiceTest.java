package com.genealogy.person.event.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.event.dto.PersonEventResponse;
import com.genealogy.person.event.dto.ReplacePersonEventsRequest;
import com.genealogy.person.event.entity.PersonEventEntity;
import com.genealogy.person.event.repository.PersonEventRepository;
import com.genealogy.person.repository.PersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersonEventApplicationServiceTest {

    @Mock
    private PersonRepository personRepository;
    @Mock
    private PersonEventRepository personEventRepository;
    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    private PersonEventApplicationService service;

    @BeforeEach
    void setUp() {
        service = new PersonEventApplicationService(
                personRepository,
                personEventRepository,
                authorizationApplicationService
        );
    }

    @Test
    void officialPersonEventsMustUsePersonReviewWorkflow() {
        PersonEntity person = person("official");
        when(personRepository.findByIdAndDeletedAtIsNull(11L)).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.replaceByPerson(11L, new ReplacePersonEventsRequest(List.of()), 9L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("PERSON_EVENT_REVIEW_REQUIRED"))
                .hasMessage("非草稿人物关键事件变更必须随人物资料提交审核");

        verifyNoEventMutation();
    }

    @Test
    void rejectedPersonEventsMustUsePersonReviewWorkflow() {
        PersonEntity person = person("rejected");
        when(personRepository.findByIdAndDeletedAtIsNull(11L)).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.replaceByPerson(11L, new ReplacePersonEventsRequest(List.of()), 9L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("PERSON_EVENT_REVIEW_REQUIRED"))
                .hasMessage("非草稿人物关键事件变更必须随人物资料提交审核");

        verifyNoEventMutation();
    }

    @Test
    void pendingReviewPersonEventsCannotBeChanged() {
        PersonEntity person = person("pending_review");
        when(personRepository.findByIdAndDeletedAtIsNull(11L)).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.replaceByPerson(11L, new ReplacePersonEventsRequest(List.of()), 9L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("PERSON_EVENT_NOT_EDITABLE"))
                .hasMessage("人物资料处于待审核状态，关键事件暂不可修改");

        verifyNoEventMutation();
    }

    @Test
    void submittedPersonEventsCannotBeChanged() {
        PersonEntity person = person("submitted");
        when(personRepository.findByIdAndDeletedAtIsNull(11L)).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.replaceByPerson(11L, new ReplacePersonEventsRequest(List.of()), 9L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("PERSON_EVENT_NOT_EDITABLE"))
                .hasMessage("人物资料处于待审核状态，关键事件暂不可修改");

        verifyNoEventMutation();
    }

    @Test
    void futureDateIsRejectedBeforeExistingEventsAreChanged() {
        PersonEntity person = person("draft");
        when(personRepository.findByIdAndDeletedAtIsNull(11L)).thenReturn(Optional.of(person));
        ReplacePersonEventsRequest request = new ReplacePersonEventsRequest(List.of(
                item("未来事件", LocalDate.now().plusDays(1), 0)
        ));

        assertThatThrownBy(() -> service.replaceByPerson(11L, request, 9L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("PERSON_EVENT_DATE_IN_FUTURE"))
                .hasMessage("关键事件日期不能晚于今天");

        verify(personEventRepository, never())
                .findByPersonIdAndDeletedAtIsNullOrderBySortOrderAscEventDateAscIdAsc(11L);
        verify(personEventRepository, never()).saveAll(anyList());
    }

    @Test
    void replacementUsesActorAndPreservesManualOrderAcrossDates() {
        PersonEntity person = person("draft");
        when(personRepository.findByIdAndDeletedAtIsNull(11L)).thenReturn(Optional.of(person));
        when(personEventRepository.findByPersonIdAndDeletedAtIsNullOrderBySortOrderAscEventDateAscIdAsc(11L))
                .thenReturn(List.of());
        when(personEventRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<PersonEventEntity> saved = new ArrayList<>(invocation.getArgument(0));
            for (int index = 0; index < saved.size(); index++) {
                saved.get(index).setId((long) index + 1);
            }
            return saved;
        });
        ReplacePersonEventsRequest request = new ReplacePersonEventsRequest(List.of(
                item("先展示但后发生", LocalDate.of(2020, 2, 1), 0),
                item("后展示但先发生", LocalDate.of(2020, 1, 1), 1)
        ));

        var responses = service.replaceByPerson(11L, request, 9L);

        assertThat(responses).extracting(PersonEventResponse::eventTitle)
                .containsExactly("先展示但后发生", "后展示但先发生");
        assertThat(responses).extracting(PersonEventResponse::sortOrder)
                .containsExactly(0, 1);
        ArgumentCaptor<List<PersonEventEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(personEventRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .allSatisfy(event -> {
                    assertThat(event.getClanId()).isEqualTo(1L);
                    assertThat(event.getPersonId()).isEqualTo(11L);
                    assertThat(event.getCreatedBy()).isEqualTo(9L);
                    assertThat(event.getDataStatus()).isEqualTo("draft");
                });
    }

    private void verifyNoEventMutation() {
        verify(authorizationApplicationService).requireBranchPermission(1L, 9L, 7L, "person:update");
        verify(personEventRepository, never())
                .findByPersonIdAndDeletedAtIsNullOrderBySortOrderAscEventDateAscIdAsc(11L);
        verify(personEventRepository, never()).saveAll(anyList());
    }

    private PersonEntity person(String status) {
        PersonEntity person = new PersonEntity();
        person.setId(11L);
        person.setClanId(1L);
        person.setBranchId(7L);
        person.setDataStatus(status);
        return person;
    }

    private ReplacePersonEventsRequest.PersonEventItem item(
            String title,
            LocalDate date,
            Integer sortOrder
    ) {
        return new ReplacePersonEventsRequest.PersonEventItem(
                "life",
                title,
                date,
                "day",
                null,
                null,
                sortOrder
        );
    }
}
