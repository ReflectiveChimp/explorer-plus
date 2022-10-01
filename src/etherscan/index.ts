import { addMethodSelectors } from './selectors';
import { runTasks, Task } from '../common/tasks';

const tasks: Task[] = [
  {
    paths: ['/readContract'],
    method: () => addMethodSelectors('read'),
  },
  {
    paths: ['/writecontract/index'],
    method: () => addMethodSelectors('write'),
  },
];

runTasks(tasks);
