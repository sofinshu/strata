$path = "c:\Users\Administrator\Desktop\bot\src\commands"
$output = "c:\Users\Administrator\Desktop\bot\Hacka\extracted.js"
$results = @()
Get-ChildItem -Path $path -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "\.setName\(['""]([^'""]+)['""]\)") {
        $name = $matches[1]
        $desc = ""
        if ($content -match "\.setDescription\(['""]([^'""]+)['""]\)") {
            $desc = $matches[1].Replace("'", "\'")
        }
        $tier = "Premium"
        $rand = Get-Random -Maximum 100
        if ($rand -lt 60) { $tier = "Free" } elseif ($rand -gt 85) { $tier = "Enterprise" }
        $results += "            { name: '$name', desc: '$desc', tier: '$tier' }"
    }
}
[System.IO.File]::WriteAllText($output, ($results -join ",\n"))
Write-Output "Extracted: $($results.Count) commands"
