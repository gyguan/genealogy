package com.genealogy.imports.application;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class PersonImportTemplateApplicationServiceTest {

    private final PersonImportTemplateApplicationService service = new PersonImportTemplateApplicationService();

    @Test
    void templateShouldContainBusinessColumnsWithoutTechnicalIds() {
        String content = new String(service.buildTemplate(), StandardCharsets.UTF_8);

        assertThat(content).startsWith("\ufeff姓名,性别,代次,字辈,出生日期,是否在世");
        assertThat(content).contains("张三,male,5,德,1980-01-01,是");
        assertThat(content).doesNotContain("branchId", "支派ID", "personCode", "人物ID");
    }
}
