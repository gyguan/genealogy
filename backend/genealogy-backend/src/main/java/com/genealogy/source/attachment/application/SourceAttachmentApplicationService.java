package com.genealogy.source.attachment.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.source.attachment.dto.SourceAttachmentResponse;
import com.genealogy.source.attachment.entity.SourceAttachmentEntity;
import com.genealogy.source.attachment.repository.SourceAttachmentRepository;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class SourceAttachmentApplicationService {

    private static final Path ROOT = Path.of("data", "uploads", "sources");

    private final SourceRepository sourceRepository;
    private final SourceAttachmentRepository sourceAttachmentRepository;

    public SourceAttachmentApplicationService(SourceRepository sourceRepository, SourceAttachmentRepository sourceAttachmentRepository) {
        this.sourceRepository = sourceRepository;
        this.sourceAttachmentRepository = sourceAttachmentRepository;
    }

    @Transactional
    public SourceAttachmentResponse upload(Long sourceId, MultipartFile file, Long actorId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("SOURCE_ATTACHMENT_EMPTY", "附件不能为空");
        }
        SourceEntity source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "资料来源不存在"));
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename());
        String ext = extension(originalFilename);
        String storedFilename = UUID.randomUUID() + ext;
        Path dir = ROOT.resolve(String.valueOf(sourceId));
        Path target = dir.resolve(storedFilename);
        try {
            Files.createDirectories(dir);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BusinessException("SOURCE_ATTACHMENT_UPLOAD_FAILED", "附件保存失败");
        }

        SourceAttachmentEntity entity = new SourceAttachmentEntity();
        entity.setSourceId(sourceId);
        entity.setClanId(source.getClanId());
        entity.setOriginalFilename(originalFilename);
        entity.setStoredFilename(storedFilename);
        entity.setContentType(file.getContentType());
        entity.setFileSize(file.getSize());
        entity.setStoragePath(target.toString());
        entity.setChecksum(sha256(target));
        entity.setUploadStatus("uploaded");
        entity.setCreatedBy(actorId);
        entity.setCreatedAt(LocalDateTime.now());
        return toResponse(sourceAttachmentRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<SourceAttachmentResponse> list(Long sourceId) {
        return sourceAttachmentRepository.findBySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(sourceId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private String extension(String filename) {
        int index = filename.lastIndexOf('.');
        if (index < 0 || index == filename.length() - 1) {
            return "";
        }
        return filename.substring(index).toLowerCase();
    }

    private String sha256(Path path) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream inputStream = Files.newInputStream(path); DigestInputStream digestInputStream = new DigestInputStream(inputStream, digest)) {
                digestInputStream.transferTo(OutputStreamSink.INSTANCE);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (IOException | NoSuchAlgorithmException ex) {
            return null;
        }
    }

    private SourceAttachmentResponse toResponse(SourceAttachmentEntity entity) {
        return new SourceAttachmentResponse(
                entity.getId(), entity.getSourceId(), entity.getClanId(), entity.getOriginalFilename(), entity.getStoredFilename(),
                entity.getContentType(), entity.getFileSize(), entity.getStoragePath(), entity.getChecksum(), entity.getUploadStatus(), entity.getCreatedAt()
        );
    }

    private static final class OutputStreamSink extends java.io.OutputStream {
        private static final OutputStreamSink INSTANCE = new OutputStreamSink();
        @Override public void write(int b) { }
        @Override public void write(byte[] b, int off, int len) { }
    }
}
