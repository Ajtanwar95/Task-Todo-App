import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Draggable } from '@hello-pangea/dnd';
import { updateTask, deleteTask, addComment, updateComment, deleteComment } from '../store/boardSlice';
import { updateTaskInFirebase, deleteTaskFromFirebase, addCommentToFirebase, updateCommentInFirebase, deleteCommentFromFirebase } from '../services/firebaseService';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';

function Task({ taskId, index, columnId, userId }) {
  const dispatch = useDispatch();
  const task = useSelector((state) => state.board.tasks[taskId]) || { title: '', description: '', comments: {} };
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  useEffect(() => {
    setTitle(task.title || '');
    setDescription(task.description || '');
    const commentsRef = ref(database, `board/tasks/${taskId}/comments`);
    onValue(commentsRef, (snapshot) => {
      const data = snapshot.val();
      setComments(data ? Object.entries(data).map(([id, comment]) => ({ id, ...comment })) : []);
    });
  }, [taskId, task.title, task.description]);

  const handleUpdate = () => {
    if (title.trim()) {
      dispatch(updateTask({ id: taskId, title, description }));
      updateTaskInFirebase(taskId, title, description, userId);
      setIsEditing(false);
    } else {
      alert('Task title cannot be empty.');
    }
  };

  const handleDelete = () => {
    if (isDeleting) return;
    setIsDeleting(true);
    dispatch(deleteTask({ taskId, columnId }));
    deleteTaskFromFirebase(taskId, columnId, userId)
      .finally(() => setIsDeleting(false));
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (comment.trim()) {
      dispatch(addComment({ taskId, comment: { text: comment, createdAt: new Date().toISOString(), userId } }));
      addCommentToFirebase(taskId, comment, userId);
      setComment('');
    } else {
      alert('Comment cannot be empty.');
    }
  };

  const handleEditComment = (commentId, text) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  };

  const handleUpdateComment = (e) => {
    e.preventDefault();
    if (editingCommentText.trim()) {
      dispatch(updateComment({ taskId, commentId: editingCommentId, text: editingCommentText }));
      updateCommentInFirebase(taskId, editingCommentId, editingCommentText, userId);
      setEditingCommentId(null);
      setEditingCommentText('');
    } else {
      alert('Comment cannot be empty.');
    }
  };

  const handleDeleteComment = (commentId) => {
    dispatch(deleteComment({ taskId, commentId }));
    deleteCommentFromFirebase(taskId, commentId, userId);
  };

  if (!task) return null;

  return (
    <Draggable draggableId={taskId} index={index}>
      {(provided, snapshot) => (
        <div
          className={`bg-white bg-opacity-30 backdrop-blur-lg p-3 rounded-lg shadow-md transform transition-all duration-200 hover:scale-105 hover:-rotate-1 ${
            snapshot.isDragging ? 'scale-110 shadow-xl border-2 border-blue-500' : 'hover:shadow-lg'
          } ${isEditing ? 'border-2 border-green-500' : ''} ${isDeleting ? 'border-2 border-red-500' : ''} animate-fade-in`}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white bg-opacity-50 border-2 border-green-500 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description"
                className="bg-white bg-opacity-50 border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows="3"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdate}
                  className="bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-medium text-gray-900">{task.title || 'Untitled'}</h3>
              {task.description && (
                <div className="mt-2">
                  <h4 className="text-sm font-semibold text-gray-800">Description</h4>
                  <p className="text-sm text-gray-700">{task.description}</p>
                </div>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="text-green-500 hover:text-green-700 text-sm mt-2 mr-2 transition-colors"
                title="Edit Task"
              >
                <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span className="ml-1">Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className={`text-red-500 hover:text-red-700 text-sm mt-2 transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isDeleting}
                title="Delete Task"
              >
                <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="ml-1">Delete</span>
              </button>
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-gray-800">Comments</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto bg-white bg-opacity-20 rounded-lg p-2">
                  {comments.map((c) => (
                    <div key={c.id} className={`flex items-center space-x-2 text-xs text-gray-600 animate-slide-in ${editingCommentId === c.id ? 'border-2 border-green-500 rounded p-1' : ''}`}>
                      {editingCommentId === c.id ? (
                        <form onSubmit={handleUpdateComment} className="flex-1">
                          <input
                            type="text"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="bg-white bg-opacity-50 border border-gray-300 p-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                            autoFocus
                          />
                          <div className="flex space-x-1 mt-1">
                            <button
                              type="submit"
                              className="text-teal-600 hover:text-teal-700 text-xs"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="text-gray-600 hover:text-gray-700 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <p className="flex-1">
                            <span className="font-medium">User {c.userId.slice(0, 8)}:</span> {c.text}{' '}
                            <span className="text-gray-500">({new Date(c.createdAt).toLocaleString()})</span>
                          </p>
                          <button
                            onClick={() => handleEditComment(c.id, c.text)}
                            className="text-green-500 hover:text-green-700"
                            title="Edit Comment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete Comment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddComment} className="mt-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment"
                    className="bg-white bg-opacity-50 border border-gray-300 p-2 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    className="bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 text-sm mt-2 transition-colors"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default Task;