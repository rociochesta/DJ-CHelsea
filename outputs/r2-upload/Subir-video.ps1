$ErrorActionPreference = 'Stop'
try {
    $uploader = Get-ChildItem -LiteralPath $PSScriptRoot -Filter rclone.exe -Recurse | Select-Object -First 1
    if (!$uploader) { throw 'No se encontro rclone.' }
    Write-Host 'Subir movie.mp4 al bucket stream de Cloudflare R2'
    Write-Host 'Los datos se usan solo durante esta carga y no se guardan.'
    $endpoint = (Read-Host 'Pega el endpoint S3 de R2 (https://...r2.cloudflarestorage.com)').Trim().TrimEnd('/')
    $parsed = [Uri]$endpoint
    if ($parsed.Scheme -ne 'https' -or $parsed.Host -notmatch '^[a-fA-F0-9]{32}(\.(eu|fedramp))?\.r2\.cloudflarestorage\.com$' -or $parsed.AbsolutePath -ne '/') {
        throw 'El endpoint debe ser el endpoint S3 oficial de tu cuenta R2, sin el nombre del bucket.'
    }
    $env:RCLONE_CONFIG_ROOMVIDEO_TYPE = 's3'
    $env:RCLONE_CONFIG_ROOMVIDEO_PROVIDER = 'Cloudflare'
    $env:RCLONE_CONFIG_ROOMVIDEO_ENDPOINT = $endpoint
    $env:RCLONE_CONFIG_ROOMVIDEO_REGION = 'auto'
    $env:RCLONE_CONFIG_ROOMVIDEO_ACCESS_KEY_ID = (Read-Host 'Access Key ID').Trim()
    $secret = Read-Host 'Secret Access Key (oculta)' -AsSecureString
    $env:RCLONE_CONFIG_ROOMVIDEO_SECRET_ACCESS_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
    Write-Host 'Carga limitada a 1 MiB/s para reducir el uso de la conexion.'
    & $uploader.FullName copyto 'C:\Users\rocio\Videos\movie.mp4' 'roomvideo:stream/movie.mp4' --config NUL --progress --bwlimit 1M --s3-chunk-size 64M --s3-upload-concurrency 1 --s3-no-check-bucket
    if ($LASTEXITCODE -ne 0) { throw 'La carga no termino correctamente. Puedes volver a ejecutar este asistente.' }
    Write-Host 'Carga completada: stream/movie.mp4' -ForegroundColor Green
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
    'TYPE','PROVIDER','ENDPOINT','REGION','ACCESS_KEY_ID','SECRET_ACCESS_KEY' | ForEach-Object {
        Remove-Item -LiteralPath "Env:RCLONE_CONFIG_ROOMVIDEO_$_" -ErrorAction SilentlyContinue
    }
    Read-Host 'Pulsa Enter para cerrar'
}
