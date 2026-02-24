package com.presensenet.ui

import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.presensenet.bitmapToJpeg
import com.presensenet.toBitmap
import com.presensenet.Locator
import com.presensenet.LocatorResult
import com.presensenet.Network
import com.presensenet.NetworkResult
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

@Composable
fun CameraScreen(onOpenSettings: () -> Unit) {

    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    var status by remember { mutableStateOf("Ready") }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {

        // 🔹 Camera Preview
        Box(modifier = Modifier.weight(1f)) {
            AndroidView(factory = {

                val previewView = PreviewView(it)

                val cameraProviderFuture = ProcessCameraProvider.getInstance(it)

                cameraProviderFuture.addListener({

                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build()
                    preview.setSurfaceProvider(previewView.surfaceProvider)

                    val capture = ImageCapture.Builder().build()
                    imageCapture = capture

                    cameraProvider.unbindAll()

                    cameraProvider.bindToLifecycle(
                        context as androidx.lifecycle.LifecycleOwner,
                        CameraSelector.DEFAULT_FRONT_CAMERA,
                        preview,
                        capture
                    )

                }, ContextCompat.getMainExecutor(it))

                previewView
            })
        }

        // 🔹 Bottom Section
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            val isError = status.startsWith("❌")

            Text(
                text = status,
                color = if (isError)
                    MaterialTheme.colorScheme.error
                else
                    MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = onOpenSettings
            ) {
                Text("Open Settings")
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = {

                    val capture = imageCapture ?: return@Button

                    val executor = Executors.newSingleThreadExecutor()

                    capture.takePicture(
                        executor,
                        object : ImageCapture.OnImageCapturedCallback() {

                            override fun onCaptureSuccess(image: ImageProxy) {

                                val bitmap = image.toBitmap()
                                image.close()

                                val jpeg = bitmapToJpeg(bitmap)

                                scope.launch {

                                    try {

                                        status = "Checking location..."

                                        val locator = Locator(context)

                                        when (val locationResult =
                                            locator.checkLocation()) {

                                            is LocatorResult.Error -> {
                                                status = "❌ ${locationResult.message}"
                                                return@launch
                                            }

                                            is LocatorResult.Success -> {

                                                if (!locationResult.result.isInside) {
                                                    status = "❌ You are outside the designated area"
                                                    return@launch
                                                }

                                                status = "Sending to server..."

                                                when (val networkResult =
                                                    Network.sendImage(context, jpeg)) {

                                                    is NetworkResult.Success -> {
                                                        status =
                                                            "✅ ${networkResult.message}"
                                                    }

                                                    is NetworkResult.Error -> {
                                                        status =
                                                            "❌ ${networkResult.message}"
                                                    }
                                                }
                                            }
                                        }

                                    } catch (e: Exception) {
                                        status =
                                            "❌ Unexpected Error: ${e.message}"
                                    }
                                }
                            }

                            override fun onError(exception: ImageCaptureException) {
                                status =
                                    "❌ Camera Error: ${exception.message}"
                            }
                        }
                    )
                }
            ) {
                Text("Capture & Verify")
            }
        }
    }
}
