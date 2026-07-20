import React, { useMemo } from 'react';
import Isoflow from 'src/Isoflow';
import { initialData } from '../initialData';

export const BasicEditor = () => {
  const roomId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let room = urlParams.get('room');
    if (!room) {
      room = Math.random().toString(36).substring(2, 15);
      urlParams.set('room', room);
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?${urlParams.toString()}`
      );
    }
    return room;
  }, []);

  return (
    <Isoflow
      initialData={{ ...initialData, fitToView: true }}
      collabRoomId={roomId}
      enableBrowserStorage
    />
  );
};
