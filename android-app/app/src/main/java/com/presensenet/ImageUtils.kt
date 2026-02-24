package com.presensenet

import android.graphics.*
import androidx.camera.core.ImageProxy
import java.io.ByteArrayOutputStream
import android.graphics.Bitmap

fun ImageProxy.toBitmap(): Bitmap {

    // If image is JPEG (1 plane) — direct decode
    if (format == ImageFormat.JPEG && planes.size == 1) {
        val buffer = planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }

    // Otherwise it's YUV_420_888 (3 planes)
    val yBuffer = planes[0].buffer
    val uBuffer = planes[1].buffer
    val vBuffer = planes[2].buffer

    val ySize = yBuffer.remaining()
    val uSize = uBuffer.remaining()
    val vSize = vBuffer.remaining()

    val nv21 = ByteArray(ySize + uSize + vSize)

    // Copy Y
    yBuffer.get(nv21, 0, ySize)
    // Copy V
    vBuffer.get(nv21, ySize, vSize)
    // Copy U
    uBuffer.get(nv21, ySize + vSize, uSize)

    val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)

    val out = ByteArrayOutputStream()
    yuvImage.compressToJpeg(Rect(0, 0, width, height), 100, out)

    val jpeg = out.toByteArray()
    return BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size)
}

fun bitmapToJpeg(bitmap: Bitmap): ByteArray {
    val stream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 95, stream)
    return stream.toByteArray()
}
