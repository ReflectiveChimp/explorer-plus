import { addMethodSelectors } from './selectors';
import { runTasks, Task } from '../common/tasks';
import { checkForUnverified } from './unverified';

const tasks: Task[] = [
  {
    paths: ['/readContract'],
    method: () => addMethodSelectors('read'),
  },
  {
    paths: ['/writecontract/index'],
    method: () => addMethodSelectors('write'),
  },
  {
    paths: ['/address/*'],
    method: checkForUnverified,
  },
];

runTasks(tasks);
