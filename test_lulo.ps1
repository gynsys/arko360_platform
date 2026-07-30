$dbPath = "C:\Users\pablo\Downloads\lulo2.mdb"
$connString = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$dbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connString)
try {
    $conn.Open()
    Write-Output "Conexion exitosa a lulo2.mdb!"
    $schema = $conn.GetSchema("Tables")
    foreach ($row in $schema.Rows) {
        if ($row.Item("TABLE_TYPE") -eq "TABLE") {
            Write-Output ("Tabla encontrada: " + $row.Item("TABLE_NAME"))
        }
    }
    $conn.Close()
} catch {
    Write-Error $_.Exception.Message
}
