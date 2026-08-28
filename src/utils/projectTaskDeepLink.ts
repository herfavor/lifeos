/** Build the task-creation deep link used by an empty project card. */
export function getProjectQuickAddPath(projectId: string): string {
  return `/tasks?tab=tasks&project=${encodeURIComponent(projectId)}&new=1`;
}

/** Return a project default only when the URL explicitly requests task creation. */
export function getQuickAddProjectId(searchParams: URLSearchParams): string | undefined {
  return searchParams.get('new') === '1' ? searchParams.get('project') || undefined : undefined;
}
