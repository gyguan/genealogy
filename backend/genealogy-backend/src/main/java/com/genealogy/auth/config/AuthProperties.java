package com.genealogy.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "genealogy.auth")
public class AuthProperties {

    private boolean publicRegistrationEnabled = false;
    private boolean demoModeEnabled = false;
    private boolean exposeBearerToken = false;
    private boolean exposeResetToken = false;
    private boolean cookieSecure = false;
    private String cookieSameSite = "Strict";
    private String sessionCookieName = "GENEALOGY_SESSION";
    private String csrfCookieName = "GENEALOGY_CSRF";
    private int sessionHours = 8;
    private int rememberMeHours = 720;
    private int activityTouchMinutes = 5;
    private int loginWindowMinutes = 15;
    private int loginCooldownMinutes = 15;
    private int accountMaxFailures = 5;
    private int ipMaxFailures = 20;
    private long sessionCleanupIntervalMs = 3600000L;
    private int sessionRetentionDays = 30;
    private int inviteHours = 72;
    private int resetMinutes = 30;
    private String resetBaseUrl = "http://localhost:5179/?auth=reset&resetToken=";
    private String resetDeliveryUrl;

    public int sessionHours(boolean rememberMe) {
        return rememberMe ? rememberMeHours : sessionHours;
    }
}
