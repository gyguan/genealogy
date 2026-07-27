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

    @Around("execution(* com.genealogy.imports.application.ImportApplicationService.importPersonsCsv(..))")
    public Object guardPersonImport(ProceedingJoinPoint joinPoint) throws Throwable {
        Object[] args = joinPoint.getArgs();
        return guard(
                joinPoint,
                requiredLong(args, 0, "clanId"),
                requiredLong(args, 1, "branchId"),
                ImportJobEntity.TYPE_PERSON,
                requiredFile(args, 2),
                requiredLong(args, 4, "actorId")
        );
    }

    @Around("execution(* com.genealogy.imports.application.RelationshipImportApplicationService.importRelationships(..))")
    public Object guardRelationshipImport(ProceedingJoinPoint joinPoint) throws Throwable {
        Object[] args = joinPoint.getArgs();
        return guard(
                joinPoint,
                requiredLong(args, 0, "clanId"),
                requiredLong(args, 1, "branchId"),
                ImportJobEntity.TYPE_RELATIONSHIP,
                requiredFile(args, 2),
                requiredLong(args, 3, "actorId")
        );
    }

    @Around("execution(* com.genealogy.imports.application.SourceImportApplicationService.importSources(..))")
    public Object guardSourceImport(ProceedingJoinPoint joinPoint) throws Throwable {
        Object[] args = joinPoint.getArgs();
        return guard(
                joinPoint,
                requiredLong(args, 0, "clanId"),
                requiredLong(args, 1, "branchId"),
                ImportJobEntity.TYPE_SOURCE,
                requiredFile(args, 2),
                requiredLong(args, 3, "actorId")
        );
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

                ImportJobResponse completeResponse = importJobApplicationService.getJob(clanId, response.id(), actorId);
                transactionManager.commit(transaction);
                return completeResponse;
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

    private Long requiredLong(Object[] args, int index, String name) {
        if (args.length <= index || !(args[index] instanceof Long value) || value <= 0) {
            throw new BusinessException("IMPORT_IDEMPOTENCY_ARGUMENT_INVALID", "导入幂等参数无效：" + name);
        }
        return value;
    }

    private MultipartFile requiredFile(Object[] args, int index) {
        if (args.length <= index || !(args[index] instanceof MultipartFile file)) {
            throw new BusinessException("IMPORT_IDEMPOTENCY_ARGUMENT_INVALID", "导入幂等文件参数无效");
        }
        return file;
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
