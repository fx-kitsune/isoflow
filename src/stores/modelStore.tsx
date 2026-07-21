import React, { createContext, useRef, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import { ModelStore } from 'src/types';
import { INITIAL_DATA } from 'src/config';
import yjs from 'zustand-middleware-yjs';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';

const getDeviceId = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    let id = localStorage.getItem('isoflow_device_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('isoflow_device_id', id);
    }
    return id;
  }
  return 'unknown';
};

const initialState = (
  collabRoomId?: string,
  enableBrowserStorage?: boolean
) => {
  if (!collabRoomId) {
    return createStore<ModelStore>((set, get) => {
      return {
        ...INITIAL_DATA,
        actions: {
          get,
          set
        }
      };
    });
  }

  const doc = new Y.Doc();

  const roomName = `isoflow-room-${collabRoomId}`;

  if (enableBrowserStorage) {
    const persistence = new IndexeddbPersistence(roomName, doc);
    persistence.on('synced', () => {
      // Indexeddb synced
    });
  }

  const provider = new WebrtcProvider(roomName, doc);
  const deviceId = getDeviceId();
  provider.awareness.setLocalStateField('user', {
    deviceId
  });

  const withYjs = typeof yjs === 'function' ? yjs : (yjs as any).default || yjs;

  return createStore<ModelStore>(
    withYjs(doc, 'isoflow-store', (set: any, get: any) => {
      return {
        ...INITIAL_DATA,
        actions: {
          get,
          set
        }
      };
    })
  );
};

const ModelContext = createContext<ReturnType<typeof initialState> | null>(
  null
);

interface ProviderProps {
  children: React.ReactNode;
  collabRoomId?: string;
  enableBrowserStorage?: boolean;
}

// TODO: Typings below are pretty gnarly due to the way Zustand works.
// see https://github.com/pmndrs/zustand/discussions/1180#discussioncomment-3439061
export const ModelProvider = ({
  children,
  collabRoomId,
  enableBrowserStorage
}: ProviderProps) => {
  const storeRef = useRef<ReturnType<typeof initialState>>();

  if (!storeRef.current) {
    storeRef.current = initialState(collabRoomId, enableBrowserStorage);
  }

  return (
    <ModelContext.Provider value={storeRef.current}>
      {children}
    </ModelContext.Provider>
  );
};

export function useModelStore<T>(
  selector: (state: ModelStore) => T,
  equalityFn?: (left: T, right: T) => boolean
) {
  const store = useContext(ModelContext);

  if (store === null) {
    throw new Error('Missing provider in the tree');
  }

  const value = useStore(store, selector, equalityFn);

  return value;
}
