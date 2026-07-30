package com.genealogy.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MyBatis-Plus configuration for the staged JPA/MyBatis migration.
 *
 * <p>Only interfaces explicitly annotated with {@link Mapper} are scanned so
 * Spring Data repositories remain managed by JPA during the dual-stack phase.
 * Both stacks reuse Spring Boot's single DataSource and transaction manager.</p>
 */
@Configuration
@MapperScan(basePackages = "com.genealogy", annotationClass = Mapper.class)
public class MybatisPlusConfiguration {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.POSTGRE_SQL));
        return interceptor;
    }
}
