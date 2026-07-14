package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RelationshipImportFilePolicyServiceTest {

    private final RelationshipImportFilePolicyService service = new RelationshipImportFilePolicyService();

    @Test
    void strictCsvHeaderShouldPass() {
        service.validate(5L, csv("关系主体编码,关系对象编码,关系类型,说明\nP1,P2,父子,说明\n"));
    }

    @Test
    void reorderedHeaderShouldFail() {
        assertThatThrownBy(() -> service.validate(5L, csv("关系对象编码,关系主体编码,关系类型,说明\nP2,P1,父子,说明\n")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("人物关系导入模板不一致");
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "relationships.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }
}
