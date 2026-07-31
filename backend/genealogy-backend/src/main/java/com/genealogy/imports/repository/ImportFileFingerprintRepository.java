package com.genealogy.imports.repository;
import com.genealogy.imports.entity.ImportFileFingerprintEntity;
import com.genealogy.imports.repository.mybatis.ImportFileFingerprintPersistenceMapper;
import org.springframework.stereotype.Repository; import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Repository @Transactional(readOnly=true) public class ImportFileFingerprintRepository {
 private final ImportFileFingerprintPersistenceMapper mapper; public ImportFileFingerprintRepository(ImportFileFingerprintPersistenceMapper mapper){this.mapper=mapper;}
 @Transactional public ImportFileFingerprintEntity save(ImportFileFingerprintEntity e){Objects.requireNonNull(e); if(e.getId()==null) mapper.insert(e); else requireOne(mapper.updateAllById(e)); return e;}
 @Transactional public ImportFileFingerprintEntity saveAndFlush(ImportFileFingerprintEntity e){return save(e);}
 public Optional<ImportFileFingerprintEntity> findByClanIdAndBranchIdAndImportTypeAndFileHash(Long c,Long b,String t,String h){return Optional.ofNullable(mapper.findExisting(c,b,t,h));}
 private void requireOne(int n){if(n!=1) throw new IllegalStateException("Fingerprint update failed");}
}
