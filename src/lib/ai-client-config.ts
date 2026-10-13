/**
 * Extra headers for the Anthropic client. A key that is not tied to one workspace is rejected with
 * "API key is not scoped to a workspace ... specify the anthropic-workspace-id header", so when
 * ANTHROPIC_WORKSPACE_ID is set it is sent with every request. Unset = no extra header (keys created
 * inside a workspace need nothing).
 */
export function anthropicHeadersFromEnv(env: Record<string, string | undefined>): Record<string, string> | undefined {
  const workspaceId = env.ANTHROPIC_WORKSPACE_ID?.trim().replace(/^["']|["']$/g, "").trim();
  return workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined;
}
