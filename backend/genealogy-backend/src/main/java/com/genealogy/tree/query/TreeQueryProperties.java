package com.genealogy.tree.query;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "genealogy.tree.query")
public class TreeQueryProperties {
    public static final int HARD_MAX_DEPTH = 20;
    public static final int HARD_MAX_NODES = 2000;
    public static final int HARD_MAX_EDGES = 4000;

    private int defaultDepth = 5;
    private int maxDepth = HARD_MAX_DEPTH;
    private int defaultNodes = 500;
    private int maxNodes = HARD_MAX_NODES;
    private int defaultEdges = 1000;
    private int maxEdges = HARD_MAX_EDGES;

    public int getDefaultDepth() { return defaultDepth; }
    public void setDefaultDepth(int value) { this.defaultDepth = value; }
    public int getMaxDepth() { return maxDepth; }
    public void setMaxDepth(int value) { this.maxDepth = value; }
    public int getDefaultNodes() { return defaultNodes; }
    public void setDefaultNodes(int value) { this.defaultNodes = value; }
    public int getMaxNodes() { return maxNodes; }
    public void setMaxNodes(int value) { this.maxNodes = value; }
    public int getDefaultEdges() { return defaultEdges; }
    public void setDefaultEdges(int value) { this.defaultEdges = value; }
    public int getMaxEdges() { return maxEdges; }
    public void setMaxEdges(int value) { this.maxEdges = value; }
}
