package com.genealogy.imports.application;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class PersonImportTemplateApplicationService {

    public byte[] buildTemplate() {
        String content = "\ufeff姓名,性别,代次,字辈,出生日期,是否在世\n"
                + "张三,male,5,德,1980-01-01,是\n";
        return content.getBytes(StandardCharsets.UTF_8);
    }
}
