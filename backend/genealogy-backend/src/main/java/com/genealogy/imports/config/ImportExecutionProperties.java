package com.genealogy.imports.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "genealogy.import.execution")
public class ImportExecutionProperties {

    private long asyncFileBytesThreshold = 5L * 1024L * 1024L;
    private int chunkSize = 200;
    private int maxRetries = 3;
    private int leaseSeconds = 60;
    private long pollDelayMs = 1000L;

    public long getAsyncFileBytesThreshold() {
        return asyncFileBytesThreshold;
    }

    public void setAsyncFileBytesThreshold(long asyncFileBytesThreshold) {
        this.asyncFileBytesThreshold = Math.max(1L, asyncFileBytesThreshold);
    }

    public int getChunkSize() {
        return chunkSize;
    }

    public void setChunkSize(int chunkSize) {
        this.chunkSize = Math.max(1, chunkSize);
    }

    public int getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(int maxRetries) {
        this.maxRetries = Math.max(1, maxRetries);
    }

    public int getLeaseSeconds() {
        return leaseSeconds;
    }

    public void setLeaseSeconds(int leaseSeconds) {
        this.leaseSeconds = Math.max(10, leaseSeconds);
    }

    public long getPollDelayMs() {
        return pollDelayMs;
    }

    public void setPollDelayMs(long pollDelayMs) {
        this.pollDelayMs = Math.max(250L, pollDelayMs);
    }
}
