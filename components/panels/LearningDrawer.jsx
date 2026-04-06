export default function LearningDrawer({ open, onClose }) {
  return (
    <div className={`fixed top-0 left-0 h-full w-80 bg-black transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      
      <button onClick={onClose}>Close</button>

      <Glossary />

    </div>
  );
}