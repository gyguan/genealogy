package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.source.dto.AttachmentCreateRequest;
import com.genealogy.source.dto.AttachmentFileDownload;
import com.genealogy.source.dto.AttachmentResponse;
import com.genealogy.source.entity.AttachmentEntity;
import com.genealogy.source.repository.AttachmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;

@Service
public class AttachmentFileApplicationService {

    private static final long MAX_FILE_SIZE = 20L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain"
    );

    private final SourceEvidenceApplicationService sourceEvidenceApplicationService;
    private final AttachmentRepository attachmentRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final Path storageRoot;

    public AttachmentFileApplicationService(
            SourceEvidenceApplicationService sourceEvidenceApplicationService,
            AttachmentRepository attachmentRepository,
            AuthorizationApplicationService authorizationApplicationService,
            @Value("${genealogy.attachment.storage-root:./data/attachments}") String storageRoot
    ) {
        this.sourceEvidenceApplicationService = sourceEvidenceApplicationService;
        this.attachmentRepository = attachmentRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.storageRoot = Paths.get(storageRoot).toAbsolutePath().normalize();
    }

    @Transactional
    public AttachmentResponse upload(Long clanId, Long sourceId, MultipartFile file, Long actorId, String accessLevel) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        validateFile(file);
        byte[] content = readBytes(file);
        String checksum = sha256(content);
        String originalName = safeFileName(file.getOriginalFilename());
        String contentType = defaultIfBlank(file.getContentType(), "application/octet-stream");
        String relativePath = buildRelativePath(clanId, originalName);
        Path target = storageRoot.resolve(relativePath).normalize();
        if (!target.startsWith(storageRoot)) {
            throw new BusinessException("ATTACHMENT_PATH_INVALID", "附件路径非法");
        }
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException ex) {
            throw new BusinessException("ATTACHMENT_WRITE_FAILED", "附件写入失败");
        }

        AttachmentCreateRequest request = new AttachmentCreateRequest(
                clanId,
                sourceId,
                originalName,
                contentType,
                (long) content.length,
                relativePath,
                null,
                checksum,
                actorId,
                accessLevel
        );
        return sourceEvidenceApplicationService.createAttachment(request);
    }

    @Transactional(readOnly = true)
    public AttachmentFileDownload download(Long attachmentId, Long actorId) {
        AttachmentEntity attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BusinessException("ATTACHMENT_NOT_FOUND", "附件不存在"));
        authorizationApplicationService.requireClanMember(attachment.getClanId(), actorId);
        Path target = storageRoot.resolve(attachment.getStoragePath()).normalize();
        if (!target.startsWith(storageRoot) || !Files.exists(target)) {
            throw new BusinessException("ATTACHMENT_FILE_NOT_FOUND", "附件文件不存在");
        }
        try {
            return new AttachmentFileDownload(attachment.getFileName(), attachment.getFileType(), Files.readAllBytes(target));
        } catch (IOException ex) {
            throw new BusinessException("ATTACHMENT_READ_FAILED", "附件读取失败");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("ATTACHMENT_FILE_EMPTY", "附件文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("ATTACHMENT_FILE_TOO_LARGE", "附件文件不能超过20MB");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank() && !ALLOWED_TYPES.contains(contentType)) {
            throw new BusinessException("ATTACHMENT_FILE_TYPE_UNSUPPORTED", "不支持的附件类型");
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new BusinessException("ATTACHMENT_READ_FAILED", "附件读取失败");
        }
    }

    private String buildRelativePath(Long clanId, String fileName) {
        String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String ext = extension(fileName);
        return "clan-" + clanId + "/" + datePart + "/" + UUID.randomUUID() + ext;
    }

    private String safeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "attachment";
        }
        return Paths.get(fileName).getFileName().toString().replaceAll("[\\r\\n]", "").trim();
    }

    private String extension(String fileName) {
        int index = fileName.lastIndexOf('.');
        if (index < 0 || index == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(index);
    }

    private String sha256(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(content));
        } catch (Exception ex) {
            throw new BusinessException("ATTACHMENT_CHECKSUM_FAILED", "附件校验值计算失败");
        }
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }
}
