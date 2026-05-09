[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action = "start"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunDir = Join-Path $RepoRoot ".run"
$PidFile = Join-Path $RunDir "stack-pids.json"
$FrontendEnvFile = Join-Path $RepoRoot "frontend\.env"
$FrontendEnvExample = Join-Path $RepoRoot "frontend\.env.example"

$Services = @(
    @{
        Name = "backend"
        Port = 8000
        WorkingDirectory = Join-Path $RepoRoot "backend"
        LogFile = Join-Path $RunDir "backend.log"
        ErrorLogFile = Join-Path $RunDir "backend.err.log"
        StartupTimeoutSeconds = 20
        Command = "poetry run uvicorn app.main:app --host 127.0.0.1 --port 8000"
    },
    @{
        Name = "frontend"
        Port = 5173
        WorkingDirectory = Join-Path $RepoRoot "frontend"
        LogFile = Join-Path $RunDir "frontend.log"
        ErrorLogFile = Join-Path $RunDir "frontend.err.log"
        StartupTimeoutSeconds = 30
        Command = "npm run dev -- --host 127.0.0.1 --port 5173"
    },
    @{
        Name = "rasa"
        Port = 5005
        WorkingDirectory = Join-Path $RepoRoot "rasa_bot"
        LogFile = Join-Path $RunDir "rasa.log"
        ErrorLogFile = Join-Path $RunDir "rasa.err.log"
        StartupTimeoutSeconds = 120
        Command = 'poetry run rasa run --enable-api --cors "*" --port 5005'
    },
    @{
        Name = "actions"
        Port = 5055
        WorkingDirectory = Join-Path $RepoRoot "rasa_bot"
        LogFile = Join-Path $RunDir "actions.log"
        ErrorLogFile = Join-Path $RunDir "actions.err.log"
        StartupTimeoutSeconds = 30
        Command = "poetry run rasa run actions --port 5055"
    }
)

function Ensure-RunDirectory {
    if (-not (Test-Path -LiteralPath $RunDir)) {
        New-Item -ItemType Directory -Path $RunDir | Out-Null
    }
}

function Ensure-FrontendEnv {
    if ((-not (Test-Path -LiteralPath $FrontendEnvFile)) -and (Test-Path -LiteralPath $FrontendEnvExample)) {
        Copy-Item -LiteralPath $FrontendEnvExample -Destination $FrontendEnvFile
        Write-Host "Creado frontend/.env desde .env.example"
    }
}

function Test-CommandExists {
    param([Parameter(Mandatory = $true)][string]$Name)

    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-ListeningConnection {
    param([Parameter(Mandatory = $true)][int]$Port)

    return Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

function Test-PortAvailable {
    param([Parameter(Mandatory = $true)][int]$Port)

    return -not (Get-ListeningConnection -Port $Port)
}

function Wait-ForPort {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (-not (Test-PortAvailable -Port $Port)) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }

    return $false
}

function Wait-ForPortToClose {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutSeconds = 20
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortAvailable -Port $Port) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }

    return $false
}

function Get-ProcessByIdSafe {
    param([Parameter(Mandatory = $true)][int]$Id)

    return Get-Process -Id $Id -ErrorAction SilentlyContinue
}

function Save-State {
    param([Parameter(Mandatory = $true)][array]$ProcessState)

    $payload = [ordered]@{
        created_at = (Get-Date).ToString("o")
        repo_root = $RepoRoot
        services = $ProcessState
    }

    $payload | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $PidFile
}

function Load-State {
    if (-not (Test-Path -LiteralPath $PidFile)) {
        return $null
    }

    return Get-Content -LiteralPath $PidFile -Raw | ConvertFrom-Json
}

function Remove-StateFile {
    if (Test-Path -LiteralPath $PidFile) {
        Remove-Item -LiteralPath $PidFile -Force
    }
}

function Stop-RecordedProcesses {
    param([switch]$Quiet)

    $state = Load-State
    if (-not $state) {
        if (-not $Quiet) {
            Write-Host "No hay stack registrado para apagar."
        }
        return
    }

    foreach ($service in $state.services) {
        $process = Get-ProcessByIdSafe -Id ([int]$service.pid)
        if (-not $process) {
            if (-not $Quiet) {
                Write-Host "$($service.name): PID $($service.pid) ya no estaba corriendo."
            }
            continue
        }

        if (-not $Quiet) {
            Write-Host "Apagando $($service.name) (PID $($service.pid))..."
        }

        & taskkill /PID $service.pid /T /F *> $null

        $null = Wait-ForPortToClose -Port ([int]$service.port) -TimeoutSeconds 20
    }

    Remove-StateFile

    if (-not $Quiet) {
        Write-Host "Stack apagado."
    }
}

function Show-Status {
    $state = Load-State
    $statusRows = foreach ($service in $Services) {
        $record = $null
        if ($state) {
            $record = $state.services | Where-Object { $_.name -eq $service.Name } | Select-Object -First 1
        }

        $process = $null
        if ($record) {
            $process = Get-ProcessByIdSafe -Id ([int]$record.pid)
        }

        $portConnection = Get-ListeningConnection -Port $service.Port

        [PSCustomObject]@{
            Service = $service.Name
            Port = $service.Port
            Running = [bool]$process
            PID = if ($process) { $process.Id } else { $null }
            PortBusy = [bool]$portConnection
            Log = $service.LogFile
        }
    }

    $statusRows | Format-Table -AutoSize
}

function Start-Stack {
    Ensure-RunDirectory
    Ensure-FrontendEnv

    foreach ($tool in @("poetry", "npm")) {
        if (-not (Test-CommandExists -Name $tool)) {
            throw "No encontre '$tool' en PATH."
        }
    }

    $existingState = Load-State
    if ($existingState) {
        $active = $existingState.services | Where-Object { Get-ProcessByIdSafe -Id ([int]$_.pid) }
        if ($active) {
            throw "Ya hay un stack registrado corriendo. Usa '.\manage-stack.ps1 status' o '.\manage-stack.ps1 stop'."
        }

        Remove-StateFile
    }

    $occupiedPorts = foreach ($service in $Services) {
        $connection = Get-ListeningConnection -Port $service.Port
        if ($connection) {
            [PSCustomObject]@{
                Service = $service.Name
                Port = $service.Port
                PID = $connection.OwningProcess
            }
        }
    }

    if ($occupiedPorts) {
        $details = $occupiedPorts | ForEach-Object {
            "$($_.Service): puerto $($_.Port) ocupado por PID $($_.PID)"
        }
        throw ("No puedo arrancar porque hay puertos ocupados.`n" + ($details -join "`n"))
    }

    $started = @()

    try {
        foreach ($service in $Services) {
            if (Test-Path -LiteralPath $service.LogFile) {
                Remove-Item -LiteralPath $service.LogFile -Force
            }
            if (Test-Path -LiteralPath $service.ErrorLogFile) {
                Remove-Item -LiteralPath $service.ErrorLogFile -Force
            }

            $bootstrap = @(
                '$ErrorActionPreference = ''Stop'''
                "Set-Location -LiteralPath '$($service.WorkingDirectory)'"
                $service.Command
            ) -join "; "

            $process = Start-Process -FilePath "powershell.exe" `
                -ArgumentList @(
                    "-NoProfile",
                    "-ExecutionPolicy", "Bypass",
                    "-Command", $bootstrap
                ) `
                -WorkingDirectory $service.WorkingDirectory `
                -RedirectStandardOutput $service.LogFile `
                -RedirectStandardError $service.ErrorLogFile `
                -WindowStyle Hidden `
                -PassThru

            $started += [ordered]@{
                name = $service.Name
                pid = $process.Id
                port = $service.Port
                log = $service.LogFile
                working_directory = $service.WorkingDirectory
            }

            if (-not (Wait-ForPort -Port $service.Port -TimeoutSeconds $service.StartupTimeoutSeconds)) {
                throw "El servicio '$($service.Name)' no abrio el puerto $($service.Port). Revisa $($service.LogFile)."
            }

            Write-Host "Arranco $($service.Name) en puerto $($service.Port) (PID $($process.Id))."
        }

        Save-State -ProcessState $started
        Write-Host "Stack levantado. Logs en $RunDir"
    }
    catch {
        Write-Warning $_.Exception.Message
        if ($started.Count -gt 0) {
            Save-State -ProcessState $started
            Stop-RecordedProcesses -Quiet
        }
        throw
    }
}

switch ($Action) {
    "start" {
        Start-Stack
    }
    "stop" {
        Stop-RecordedProcesses
    }
    "restart" {
        Stop-RecordedProcesses -Quiet
        Start-Stack
    }
    "status" {
        Show-Status
    }
}
