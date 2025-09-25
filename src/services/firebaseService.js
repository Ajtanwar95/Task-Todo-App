import { database } from '../firebase';
import { ref, onValue, set, push, remove, update, serverTimestamp, onDisconnect } from 'firebase/database';
import { store } from '../store';
import { setBoard, setUsers, undo, redo } from '../store/boardSlice';

export const initializeFirebaseSync = (userId) => {
  const userRef = ref(database, `users/${userId}`);
  set(userRef, { connected: true, timestamp: serverTimestamp(), userId })
    .then(() => console.log('User initialized:', userId))
    .catch((error) => console.error('Failed to initialize user:', error));
  onDisconnect(userRef).remove();

  const boardRef = ref(database, 'board');
  onValue(boardRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      store.dispatch(setBoard({
        columns: data.columns || {},
        columnOrder: data.columnOrder || [],
        tasks: data.tasks || {},
      }));
      console.log('Board synced from Firebase:', data);
    }
  }, { onlyOnce: false });

  const usersRef = ref(database, 'users');
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() || {};
    const now = Date.now();
    const activeUsers = Object.fromEntries(
      Object.entries(users).filter(([_, user]) => user.timestamp && (now - user.timestamp) < 5 * 60 * 1000)
    );
    store.dispatch(setUsers(activeUsers));
    console.log('Users synced from Firebase:', activeUsers);
  }, { onlyOnce: false });

  const historyRef = ref(database, 'board/history');
  onValue(historyRef, (snapshot) => {
    const data = snapshot.val() || { past: [], future: [] };
    store.dispatch(setBoard({
      columns: data.columns || {},
      columnOrder: data.columnOrder || [],
      tasks: data.tasks || {},
    }));
    console.log('History synced from Firebase:', data);
  }, { onlyOnce: false });
};

export const addColumnToFirebase = (title) => {
  const columnId = crypto.randomUUID();
  const columnRef = ref(database, `board/columns/${columnId}`);
  set(columnRef, { id: columnId, title, taskIds: [] })
    .then(() => {
      const columnOrderRef = ref(database, 'board/columnOrder');
      onValue(columnOrderRef, (snapshot) => {
        const columnOrder = snapshot.val() || [];
        set(columnOrderRef, [...columnOrder, columnId]);
        alert('Column added successfully!');
        console.log('Column added to Firebase:', { columnId, title });
      }, { onlyOnce: true });
    })
    .catch((error) => {
      alert('Failed to add column.');
      console.error('Failed to add column:', error);
    });
};

export const updateColumnInFirebase = (id, title, userId) => {
  const columnRef = ref(database, `board/columns/${id}`);
  update(columnRef, { title })
    .then(() => {
      alert('Column updated successfully!');
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { action: `Editing column: ${title}` });
      console.log('Column updated in Firebase:', { id, title });
    })
    .catch((error) => {
      alert('Failed to update column.');
      console.error('Failed to update column:', error);
    });
};

export const deleteColumnFromFirebase = (columnId, userId) => {
  const columnRef = ref(database, `board/columns/${columnId}`);
  remove(columnRef)
    .then(() => {
      const columnOrderRef = ref(database, 'board/columnOrder');
      onValue(columnOrderRef, (snapshot) => {
        const columnOrder = snapshot.val() || [];
        set(columnOrderRef, columnOrder.filter(id => id !== columnId));
        alert('Column deleted successfully!');
        console.log('Column deleted from Firebase:', columnId);
      }, { onlyOnce: true });
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { action: `Deleted column` });
    })
    .catch((error) => {
      alert('Failed to delete column.');
      console.error('Failed to delete column:', error);
    });
};

export const addTaskToFirebase = (columnId, title, description, userId) => {
  const taskId = crypto.randomUUID();
  const now = new Date().toISOString();
  const taskRef = ref(database, `board/tasks/${taskId}`);
  set(taskRef, { id: taskId, title, description, createdAt: now, updatedAt: now })
    .then(() => {
      const columnRef = ref(database, `board/columns/${columnId}`);
      onValue(columnRef, (snapshot) => {
        const column = snapshot.val() || { taskIds: [] };
        set(columnRef, { ...column, taskIds: [...(column.taskIds || []), taskId] });
        alert('Task added successfully!');
        console.log('Task added to Firebase:', { taskId, columnId, title });
      }, { onlyOnce: true });
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { action: `Added task: ${title}` });
    })
    .catch((error) => {
      alert('Failed to add task.');
      console.error('Failed to add task:', error);
    });
};

export const updateTaskInFirebase = (taskId, title, description, userId) => {
  const taskRef = ref(database, `board/tasks/${taskId}`);
  update(taskRef, { title, description, updatedAt: new Date().toISOString() })
    .then(() => {
      alert('Task updated successfully!');
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { action: `Editing task: ${title}` });
      console.log('Task updated in Firebase:', { taskId, title });
    })
    .catch((error) => {
      alert('Failed to update task.');
      console.error('Failed to update task:', error);
    });
};

export const deleteTaskFromFirebase = (taskId, columnId, userId) => {
  const taskRef = ref(database, `board/tasks/${taskId}`);
  remove(taskRef)
    .then(() => {
      const columnRef = ref(database, `board/columns/${columnId}`);
      onValue(columnRef, (snapshot) => {
        const column = snapshot.val() || { taskIds: [] };
        const updatedTaskIds = (column.taskIds || []).filter(id => id !== taskId);
        set(columnRef, { ...column, taskIds: updatedTaskIds });
        alert('Task deleted successfully!');
        console.log('Task deleted from Firebase:', { taskId, columnId });
      }, { onlyOnce: true });
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { action: `Deleted task` });
    })
    .catch((error) => {
      alert('Failed to delete task.');
      console.error('Failed to delete task:', error);
    });
};

export const reorderTasksInFirebase = (source, destination, userId, taskId) => {
  const sourceColumnRef = ref(database, `board/columns/${source.droppableId}`);
  const destColumnRef = ref(database, `board/columns/${destination.droppableId}`);
  onValue(sourceColumnRef, (sourceSnapshot) => {
    const sourceColumn = sourceSnapshot.val() || { taskIds: [] };
    const sourceTasks = [...(sourceColumn.taskIds || [])];
    onValue(destColumnRef, (destSnapshot) => {
      const destColumn = destSnapshot.val() || { taskIds: [] };
      const destTasks = [...(destColumn.taskIds || [])];
      const [movedTask] = sourceTasks.splice(source.index, 1);
      if (source.droppableId === destination.droppableId) {
        sourceTasks.splice(destination.index, 0, movedTask);
        update(sourceColumnRef, { taskIds: sourceTasks });
      } else {
        destTasks.splice(destination.index, 0, movedTask);
        update(sourceColumnRef, { taskIds: sourceTasks });
        update(destColumnRef, { taskIds: destTasks });
      }
      alert('Task moved successfully!');
      const userRef = ref(database, `users/${userId}`);
      const taskTitle = store.getState().board.tasks[taskId]?.title || 'Unknown';
      update(userRef, { action: `Moving task: ${taskTitle}` });
      console.log('Tasks reordered in Firebase:', { source, destination, taskId });
    }, { onlyOnce: true });
  }, { onlyOnce: true });
};

export const reorderColumnsInFirebase = (source, destination, userId) => {
  const columnOrderRef = ref(database, 'board/columnOrder');
  onValue(columnOrderRef, (snapshot) => {
    const columnOrder = snapshot.val() || [];
    const [movedColumn] = columnOrder.splice(source.index, 1);
    columnOrder.splice(destination.index, 0, movedColumn);
    set(columnOrderRef, columnOrder);
    alert('Column reordered successfully!');
    const userRef = ref(database, `users/${userId}`);
    update(userRef, { action: `Reordered column` });
    console.log('Columns reordered in Firebase:', { source, destination });
  }, { onlyOnce: true });
};

export const addCommentToFirebase = (taskId, comment, userId) => {
  const commentsRef = ref(database, `board/tasks/${taskId}/comments`);
  const newCommentRef = push(commentsRef);
  set(newCommentRef, { id: newCommentRef.key, text: comment, createdAt: new Date().toISOString(), userId })
    .then(() => {
      alert('Comment added successfully!');
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { action: `Added comment to task` });
      console.log('Comment added to Firebase:', { taskId, comment });
    })
    .catch((error) => {
      alert('Failed to add comment.');
      console.error('Failed to add comment:', error);
    });
};

export const updateCommentInFirebase = (taskId, commentId, text, userId) => {
  const commentRef = ref(database, `board/tasks/${taskId}/comments/${commentId}`);
  update(commentRef, { text, updatedAt: new Date().toISOString() })
    .then(() => {
      alert('Comment updated successfully!');
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { action: `Edited comment` });
      console.log('Comment updated in Firebase:', { taskId, commentId, text });
    })
    .catch((error) => {
      alert('Failed to update comment.');
      console.error('Failed to update comment:', error);
    });
};

export const deleteCommentFromFirebase = (taskId, commentId, userId) => {
  const commentRef = ref(database, `board/tasks/${taskId}/comments/${commentId}`);
  remove(commentRef)
    .then(() => {
      alert('Comment deleted successfully!');
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { action: `Deleted comment` });
      console.log('Comment deleted from Firebase:', { taskId, commentId });
    })
    .catch((error) => {
      alert('Failed to delete comment.');
      console.error('Failed to delete comment:', error);
    });
};

export const undoInFirebase = (userId) => {
  const historyRef = ref(database, 'board/history');
  onValue(historyRef, (snapshot) => {
    const history = snapshot.val() || { past: [], future: [] };
    console.log('undoInFirebase - Current history:', history);
    if (history.past && history.past.length > 0) {
      const lastState = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      const newFuture = [...(history.future || []), {
        columns: store.getState().board.columns,
        columnOrder: store.getState().board.columnOrder,
        tasks: store.getState().board.tasks,
        action: lastState.action,
      }];
      set(historyRef, { past: newPast, future: newFuture })
        .then(() => {
          set(ref(database, 'board/columns'), lastState.columns);
          set(ref(database, 'board/columnOrder'), lastState.columnOrder);
          set(ref(database, 'board/tasks'), lastState.tasks);
          store.dispatch(undo());
          alert('Action undone successfully!');
          const userRef = ref(database, `users/${userId}`);
          update(userRef, { action: `Undid action: ${lastState.action}` });
          console.log('Undo applied in Firebase:', { lastState, newPast, newFuture });
        })
        .catch((error) => {
          alert('Failed to undo action.');
          console.error('Failed to undo in Firebase:', error);
        });
    } else {
      alert('No actions to undo.');
      console.log('No actions to undo in Firebase');
    }
  }, { onlyOnce: true });
};

export const redoInFirebase = (userId) => {
  const historyRef = ref(database, 'board/history');
  onValue(historyRef, (snapshot) => {
    const history = snapshot.val() || { past: [], future: [] };
    console.log('redoInFirebase - Current history:', history);
    if (history.future && history.future.length > 0) {
      const nextState = history.future[history.future.length - 1];
      const newFuture = history.future.slice(0, -1);
      const newPast = [...(history.past || []), {
        columns: store.getState().board.columns,
        columnOrder: store.getState().board.columnOrder,
        tasks: store.getState().board.tasks,
        action: nextState.action,
      }];
      set(historyRef, { past: newPast, future: newFuture })
        .then(() => {
          set(ref(database, 'board/columns'), nextState.columns);
          set(ref(database, 'board/columnOrder'), nextState.columnOrder);
          set(ref(database, 'board/tasks'), nextState.tasks);
          store.dispatch(redo());
          alert('Action redone successfully!');
          const userRef = ref(database, `users/${userId}`);
          update(userRef, { action: `Redid action: ${nextState.action}` });
          console.log('Redo applied in Firebase:', { nextState, newPast, newFuture });
        })
        .catch((error) => {
          alert('Failed to redo action.');
          console.error('Failed to redo in Firebase:', error);
        });
    } else {
      alert('No actions to redo.');
      console.log('No actions to redo in Firebase');
    }
  }, { onlyOnce: true });
};