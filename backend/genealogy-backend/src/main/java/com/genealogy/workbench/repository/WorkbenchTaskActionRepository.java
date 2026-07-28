package com.genealogy.workbench.repository;

import com.genealogy.workbench.entity.WorkbenchTaskActionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkbenchTaskActionRepository extends JpaRepository<WorkbenchTaskActionEntity, Long> {

    Optional<WorkbenchTaskActionEntity> findByClanIdAndTaskKeyAndActionType(
            Long clanId,
            String taskKey,
            String actionType
    );

    List<WorkbenchTaskActionEntity> findByClanIdAndActionType(Long clanId, String actionType);
}
