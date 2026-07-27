package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.entity.ImportFileFingerprintEntity;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportFileFingerprintRepository;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ImportFileIdempotencyAspect {

    private final ImportFileFingerprintRepository fingerprintRepository;
    private final ImportJobApplicationService importJobApplicationService;
    private final PlatformTransactionManager transactionManager;
    private final ConcurrentHashMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    public ImportFileIdempotencyAspect(
            ImportFileFingerprintRepository fingerprintRepository,
            ImportJobApplicationService importJobApplicationService,
            PlatformTransactionManager transactionManager
    ) {
        this.fingerprintRepository = fingerprintRepository;
        this.importJobApplicationService = importJobApplicationService;
        this.transactionManager = transactionManager;
    }

    @Around("execution(* com.genealogy.imports.application.ImportApplicationService.importPersonsCsv(..))"
            + " && args(clanId, branchId, file, confirmDuplicates, actorId)")
    public Object guardPersonImport(
            ProceedingJoinPoint joinPoint,
            Long clanId,
            Long branchId,
            MultipartFile file,
            boolean confirmDuplicates,
            Long actorId
    ) throws Throwable {
        return guard(joinPoint, clanId, branchId, ImportJobEntity.TYPE_PERSON, file, actorId);
    }

    @Around("execution(* com.genealogy.imports.application.RelationshipImportApplicationService.importRelationships(..))"
            + " && args(clanId, branchId, file, actorId)")
    public Object guardRelationshipImport(
            ProceedingJoinPoint joinPoint,
            Long clanId,
            Long branchId,
            MultipartFile file,
            Long actorId
    ) throws Throwable {
        return guard(joinPoint, clanId, branchId, ImportJobEntity.TYPE_RELATIONSHIP, file, actorId);
    }

    @Around("execution(* com.genealogy.imports.application.SourceImportApplicationService.importSources(..))"
            + " && args(clanId, branchId, file, actorId)")
    public Object guardSourceImport(
            ProceedingJoinPoint joinPoint,
            Long clanId,
            Long branchId,
            MultipartFile file,
            Long actorId
    ) throws Throwable {
        return guard(joinPoint, clanId, branchId, ImportJobEntity.TYPE_SOURCE, file, actorId);
    }

    private Object guard(
            ProceedingJoinPoint joinPoint,
            Long clanId,
            Long branchId,
            String importType,
            MultipartFile file,
            Long actorId
    ) throws Throwable {
        String fileHash = sha256(file);
        String lockKey = clanId + ":" + branchId + ":" + importType + ":" + fileHash;
        ReentrantLock lock = locks.computeIfAbsent(lockKey, ignored -> new ReentrantLock());
        lock.lock();
        try {
            DefaultTransactionDefinition definition = new DefaultTransactionDefinition();
            TransactionStatus transaction = transactionManager.getTransaction(definition);
            try {
                ImportFileFingerprintEntity existing = fingerprintRepository
                        .findByClanIdAndBranchIdAndImportTypeAndFileHash(clanId, branchId, importType, fileHash)
                        .orElse(null);
                if (existing != null) {
                    ImportJobResponse response = importJobApplicationService.getJob(clanId, existing.getJobId(), actorId);
                    transactionManager.commit(transaction);
                    return response;
                }

                Object result = joinPoint.proceed();
                if (!(result instanceof ImportJobResponse response) || response.id() == null) {
                    throw new BusinessException("IMPORT_IDEMPOTENCY_RESULT_INVALID", "导入服务未返回有效批次");
                }

                ImportFileFingerprintEntity fingerprint = new ImportFileFingerprintEntity();
                fingerprint.setClanId(clanId);
                fingerprint.setBranchId(branchId);
                fingerprint.setImportType(importType);
                fingerprint.setFileHash(fileHash);
                fingerprint.setJobId(response.id());
                fingerprint.setCreatedAt(LocalDateTime.now());
                fingerprintRepository.saveAndFlush(fingerprint);
                transactionManager.commit(transaction);
                return result;
            } catch (Throwable throwable) {
                if (!transaction.isCompleted()) {
                    transactionManager.rollback(transaction);
                }
                throw throwable;
            }
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                locks.remove(lockKey, lock);
            }
        }
    }

    private String sha256(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(file.getBytes()));
        } catch (IOException exception) {
            throw new BusinessException("IMPORT_FILE_HASH_FAILED", "导入文件读取失败，无法生成幂等指纹");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", exception);
        }
    }
}
