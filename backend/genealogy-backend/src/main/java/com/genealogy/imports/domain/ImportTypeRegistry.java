package com.genealogy.imports.domain;

import com.genealogy.common.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class ImportTypeRegistry {

    private final Map<String, ImportTypeDefinition> definitions;

    public ImportTypeRegistry(List<ImportTypeDefinition> definitions) {
        Map<String, ImportTypeDefinition> registered = new LinkedHashMap<>();
        for (ImportTypeDefinition definition : definitions) {
            String type = normalize(definition.importType());
            if (registered.putIfAbsent(type, definition) != null) {
                throw new IllegalStateException("duplicate import type registration: " + type);
            }
        }
        this.definitions = Map.copyOf(registered);
    }

    public ImportTypeDefinition require(String importType, String fileFormat) {
        String normalizedType = normalize(importType);
        String normalizedFormat = normalize(fileFormat);
        ImportTypeDefinition definition = definitions.get(normalizedType);
        if (definition == null) {
            throw new BusinessException("IMPORT_TYPE_UNSUPPORTED", "暂不支持该导入类型: " + importType);
        }
        if (!definition.supports(normalizedFormat)) {
            throw new BusinessException(
                    "IMPORT_FILE_FORMAT_UNSUPPORTED",
                    "导入类型 " + normalizedType + " 不支持文件格式 " + normalizedFormat
            );
        }
        return definition;
    }

    public List<ImportTypeDefinition> definitions() {
        return List.copyOf(definitions.values());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
