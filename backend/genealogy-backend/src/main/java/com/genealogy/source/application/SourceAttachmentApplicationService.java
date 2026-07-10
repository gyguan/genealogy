package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.source.dto.SourceAttachmentFileResponse;
import com.genealogy.source.dto.SourceAttachmentResponse;
import com.genealogy.source.entity.SourceAttachmentEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class SourceAttachmentApplicationService {

    private static final String SOURCE_VIEW = "source:view";
    private static final String ATTACHMENT_UPLOAD = "attachment:upload";
    private static final String ATTACHMENT_VIEW = "attachment:view";
    private static final String ATTACHMENT_PREVIEW = "attachment:preview";
    private static final String ATTACHMENT_DOWNLOAD = "attachment:download";
    private static final String ATTACHMENT_DELETE = "attachment:delete";
    private static final String PRIVACY_CLAN_ONLY = "clan_only";
    private static final String SENSITIVE_NORMAL = "normal";
    private static final String SENSITIVE_HIGHLY = "highly_sensitive";
    private static final Set<String> PRIVACY_LEVELS = Set.of("public", PRIVACY_CLAN_ONLY, "branch_only", "relatives_only", "private", "sealed");
    private static final Set<String> SENSITIVE_LEVELS = Set.of(SENSITIVE_NORMAL, "sensitive", SENSITIVE_HIGHLY);
    private static final long MAX_FILE_SIZE_BYTES = 20L * 1024L * 1024L;

    private final SourceRepository sourceRepository;
    private final SourceAttachmentRepository sourceAttachmentRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final Path storageRoot;

    public SourceAttachmentApplicationService(
            SourceRepository sourceRepository,
            SourceAttachmentRepository sourceAttachmentRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            @Value("${genealogy.source-attachment.storage-root:data/source-attachments}") String storageRoot
    ) {
        this.sourceRepository = sourceRepository;
        this.sourceAttachmentRepository = sourceAttachmentRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.storageRoot = Path.of(storageRoot).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public PageResponse<SourceAttachmentResponse> listBySource(Long sourceId, int pageNo, int pageSize, Long actorId) {
        SourceEntity source = getSource(sourceId);
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, SOURCE_VIEW);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SourceAttachmentResponse> page = sourceAttachmentRepository.findBySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(sourceId, pageRequest)
                .map(attachment -> toResponse(attachment, actorId));
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional
    public SourceAttachmentResponse upload(Long sourceId, MultipartFile file, String privacyLevel, String sensitiveLevel, Long actorId, String requestId, String clientIp) {
        SourceEntity source = getSource(sourceId);
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, SOURCE_VIEW);
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, ATTACHMENT_UPLOAD);
        validateFile(file);

        String normalizedPrivacy = normalizePrivacyLevel(privacyLevel);
        String normalizedSensitive = normalizeSensitiveLevel(sensitiveLevel);
        String originalFilename = sanitizeOriginalFilename(file.getOriginalFilename());
        String storedFilename = UUID.randomUUID() + "-" + originalFilename;
        Path targetDirectory = storageRoot.resolve(String.valueOf(source.getClanId())).resolve(String.valueOf(sourceId)).normalize();
        Path targetPath = targetDirectory.resolve(storedFilename).normalize();
        if (!targetPath.startsWith(storageRoot)) {
            throw new BusinessException("SOURCE_ATTACHMENT_PATH_INVALID", "附件存储路径不合法");
        }

        try {
            Files.createDirectories(targetDirectory);
            byte[] content = file.getBytes();
            Files.write(targetPath, content);
            SourceAttachmentEntity entity = new SourceAttachmentEntity();
            entity.setSourceId(sourceId);
            entity.setClanId(source.getClanId());
            entity.setOriginalFilename(originalFilename);
            entity.setStoredFilename(storedFilename);
            entity.setContentType(normalizeContentType(file.getContentType()));
            entity.setFileSize(file.getSize());
            entity.setStoragePath(targetPath.toString());
            entity.setChecksum(sha256(content));
            entity.setUploadStatus("uploaded");
            entity.setPrivacyLevel(normalizedPrivacy);
            entity.setSensitiveLevel(normalizedSensitive);
            entity.setCreatedBy(actorId);
            entity.setCreatedAt(LocalDateTime.now());
            SourceAttachmentEntity saved = sourceAttachmentRepository.save(entity);
            operationLogApplicationService.record(source.getClanId(), actorId, "source_attachment_upload", "source_attachment", saved.getId(), "upload source attachment: " + originalFilename, "sourceId=" + sourceId + "; privacyLevel=" + normalizedPrivacy + "; sensitiveLevel=" + normalizedSensitive, requestId, clientIp);
            return toResponse(saved, actorId);
        } catch (IOException exception) {
            throw new BusinessException("SOURCE_ATTACHMENT_STORAGE_FAILED", "附件保存失败");
        }
    }

    @Transactional(readOnly = true)
    public SourceAttachmentFileResponse preview(Long attachmentId, Long actorId, String requestId, String clientIp) {
        SourceAttachmentEntity attachment = getAttachment(attachmentId);
        requirePreviewPermission(attachment, actorId);
        SourceAttachmentFileResponse response = readFile(attachment);
        operationLogApplicationService.record(attachment.getClanId(), actorId, "source_attachment_preview", "source_attachment", attachment.getId(), "preview source attachment: " + attachment.getOriginalFilename(), "sourceId=" + attachment.getSourceId(), requestId, clientIp);
        return response;
    }

    @Transactional(readOnly = true)
    public SourceAttachmentFileResponse download(Long attachmentId, Long actorId, String requestId, String clientIp) {
        SourceAttachmentEntity attachment = getAttachment(attachmentId);
        requireDownloadPermission(attachment, actorId);
        SourceAttachmentFileResponse response = readFile(attachment);
        operationLogApplicationService.record(attachment.getClanId(), actorId, "source_attachment_download", "source_attachment", attachment.getId(), "download source attachment: " + attachment.getOriginalFilename(), "sourceId=" + attachment.getSourceId(), requestId, clientIp);
        return response;
    }

    @Transactional
    public void delete(Long attachmentId, Long actorId, String requestId, String clientIp) {
        SourceAttachmentEntity attachment = getAttachment(attachmentId);
        authorizationApplicationService.requirePermission(attachment.getClanId(), actorId, ATTACHMENT_DELETE);
        attachment.setDeletedAt(LocalDateTime.now());
        sourceAttachmentRepository.save(attachment);
        operationLogApplicationService.record(attachment.getClanId(), actorId, "source_attachment_delete", "source_attachment", attachment.getId(), "delete source attachment: " + attachment.getOriginalFilename(), "sourceId=" + attachment.getSourceId(), requestId, clientIp);
    }

    private SourceEntity getSource(Long sourceId) {
        return sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "source not found"));
    }

    private SourceAttachmentEntity getAttachment(Long attachmentId) {
        return sourceAttachmentRepository.findByIdAndDeletedAtIsNull(attachmentId)
                .orElseThrow(() -> new BusinessException("SOURCE_ATTACHMENT_NOT_FOUND", "附件不存在"));
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("SOURCE_ATTACHMENT_EMPTY", "附件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException("SOURCE_ATTACHMENT_TOO_LARGE", "附件大小不能超过20MB");
        }
    }

    private void requirePreviewPermission(SourceAttachmentEntity attachment, Long actorId) {
        boolean allowed = authorizationApplicationService.can(attachment.getClanId(), actorId, ATTACHMENT_PREVIEW)
                || authorizationApplicationService.can(attachment.getClanId(), actorId, ATTACHMENT_VIEW)
                || authorizationApplicationService.can(attachment.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
        if (SENSITIVE_HIGHLY.equals(attachment.getSensitiveLevel())) {
            allowed = authorizationApplicationService.can(attachment.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
        }
        if (!allowed) {
            throw new BusinessException("SOURCE_ATTACHMENT_PREVIEW_FORBIDDEN", "您暂无附件预览权限");
        }
    }

    private void requireDownloadPermission(SourceAttachmentEntity attachment, Long actorId) {
        authorizationApplicationService.requirePermission(attachment.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
    }

    private SourceAttachmentFileResponse readFile(SourceAttachmentEntity attachment) {
        Path path = Path.of(attachment.getStoragePath()).toAbsolutePath().normalize();
        if (!path.startsWith(storageRoot)) {
            throw new BusinessException("SOURCE_ATTACHMENT_PATH_INVALID", "附件存储路径不合法");
        }
        if (!Files.exists(path)) {
            throw new BusinessException("SOURCE_ATTACHMENT_FILE_MISSING", "附件文件不存在");
        }
        try {
            byte[] content = Files.readAllBytes(path);
            return new SourceAttachmentFileResponse(attachment.getId(), attachment.getOriginalFilename(), normalizeContentType(attachment.getContentType()), content.length, content);
        } catch (IOException exception) {
            throw new BusinessException("SOURCE_ATTACHMENT_READ_FAILED", "附件读取失败");
        }
    }

    private SourceAttachmentResponse toResponse(SourceAttachmentEntity entity, Long actorId) {
        return new SourceAttachmentResponse(
                entity.getId(),
                entity.getSourceId(),
                entity.getClanId(),
                entity.getOriginalFilename(),
                entity.getContentType(),
                entity.getFileSize(),
                normalizePrivacyLevel(entity.getPrivacyLevel()),
                normalizeSensitiveLevel(entity.getSensitiveLevel()),
                entity.getUploadStatus(),
                canPreview(entity, actorId),
                canDownload(entity, actorId),
                entity.getCreatedBy(),
                entity.getCreatedAt()
        );
    }

    private boolean canPreview(SourceAttachmentEntity entity, Long actorId) {
        boolean allowed = authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_PREVIEW)
                || authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_VIEW)
                || authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
        if (SENSITIVE_HIGHLY.equals(normalizeSensitiveLevel(entity.getSensitiveLevel()))) {
            return authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
        }
        return allowed;
    }

    private boolean canDownload(SourceAttachmentEntity entity, Long actorId) {
        return authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
    }

    private String normalizePrivacyLevel(String value) {
        String normalized = normalizeEnum(value, PRIVACY_CLAN_ONLY);
        if (!PRIVACY_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_ATTACHMENT_PRIVACY_INVALID", "附件隐私级别不合法");
        }
        return normalized;
    }

    private String normalizeSensitiveLevel(String value) {
        String normalized = normalizeEnum(value, SENSITIVE_NORMAL);
        if (!SENSITIVE_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_ATTACHMENT_SENSITIVE_INVALID", "附件敏感级别不合法");
        }
        return normalized;
    }

    private String normalizeEnum(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "application/octet-stream";
        }
        return contentType;
    }

    private String sanitizeOriginalFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "attachment.bin";
        }
        String sanitized = originalFilename.replace('\\', '/');
        int lastSlash = sanitized.lastIndexOf('/');
        sanitized = lastSlash >= 0 ? sanitized.substring(lastSlash + 1) : sanitized;
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9._\\u4e00-\\u9fa5-]", "_");
        return sanitized.isBlank() ? "attachment.bin" : sanitized;
    }

    private String sha256(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new BusinessException("SOURCE_ATTACHMENT_CHECKSUM_FAILED", "附件校验值计算失败");
        }
    }
}
