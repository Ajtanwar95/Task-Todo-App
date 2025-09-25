import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { updateColumn, deleteColumn } from '../store/boardSlice';
import { updateColumnInFirebase, deleteColumnFromFirebase } from '../services/firebaseService';
import Task from './Task';
import AddTask from './AddTask';

function Column({ columnId, index, userId }) {
  const dispatch = useDispatch();
  const column = useSelector((state) => state.board.columns[columnId]) || { title: '', taskIds: [] };
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.title || '');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTitle(column.title || '');
  }, [column.title]);

  const handleUpdate = () => {
    if (title.trim()) {
      dispatch(updateColumn({ id: columnId, title }));
      updateColumnInFirebase(columnId, title, userId);
      setIsEditing(false);
    } else {
      alert('Column title cannot be empty.');
    }
  };

  const handleDelete = () => {
    if (isDeleting) return;
    setIsDeleting(true);
    dispatch(deleteColumn(columnId));
    deleteColumnFromFirebase(columnId, userId)
      .finally(() => setIsDeleting(false));
  };

  if (!column) return null;

  return (
    <Draggable draggableId={columnId} index={index}>
      {(provided, snapshot) => (
        <div
          className={`bg-white bg-opacity-30 backdrop-blur-lg rounded-xl shadow-lg p-4 w-full sm:w-80 flex-shrink-0 transform transition-all duration-300 hover:scale-105 hover:-rotate-1 ${
            snapshot.isDragging ? 'scale-110 shadow-2xl border-2 border-blue-500' : 'hover:shadow-xl'
          } animate-slide-in`}
          {...provided.draggableProps}
          ref={provided.innerRef}
        >
          <div className="flex justify-between items-center mb-3" {...provided.dragHandleProps}>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleUpdate}
                onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
                className="bg-white bg-opacity-50 border-2 border-green-500 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
            ) : (
              <h2
                className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-teal-600 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                {column.title || 'Untitled'}
              </h2>
            )}
            <button
              onClick={handleDelete}
              className={`text-red-500 hover:text-red-700 transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed border-2 border-red-500 rounded' : ''}`}
              disabled={isDeleting}
              title="Delete Column"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <Droppable droppableId={columnId} type="task" isDropDisabled={false}>
            {(provided, snapshot) => (
              <div
                className={`space-y-3 min-h-[100px] p-2 rounded-lg ${
                  snapshot.isDraggingOver ? 'bg-teal-100 bg-opacity-30 border-2 border-blue-500' : 'bg-gray-100 bg-opacity-30'
                } transition-colors duration-200`}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {(column.taskIds || []).map((taskId, index) => (
                  <Task key={taskId} taskId={taskId} index={index} columnId={columnId} userId={userId} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <AddTask columnId={columnId} userId={userId} />
        </div>
      )}
    </Draggable>
  );
}

export default Column;