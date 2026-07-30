package com.genealogy.common.persistence;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PageResultTest {

    @Test
    void pageQueryUsesOneBasedPositiveValues() {
        assertThat(new PageQuery(1, 20)).isEqualTo(new PageQuery(1, 20));
        assertThatThrownBy(() -> new PageQuery(0, 20))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PageQuery(1, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void pageResultDefensivelyCopiesAndMapsRecords() {
        List<Integer> source = new ArrayList<>(List.of(1, 2));
        PageResult<Integer> page = new PageResult<>(source, 2);
        source.add(3);

        PageResult<String> mapped = page.map(String::valueOf);

        assertThat(page.records()).containsExactly(1, 2);
        assertThat(mapped.records()).containsExactly("1", "2");
        assertThat(mapped.total()).isEqualTo(2);
        assertThatThrownBy(() -> page.records().add(3))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void pageResultRejectsNegativeTotalsAndNormalizesNullRecords() {
        assertThat(new PageResult<>(null, 0).records()).isEmpty();
        assertThatThrownBy(() -> new PageResult<>(List.of(), -1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
