import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext({})

function Tabs({ defaultValue, value, onValueChange, children, className }) {
  const [selected, setSelected] = React.useState(value || defaultValue)
  const current = value !== undefined ? value : selected

  return (
    <TabsContext.Provider value={{ value: current, onValueChange: onValueChange || setSelected }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children }) {
  return (
    <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
      {children}
    </div>
  )
}

function TabsTrigger({ value, className, children }) {
  const { value: selected, onValueChange } = React.useContext(TabsContext)
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        selected === value ? "bg-background text-foreground shadow" : "hover:bg-background/50",
        className
      )}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, className, children }) {
  const { value: selected } = React.useContext(TabsContext)
  if (selected !== value) return null
  return <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
