import { configureStore } from '@reduxjs/toolkit';
import { diamondReducer } from './diamondSlice';
import { authReducer } from './authSlice';

export const store = configureStore({
  reducer: {
    diamond: diamondReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['diamond/setImageData'],
        ignoredPaths: ['diamond.imageData'],
      },
    }),
  devTools: __DEV__,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

