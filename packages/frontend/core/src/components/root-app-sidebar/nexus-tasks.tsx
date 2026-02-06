import { MenuItem } from '@affine/core/modules/app-sidebar/views';
import { NexusTaskService } from '@affine/core/modules/nexus-ai';
import { CheckBoxUnIcon, DoneIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { memo, useCallback } from 'react';

import { CollapsibleSection } from '../../desktop/components/navigation-panel';

export const NexusTaskSidebar = memo(() => {
  const taskService = useService(NexusTaskService);
  const tasks = useLiveData(taskService.allTasks$);

  const onRemoveTask = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      taskService.removeTask(id);
    },
    [taskService]
  );

  if (tasks.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection path={['nexus-tasks']} title="Nexus Tasks">
      {tasks.map(task => (
        <MenuItem
          key={task.id}
          icon={<CheckBoxUnIcon />}
          data-testid="nexus-task-item"
          postfix={
            <DoneIcon
              onClick={e => onRemoveTask(task.id, e)}
              style={{ cursor: 'pointer', fontSize: '14px' }}
            />
          }
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '12px',
              }}
            >
              {task.task}
            </span>
            {task.dueDate && (
              <span style={{ fontSize: '10px', opacity: 0.6 }}>
                Due: {task.dueDate}
              </span>
            )}
          </div>
        </MenuItem>
      ))}
    </CollapsibleSection>
  );
});

NexusTaskSidebar.displayName = 'NexusTaskSidebar';
