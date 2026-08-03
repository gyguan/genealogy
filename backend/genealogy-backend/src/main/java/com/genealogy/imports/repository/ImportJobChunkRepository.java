package com.genealogy.imports.repository;
import com.genealogy.imports.entity.ImportJobChunkEntity; import com.genealogy.imports.repository.mybatis.ImportJobChunkPersistenceMapper;
import org.springframework.dao.OptimisticLockingFailureException; import org.springframework.stereotype.Repository; import org.springframework.transaction.annotation.Transactional; import java.util.*;
@Repository @Transactional(readOnly=true) public class ImportJobChunkRepository { private final ImportJobChunkPersistenceMapper mapper; public ImportJobChunkRepository(ImportJobChunkPersistenceMapper mapper){this.mapper=mapper;}
 @Transactional public ImportJobChunkEntity save(ImportJobChunkEntity e){Objects.requireNonNull(e); if(e.getId()==null){if(e.getVersion()==null)e.setVersion(0L); mapper.insert(e);} else {long v=e.getVersion()==null?0:e.getVersion(); if(mapper.updateWithVersion(e)!=1) throw new OptimisticLockingFailureException("Import chunk version conflict"); e.setVersion(v+1);} return e;}
 public Optional<ImportJobChunkEntity> findByJobIdAndStageAndChunkNo(Long j,String s,Integer c){return Optional.ofNullable(mapper.findByJobStageChunk(j,s,c));}
}
