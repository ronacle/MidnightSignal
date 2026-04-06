export default function ControlDrawer({ open, onClose }) {
  return (
    <div className={`fixed top-0 right-0 h-full w-80 bg-black transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      
      <button onClick={onClose}>Close</button>

      {/* KEEP YOUR EXISTING PANELS HERE */}
      <AccountSync />
      <SessionSettings />
      <AlertSettings />
      <LiveControls />
      <Agreement />

    </div>
  );
}