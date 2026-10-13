package com.genealogy.auth.config;

import com.genealogy.auth.application.AuthApplicationService;
import com.genealogy.auth.dto.RegisterRequest;
import com.genealogy.auth.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthBootstrapAdminInitializerTest {

    private final AppUserRepository users = mock(AppUserRepository.class);
    private final AuthApplicationService auth = mock(AuthApplicationService.class);
    private final ApplicationArguments args = mock(ApplicationArguments.class);

    @Test
    void createsFirstAccountOnlyWhenUserTableIsEmptyAndConfigurationIsComplete() {
        AuthProperties properties = validProperties();
        when(users.existsAny()).thenReturn(false);

        initializer(properties).run(args);

        verify(auth).registerApproved(argThat(request ->
                "bootstrap-admin".equals(request.username())
                        && "A-strong-bootstrap-password".equals(request.password())
                        && "Initial Admin".equals(request.displayName())
                        && request.phone() == null
                        && request.email() == null
        ));
    }

    @Test
    void skipsBootstrapWhenAnyUserAlreadyExists() {
        AuthProperties properties = validProperties();
        when(users.existsAny()).thenReturn(true);

        initializer(properties).run(args);

        verify(auth, never()).registerApproved(org.mockito.ArgumentMatchers.any(RegisterRequest.class));
    }

    @Test
    void failsFastWhenBootstrapUsernameIsMissing() {
        AuthProperties properties = validProperties();
        properties.setBootstrapAdminUsername(" ");
        when(users.existsAny()).thenReturn(false);

        assertThatThrownBy(() -> initializer(properties).run(args))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GENEALOGY_AUTH_BOOTSTRAP_ADMIN_USERNAME");

        verify(auth, never()).registerApproved(org.mockito.ArgumentMatchers.any(RegisterRequest.class));
    }

    @Test
    void requiresStrongerBootstrapPasswordThanPublicRegistrationMinimum() {
        AuthProperties properties = validProperties();
        properties.setBootstrapAdminPassword("12345678");
        when(users.existsAny()).thenReturn(false);

        assertThatThrownBy(() -> initializer(properties).run(args))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("12 to 64");

        verify(auth, never()).registerApproved(org.mockito.ArgumentMatchers.any(RegisterRequest.class));
    }

    private AuthBootstrapAdminInitializer initializer(AuthProperties properties) {
        return new AuthBootstrapAdminInitializer(properties, users, auth);
    }

    private AuthProperties validProperties() {
        AuthProperties properties = new AuthProperties();
        properties.setBootstrapAdminEnabled(true);
        properties.setBootstrapAdminUsername("bootstrap-admin");
        properties.setBootstrapAdminPassword("A-strong-bootstrap-password");
        properties.setBootstrapAdminDisplayName("Initial Admin");
        return properties;
    }
}
