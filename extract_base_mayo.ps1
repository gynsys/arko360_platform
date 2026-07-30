$dbPath = "C:\Users\pablo\Desktop\base_mayo.mdb"
$outDir = "C:\Users\pablo\Documents\arko360_platform\cost360"

# Crear o verificar carpeta de salida
if (-not (Test-Path -Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$connString = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$dbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connString)

try {
    $conn.Open()
    Write-Output "Conectado a $dbPath"
    
    $schema = $conn.GetSchema("Tables")
    $tables = @()
    foreach ($row in $schema.Rows) {
        if ($row.Item("TABLE_TYPE") -eq "TABLE") {
            $tables += $row.Item("TABLE_NAME")
        }
    }
    
    foreach ($table in $tables) {
        Write-Output "Exportando tabla: $table ..."
        $cmd = New-Object System.Data.OleDb.OleDbCommand("SELECT * FROM [$table]", $conn)
        $adapter = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
        $dt = New-Object System.Data.DataTable
        $adapter.Fill($dt) | Out-Null
        
        $outFile = Join-Path -Path $outDir -ChildPath "Export2024_$table.csv"
        
        # Exportar a CSV (usando formato compatible y separador coma)
        $dt | Export-Csv -Path $outFile -NoTypeInformation -Encoding UTF8
    }
    
    $conn.Close()
    Write-Output "¡Exportación completada exitosamente a $outDir!"
} catch {
    Write-Error $_.Exception.Message
}
