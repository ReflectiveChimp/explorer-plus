export type Task = {
  paths: string[];
  caseSensitive?: boolean;
  method: () => Promise<void>;
};

export async function runTasks(tasks: Task[]) {
  const location = window.location;

  const promises = tasks
    .map(task => {
      const matches = task.paths.some(path => {
        let currentPath = location.pathname;

        if (!task.caseSensitive) {
          currentPath = currentPath.toLowerCase();
          path = path.toLowerCase();
        }

        return currentPath === path;
      });

      if (matches) {
        return task.method();
      }
    })
    .filter(promise => !!promise);

  await Promise.all(promises);
}
