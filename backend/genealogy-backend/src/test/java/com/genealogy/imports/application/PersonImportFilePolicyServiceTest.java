package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PersonImportFilePolicyServiceTest {

    private final PersonImportFilePolicyService service = new PersonImportFilePolicyService();

    @Test
    void shouldRequireTargetBranchBeforeReadingPersonFile() {
        MockMultipartFile file = csv("姓名,性别\n张三,male\n");

        assertThatThrownBy(() -> service.validate(null, file))
                .isInstanceOf(BusinessException.class)
                .hasMessage("请先选择目标支派，再导入人物")
                .extracting(error -> ((BusinessException) error).getCode())
                .isEqualTo("IMPORT_BRANCH_REQUIRED");
    }

    @Test
    void shouldRejectTechnicalBranchIdColumn() {
        MockMultipartFile file = csv("branchId,姓名\n5,张三\n");

        assertThatThrownBy(() -> service.validate(5L, file))
                .isInstanceOf(BusinessException.class)
                .hasMessage("导入文件不能填写支派ID或支派列，请在页面中选择目标支派")
                .extracting(error -> ((BusinessException) error).getCode())
                .isEqualTo("IMPORT_BRANCH_COLUMN_FORBIDDEN");
    }

    @Test
    void shouldRejectChineseBranchColumnAlias() {
        MockMultipartFile file = csv("支派,姓名\n长房,张三\n");

        assertThatThrownBy(() -> service.validate(5L, file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不能填写支派ID或支派列");
    }

    @Test
    void shouldAllowBusinessPersonColumnsForSelectedBranch() {
        MockMultipartFile file = csv("姓名,性别,代次,字辈,出生日期,是否在世\n张三,male,5,德,1980-01-01,是\n");

        assertThatCode(() -> service.validate(5L, file)).doesNotThrowAnyException();
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile(
                "file",
                "persons.csv",
                "text/csv",
                content.getBytes(StandardCharsets.UTF_8)
        );
    }
}
