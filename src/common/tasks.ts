import minimatch from 'minimatch';

export type Task = {
  paths: string[];
  caseSensitive?: boolean;
  method: () => Promise<void>;
};

export async function runTasks(tasks: Task[]) {
  const windowPath = window.location.pathname;

  const promises = tasks
    .map(task => {
      const matches = task.paths.some(globPath => {
        return minimatch(windowPath, globPath, { nocase: !task.caseSensitive });
      });

      if (matches) {
        return task.method();
      }
    })
    .filter(promise => !!promise);

  await Promise.all(promises);
}
