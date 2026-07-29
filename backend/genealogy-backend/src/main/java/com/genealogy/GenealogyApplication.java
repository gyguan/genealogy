package com.genealogy;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.config.ProductionEnvironmentValidator;
import com.genealogy.person.application.PersonCodeRuleProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({PersonCodeRuleProperties.class, AuthProperties.class})
public class GenealogyApplication {

    public static void main(String[] args) {
        createApplication().run(args);
    }

    public static SpringApplication createApplication() {
        SpringApplication application = new SpringApplication(GenealogyApplication.class);
        ProductionEnvironmentValidator validator = new ProductionEnvironmentValidator();
        application.addInitializers(context -> validator.validate(context.getEnvironment()));
        return application;
    }
}
