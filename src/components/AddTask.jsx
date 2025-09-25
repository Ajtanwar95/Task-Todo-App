import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addTask } from '../store/boardSlice';
import { addTaskToFirebase } from '../services/firebaseService';

function AddTask({ columnId, userId }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      dispatch(addTask({ columnId, title, description }));
      addTaskToFirebase(columnId, title, description, userId);
      setTitle('');
      setDescription('');
      setIsOpen(false);
    } else {
      alert('Task title cannot be empty.');
    }
  };

  return (
    <div className="mt-3">
      {isOpen ? (
        <form onSubmit={handleSubmit} className="space-y-3 animate-slide-in">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task title"
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
              type="submit"
              className="bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Add Task
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-teal-600 text-white px-3 py-1 rounded-lg w-full hover:bg-teal-700 transition-all duration-300 hover:scale-105 animate-fade-in"
        >
          + Add New Task
        </button>
      )}
    </div>
  );
}

export default AddTask;