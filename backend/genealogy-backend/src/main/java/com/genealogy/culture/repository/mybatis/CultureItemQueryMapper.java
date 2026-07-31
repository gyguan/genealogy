package com.genealogy.culture.repository.mybatis;

import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.query.CultureItemSearchRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CultureItemQueryMapper {
    List<CultureItemEntity> search(@Param("criteria") CultureItemSearchRow criteria, @Param("offset") long offset, @Param("limit") int limit);
    long count(@Param("criteria") CultureItemSearchRow criteria);
}
