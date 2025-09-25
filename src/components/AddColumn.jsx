import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addColumn } from '../store/boardSlice';
import { addColumnToFirebase } from '../services/firebaseService';

function AddColumn({ userId }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      dispatch(addColumn({ title }));
      addColumnToFirebase(title);
      setTitle('');
      setIsOpen(false);
    } else {
      alert('Column title cannot be empty.');
    }
  };

  return (
    <div className="w-full sm:w-80 flex-shrink-0">
      {isOpen ? (
        <form onSubmit={handleSubmit} className="bg-white bg-opacity-30 backdrop-blur-lg p-4 rounded-xl shadow-lg animate-slide-in">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New column title"
            className="bg-white bg-opacity-50 border-2 border-green-500 p-2 rounded-lg w-full mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Add Column
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-teal-600 text-white p-4 rounded-xl shadow-lg w-full hover:bg-teal-700 transition-all duration-300 hover:scale-105 animate-fade-in"
        >
          + Add New Column
        </button>
      )}
    </div>
  );
}

export default AddColumn;