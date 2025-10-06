import React, { useRef, useState, useEffect } from "react";
import CorteForm from "../components/CorteForm";
import CorteHistory from "../components/CorteHistory";

export default function Corte() {
  const [leftWidth, setLeftWidth] = useState(480);
  // Smaller default width for a more "zoomed-out" view
  const [compactLeftWidth] = useState(380);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = leftWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!draggingRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const delta = e.clientX - startXRef.current;
    const newWidth = startWidthRef.current + delta;
    const min = 300;
    const max = containerRect.width * 0.75;
    setLeftWidth(Math.max(min, Math.min(newWidth, max)));
  };

  const handleMouseUp = () => {
    if (draggingRef.current) {
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const [editingCutId, setEditingCutId] = useState(null);

  const today = new Date().toLocaleDateString('es-MX');

  // initialize leftWidth to compact default
  useEffect(() => { if (leftWidth === 480) setLeftWidth(compactLeftWidth); }, []);

  return (
    <div className="p-2 h-screen flex flex-col" ref={containerRef}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-semibold">Corte de Caja</h1>
          <div className="text-xs text-gray-600">Control de efectivo (MXN) — {today}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-1 items-stretch">
        <div style={{ width: leftWidth }} className="flex-shrink-0 h-full overflow-auto">
          <div className="h-full">
            <CorteForm compact={true} editCutId={editingCutId} onSaved={() => setEditingCutId(null)} />
          </div>
        </div>

        <div
          onMouseDown={handleMouseDown}
          className="w-1 bg-gray-200 cursor-col-resize h-full"
          style={{ cursor: 'col-resize' }}
        />

        <div className="flex-1 h-full overflow-auto">
          <CorteHistory compact onEdit={(id) => setEditingCutId(id)} />
        </div>
      </div>
    </div>
  );
}
