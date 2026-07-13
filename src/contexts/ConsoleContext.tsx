import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'

interface ConsoleCtx {
  consoleOpen: boolean
  setConsoleOpen: Dispatch<SetStateAction<boolean>>
}

const Ctx = createContext<ConsoleCtx>({ consoleOpen: false, setConsoleOpen: () => {} })

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [consoleOpen, setConsoleOpen] = useState(false)
  return <Ctx.Provider value={{ consoleOpen, setConsoleOpen }}>{children}</Ctx.Provider>
}

export const useConsole = () => useContext(Ctx)
