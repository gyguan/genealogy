package com.genealogy.generation.repository;

import com.genealogy.generation.entity.GenerationWordEntity;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Compatibility persistence port used by Source/Culture target display logic.
 * The canonical write and query implementation is {@link GenWordRepository}.
 */
@Repository
public class GenerationWordRepository {

    private final GenWordRepository delegate;

    public GenerationWordRepository(GenWordRepository delegate) {
        this.delegate = delegate;
    }

    public Optional<GenerationWordEntity> findById(Long id) {
        return delegate.findById(id);
    }

    public boolean existsById(Long id) {
        return delegate.findById(id).isPresent();
    }
}
