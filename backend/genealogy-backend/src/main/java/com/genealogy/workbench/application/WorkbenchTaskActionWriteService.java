package com.genealogy.workbench.application;

import com.genealogy.workbench.entity.WorkbenchTaskActionEntity;
import com.genealogy.workbench.repository.WorkbenchTaskActionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkbenchTaskActionWriteService {

    private final WorkbenchTaskActionRepository repository;

    public WorkbenchTaskActionWriteService(WorkbenchTaskActionRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public WorkbenchTaskActionEntity insert(WorkbenchTaskActionEntity entity) {
        return repository.saveAndFlush(entity);
    }
}
