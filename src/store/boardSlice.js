import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { ref, set } from 'firebase/database';
import { database } from './firebase';    

const initialState = {
  columns: {},
  columnOrder: [],
  tasks: {},
  users: {},
  history: [],
  future: [],
};

const pushHistoryToFirebase = (state) => {
  const historyRef = ref(database, 'board/history');
  set(historyRef, {
    past: state.history,
    future: state.future,
  }).catch((error) => console.error('Failed to push history to Firebase:', error));
};

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    setBoard(state, action) {
      state.columns = action.payload.columns || {};
      state.columnOrder = action.payload.columnOrder || [];
      state.tasks = action.payload.tasks || {};
      console.log('setBoard:', { columns: state.columns, columnOrder: state.columnOrder, tasks: state.tasks });
    },
    addColumn(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'addColumn',
      });
      state.future = [];
      const columnId = uuidv4();
      state.columns[columnId] = { id: columnId, title: action.payload.title, taskIds: [] };
      state.columnOrder.push(columnId);
      console.log('addColumn:', { history: state.history, columnId, title: action.payload.title });
      pushHistoryToFirebase(state, 'addColumn');
    },
    updateColumn(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'updateColumn',
      });
      state.future = [];
      const { id, title } = action.payload;
      if (state.columns[id]) {
        state.columns[id].title = title;
      }
      console.log('updateColumn:', { history: state.history, columnId: id, title });
      pushHistoryToFirebase(state, 'updateColumn');
    },
    deleteColumn(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'deleteColumn',
      });
      state.future = [];
      const columnId = action.payload;
      state.columnOrder = state.columnOrder.filter(id => id !== columnId);
      if (state.columns[columnId]) {
        (state.columns[columnId].taskIds || []).forEach(taskId => {
          delete state.tasks[taskId];
        });
        delete state.columns[columnId];
      }
      console.log('deleteColumn:', { history: state.history, columnId });
      pushHistoryToFirebase(state, 'deleteColumn');
    },
    addTask(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'addTask',
      });
      state.future = [];
      const { columnId, title, description } = action.payload;
      if (state.columns[columnId]) {
        const taskId = uuidv4();
        const now = new Date().toISOString();
        state.tasks[taskId] = { id: taskId, title, description, createdAt: now, updatedAt: now };
        state.columns[columnId].taskIds = state.columns[columnId].taskIds || [];
        state.columns[columnId].taskIds.push(taskId);
      }
      console.log('addTask:', { history: state.history, columnId, taskId: state.columns[columnId]?.taskIds });
      pushHistoryToFirebase(state, 'addTask');
    },
    updateTask(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'updateTask',
      });
      state.future = [];
      const { id, title, description } = action.payload;
      if (state.tasks[id]) {
        state.tasks[id] = {
          ...state.tasks[id],
          title,
          description,
          updatedAt: new Date().toISOString(),
        };
      }
      console.log('updateTask:', { history: state.history, taskId: id, title });
      pushHistoryToFirebase(state, 'updateTask');
    },
    deleteTask(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'deleteTask',
      });
      state.future = [];
      const { taskId, columnId } = action.payload;
      if (state.columns[columnId] && state.tasks[taskId]) {
        state.columns[columnId].taskIds = (state.columns[columnId].taskIds || []).filter(id => id !== taskId);
        delete state.tasks[taskId];
      }
      console.log('deleteTask:', { history: state.history, taskId, columnId });
      pushHistoryToFirebase(state, 'deleteTask');
    },
    reorderTasks(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'reorderTasks',
      });
      state.future = [];
      const { source, destination } = action.payload;
      const sourceColumn = state.columns[source.droppableId];
      const destColumn = state.columns[destination.droppableId];
      if (sourceColumn && destColumn) {
        const sourceTasks = [...(sourceColumn.taskIds || [])];
        const [movedTask] = sourceTasks.splice(source.index, 1);
        if (source.droppableId === destination.droppableId) {
          sourceTasks.splice(destination.index, 0, movedTask);
          state.columns[source.droppableId].taskIds = sourceTasks;
        } else {
          const destTasks = [...(destColumn.taskIds || [])];
          destTasks.splice(destination.index, 0, movedTask);
          state.columns[source.droppableId].taskIds = sourceTasks;
          state.columns[destination.droppableId].taskIds = destTasks;
        }
      }
      console.log('reorderTasks:', { history: state.history, source, destination });
      pushHistoryToFirebase(state, 'reorderTasks');
    },
    reorderColumns(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'reorderColumns',
      });
      state.future = [];
      const { source, destination } = action.payload;
      const [movedColumn] = state.columnOrder.splice(source.index, 1);
      state.columnOrder.splice(destination.index, 0, movedColumn);
      console.log('reorderColumns:', { history: state.history, source, destination });
      pushHistoryToFirebase(state, 'reorderColumns');
    },
    addComment(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'addComment',
      });
      state.future = [];
      const { taskId, comment } = action.payload;
      if (state.tasks[taskId]) {
        state.tasks[taskId].comments = state.tasks[taskId].comments || {};
        const commentId = uuidv4();
        state.tasks[taskId].comments[commentId] = {
          id: commentId,
          ...comment,
        };
      }
      console.log('addComment:', { history: state.history, taskId, comment });
      pushHistoryToFirebase(state, 'addComment');
    },
    updateComment(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'updateComment',
      });
      state.future = [];
      const { taskId, commentId, text } = action.payload;
      if (state.tasks[taskId] && state.tasks[taskId].comments?.[commentId]) {
        state.tasks[taskId].comments[commentId].text = text;
        state.tasks[taskId].comments[commentId].updatedAt = new Date().toISOString();
      }
      console.log('updateComment:', { history: state.history, taskId, commentId, text });
      pushHistoryToFirebase(state, 'updateComment');
    },
    deleteComment(state, action) {
      state.history.push({
        columns: JSON.parse(JSON.stringify(state.columns)),
        columnOrder: [...state.columnOrder],
        tasks: JSON.parse(JSON.stringify(state.tasks)),
        action: 'deleteComment',
      });
      state.future = [];
      const { taskId, commentId } = action.payload;
      if (state.tasks[taskId] && state.tasks[taskId].comments?.[commentId]) {
        delete state.tasks[taskId].comments[commentId];
      }
      console.log('deleteComment:', { history: state.history, taskId, commentId });
      pushHistoryToFirebase(state, 'deleteComment');
    },
    undo(state) {
      if (state.history.length > 0) {
        const pastState = state.history.pop();
        state.future.push({
          columns: JSON.parse(JSON.stringify(state.columns)),
          columnOrder: [...state.columnOrder],
          tasks: JSON.parse(JSON.stringify(state.tasks)),
          action: pastState.action,
        });
        state.columns = pastState.columns;
        state.columnOrder = pastState.columnOrder;
        state.tasks = pastState.tasks;
        console.log('undo:', { pastState, newHistory: state.history, newFuture: state.future });
      } else {
        console.log('No actions to undo in Redux');
      }
    },
    redo(state) {
      if (state.future.length > 0) {
        const futureState = state.future.pop();
        state.history.push({
          columns: JSON.parse(JSON.stringify(state.columns)),
          columnOrder: [...state.columnOrder],
          tasks: JSON.parse(JSON.stringify(state.tasks)),
          action: futureState.action,
        });
        state.columns = futureState.columns;
        state.columnOrder = futureState.columnOrder;
        state.tasks = futureState.tasks;
        console.log('redo:', { futureState, newHistory: state.history, newFuture: state.future });
      } else {
        console.log('No actions to redo in Redux');
      }
    },
    setUsers(state, action) {
      state.users = action.payload;
    },
  },
});

export const {
  setBoard,
  addColumn,
  updateColumn,
  deleteColumn,
  addTask,
  updateTask,
  deleteTask,
  reorderTasks,
  reorderColumns,
  addComment,
  updateComment,
  deleteComment,
  undo,
  redo,
  setUsers,
} = boardSlice.actions;
export default boardSlice.reducer;