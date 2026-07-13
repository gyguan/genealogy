package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class PersonImportFilePolicyServiceTest {

    private final PersonImportFilePolicyService service = new PersonImportFilePolicyService();

    @Test
    void shouldRequireTargetBranchBeforeReadingPersonFile() {
        MockMultipartFile file = csv("姓名,性别\n张三,male\n");

        BusinessException error = catchThrowableOfType(
                () -> service.validate(null, file),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_BRANCH_REQUIRED");
        assertThat(error).hasMessage("请先选择目标支派，再导入人物");
    }

    @Test
    void shouldRejectTechnicalBranchIdColumn() {
        MockMultipartFile file = csv("branchId,姓名\n5,张三\n");

        BusinessException error = catchThrowableOfType(
                () -> service.validate(5L, file),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_BRANCH_COLUMN_FORBIDDEN");
        assertThat(error).hasMessage("导入文件不能填写支派ID或支派列，请在页面中选择目标支派");
    }

    @Test
    void shouldRejectChineseBranchColumnAlias() {
        MockMultipartFile file = csv("支派,姓名\n长房,张三\n");

        BusinessException error = catchThrowableOfType(
                () -> service.validate(5L, file),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error).hasMessageContaining("不能填写支派ID或支派列");
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
