import { createContext, useContext } from 'react'

export const DownloadContext = createContext(null)

export function useDownloads() {
  return useContext(DownloadContext)
}
