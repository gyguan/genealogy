package com.genealogy.source.attachment.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
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

    private static final Path ROOT = Path.of("data", "uploads", "sources").toAbsolutePath().normalize();
    public static final String ATTACHMENT_VIEW = "attachment:view";
    public static final String ATTACHMENT_UPLOAD = "attachment:upload";
    public static final String ATTACHMENT_PREVIEW = "attachment:preview";
    public static final String ATTACHMENT_DOWNLOAD = "attachment:download";
    public static final String ATTACHMENT_DELETE = "attachment:delete";

    private final SourceRepository sourceRepository;
    private final SourceAttachmentRepository sourceAttachmentRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public SourceAttachmentApplicationService(
            SourceRepository sourceRepository,
            SourceAttachmentRepository sourceAttachmentRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.sourceRepository = sourceRepository;
        this.sourceAttachmentRepository = sourceAttachmentRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional
    public SourceAttachmentResponse upload(Long sourceId, MultipartFile file, Long actorId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("SOURCE_ATTACHMENT_EMPTY", "附件不能为空");
        }
        SourceEntity source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "资料来源不存在"));
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, ATTACHMENT_UPLOAD);
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename());
        String ext = extension(originalFilename);
        String storedFilename = UUID.randomUUID() + ext;
        Path dir = ROOT.resolve(String.valueOf(sourceId)).normalize();
        Path target = dir.resolve(storedFilename).normalize();
        if (!target.startsWith(ROOT)) {
            throw new BusinessException("SOURCE_ATTACHMENT_PATH_INVALID", "附件存储路径非法");
        }
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
        SourceAttachmentEntity saved = sourceAttachmentRepository.save(entity);
        operationLogApplicationService.record(source.getClanId(), actorId, "attachment_upload", "source_attachment", saved.getId(), "上传来源附件：" + saved.getOriginalFilename(), null);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SourceAttachmentResponse> list(Long sourceId) {
        SourceEntity source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "资料来源不存在"));
        authorizationApplicationService.requirePermission(source.getClanId(), null, ATTACHMENT_VIEW);
        return listInternal(sourceId);
    }

    @Transactional(readOnly = true)
    public List<SourceAttachmentResponse> list(Long sourceId, Long actorId) {
        SourceEntity source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "资料来源不存在"));
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, ATTACHMENT_VIEW);
        return listInternal(sourceId);
    }

    @Transactional(readOnly = true)
    public AttachmentFile readFile(Long attachmentId) {
        return readFile(attachmentId, null, ATTACHMENT_DOWNLOAD);
    }

    @Transactional(readOnly = true)
    public AttachmentFile readFile(Long attachmentId, Long actorId, String permissionCode) {
        SourceAttachmentEntity entity = getActive(attachmentId);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, permissionCode == null ? ATTACHMENT_DOWNLOAD : permissionCode);
        Path path = Path.of(entity.getStoragePath()).toAbsolutePath().normalize();
        if (!path.startsWith(ROOT) || !Files.exists(path)) {
            throw new BusinessException("SOURCE_ATTACHMENT_FILE_NOT_FOUND", "附件文件不存在");
        }
        try {
            return new AttachmentFile(Files.readAllBytes(path), entity.getOriginalFilename(), entity.getContentType(), entity.getClanId(), entity.getId());
        } catch (IOException ex) {
            throw new BusinessException("SOURCE_ATTACHMENT_READ_FAILED", "附件读取失败");
        }
    }

    @Transactional
    public void remove(Long attachmentId) {
        remove(attachmentId, null);
    }

    @Transactional
    public void remove(Long attachmentId, Long actorId) {
        SourceAttachmentEntity entity = getActive(attachmentId);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, ATTACHMENT_DELETE);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setUploadStatus("deleted");
        sourceAttachmentRepository.save(entity);
        operationLogApplicationService.record(entity.getClanId(), actorId, "attachment_delete", "source_attachment", entity.getId(), "删除来源附件：" + entity.getOriginalFilename(), null);
    }

    private List<SourceAttachmentResponse> listInternal(Long sourceId) {
        return sourceAttachmentRepository.findBySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(sourceId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private SourceAttachmentEntity getActive(Long attachmentId) {
        return sourceAttachmentRepository.findByIdAndDeletedAtIsNull(attachmentId)
                .orElseThrow(() -> new BusinessException("SOURCE_ATTACHMENT_NOT_FOUND", "附件不存在或已删除"));
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

    public record AttachmentFile(byte[] content, String filename, String contentType, Long clanId, Long attachmentId) {}

    private static final class OutputStreamSink extends java.io.OutputStream {
        private static final OutputStreamSink INSTANCE = new OutputStreamSink();
        @Override public void write(int b) { }
        @Override public void write(byte[] b, int off, int len) { }
    }
}
