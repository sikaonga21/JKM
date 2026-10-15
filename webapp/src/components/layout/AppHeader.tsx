import { Database, Download, LogOut, Settings as SettingsIcon, Upload } from "lucide-react"
import type { Theme } from "@/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { BrandMark } from "./BrandMark"
import { ThemeToggle } from "./ThemeToggle"

interface AppHeaderProps {
  companyName: string
  logo: string
  theme: Theme
  resolvedTheme: "light" | "dark"
  onThemeChange: (theme: Theme) => void
  onOpenSettings: () => void
  onExportBackup: () => void
  onImportBackup: () => void
  onExportCsv: () => void
  onSignOut: () => void
}

export function AppHeader({
  companyName,
  logo,
  theme,
  resolvedTheme,
  onThemeChange,
  onOpenSettings,
  onExportBackup,
  onImportBackup,
  onExportCsv,
  onSignOut,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl no-print">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark logo={logo} name={companyName} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{companyName}</p>
            <p className="text-xs text-muted-foreground">Quotations &amp; invoicing</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Data</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Backup</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onExportBackup}>
                <Download />
                Export backup (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onImportBackup}>
                <Upload />
                Import backup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Reports</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onExportCsv}>
                <Download />
                Export list (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" className="gap-2" onClick={onOpenSettings}>
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />
          <ThemeToggle theme={theme} resolved={resolvedTheme} onChange={onThemeChange} />
          <Button variant="ghost" size="sm" className="gap-2" onClick={onSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
