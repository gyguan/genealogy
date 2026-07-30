package com.genealogy.generation.repository;

import com.genealogy.generation.entity.GenerationSchemeEntity;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Compatibility persistence port used by Source/Culture target display logic.
 * The canonical write and query implementation is {@link GenSchemeRepository}.
 */
@Repository
public class GenerationSchemeRepository {

    private final GenSchemeRepository delegate;

    public GenerationSchemeRepository(GenSchemeRepository delegate) {
        this.delegate = delegate;
    }

    public Optional<GenerationSchemeEntity> findById(Long id) {
        return delegate.findById(id);
    }

    public Optional<GenerationSchemeEntity> findByIdAndClanId(Long id, Long clanId) {
        return delegate.findById(id)
                .filter(entity -> entity.getClanId().equals(clanId));
    }

    public boolean existsById(Long id) {
        return delegate.existsById(id);
    }
}
