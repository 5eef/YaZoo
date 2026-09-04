param(
    [string] $BaseUrl = 'http://localhost:8180',
    [Parameter(Mandatory = $true)]
    [string] $Password
)

$ErrorActionPreference = 'Stop'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$origin = ([Uri] $BaseUrl).GetLeftPart([System.UriPartial]::Authority)
$email = 'showcase-smoke-' + [Guid]::NewGuid().ToString('N') + '@example.test'

function Get-CsrfHeaders {
    Invoke-WebRequest -Uri "$BaseUrl/sanctum/csrf-cookie" -WebSession $session -UseBasicParsing | Out-Null
    $csrfCookie = $session.Cookies.GetCookies($BaseUrl)['XSRF-TOKEN']

    if ($null -eq $csrfCookie) {
        throw 'The showcase did not issue an XSRF-TOKEN cookie.'
    }

    return @{
        Accept = 'application/json'
        Origin = $origin
        'X-XSRF-TOKEN' = [Uri]::UnescapeDataString($csrfCookie.Value)
    }
}

function Invoke-JsonRequest {
    param(
        [string] $Method,
        [string] $Path,
        [hashtable] $Headers,
        [hashtable] $Body = $null
    )

    $parameters = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        WebSession = $session
        Headers = $Headers
        UseBasicParsing = $true
    }

    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = ConvertTo-Json $Body
    }

    return Invoke-WebRequest @parameters
}

$headers = Get-CsrfHeaders
$register = Invoke-JsonRequest -Method Post -Path '/api/auth/register' -Headers $headers -Body @{
    name = 'Showcase Smoke User'
    email = $email
    password = $Password
    password_confirmation = $Password
    device_name = 'showcase-smoke'
}
$meAfterRegister = Invoke-JsonRequest -Method Get -Path '/api/auth/me' -Headers @{ Accept = 'application/json' }
$logoutAfterRegister = Invoke-JsonRequest -Method Post -Path '/api/auth/logout' -Headers $headers

$headers = Get-CsrfHeaders
$login = Invoke-JsonRequest -Method Post -Path '/api/auth/login' -Headers $headers -Body @{
    email = $email
    password = $Password
    device_name = 'showcase-smoke'
}
$meAfterLogin = Invoke-JsonRequest -Method Get -Path '/api/auth/me' -Headers @{ Accept = 'application/json' }
$logoutAfterLogin = Invoke-JsonRequest -Method Post -Path '/api/auth/logout' -Headers $headers

Write-Output ('register={0} me_after_register={1} logout={2} login={3} me_after_login={4} logout_after_login={5}' -f `
    $register.StatusCode,
    $meAfterRegister.StatusCode,
    $logoutAfterRegister.StatusCode,
    $login.StatusCode,
    $meAfterLogin.StatusCode,
    $logoutAfterLogin.StatusCode)
