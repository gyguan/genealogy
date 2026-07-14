package com.genealogy;

import com.genealogy.auth.config.AuthProperties;
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
        SpringApplication.run(GenealogyApplication.class, args);
    }
}
