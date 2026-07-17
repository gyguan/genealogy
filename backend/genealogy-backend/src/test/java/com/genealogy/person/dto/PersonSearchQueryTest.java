package com.genealogy.person.dto;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PersonSearchQueryTest {

    @Test
    void normalizesMultiValueFiltersAndSort() {
        PersonSearchQuery query = new PersonSearchQuery(
                1L,
                2L,
                "  长沙  ",
                "  张  ",
                List.of("male", " male ", "female"),
                List.of(15, 15, 0, -1, 16),
                List.of(" 永 ", "永", "世"),
                List.of("official", " draft ", "official"),
                "generationNo,asc"
        );

        assertThat(query.keyword()).isEqualTo("长沙");
        assertThat(query.name()).isEqualTo("张");
        assertThat(query.genders()).containsExactly("male", "female");
        assertThat(query.generationNos()).containsExactly(15, 16);
        assertThat(query.generationWords()).containsExactly("永", "世");
        assertThat(query.dataStatuses()).containsExactly("official", "draft");
        assertThat(query.sort()).isEqualTo("generationNo,asc");
    }

    @Test
    void keepsOriginalSingleValueConstructorCompatible() {
        PersonSearchQuery query = new PersonSearchQuery(
                1L,
                2L,
                "keyword",
                "name",
                "male",
                15,
                "永",
                "official"
        );

        assertThat(query.genders()).containsExactly("male");
        assertThat(query.generationNos()).containsExactly(15);
        assertThat(query.generationWords()).containsExactly("永");
        assertThat(query.dataStatuses()).containsExactly("official");
        assertThat(query.sort()).isEqualTo(PersonSearchQuery.DEFAULT_SORT);
    }

    @Test
    void fallsBackToDefaultSort() {
        PersonSearchQuery query = new PersonSearchQuery(
                1L,
                null,
                null,
                null,
                List.of(),
                List.of(),
                List.of(),
                List.of("official"),
                "unknown,desc"
        );

        assertThat(query.sort()).isEqualTo(PersonSearchQuery.DEFAULT_SORT);
    }
}