package com.genealogy.imports.repository;
import com.genealogy.imports.entity.ImportJobPayloadEntity; import com.genealogy.imports.repository.mybatis.ImportJobPayloadPersistenceMapper;
import org.springframework.stereotype.Repository; import org.springframework.transaction.annotation.Transactional; import java.util.*;
@Repository @Transactional(readOnly=true) public class ImportJobPayloadRepository { private final ImportJobPayloadPersistenceMapper mapper; public ImportJobPayloadRepository(ImportJobPayloadPersistenceMapper mapper){this.mapper=mapper;}
 @Transactional public ImportJobPayloadEntity save(ImportJobPayloadEntity e){Objects.requireNonNull(e); if(mapper.selectById(e.getJobId())==null) mapper.insert(e); else if(mapper.updateAllById(e)!=1) throw new IllegalStateException("Payload update failed"); return e;}
 public Optional<ImportJobPayloadEntity> findById(Long id){return Optional.ofNullable(mapper.selectById(id));} public boolean existsById(Long id){return id!=null&&mapper.selectById(id)!=null;} @Transactional public void deleteById(Long id){if(id!=null) mapper.deleteById(id);}
}
