Add-Type -AssemblyName System.Drawing

$sourcePath = Resolve-Path 'public/assets/backgrounds/stickman_battle_generated.png'
$outputPath = Join-Path (Get-Location) 'public/assets/backgrounds/stickman_battle_generated_sharp.jpg'

$source = [System.Drawing.Image]::FromFile($sourcePath)
try {
    $scale = 4
    $targetWidth = $source.Width * $scale
    $targetHeight = $source.Height * $scale
    $bitmap = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
        }
        finally {
            $graphics.Dispose()
        }

        $sharpBitmap = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
        try {
            for ($y = 1; $y -lt $targetHeight - 1; $y++) {
                for ($x = 1; $x -lt $targetWidth - 1; $x++) {
                    $center = $bitmap.GetPixel($x, $y)
                    $left = $bitmap.GetPixel($x - 1, $y)
                    $right = $bitmap.GetPixel($x + 1, $y)
                    $top = $bitmap.GetPixel($x, $y - 1)
                    $bottom = $bitmap.GetPixel($x, $y + 1)

                    $r = [Math]::Min(255, [Math]::Max(0, [int](1.85 * $center.R - 0.2125 * ($left.R + $right.R + $top.R + $bottom.R))))
                    $g = [Math]::Min(255, [Math]::Max(0, [int](1.85 * $center.G - 0.2125 * ($left.G + $right.G + $top.G + $bottom.G))))
                    $b = [Math]::Min(255, [Math]::Max(0, [int](1.85 * $center.B - 0.2125 * ($left.B + $right.B + $top.B + $bottom.B))))

                    $sharpBitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($center.A, $r, $g, $b))
                }
            }

            for ($x = 0; $x -lt $targetWidth; $x++) {
                $sharpBitmap.SetPixel($x, 0, $bitmap.GetPixel($x, 0))
                $sharpBitmap.SetPixel($x, $targetHeight - 1, $bitmap.GetPixel($x, $targetHeight - 1))
            }
            for ($y = 0; $y -lt $targetHeight; $y++) {
                $sharpBitmap.SetPixel(0, $y, $bitmap.GetPixel(0, $y))
                $sharpBitmap.SetPixel($targetWidth - 1, $y, $bitmap.GetPixel($targetWidth - 1, $y))
            }

            $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
                Where-Object { $_.MimeType -eq 'image/jpeg' }
            $quality = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 94L
            $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
            $encoderParams.Param[0] = $quality
            try {
                $sharpBitmap.Save($outputPath, $encoder, $encoderParams)
            }
            finally {
                $quality.Dispose()
                $encoderParams.Dispose()
            }
        }
        finally {
            $sharpBitmap.Dispose()
        }
    }
    finally {
        $bitmap.Dispose()
    }
}
finally {
    $source.Dispose()
}

Write-Output $outputPath
