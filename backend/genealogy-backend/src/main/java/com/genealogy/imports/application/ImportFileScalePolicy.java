package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.springframework.web.multipart.MultipartFile;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamReader;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;

/** Bounded file-size routing that never invents a synthetic row count. */
final class ImportFileScalePolicy {

    enum Decision { SMALL, LARGE }

    Decision evaluate(MultipartFile file, int rowThreshold) {
        if (file == null || file.isEmpty()) return Decision.SMALL;
        String filename = file.getOriginalFilename() == null
                ? ""
                : file.getOriginalFilename().trim().toLowerCase(Locale.ROOT);
        try {
            if (filename.endsWith(".csv")) return countCsv(file, rowThreshold);
            if (filename.endsWith(".xlsx")) return countXlsx(file, rowThreshold);
            return Decision.SMALL;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "无法评估导入文件规模，请确认文件未损坏");
        }
    }

    private Decision countCsv(MultipartFile file, int threshold) throws Exception {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            reader.readLine();
            int rows = 0;
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank() && ++rows >= threshold) return Decision.LARGE;
            }
            return Decision.SMALL;
        }
    }

    private Decision countXlsx(MultipartFile file, int threshold) throws Exception {
        try (OPCPackage pkg = OPCPackage.open(file.getInputStream())) {
            XSSFReader reader = new XSSFReader(pkg);
            Iterator<InputStream> sheets = reader.getSheetsData();
            int rows = 0;
            while (sheets.hasNext()) {
                try (InputStream sheet = sheets.next()) {
                    XMLStreamReader xml = XMLInputFactory.newFactory().createXMLStreamReader(sheet);
                    boolean headerSkipped = false;
                    while (xml.hasNext()) {
                        if (xml.next() == XMLStreamConstants.START_ELEMENT && "row".equals(xml.getLocalName())) {
                            if (!headerSkipped) {
                                headerSkipped = true;
                            } else if (++rows >= threshold) {
                                xml.close();
                                return Decision.LARGE;
                            }
                        }
                    }
                    xml.close();
                }
            }
            return Decision.SMALL;
        }
    }
}
