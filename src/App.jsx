import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { reorderTasks, reorderColumns} from './store/boardSlice';
import { initializeFirebaseSync, reorderTasksInFirebase, reorderColumnsInFirebase, undoInFirebase, redoInFirebase } from './services/firebaseService';
import Column from './components/Column';
import AddColumn from './components/AddColumn';
import ErrorBoundary from './components/ErrorBoundary';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const dispatch = useDispatch();
  const { columnOrder, users, history, future } = useSelector((state) => state.board);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const id = uuidv4();
    setUserId(id);
    initializeFirebaseSync(id);
  }, []);

  const onDragEnd = (result) => {
    const { source, destination, type, draggableId } = result;
    if (!destination) return;

    if (type === 'column') {
      dispatch(reorderColumns({ source, destination }));
      reorderColumnsInFirebase(source, destination, userId);
    } else {
      dispatch(reorderTasks({ source, destination, taskId: draggableId }));
      reorderTasksInFirebase(source, destination, userId, draggableId);
    }
  };

  const handleUndo = () => {
    undoInFirebase(userId);
  };

  const handleRedo = () => {
    redoInFirebase(userId);
  };

  console.log({ ErrorBoundary, Column, AddColumn });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-purple-200 to-coral-200 p-4 sm:p-6 md:p-8 font-inter">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white bg-opacity-30 backdrop-blur-lg rounded-xl p-4 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 animate-pulse">AjayTaskFlow</h1>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                history.length > 0
                  ? 'bg-teal-600 text-white hover:bg-teal-700 animate-pulse'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
              title="Undo last action"
            >
              <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                future.length > 0
                  ? 'bg-teal-600 text-white hover:bg-teal-700 animate-pulse'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
              title="Redo last action"
            >
              <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l6-6m0 0l-6 6m6-6H9a6 6 0 000 12h3" />
              </svg>
              Redo
            </button>
            <div>
              <span className="text-sm font-medium text-gray-800 bg-white bg-opacity-50 rounded-full px-3 py-1">
                Users Online: {Object.keys(users).length}
              </span>
              <div className="mt-2 text-xs text-gray-700 max-h-24 overflow-y-auto bg-white bg-opacity-30 rounded-lg p-2">
                {Object.entries(users).map(([id, user]) => (
                  <p key={id} className="animate-slide-in">
                    User {id.slice(0, 8)}: {user.action || 'Connected'}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="column" isDropDisabled={false}>
            {(provided) => (
              <div
                className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 overflow-x-auto pb-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {columnOrder.length > 0 ? (
                  columnOrder.map((columnId, index) => (
                    <ErrorBoundary key={columnId}>
                      <Column columnId={columnId} index={index} userId={userId} />
                    </ErrorBoundary>
                  ))
                ) : (
                  <div className="text-gray-600 text-center w-full">No columns yet. Add one to get started!</div>
                )}
                {provided.placeholder}
                <AddColumn userId={userId} />
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}

export default App;