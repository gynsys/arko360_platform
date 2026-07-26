import { useState, useCallback } from 'react';

export function useSlabHistory({ shape, setShape, internalWalls, setInternalWalls, openings, setOpenings, columns, setColumns }) {
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  const saveHistory = useCallback(() => {
    setHistoryPast(prev => {
      const next = [...prev, { shape, internalWalls: [...internalWalls], openings: [...openings], columns: [...columns] }];
      return next.length > 50 ? next.slice(-50) : next;
    });
    setHistoryFuture([]);
  }, [shape, internalWalls, openings, columns]);

  const undo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast(prev => prev.slice(0, -1));
    setHistoryFuture(prev => [{ shape, internalWalls, openings, columns }, ...prev]);
    if (previous.shape) setShape(previous.shape);
    setInternalWalls(previous.internalWalls);
    setOpenings(previous.openings);
    setColumns(previous.columns || []);
  }, [historyPast, shape, internalWalls, openings, columns, setShape, setInternalWalls, setOpenings, setColumns]);

  const redo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture(prev => prev.slice(1));
    setHistoryPast(prev => [...prev, { shape, internalWalls, openings, columns }]);
    if (next.shape) setShape(next.shape);
    setInternalWalls(next.internalWalls);
    setOpenings(next.openings);
    setColumns(next.columns || []);
  }, [historyFuture, shape, internalWalls, openings, columns, setShape, setInternalWalls, setOpenings, setColumns]);

  return { historyPast, historyFuture, saveHistory, undo, redo };
}
