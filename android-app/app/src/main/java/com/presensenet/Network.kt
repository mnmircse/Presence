package com.presensenet

import android.content.Context
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import java.io.IOException

sealed class NetworkResult {
    data class Success(val message: String) : NetworkResult()
    data class Error(val message: String) : NetworkResult()
}

object Network {

    private val client = OkHttpClient()

    suspend fun sendImage(
        context: Context,
        image: ByteArray
    ): NetworkResult {

        // 🔹 Get server URL BEFORE entering callback block
        val serverUrl = ConfigManager.getServerUrl(context)

        if (serverUrl.isBlank()) {
            return NetworkResult.Error("Server URL not configured")
        }

        return suspendCancellableCoroutine { continuation ->

            try {

                val requestBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart(
                        "image",
                        "face.jpg",
                        image.toRequestBody("image/jpeg".toMediaType())
                    )
                    .build()

                val request = Request.Builder()
                    .url(serverUrl)
                    .post(requestBody)
                    .build()

                val call = client.newCall(request)

                // 🔹 Cancel request if coroutine is cancelled
                continuation.invokeOnCancellation {
                    call.cancel()
                }

                call.enqueue(object : Callback {

                    override fun onFailure(call: Call, e: IOException) {
                        if (!continuation.isActive) return
                        continuation.resume(
                            NetworkResult.Error("Network Error: ${e.message}")
                        )
                    }

                    override fun onResponse(call: Call, response: Response) {
                        if (!continuation.isActive) return

                        if (!response.isSuccessful) {
                            continuation.resume(
                                NetworkResult.Error("Server Error: ${response.code}")
                            )
                            return
                        }

                        val body = response.body?.string()

                        continuation.resume(
                            NetworkResult.Success(body ?: "Empty Response")
                        )
                    }
                })

            } catch (e: Exception) {
                if (continuation.isActive) {
                    continuation.resume(
                        NetworkResult.Error("Unexpected Error: ${e.message}")
                    )
                }
            }
        }
    }
}
