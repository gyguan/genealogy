package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class PersonImportFilePolicyServiceTest {

    private final PersonImportFilePolicyService service = new PersonImportFilePolicyService();
    private final PersonImportTemplateApplicationService templateService = new PersonImportTemplateApplicationService();

    @Test
    void shouldRequireTargetBranchBeforeReadingPersonFile() {
        BusinessException error = catchThrowableOfType(
                () -> service.validate(null, standardCsv()),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_BRANCH_REQUIRED");
        assertThat(error).hasMessage("请先选择目标支派，再导入人物");
    }

    @Test
    void shouldAllowStrictCsvTemplate() {
        assertThatCode(() -> service.validate(5L, standardCsv())).doesNotThrowAnyException();
    }

    @Test
    void shouldAllowBomAndTrimmedCsvHeaders() {
        MockMultipartFile file = csv("\ufeff 姓名 , 性别 , 代次 , 字辈 , 出生日期 , 是否在世 \n张三,男,5,德,1980-01-01,是\n");

        assertThatCode(() -> service.validate(5L, file)).doesNotThrowAnyException();
    }

    @Test
    void shouldAllowStrictXlsxTemplate() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "persons.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                templateService.buildXlsxTemplate()
        );

        assertThatCode(() -> service.validate(5L, file)).doesNotThrowAnyException();
    }

    @Test
    void shouldRejectMissingHeaderColumn() {
        assertHeaderMismatch("姓名,性别,代次,字辈,出生日期\n");
    }

    @Test
    void shouldRejectExtraHeaderColumn() {
        assertHeaderMismatch("姓名,性别,代次,字辈,出生日期,是否在世,备注\n");
    }

    @Test
    void shouldRejectReorderedCsvHeaders() {
        assertHeaderMismatch("姓名,代次,性别,字辈,出生日期,是否在世\n");
    }

    @Test
    void shouldRejectReorderedXlsxHeaders() throws Exception {
        MockMultipartFile file = xlsx(List.of("姓名", "代次", "性别", "字辈", "出生日期", "是否在世"));

        BusinessException error = catchThrowableOfType(
                () -> service.validate(5L, file),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_TEMPLATE_HEADER_MISMATCH");
        assertThat(error).hasMessageContaining("标准表头", "当前表头");
    }

    @Test
    void shouldRejectEnglishHeaders() {
        assertHeaderMismatch("name,gender,generationNo,generationWord,birthDate,isLiving\n");
    }

    @Test
    void shouldRejectChineseHeaderAliases() {
        assertHeaderMismatch("名字,性别,世代,字派,出生时间,在世\n");
    }

    @Test
    void shouldRejectEmptyHeader() {
        BusinessException error = catchThrowableOfType(
                () -> service.validate(5L, csv("\n张三,男,5,德,1980-01-01,是\n")),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_TEMPLATE_HEADER_REQUIRED");
    }

    @Test
    void shouldRejectDataWithoutHeader() {
        assertHeaderMismatch("张三,男,5,德,1980-01-01,是\n");
    }

    @Test
    void shouldRejectUnsupportedFileType() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "persons.xls",
                "application/vnd.ms-excel",
                new byte[]{1, 2, 3}
        );

        BusinessException error = catchThrowableOfType(
                () -> service.validate(5L, file),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_FILE_TYPE_UNSUPPORTED");
    }

    private void assertHeaderMismatch(String header) {
        BusinessException error = catchThrowableOfType(
                () -> service.validate(5L, csv(header)),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_TEMPLATE_HEADER_MISMATCH");
        assertThat(error).hasMessageContaining("标准表头", "当前表头");
    }

    private MockMultipartFile standardCsv() {
        return csv("姓名,性别,代次,字辈,出生日期,是否在世\n张三,男,5,德,1980-01-01,是\n");
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile(
                "file",
                "persons.csv",
                "text/csv",
                content.getBytes(StandardCharsets.UTF_8)
        );
    }

    private MockMultipartFile xlsx(List<String> headers) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Row row = workbook.createSheet("人物导入").createRow(0);
            for (int index = 0; index < headers.size(); index++) {
                row.createCell(index).setCellValue(headers.get(index));
            }
            workbook.write(output);
            return new MockMultipartFile(
                    "file",
                    "persons.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    output.toByteArray()
            );
        }
    }
}
