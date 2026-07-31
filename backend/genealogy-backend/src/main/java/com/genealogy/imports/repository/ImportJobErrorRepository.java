package com.genealogy.imports.repository;
import com.genealogy.imports.entity.ImportJobErrorEntity; import com.genealogy.imports.repository.mybatis.ImportJobErrorPersistenceMapper;
import org.springframework.stereotype.Repository; import org.springframework.transaction.annotation.Transactional; import java.util.*;
@Repository @Transactional(readOnly=true) public class ImportJobErrorRepository { private final ImportJobErrorPersistenceMapper mapper; public ImportJobErrorRepository(ImportJobErrorPersistenceMapper mapper){this.mapper=mapper;}
 @Transactional public ImportJobErrorEntity save(ImportJobErrorEntity e){Objects.requireNonNull(e); if(e.getId()==null) mapper.insert(e); else if(mapper.updateAllById(e)!=1) throw new IllegalStateException("Import error update failed"); return e;}
 @Transactional public List<ImportJobErrorEntity> saveAll(Collection<ImportJobErrorEntity> es){return es==null?List.of():es.stream().map(this::save).toList();}
 public List<ImportJobErrorEntity> findByJobIdOrderByRowNoAsc(Long id){return mapper.findByJobId(id);} public Optional<ImportJobErrorEntity> findFirstByJobIdAndRowNo(Long j,Integer r){return Optional.ofNullable(mapper.findFirstByJobIdAndRowNo(j,r));}
 @Transactional public void deleteByJobIdAndRowNo(Long j,Integer r){mapper.deleteByJobIdAndRowNo(j,r);}
}
