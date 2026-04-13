import { createContext, useContext } from 'react'

/** Provides the current active layer number (0–4) to all node components. */
export const LayerContext = createContext(0)
export const useActiveLayer = () => useContext(LayerContext)

export const LAYER_NAMES = ['Main Story', 'Subplot A', 'Subplot B', 'Subplot C', 'Subplot D']
