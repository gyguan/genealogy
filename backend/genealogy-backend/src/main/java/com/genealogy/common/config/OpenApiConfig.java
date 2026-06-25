package com.genealogy.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI genealogyOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Genealogy API")
                        .description("中国式族谱系统 MVP 1 后端接口")
                        .version("0.1.0"));
    }
}
