package com.presensenet

import android.graphics.Bitmap
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import java.io.ByteArrayOutputStream

fun uploadToServer(bitmap: Bitmap) {
    val stream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
    val bytes = stream.toByteArray()

    val requestBody = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart(
            "image",
            "face.jpg",
            RequestBody.create("image/jpeg".toMediaTypeOrNull(), bytes)
        )
        .build()

    val request = Request.Builder()
        .url(" https://unabated-kandy-arrhythmic.ngrok-free.dev/scan")
        .post(requestBody)
        .build()

    OkHttpClient().newCall(request).execute()
}
